package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
)

var searcher *MultiSearcher
var indexPage []byte

func init() {
	searcher = NewMultiSearcher(
		&DuckDuckGo{},
		&Bing{},
		&Baidu{},
		&Sogou{},
		&Google{},
	)

	var err error
	indexPage, err = ioutil.ReadFile("index.html")
	if err != nil {
		fmt.Printf("Warning: cannot read index.html: %v\n", err)
	}

	err = initStorage()
	if err != nil {
		fmt.Printf("Warning: cannot initialize storage: %v\n", err)
	}
}

// validateQuery 验证搜索查询
func validateQuery(query string) error {
	query = strings.TrimSpace(query)
	if query == "" {
		return fmt.Errorf("搜索关键词不能为空")
	}
	if len(query) > 200 {
		return fmt.Errorf("搜索关键词过长（最多200字符）")
	}
	// 防止简单的注入
	dangerous := []string{"<script", "javascript:", "onerror", "onload"}
	lowerQuery := strings.ToLower(query)
	for _, d := range dangerous {
		if strings.Contains(lowerQuery, d) {
			return fmt.Errorf("搜索关键词包含非法字符")
		}
	}
	return nil
}

// SearchResponse 搜索响应结构
type SearchResponse struct {
	Query   string         `json:"query"`
	Total   int            `json:"total"`
	Page    int            `json:"page"`
	PerPage int            `json:"per_page"`
	Results []SearchResult `json:"results"`
}

func searchHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := r.URL.Query().Get("q")
	if err := validateQuery(query); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit := 10
	if limitStr != "" {
		var err error
		limit, err = strconv.Atoi(limitStr)
		if err != nil || limit <= 0 || limit > 50 {
			limit = 10
		}
	}

	pageStr := r.URL.Query().Get("page")
	page := 1
	if pageStr != "" {
		var err error
		page, err = strconv.Atoi(pageStr)
		if err != nil || page < 1 {
			page = 1
		}
	}

	forceRefresh := r.URL.Query().Get("force") == "1"

	// 搜索获取全部结果
	allResults, err := searcher.Search(query, limit*page, forceRefresh)
	if err != nil {
		http.Error(w, fmt.Sprintf("Search failed: %v", err), http.StatusInternalServerError)
		return
	}

	// 分页处理
	start := (page - 1) * limit
	end := start + limit
	var pagedResults []SearchResult
	if start < len(allResults) {
		if end > len(allResults) {
			end = len(allResults)
		}
		pagedResults = allResults[start:end]
	}

	// 仅第一页时保存
	if page == 1 {
		go SaveSearchResults(query, pagedResults)
	}

	response := SearchResponse{
		Query:   query,
		Total:   len(allResults),
		Page:    page,
		PerPage: limit,
		Results: pagedResults,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	json.NewEncoder(w).Encode(response)
}

func searchPageHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Write(indexPage)
}

func historyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit := 20
	if limitStr != "" {
		var err error
		limit, err = strconv.Atoi(limitStr)
		if err != nil || limit <= 0 {
			limit = 20
		}
	}

	history, err := GetSearchHistory(limit)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get history: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(history)
}

func clearHistoryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	err := ClearSearchHistory()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to clear history: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Write([]byte(`{"success": true}`))
}

// healthHandler 健康检查接口
func healthHandler(w http.ResponseWriter, r *http.Request) {
	total, expired := searcher.cache.Stats()
	health := map[string]interface{}{
		"status":        "ok",
		"cache_total":   total,
		"cache_expired": expired,
		"engines":       len(searcher.searchers),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(health)
}

func main() {
	http.HandleFunc("/api/search", searchHandler)
	http.HandleFunc("/api/history", historyHandler)
	http.HandleFunc("/api/history/clear", clearHistoryHandler)
	http.HandleFunc("/api/health", healthHandler)
	http.HandleFunc("/", searchPageHandler)

	fmt.Println("Search engine service starting...")
	fmt.Println("Access address: http://localhost:8081")
	fmt.Println("Health check: http://localhost:8081/api/health")

	err := http.ListenAndServe(":8081", nil)
	if err != nil {
		fmt.Printf("Service start failed: %v\n", err)
	}
}
