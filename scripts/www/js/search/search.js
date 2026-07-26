function redirectToSearch() {
    var engines = {
        "bilibili": "https://search.bilibili.com/all?keyword=",
        "douyin": "https://www.douyin.com/root/search/",
        "baidu": "https://www.baidu.com/s?wd=",
        "sogou": "https://www.sogou.com/web?query=",
        "360": "https://www.so.com/s?ie=UTF-8&q=",
        "360ai": "https://www.so.com/s?ie=UTF-8&q=",
        "yande": "https://yandex.com/search/?text=",
        "magi": "https://magi.com/search?q=",
        "duckduckgo": "https://duckduckgo.com/?q=",
        "github": "https://github.com/search?q=",
        "bing": "https://www.bing.com/search?q=",
        "tx": "https://pc.qq.com/search.html#!keyword=",
        "google": "https://www.google.com/search?q=",
        "163music": "https://music.163.com/#/search/m/?s=",
        "qqmusic": "https://y.qq.com/n/ryqq/search?w=",
    };

    var engine = document.getElementById("searchEngine").value;
    var query = document.getElementById("searchQuery").value.trim();

    if (!query) {
        var url = engines[engine];
        var homeUrl = url.split(/[?#]/)[0];
        const newTab = window.open();
        newTab.location.href = homeUrl;
        return;
    }

    var url = engines[engine] + encodeURIComponent(query);
    const newTab = window.open();
    newTab.location.href = url;
}

document.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && document.activeElement.id === 'searchQuery') {
        redirectToSearch();
    }
});


const btn = document.getElementById('btn');
const input = document.getElementById('searchQuery');
const searchCardUntop = document.querySelector('.search-card-untop');

if (btn && input && searchCardUntop) {
    btn.addEventListener('click', () => {
        input.value = '/';
        input.focus();
        checkSearchCard();
    });

    input.addEventListener('input', function () {
        checkSearchCard();
    });
}

function checkSearchCard() {
    if (!searchCardUntop) return;
    const val = input.value.trim();
    if (val.includes('/')) {
        searchCardUntop.style.display = 'block';
    } else {
        searchCardUntop.style.display = 'none';
    }
}

function toggleFullscreen() {
    const btn = document.getElementById('fullBtn');
    if (!btn) return;

    const docEl = document.documentElement;
    const requestFullscreen = docEl.requestFullscreen ||
        docEl.webkitRequestFullscreen ||
        docEl.mozRequestFullScreen ||
        docEl.msRequestFullscreen;
    const exitFullscreen = document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.mozCancelFullScreen ||
        document.msExitFullscreen;
    const fullscreenElement = document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;

    try {
        if (!fullscreenElement) {
            if (requestFullscreen) {
                requestFullscreen.call(docEl);
            }
        } else {
            if (exitFullscreen) {
                exitFullscreen.call(document);
            }
        }
    } catch (e) {
        console.error('全屏操作失败:', e);
    }
}

async function refreshBg() {
    const saveBg = localStorage.getItem('chooseBg') || 'bing';
    if (typeof setBg === 'function') {
        if (saveBg.startsWith('360-') || saveBg === 'hd' || saveBg === 'sina' || saveBg === 'bing') {
            document.body.style.background = '';
            setTimeout(() => {
                setBg(saveBg);
            }, 50);
        } else {
            setBg(saveBg);
        }
    } else {
        const bgUrl = 'https://api.paugram.com/bing/?t=' + Date.now();
        document.body.style.background = `url("${bgUrl}") center center / cover fixed`;
    }
}

const bgOverlay = document.getElementById('bgOverlay');
const quickSettingsBox = document.querySelector('.QuickSettingsBox');

if (bgOverlay && quickSettingsBox) {
    let leaveTimeout;
    
    quickSettingsBox.addEventListener('mouseenter', () => {
        clearTimeout(leaveTimeout);
        bgOverlay.classList.add('active');
        quickSettingsBox.classList.add('active');
    });

    quickSettingsBox.addEventListener('mouseleave', () => {
        leaveTimeout = setTimeout(() => {
            bgOverlay.classList.remove('active');
            quickSettingsBox.classList.remove('active');
        }, 500);
    });
}

const toggleBtn = document.getElementById('toggleSearch');
const searchBox = document.querySelector('.SearchBox');

if (toggleBtn && searchBox) {
    toggleBtn.addEventListener('click', () => {
        searchBox.classList.toggle('hidden');
        if (searchBox.classList.contains('hidden')) {
            toggleBtn.textContent = '显示搜索框';
        } else {
            toggleBtn.textContent = '隐藏搜索框';
        }
    });
}

const toggleCardsBtn = document.getElementById('toggleCards');
const toggleableCards = document.querySelectorAll('.toggleable-card');
let cardsHidden = localStorage.getItem('cardsHidden') === 'true' || false;

const cardSwitchMap = {
    'switchWeather': 'weatherCard',
    'switchApp': 'appCard',
    'switchLights': 'lightsCard',
    'switchZhihu': 'zhihuCard'
};

if (cardsHidden) {
    toggleableCards.forEach(function (card) {
        card.classList.add('card-collapsed');
    });
    if (toggleCardsBtn) {
        toggleCardsBtn.textContent = '显示所有卡片';
    }
}

if (toggleCardsBtn) {
    toggleCardsBtn.addEventListener('click', () => {
        cardsHidden = !cardsHidden;
        localStorage.setItem('cardsHidden', cardsHidden.toString());

        toggleableCards.forEach(function (card) {
            if (cardsHidden) {
                card.classList.add('card-collapsed');
            } else {
                card.classList.remove('card-collapsed');
            }
        });
        toggleCardsBtn.textContent = cardsHidden ? '显示所有卡片' : '隐藏所有卡片';
    });
}

function scrollToCard(cardId, event) {
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }

    const target = document.getElementById(cardId);
    if (!target) return;

    const isCollapsed = target.classList.contains('card-collapsed');
    const shouldExpand = isCollapsed || cardsHidden;

    if (shouldExpand) {
        toggleableCards.forEach(function (card) {
            card.classList.remove('card-collapsed');
            card.classList.remove('card-highlight');
        });
        cardsHidden = false;
        localStorage.setItem('cardsHidden', 'false');
        if (toggleCardsBtn) {
            toggleCardsBtn.textContent = '隐藏所有卡片';
        }

        const switchId = Object.keys(cardSwitchMap).find(key => cardSwitchMap[key] === cardId);
        if (switchId) {
            const switchEl = document.getElementById(switchId);
            if (switchEl) {
                switchEl.checked = true;
                localStorage.setItem('cardVisible_' + cardId, 'true');
            }
        }
    }

    const scrollDelay = shouldExpand ? 450 : 100;
    setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, scrollDelay);

    setTimeout(() => {
        target.classList.remove('card-highlight');
        setTimeout(() => {
            target.classList.add('card-highlight');
            setTimeout(function () {
                target.classList.remove('card-highlight');
            }, 1800);
        }, 50);
    }, shouldExpand ? 500 : 50);
}

function initCardSwitches() {
    Object.keys(cardSwitchMap).forEach(function(switchId) {
        const switchEl = document.getElementById(switchId);
        const cardId = cardSwitchMap[switchId];
        const cardEl = document.getElementById(cardId);

        if (!switchEl || !cardEl) return;

        const isVisible = localStorage.getItem('cardVisible_' + cardId);
        if (isVisible === 'false') {
            switchEl.checked = false;
            cardEl.classList.add('card-collapsed');
        } else {
            switchEl.checked = true;
            cardEl.classList.remove('card-collapsed');
            localStorage.setItem('cardVisible_' + cardId, 'true');
        }

        switchEl.addEventListener('change', function(e) {
            e.stopPropagation();
            const checked = this.checked;

            if (checked) {
                cardEl.classList.remove('card-collapsed');
                localStorage.setItem('cardVisible_' + cardId, 'true');
                loadCardData(cardId);
            } else {
                cardEl.classList.add('card-collapsed');
                localStorage.setItem('cardVisible_' + cardId, 'false');
            }
        });
    });
}

function loadCardData(cardId) {
    switch (cardId) {
        case 'weatherCard':
            if (typeof triggerLoadWeather === 'function') {
                triggerLoadWeather();
            } else {
                if (typeof LazyLoad !== 'undefined') {
                    LazyLoad.loadScript('js/weather.js');
                }
            }
            break;
        case 'zhihuCard':
            if (typeof LazyLoad !== 'undefined') {
                LazyLoad.loadScript('js/api/Portal/ZhihuHotSearch/HotSearch.js');
            }
            break;
        case 'lightsCard':
            break;
        case 'appCard':
            break;
        default:
            break;
    }
}

function toggleSearchLogo() {
    const logoTitle = document.querySelector('.searchInputBox h1');
    const switchLogo = document.getElementById('switchLogo');
    if (logoTitle && switchLogo) {
        logoTitle.style.display = switchLogo.checked ? 'block' : 'none';
        localStorage.setItem('searchLogoVisible', switchLogo.checked);
    }
}

function updateLogoType() {
    const logoTextRow = document.getElementById('logoTextRow');
    const logoImageRow = document.getElementById('logoImageRow');
    const textRadio = document.querySelector('input[name="logoType"][value="text"]');
    const logoTitle = document.querySelector('.searchInputBox h1');

    if (logoTextRow && logoImageRow && logoTitle) {
        if (textRadio.checked) {
            logoTextRow.style.display = 'flex';
            logoImageRow.style.display = 'none';
            const savedLogoText = localStorage.getItem('logoText') || '市舶司';
            const savedLogoSize = localStorage.getItem('logoSize') || 68;
            logoTitle.textContent = savedLogoText;
            logoTitle.style.fontSize = savedLogoSize + 'px';
        } else {
            logoTextRow.style.display = 'none';
            logoImageRow.style.display = 'flex';
            const savedLogoImage = localStorage.getItem('logoImage');
            if (savedLogoImage) {
                logoTitle.innerHTML = `<img src="${savedLogoImage}" style="width: 100%; max-height: 80px; object-fit: contain;">`;
            }
        }
        localStorage.setItem('logoType', textRadio.checked ? 'text' : 'image');
    }
}

function updateLogoText() {
    const logoText = document.getElementById('logoText');
    const logoSize = document.getElementById('logoSize');
    const logoTitle = document.querySelector('.searchInputBox h1');

    if (logoText && logoTitle) {
        const size = logoSize ? logoSize.value : 68;
        const text = logoText.value || '市舶司';
        logoTitle.textContent = text;
        logoTitle.style.fontSize = size + 'px';
        localStorage.setItem('logoText', text);
        localStorage.setItem('logoSize', size);
    }
}

function updateLogoSize() {
    const logoSize = document.getElementById('logoSize');
    const logoSizeValue = document.getElementById('logoSizeValue');
    const logoTitle = document.querySelector('.searchInputBox h1');

    if (logoSize && logoTitle) {
        const textRadio = document.querySelector('input[name="logoType"][value="text"]');
        if (textRadio && textRadio.checked) {
            const logoText = document.getElementById('logoText');
            const text = logoText ? (logoText.value || '市舶司') : '市舶司';
            logoTitle.textContent = text;
            logoTitle.style.fontSize = logoSize.value + 'px';
        }
        if (logoSizeValue) {
            logoSizeValue.textContent = logoSize.value + 'px';
        }
        localStorage.setItem('logoSize', logoSize.value);
    }
}

function uploadLogoImage() {
    const logoImageInput = document.getElementById('logoImageInput');
    const logoTitle = document.querySelector('.searchInputBox h1');

    if (logoImageInput && logoTitle && logoImageInput.files[0]) {
        const file = logoImageInput.files[0];
        const reader = new FileReader();
        reader.onload = function (e) {
            logoTitle.innerHTML = `<img src="${e.target.result}" style="width: 100%; max-height: 80px; object-fit: contain;">`;
            localStorage.setItem('logoImage', e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

function updateSearchOpacity() {
    const searchOpacity = document.getElementById('searchOpacity');
    const opacityValue = document.getElementById('opacityValue');
    const searchBox = document.querySelector('.SearchBox');

    if (searchOpacity && searchBox) {
        const opacity = searchOpacity.value / 100;
        searchBox.style.background = `rgba(255, 255, 255, ${opacity})`;
        if (opacityValue) {
            opacityValue.textContent = searchOpacity.value + '%';
        }
        localStorage.setItem('searchOpacity', searchOpacity.value);
    }
}

function updateSearchWidth() {
    const searchWidth = document.getElementById('searchWidth');
    const widthValue = document.getElementById('widthValue');
    const searchBox = document.querySelector('.SearchBox');

    if (searchWidth && searchBox) {
        searchBox.style.maxWidth = searchWidth.value + 'px';
        if (widthValue) {
            widthValue.textContent = searchWidth.value + 'px';
        }
        localStorage.setItem('searchWidth', searchWidth.value);
    }
}

function updateSearchRadius() {
    const searchRadius = document.getElementById('searchRadius');
    const radiusValue = document.getElementById('radiusValue');
    const searchBox = document.querySelector('.SearchBox');
    const searchInput = document.getElementById('searchQuery');

    if (searchRadius && searchBox) {
        searchBox.style.borderRadius = searchRadius.value + 'px';
        if (searchInput) {
            searchInput.style.borderRadius = searchRadius.value + 'px';
        }
        if (radiusValue) {
            radiusValue.textContent = searchRadius.value + 'px';
        }
        localStorage.setItem('searchRadius', searchRadius.value);
    }
}

function updateSearchPlaceholder() {
    const searchPlaceholder = document.getElementById('searchPlaceholder');
    const searchInput = document.getElementById('searchQuery');

    if (searchPlaceholder && searchInput) {
        searchInput.placeholder = searchPlaceholder.value || '输入搜索内容';
        localStorage.setItem('searchPlaceholder', searchPlaceholder.value);
    }
}

function toggleAutoSlash() {
    const switchAutoSlash = document.getElementById('switchAutoSlash');
    const autoSlashBtn = document.getElementById('btn');

    if (autoSlashBtn) {
        autoSlashBtn.style.display = switchAutoSlash.checked ? 'flex' : 'none';
        localStorage.setItem('autoSlashVisible', switchAutoSlash.checked);
    }
}

function resetSearchSettings() {
    if (confirm('确定要恢复搜索框的默认设置吗？')) {
        localStorage.removeItem('searchLogoVisible');
        localStorage.removeItem('logoType');
        localStorage.removeItem('logoText');
        localStorage.removeItem('logoSize');
        localStorage.removeItem('logoImage');
        localStorage.removeItem('searchOpacity');
        localStorage.removeItem('searchWidth');
        localStorage.removeItem('searchRadius');
        localStorage.removeItem('searchPlaceholder');
        localStorage.removeItem('autoSlashVisible');

        const switchLogo = document.getElementById('switchLogo');
        const textRadio = document.querySelector('input[name="logoType"][value="text"]');
        const imageRadio = document.querySelector('input[name="logoType"][value="image"]');
        const logoText = document.getElementById('logoText');
        const logoSize = document.getElementById('logoSize');
        const logoSizeValue = document.getElementById('logoSizeValue');
        const searchOpacity = document.getElementById('searchOpacity');
        const opacityValue = document.getElementById('opacityValue');
        const searchWidth = document.getElementById('searchWidth');
        const widthValue = document.getElementById('widthValue');
        const searchRadius = document.getElementById('searchRadius');
        const radiusValue = document.getElementById('radiusValue');
        const searchPlaceholder = document.getElementById('searchPlaceholder');
        const switchAutoSlash = document.getElementById('switchAutoSlash');
        const logoTitle = document.querySelector('.searchInputBox h1');
        const searchBox = document.querySelector('.SearchBox');
        const searchInput = document.getElementById('searchQuery');
        const autoSlashBtn = document.getElementById('btn');
        const logoTextRow = document.getElementById('logoTextRow');
        const logoImageRow = document.getElementById('logoImageRow');

        if (switchLogo) switchLogo.checked = true;
        if (textRadio) textRadio.checked = true;
        if (imageRadio) imageRadio.checked = false;
        if (logoText) logoText.value = '市舶司';
        if (logoSize) logoSize.value = 68;
        if (logoSizeValue) logoSizeValue.textContent = '68px';
        if (searchOpacity) searchOpacity.value = 25;
        if (opacityValue) opacityValue.textContent = '25%';
        if (searchWidth) searchWidth.value = 400;
        if (widthValue) widthValue.textContent = '400px';
        if (searchRadius) searchRadius.value = 25;
        if (radiusValue) radiusValue.textContent = '25px';
        if (searchPlaceholder) searchPlaceholder.value = '输入搜索内容';
        if (switchAutoSlash) switchAutoSlash.checked = true;

        if (logoTitle) {
            logoTitle.textContent = '市舶司';
            logoTitle.style.fontSize = '68px';
            logoTitle.style.display = 'block';
        }
        if (searchBox) {
            searchBox.style.background = 'rgba(255, 255, 255, 0.25)';
            searchBox.style.maxWidth = '400px';
            searchBox.style.borderRadius = '25px';
        }
        if (searchInput) {
            searchInput.style.borderRadius = '25px';
            searchInput.placeholder = '输入搜索内容';
        }
        if (autoSlashBtn) {
            autoSlashBtn.style.display = 'flex';
        }
        if (logoTextRow) logoTextRow.style.display = 'flex';
        if (logoImageRow) logoImageRow.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', initCardSwitches);

function initSearchSettings() {
    const savedLogoVisible = localStorage.getItem('searchLogoVisible');
    const savedLogoType = localStorage.getItem('logoType');
    const savedLogoText = localStorage.getItem('logoText');
    const savedLogoSize = localStorage.getItem('logoSize');
    const savedSearchOpacity = localStorage.getItem('searchOpacity');
    const savedSearchWidth = localStorage.getItem('searchWidth');
    const savedSearchRadius = localStorage.getItem('searchRadius');
    const savedSearchPlaceholder = localStorage.getItem('searchPlaceholder');
    const savedAutoSlashVisible = localStorage.getItem('autoSlashVisible');

    const switchLogo = document.getElementById('switchLogo');
    const textRadio = document.querySelector('input[name="logoType"][value="text"]');
    const imageRadio = document.querySelector('input[name="logoType"][value="image"]');
    const logoText = document.getElementById('logoText');
    const logoSize = document.getElementById('logoSize');
    const logoSizeValue = document.getElementById('logoSizeValue');
    const searchOpacity = document.getElementById('searchOpacity');
    const opacityValue = document.getElementById('opacityValue');
    const searchWidth = document.getElementById('searchWidth');
    const widthValue = document.getElementById('widthValue');
    const searchRadius = document.getElementById('searchRadius');
    const radiusValue = document.getElementById('radiusValue');
    const searchPlaceholder = document.getElementById('searchPlaceholder');
    const switchAutoSlash = document.getElementById('switchAutoSlash');
    const logoTitle = document.querySelector('.searchInputBox h1');
    const searchBox = document.querySelector('.SearchBox');
    const searchInput = document.getElementById('searchQuery');
    const autoSlashBtn = document.getElementById('btn');
    const logoTextRow = document.getElementById('logoTextRow');
    const logoImageRow = document.getElementById('logoImageRow');

    if (savedLogoVisible === 'false') {
        if (switchLogo) switchLogo.checked = false;
        if (logoTitle) logoTitle.style.display = 'none';
    }

    if (savedLogoType === 'image') {
        if (imageRadio) imageRadio.checked = true;
        if (textRadio) textRadio.checked = false;
        if (logoTextRow) logoTextRow.style.display = 'none';
        if (logoImageRow) logoImageRow.style.display = 'flex';
        const savedLogoImage = localStorage.getItem('logoImage');
        if (savedLogoImage && logoTitle) {
            logoTitle.innerHTML = `<img src="${savedLogoImage}" style="width: 100%; max-height: 80px; object-fit: contain;">`;
        }
    }

    if (savedLogoText) {
        if (logoText) logoText.value = savedLogoText;
        if (logoTitle && savedLogoType !== 'image') {
            logoTitle.textContent = savedLogoText;
        }
    }

    if (savedLogoSize) {
        if (logoSize) logoSize.value = savedLogoSize;
        if (logoSizeValue) logoSizeValue.textContent = savedLogoSize + 'px';
        if (logoTitle && savedLogoType !== 'image') {
            logoTitle.style.fontSize = savedLogoSize + 'px';
        }
    }

    if (savedSearchOpacity) {
        if (searchOpacity) searchOpacity.value = savedSearchOpacity;
        if (opacityValue) opacityValue.textContent = savedSearchOpacity + '%';
        if (searchBox) {
            searchBox.style.background = `rgba(255, 255, 255, ${savedSearchOpacity / 100})`;
        }
    }

    if (savedSearchWidth) {
        if (searchWidth) searchWidth.value = savedSearchWidth;
        if (widthValue) widthValue.textContent = savedSearchWidth + 'px';
        if (searchBox) {
            searchBox.style.maxWidth = savedSearchWidth + 'px';
        }
    }

    if (savedSearchRadius) {
        if (searchRadius) searchRadius.value = savedSearchRadius;
        if (radiusValue) radiusValue.textContent = savedSearchRadius + 'px';
        if (searchBox) {
            searchBox.style.borderRadius = savedSearchRadius + 'px';
        }
        if (searchInput) {
            searchInput.style.borderRadius = savedSearchRadius + 'px';
        }
    }

    if (savedSearchPlaceholder) {
        if (searchPlaceholder) searchPlaceholder.value = savedSearchPlaceholder;
        if (searchInput) searchInput.placeholder = savedSearchPlaceholder;
    }

    if (savedAutoSlashVisible === 'false') {
        if (switchAutoSlash) switchAutoSlash.checked = false;
        if (autoSlashBtn) autoSlashBtn.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', initSearchSettings);