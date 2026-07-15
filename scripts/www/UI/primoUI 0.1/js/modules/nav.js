// 切换侧边栏的显示/隐藏状态
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar.classList.contains('active')) {
        closeSidebar();
    } else {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }
}

// 关闭侧边栏
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.remove('active');
    overlay.classList.remove('active');
}

// 点击侧边栏外部区域时关闭侧边栏
document.addEventListener('click', function (event) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar.classList.contains('active') && !sidebar.contains(event.target) && !event.target.closest('.navbar button')) {
        closeSidebar();
    }
});