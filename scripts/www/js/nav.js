//`<p id="nav"></p>
// 内嵌下拉导航样式
const style = document.createElement('style');
style.textContent = `
.navbar {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    width: 100%;
    padding: 8px 16px;
    box-sizing: border-box;
}
.navbar-brand {
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
    text-decoration: none;
    white-space: nowrap;
}
.navbar-nav {
    display: flex;
    list-style: none;
    gap: 1.5rem;
    align-items: center;
    margin: 0;
    padding: 0;
    margin-left: auto;
}
.navbar-nav li a {
    color: var(--text);
    text-decoration: none;
    font-size: 14px;
    padding: 4px 8px;
}
.dropdown {
    position: relative;
}
.dropdown-menu {
    margin-top: 18px;
    display: none;
    position: absolute;
    top: 100%;
    right: 0;
    margin: 0;
    padding: 8px 0;
    list-style: none;
    background: var(--card-bg);
    box-shadow: var(--shadow);
    border-radius: 8px;
    min-width: 140px;
    z-index: 1000;
    border: 1px solid var(--border);
}
.dropdown-menu.show {
    display: block;
}
.dropdown-menu li a {
    display: block;
    padding: 8px 16px;
    color: var(--text);
    text-decoration: none;
    font-size: 14px;
    white-space: nowrap;
}
.dropdown-menu li a:hover {
    background: var(--btn-bg);
}
.user-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--main) 0%, #764ba2 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    flex-shrink: 0;
}
.user-item {
    display: flex;
    align-items: center;
    gap: 8px;
}
.user-item a {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    color: var(--text);
    padding: 4px;
}
.user-name {
    font-size: 14px;
    color: var(--text);
    white-space: nowrap;
}
#mdi-apps {
    width: 22px;
    height: 22px;
    cursor: pointer;
    fill: var(--text);
}
.dropdown-btn {
    border: none;
    background: var(--btn-bg);
    padding: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
}
.dropdown-btn:hover {
    background: var(--main);
}
.dropdown-btn:hover #mdi-apps {
    fill: #fff;
}
`;
document.head.appendChild(style);

function getUserInfo() {
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
        try {
            return JSON.parse(userInfo);
        } catch (e) {
            return null;
        }
    }
    return null;
}

document.addEventListener('DOMContentLoaded', function() {
    const user = getUserInfo();
    const userName = user ? user.name || user.username || user.account || '用户' : '用户';
    const avatarText = userName.charAt(0).toUpperCase();

    document.getElementById("nav").innerHTML = `
        <nav class="navbar">
            <a href="../../index.html" class="navbar-brand">云枢</a>
            <ul class="navbar-nav">
                <li class="user-item">
                    <a href="../../service/User/User.html" title="${user ? '点击查看账户详情' : '点击登录'}">
                        <div class="user-avatar">${avatarText}</div>
                        <span class="user-name">${userName}</span>
                    </a>
                </li> 
                <li class="dropdown">
                    <button title="更多功能" class="dropdown-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" id="mdi-apps" viewBox="0 0 24 24"><path d="M16,20H20V16H16M16,14H20V10H16M10,8H14V4H10M16,8H20V4H16M10,14H14V10H10M4,14H8V10H4M4,20H8V16H4M10,20H14V16H10M4,8H8V4H4V8Z" /></svg>
                    </button>
                    <ul class="dropdown-menu" style="margin-top: 18px;">
                        <li><a href="../../service/Order/OrderBackend .html">订单管理</a></li>
                        <li><a href="../../service/Order/OrderService.html">订单服务</a></li>
                        <li><a href="../../service/bookkeeping/bookkeeping.html">记账管理</a></li>
                        <li><a href="../../service/PurchaseList/PurchaseList.html">采购管理</a></li>
                        <li><a href="../../service/User/User.html">用户管理</a></li>
                        <li><a href="../../service/transfer/transfer.html">文件传输</a></li>
                        <li><a href="../../service/InventoryManagement/InventoryManagement.html">库存管理</a></li>
                    </ul>
                </li>
            </ul>
        </nav>
    `;

    const dropdownBtn = document.querySelector('.dropdown-btn');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    
    dropdownBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });
    
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.dropdown')) {
            dropdownMenu.classList.remove('show');
        }
    });
});