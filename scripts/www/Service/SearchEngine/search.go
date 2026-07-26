package main

import (
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
)

type SearchResult struct {
	Title   string
	URL     string
	Snippet string
	Source  string
	Score   float64 `json:"-"`
}

type Searcher interface {
	Search(query string, limit int) ([]SearchResult, error)
	Name() string
}

// 搜索引擎权重
var engineWeights = map[string]float64{
	"Google":     1.0,
	"Bing":       0.9,
	"Baidu":      0.85,
	"DuckDuckGo": 0.8,
	"Sogou":      0.7,
}

type MultiSearcher struct {
	searchers []Searcher
	cache     *SearchCache
	logger    *Logger
}

func NewMultiSearcher(searchers ...Searcher) *MultiSearcher {
	return &MultiSearcher{
		searchers: searchers,
		cache:     NewSearchCache(2 * time.Minute),
		logger:    NewLogger(),
	}
}

func (m *MultiSearcher) Search(query string, limit int, forceRefresh bool) ([]SearchResult, error) {
	// 检查缓存
	cacheKey := fmt.Sprintf("%s_%d", query, limit)
	if !forceRefresh {
		if cached, ok := m.cache.Get(cacheKey); ok {
			m.logger.Info("CACHE HIT query=%q", query)
			return cached, nil
		}
	}

	var wg sync.WaitGroup
	resultsChan := make(chan []SearchResult, len(m.searchers))
	var mu sync.Mutex
	engineResults := make(map[string]int)

	for _, s := range m.searchers {
		wg.Add(1)
		go func(searcher Searcher) {
			defer wg.Done()
			start := time.Now()

			// 请求频率控制：每个引擎间隔随机延迟
			time.Sleep(time.Duration(100) * time.Millisecond)

			results, err := searcher.Search(query, limit)
			duration := time.Since(start)

			m.logger.SearchLog(query, searcher.Name(), len(results), duration, err)

			if err == nil && len(results) > 0 {
				resultsChan <- results
				mu.Lock()
				engineResults[searcher.Name()] = len(results)
				mu.Unlock()
			}
		}(s)
	}

	wg.Wait()
	close(resultsChan)

	var allResults []SearchResult
	urlMap := make(map[string]int) // URL -> 出现次数

	for results := range resultsChan {
		for _, r := range results {
			if r.URL != "" {
				urlMap[r.URL]++
				if urlMap[r.URL] == 1 {
					// 计算相关性分数
					r.Score = calculateScore(r, query, urlMap[r.URL])
					allResults = append(allResults, r)
				} else {
					// 多引擎返回同一URL，提升分数
					for i := range allResults {
						if allResults[i].URL == r.URL {
							allResults[i].Score += 0.3
							break
						}
					}
				}
			}
		}
	}

	// 智能排序
	sort.Slice(allResults, func(i, j int) bool {
		return allResults[i].Score > allResults[j].Score
	})

	if len(allResults) > limit {
		allResults = allResults[:limit]
	}

	// 写入缓存
	m.cache.Set(cacheKey, allResults)

	m.logger.Info("SEARCH COMPLETE query=%q total=%d engines=%v",
		query, len(allResults), engineResults)

	return allResults, nil
}

// calculateScore 计算搜索结果相关性分数
func calculateScore(result SearchResult, query string, urlCount int) float64 {
	score := 0.0

	// 1. 来源权重 (0-1)
	if weight, ok := engineWeights[result.Source]; ok {
		score += weight * 0.4
	}

	// 2. 标题匹配度 (0-0.3)
	queryLower := strings.ToLower(query)
	titleLower := strings.ToLower(result.Title)
	if strings.Contains(titleLower, queryLower) {
		score += 0.3
		// 完全匹配额外加分
		if titleLower == queryLower {
			score += 0.1
		}
	}

	// 3. 摘要匹配度 (0-0.2)
	snippetLower := strings.ToLower(result.Snippet)
	if strings.Contains(snippetLower, queryLower) {
		score += 0.2
	}

	// 4. URL权威性加分 (0-0.1)
	trustedDomains := []string{"wikipedia.org", "github.com", "stackoverflow.com",
		"zhihu.com", "csdn.net", "baidu.com", "gov.cn", "edu.cn"}
	for _, domain := range trustedDomains {
		if strings.Contains(result.URL, domain) {
			score += 0.1
			break
		}
	}

	// 5. HTTPS加分
	if strings.HasPrefix(result.URL, "https://") {
		score += 0.05
	}

	return score
}

// newHTTPClient 创建带超时的HTTP客户端
func newHTTPClient() *http.Client {
	return &http.Client{
		Timeout: 8 * time.Second,
	}
}

// setCommonHeaders 设置通用请求头
func setCommonHeaders(req *http.Request) {
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
	req.Header.Set("Connection", "keep-alive")
	req.Header.Set("Upgrade-Insecure-Requests", "1")
}

type DuckDuckGo struct{}

func (d *DuckDuckGo) Name() string {
	return "DuckDuckGo"
}

func (d *DuckDuckGo) Search(query string, limit int) ([]SearchResult, error) {
	var results []SearchResult

	baseURL := "https://html.duckduckgo.com/html/"
	params := url.Values{}
	params.Add("q", query)

	fullURL := baseURL + "?" + params.Encode()

	client := newHTTPClient()
	req, err := http.NewRequest("GET", fullURL, nil)
	if err != nil {
		return nil, err
	}

	setCommonHeaders(req)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("DuckDuckGo returned status code %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	doc.Find(".result").Each(func(i int, s *goquery.Selection) {
		if i >= limit {
			return
		}

		title := s.Find(".result__title").Text()
		linkTag := s.Find(".result__a")
		href, _ := linkTag.Attr("href")
		snippet := s.Find(".result__snippet").Text()

		if href != "" && strings.HasPrefix(href, "http") {
			results = append(results, SearchResult{
				Title:   strings.TrimSpace(title),
				URL:     href,
				Snippet: strings.TrimSpace(snippet),
				Source:  "DuckDuckGo",
			})
		}
	})

	return results, nil
}

type Bing struct{}

func (b *Bing) Name() string {
	return "Bing"
}

func (b *Bing) Search(query string, limit int) ([]SearchResult, error) {
	var results []SearchResult

	baseURL := "https://www.bing.com/search"
	params := url.Values{}
	params.Add("q", query)
	params.Add("count", fmt.Sprintf("%d", limit))

	fullURL := baseURL + "?" + params.Encode()

	client := newHTTPClient()
	req, err := http.NewRequest("GET", fullURL, nil)
	if err != nil {
		return nil, err
	}

	setCommonHeaders(req)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Bing returned status code %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	doc.Find("#b_results .b_algo").Each(func(i int, s *goquery.Selection) {
		if i >= limit {
			return
		}

		titleTag := s.Find("h2 a")
		title := titleTag.Text()
		href, _ := titleTag.Attr("href")
		snippet := s.Find(".b_caption p").Text()

		if href != "" && strings.HasPrefix(href, "http") {
			results = append(results, SearchResult{
				Title:   strings.TrimSpace(title),
				URL:     href,
				Snippet: strings.TrimSpace(snippet),
				Source:  "Bing",
			})
		}
	})

	return results, nil
}

// Baidu 百度搜索引擎
type Baidu struct{}

func (b *Baidu) Name() string {
	return "Baidu"
}

func (b *Baidu) Search(query string, limit int) ([]SearchResult, error) {
	var results []SearchResult

	baseURL := "https://www.baidu.com/s"
	params := url.Values{}
	params.Add("wd", query)
	params.Add("rn", fmt.Sprintf("%d", limit))

	fullURL := baseURL + "?" + params.Encode()

	client := newHTTPClient()
	req, err := http.NewRequest("GET", fullURL, nil)
	if err != nil {
		return nil, err
	}

	setCommonHeaders(req)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Baidu returned status code %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	doc.Find(".result, .c-container").Each(func(i int, s *goquery.Selection) {
		if i >= limit {
			return
		}

		titleTag := s.Find("h3 a")
		title := titleTag.Text()
		href, _ := titleTag.Attr("href")
		snippet := s.Find(".c-abstract, [class*='content-right']").Text()

		if href != "" && strings.HasPrefix(href, "http") {
			results = append(results, SearchResult{
				Title:   strings.TrimSpace(title),
				URL:     href,
				Snippet: strings.TrimSpace(snippet),
				Source:  "Baidu",
			})
		}
	})

	return results, nil
}

// Sogou 搜狗搜索引擎
type Sogou struct{}

func (s *Sogou) Name() string {
	return "Sogou"
}

func (s *Sogou) Search(query string, limit int) ([]SearchResult, error) {
	var results []SearchResult

	baseURL := "https://www.sogou.com/web"
	params := url.Values{}
	params.Add("query", query)
	params.Add("num", fmt.Sprintf("%d", limit))

	fullURL := baseURL + "?" + params.Encode()

	client := newHTTPClient()
	req, err := http.NewRequest("GET", fullURL, nil)
	if err != nil {
		return nil, err
	}

	setCommonHeaders(req)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Sogou returned status code %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	doc.Find(".results .vrwrap, .results .rb").Each(func(i int, s *goquery.Selection) {
		if i >= limit {
			return
		}

		titleTag := s.Find("h3 a")
		title := titleTag.Text()
		href, _ := titleTag.Attr("href")
		snippet := s.Find(".space-txt, [class*='fz-mid']").Text()

		if href != "" {
			if strings.HasPrefix(href, "/link") {
				href = "https://www.sogou.com" + href
			}
			if strings.HasPrefix(href, "http") {
				results = append(results, SearchResult{
					Title:   strings.TrimSpace(title),
					URL:     href,
					Snippet: strings.TrimSpace(snippet),
					Source:  "Sogou",
				})
			}
		}
	})

	return results, nil
}

// Google Google搜索引擎
type Google struct{}

func (g *Google) Name() string {
	return "Google"
}

func (g *Google) Search(query string, limit int) ([]SearchResult, error) {
	var results []SearchResult

	baseURL := "https://www.google.com/search"
	params := url.Values{}
	params.Add("q", query)
	params.Add("num", fmt.Sprintf("%d", limit))

	fullURL := baseURL + "?" + params.Encode()

	client := newHTTPClient()
	req, err := http.NewRequest("GET", fullURL, nil)
	if err != nil {
		return nil, err
	}

	setCommonHeaders(req)
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Google returned status code %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	doc.Find(".g").Each(func(i int, s *goquery.Selection) {
		if i >= limit {
			return
		}

		titleTag := s.Find("h3")
		title := titleTag.Text()
		linkTag := s.Find("a")
		href, _ := linkTag.Attr("href")
		snippet := s.Find(".VwiC3b, .s").Text()

		if href != "" && strings.HasPrefix(href, "http") && !strings.Contains(href, "google.com") {
			results = append(results, SearchResult{
				Title:   strings.TrimSpace(title),
				URL:     href,
				Snippet: strings.TrimSpace(snippet),
				Source:  "Google",
			})
		}
	})

	return results, nil
}
