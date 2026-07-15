/**
 * ============================================================
 * resizable.js - 可调整大小面板组件
 * 
 * 实现类似VS Code的可拖拽调整面板大小功能
 * 支持水平和垂直方向的面板分割
 * ============================================================ */

class ResizablePanel {
    constructor(options = {}) {
        this.options = Object.assign({
            container: 'body',
            panels: [],
            minWidth: 200,
            minHeight: 150,
            gutterSize: 4
        }, options);
        
        this.init();
    }

    init() {
        const container = document.querySelector(this.options.container);
        if (!container) return;

        this.createStyle();
        this.render(container);
        this.attachEvents();
    }

    createStyle() {
        const style = document.createElement('style');
        style.textContent = `
            .resizable-container {
                display: flex;
                height: calc(100vh - 60px);
                width: 100%;
                overflow: hidden;
                background: var(--bg);
            }

            .resizable-panel {
                display: flex;
                flex-direction: column;
                overflow: hidden;
                background: var(--card-bg);
                border-right: 1px solid var(--border);
            }

            .resizable-panel:last-child {
                border-right: none;
            }

            .panel-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: var(--btn-bg);
                border-bottom: 1px solid var(--border);
                cursor: pointer;
                user-select: none;
            }

            .panel-header:hover {
                background: var(--btn-hover, #e0e0e0);
            }

            .panel-title {
                font-size: 13px;
                font-weight: 600;
                color: var(--text);
            }

            .panel-actions {
                display: flex;
                gap: 4px;
            }

            .panel-action-btn {
                width: 20px;
                height: 20px;
                border: none;
                background: transparent;
                color: var(--text);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                font-size: 12px;
            }

            .panel-action-btn:hover {
                background: var(--border);
            }

            .panel-content {
                flex: 1;
                overflow: auto;
                padding: 8px;
            }

            .resizable-gutter {
                width: ${this.options.gutterSize}px;
                background: var(--border);
                cursor: col-resize;
                flex-shrink: 0;
                position: relative;
                transition: background 0.2s;
            }

            .resizable-gutter:hover,
            .resizable-gutter.dragging {
                background: var(--main);
            }

            .resizable-gutter::before {
                content: '';
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 6px;
                height: 100%;
            }

            .panel-collapsed {
                width: 40px !important;
                flex-shrink: 0;
            }

            .panel-collapsed .panel-header {
                writing-mode: vertical-rl;
                text-orientation: mixed;
                padding: 12px 4px;
                height: 100%;
            }

            .panel-collapsed .panel-title {
                font-size: 11px;
                white-space: nowrap;
            }

            .panel-collapsed .panel-actions {
                display: none;
            }

            .panel-collapsed + .resizable-gutter {
                display: none;
            }

            .panel-list {
                list-style: none;
                margin: 0;
                padding: 0;
            }

            .panel-list-item {
                padding: 6px 12px;
                color: var(--text);
                font-size: 13px;
                cursor: pointer;
                border-radius: 4px;
                margin-bottom: 2px;
            }

            .panel-list-item:hover {
                background: var(--btn-bg);
            }

            .panel-list-item.active {
                background: var(--main);
                color: white;
            }

            .editor-area {
                flex: 1;
                display: flex;
                flex-direction: column;
                background: var(--card-bg);
            }

            .editor-content {
                flex: 1;
                overflow: auto;
                padding: 16px;
                color: var(--text);
                background: var(--bg);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .placeholder-text {
                text-align: center;
                color: var(--text);
                opacity: 0.6;
            }

            .placeholder-text p {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
            }

            .placeholder-text .hint {
                font-size: 14px;
                margin-top: 8px;
                opacity: 0.5;
            }

            .property-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .property-item {
                display: flex;
                justify-content: space-between;
                padding: 6px 8px;
                border-radius: 4px;
            }

            .property-item:hover {
                background: var(--btn-bg);
            }

            .property-label {
                font-size: 12px;
                color: var(--text);
                opacity: 0.6;
            }

            .property-value {
                font-size: 12px;
                color: var(--text);
                font-weight: 500;
            }

            .empty-state {
                text-align: center;
                padding: 24px 16px;
                color: var(--text);
                opacity: 0.5;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }

            .empty-state p {
                margin: 0;
                font-size: 13px;
            }

            .empty-hint {
                font-size: 11px !important;
                margin-top: 4px !important;
                opacity: 0.6;
            }

            .open-folder-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 16px;
                background: var(--main);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                transition: background-color 0.2s;
            }

            .open-folder-btn:hover {
                background: var(--main-hover);
            }

            .btn-icon {
                font-size: 16px;
            }

            .btn-text {
                font-weight: 500;
            }

            .welcome-page {
                max-width: 800px;
                width: 100%;
                padding: 48px;
                color: var(--text);
            }

            .welcome-header {
                text-align: center;
                margin-bottom: 48px;
            }

            .welcome-header h1 {
                margin: 0;
                font-size: 48px;
                font-weight: 300;
                letter-spacing: -0.5px;
                opacity: 0.9;
            }

            .welcome-subtitle {
                margin: 8px 0 0;
                font-size: 14px;
                opacity: 0.5;
            }

            .welcome-section {
                margin-bottom: 32px;
            }

            .welcome-section h2 {
                margin: 0 0 12px;
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0.5px;
                opacity: 0.6;
                text-transform: uppercase;
            }

            .action-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-width: 300px;
            }

            .action-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 16px;
                background: transparent;
                border: 1px solid var(--border);
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                color: var(--text);
                transition: all 0.2s;
                text-align: left;
            }

            .action-item:hover {
                background: var(--btn-bg);
                border-color: var(--main);
            }

            .action-item.primary {
                background: var(--main);
                border-color: var(--main);
                color: white;
            }

            .action-item.primary:hover {
                background: var(--main-hover);
                border-color: var(--main-hover);
            }

            .action-icon {
                font-size: 16px;
            }

            .action-text {
                font-weight: 500;
            }

            .recent-list {
                display: flex;
                flex-direction: column;
                gap: 4px;
                max-width: 400px;
            }

            .recent-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s;
            }

            .recent-item:hover {
                background: var(--btn-bg);
            }

            .recent-icon {
                font-size: 14px;
            }

            .recent-info {
                display: flex;
                flex-direction: column;
                flex: 1;
                min-width: 0;
            }

            .recent-name {
                font-size: 13px;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .recent-path {
                font-size: 11px;
                opacity: 0.5;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-top: 2px;
            }
        `;
        document.head.appendChild(style);
    }

    render(container) {
        container.innerHTML = `
            <div class="resizable-container">
                <!-- 左侧面板 -->
                <div class="resizable-panel" id="panel-explorer" style="width: 250px;">
                    <div class="panel-header">
                        <span class="panel-title">资源管理器</span>
                        <div class="panel-actions">
                            <button class="panel-action-btn" title="新建文件">+</button>
                            <button class="panel-action-btn collapse-btn" title="折叠">›</button>
                        </div>
                    </div>
                    <div class="panel-content">
                        <div class="empty-state">
                            <button class="open-folder-btn">
                                <span class="btn-icon">📂</span>
                                <span class="btn-text">打开文件夹</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 左侧分割线 -->
                <div class="resizable-gutter" data-gutter="left"></div>

                <!-- 中间编辑区域 -->
                <div class="editor-area">
                    <div class="editor-content">
                        <div class="welcome-page">
                            <div class="welcome-header">
                                <h1>帧写</h1>
                                <p class="welcome-subtitle">编辑进化</p>
                            </div>
                            
                            <div class="welcome-section">
                                <h2>启动</h2>
                                <div class="action-list">
                                    <button class="action-item">
                                        <span class="action-icon">📄</span>
                                        <span class="action-text">新建文件...</span>
                                    </button>
                                    <button class="action-item">
                                        <span class="action-icon">📁</span>
                                        <span class="action-text">打开文件...</span>
                                    </button>
                                    <button class="action-item primary">
                                        <span class="action-icon">📂</span>
                                        <span class="action-text">打开文件夹...</span>
                                    </button>
                                </div>
                            </div>

                            <div class="welcome-section">
                                <h2>最近</h2>
                                <div class="recent-list">
                                    <div class="recent-item">
                                        <span class="recent-icon">📁</span>
                                        <div class="recent-info">
                                            <span class="recent-name">my-project</span>
                                            <span class="recent-path">F:\projects\my-project</span>
                                        </div>
                                    </div>
                                    <div class="recent-item">
                                        <span class="recent-icon">📁</span>
                                        <div class="recent-info">
                                            <span class="recent-name">demo-app</span>
                                            <span class="recent-path">F:\projects\demo-app</span>
                                        </div>
                                    </div>
                                    <div class="recent-item">
                                        <span class="recent-icon">📄</span>
                                        <div class="recent-info">
                                            <span class="recent-name">index.html</span>
                                            <span class="recent-path">F:\projects\test\index.html</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 右侧分割线 -->
                <div class="resizable-gutter" data-gutter="right"></div>

                <!-- 右侧面板 -->
                <div class="resizable-panel" id="panel-output" style="width: 300px;">
                    <div class="panel-header">
                        <span class="panel-title">属性面板</span>
                        <div class="panel-actions">
                            <button class="panel-action-btn collapse-btn" title="折叠">‹</button>
                        </div>
                    </div>
                    <div class="panel-content">
                        <div class="empty-state">
                            <p>未选择文件</p>
                            <p class="empty-hint">在资源管理器中选择文件</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    attachEvents() {
        // 绑定分割线拖拽事件
        const gutters = document.querySelectorAll('.resizable-gutter');
        gutters.forEach(gutter => {
            gutter.addEventListener('mousedown', this.startDrag.bind(this));
        });

        // 绑定面板折叠按钮
        const collapseButtons = document.querySelectorAll('.collapse-btn');
        collapseButtons.forEach(btn => {
            btn.addEventListener('click', this.toggleCollapse.bind(this));
        });

        // 绑定新建文件按钮
        const addButton = document.querySelector('.panel-actions .panel-action-btn:not(.collapse-btn)');
        if (addButton) {
            addButton.addEventListener('click', this.createNewFile.bind(this));
        }

        // 绑定打开文件夹按钮（左侧面板）
        const openFolderBtn = document.querySelector('.open-folder-btn');
        if (openFolderBtn) {
            openFolderBtn.addEventListener('click', this.handleOpenFolder.bind(this));
        }

        // 绑定欢迎页面按钮
        const actionItems = document.querySelectorAll('.action-item');
        actionItems.forEach(item => {
            item.addEventListener('click', this.handleWelcomeAction.bind(this));
        });

        // 绑定最近项目列表点击
        const recentItems = document.querySelectorAll('.recent-item');
        recentItems.forEach(item => {
            item.addEventListener('click', this.handleRecentClick.bind(this));
        });
    }

    handleOpenFolder() {
        alert('打开文件夹功能 - 可以通过原生文件选择器实现');
        // 在实际应用中，这里可以使用 input[type="file"] webkitdirectory 来选择文件夹
    }

    handleWelcomeAction(e) {
        const actionText = e.currentTarget.querySelector('.action-text').textContent;
        if (actionText.includes('新建文件')) {
            this.createNewFile();
        } else if (actionText.includes('打开文件')) {
            alert('打开文件功能');
        } else if (actionText.includes('打开文件夹')) {
            this.handleOpenFolder();
        }
    }

    handleRecentClick(e) {
        const recentName = e.currentTarget.querySelector('.recent-name').textContent;
        alert(`打开最近项目: ${recentName}`);
    }

    createNewFile() {
        const panelContent = document.querySelector('#panel-explorer .panel-content');
        const fileName = prompt('请输入新文件名:', 'untitled.html');
        
        if (fileName && fileName.trim()) {
            // 如果是空状态，移除空状态提示
            const emptyState = panelContent.querySelector('.empty-state');
            if (emptyState) {
                emptyState.remove();
            }

            // 创建列表
            let panelList = panelContent.querySelector('.panel-list');
            if (!panelList) {
                panelList = document.createElement('ul');
                panelList.className = 'panel-list';
                panelContent.appendChild(panelList);
            }

            // 创建新文件项
            const listItem = document.createElement('li');
            listItem.className = 'panel-list-item';
            listItem.textContent = fileName.trim();
            panelList.appendChild(listItem);

            // 绑定点击事件
            listItem.addEventListener('click', () => {
                document.querySelectorAll('.panel-list-item').forEach(item => {
                    item.classList.remove('active');
                });
                listItem.classList.add('active');
                
                // 更新属性面板
                this.updatePropertyPanel(fileName.trim());
            });

            // 自动选中新文件
            listItem.click();
        }
    }

    updatePropertyPanel(fileName) {
        const propertyPanel = document.querySelector('#panel-output .panel-content');
        const ext = fileName.split('.').pop().toLowerCase();
        
        // 简单的文件大小估算
        const fileSize = Math.floor(Math.random() * 10 + 1) + ' KB';
        
        propertyPanel.innerHTML = `
            <div class="property-list">
                <div class="property-item">
                    <span class="property-label">名称</span>
                    <span class="property-value">${fileName}</span>
                </div>
                <div class="property-item">
                    <span class="property-label">类型</span>
                    <span class="property-value">${ext.toUpperCase()}</span>
                </div>
                <div class="property-item">
                    <span class="property-label">大小</span>
                    <span class="property-value">${fileSize}</span>
                </div>
            </div>
        `;
    }

    startDrag(e) {
        const gutter = e.target;
        const container = gutter.parentElement;
        const panels = container.querySelectorAll('.resizable-panel');
        const gutterType = gutter.dataset.gutter;
        
        const containerRect = container.getBoundingClientRect();
        const startX = e.clientX;

        gutter.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        if (gutterType === 'left') {
            // 左侧分割线：调整左侧面板宽度
            const leftPanel = panels[0];
            const startLeftWidth = leftPanel.offsetWidth;

            const onMouseMove = (e) => {
                const deltaX = e.clientX - startX;
                let newLeftWidth = startLeftWidth + deltaX;

                if (newLeftWidth < this.options.minWidth) {
                    newLeftWidth = this.options.minWidth;
                }

                const maxLeftWidth = containerRect.width - this.options.minWidth * 2 - this.options.gutterSize * 2;
                if (newLeftWidth > maxLeftWidth) {
                    newLeftWidth = maxLeftWidth;
                }

                leftPanel.style.width = `${newLeftWidth}px`;
            };

            const onMouseUp = () => {
                gutter.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        } else {
            // 右侧分割线：调整右侧面板宽度（方向相反）
            const rightPanel = panels[1];  // 修复：中间是.editor-area，不是.resizable-panel，所以右侧面板是panels[1]
            const startRightWidth = rightPanel.offsetWidth;

            const onMouseMove = (e) => {
                const deltaX = e.clientX - startX;
                // 右侧分割线：向左拖动增加右侧宽度，向右拖动减小右侧宽度
                let newRightWidth = startRightWidth - deltaX;

                if (newRightWidth < this.options.minWidth) {
                    newRightWidth = this.options.minWidth;
                }

                const maxRightWidth = containerRect.width - this.options.minWidth * 2 - this.options.gutterSize * 2;
                if (newRightWidth > maxRightWidth) {
                    newRightWidth = maxRightWidth;
                }

                rightPanel.style.width = `${newRightWidth}px`;
            };

            const onMouseUp = () => {
                gutter.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }
    }

    toggleCollapse(e) {
        const btn = e.target;
        const panel = btn.closest('.resizable-panel');
        const isCollapsed = panel.classList.contains('panel-collapsed');
        
        if (isCollapsed) {
            panel.classList.remove('panel-collapsed');
            panel.style.width = panel.dataset.originalWidth || '250px';
            btn.textContent = btn.textContent === '‹' ? '›' : '‹';
        } else {
            panel.dataset.originalWidth = panel.style.width;
            panel.classList.add('panel-collapsed');
            btn.textContent = btn.textContent === '›' ? '‹' : '›';
        }
    }
}

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    new ResizablePanel({
        container: '#editor-container',
        minWidth: 150,
        gutterSize: 4
    });
});

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResizablePanel;
}