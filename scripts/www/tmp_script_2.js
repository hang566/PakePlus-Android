
        const originalSwitchTab = window.switchTab;
        function switchTab(tabId, event) {
            if (!event) {
                if (originalSwitchTab) originalSwitchTab(tabId);
                return;
            }

            const container = event.target.closest('.tabs-container');
            if (!container) {
                if (originalSwitchTab) originalSwitchTab(tabId, event);
                return;
            }

            container.querySelectorAll('.tabs-content .tab-pane').forEach(pane => pane.classList.remove('active'));
            container.querySelectorAll('.tabs-browser .tab-browser').forEach(tab => tab.classList.remove('active'));

            const targetPane = document.getElementById(tabId);
            if (targetPane) {
                targetPane.classList.add('active');
            }

            if (event.target) {
                event.target.classList.add('active');
            }

            if (tabId === 'tabGrid') {
                renderGrid();
            } else if (tabId === 'tabList') {
                renderTable();
            }
        }

        const STORAGE_TABLES = 'tables';

        let tables = [];
        let currentEditId = null;
        let currentDeleteAction = null;
        let currentDeleteParam = null;
        let deleteVerificationCode = '';

        function generateDeleteCode() {
            const pool = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            let code = '';
            for (let i = 0; i < 10; i++) {
                code += pool[Math.floor(Math.random() * pool.length)];
            }
            deleteVerificationCode = code;
            document.getElementById('deleteCodeDisplay').textContent = deleteVerificationCode;
        }

        function openDeleteModal(message, action, param) {
            currentDeleteAction = action;
            currentDeleteParam = param;
            document.getElementById('deleteMessage').textContent = message;
            document.getElementById('deletePassword').value = '';
            generateDeleteCode();
            document.getElementById('deleteModal').style.display = 'flex';
        }

        function closeDeleteModal() {
            document.getElementById('deleteModal').style.display = 'none';
            currentDeleteAction = null;
            currentDeleteParam = null;
        }

        function confirmDelete() {
            const input = document.getElementById('deletePassword').value.trim();
            if (!input) {
                alert('请输入验证码');
                return;
            }
            if (input !== deleteVerificationCode) {
                alert('验证码输入错误，请重新输入');
                document.getElementById('deletePassword').value = '';
                generateDeleteCode();
                return;
            }

            if (currentDeleteAction) {
                currentDeleteAction(currentDeleteParam);
            }
            closeDeleteModal();
        }

        let currentStatusFilter = 'all';
        let currentSearchText = '';
        let currentPage = 1;
        const pageSize = 10;

        function getTables() {
            const str = localStorage.getItem(STORAGE_TABLES);
            return str ? JSON.parse(str) : [];
        }

        function saveTables(list) {
            localStorage.setItem(STORAGE_TABLES, JSON.stringify(list));
        }

        function initData() {
            tables = getTables();
            if (tables.length === 0) {
                tables = [
                    { id: 'T001', number: 'A01', status: 'empty', desc: '靠窗双人桌', createDate: new Date().toISOString().split('T')[0] },
                    { id: 'T002', number: 'A02', status: 'empty', desc: '靠窗双人桌', createDate: new Date().toISOString().split('T')[0] },
                    { id: 'T003', number: 'B01', status: 'using', desc: '四人桌', createDate: new Date().toISOString().split('T')[0] },
                    { id: 'T004', number: 'B02', status: 'reserved', desc: '四人桌', createDate: new Date().toISOString().split('T')[0] },
                    { id: 'T005', number: 'C01', status: 'empty', desc: '六人圆桌', createDate: new Date().toISOString().split('T')[0] },
                    { id: 'T006', number: 'V01', status: 'empty', desc: 'VIP包厢', createDate: new Date().toISOString().split('T')[0] }
                ];
                saveTables(tables);
            }
        }

        function updateStats() {
            const totalTables = tables.length;
            const totalUsing = tables.filter(t => t.status === 'using').length;
            const totalReserved = tables.filter(t => t.status === 'reserved').length;
            const totalEmpty = tables.filter(t => t.status === 'empty').length;

            document.getElementById('statTotalTables').textContent = totalTables;
            document.getElementById('statTotalUsing').textContent = totalUsing;
            document.getElementById('statTotalReserved').textContent = totalReserved;
            document.getElementById('statTotalEmpty').textContent = totalEmpty;
            document.getElementById('statMonthTables').textContent = 0;
            document.getElementById('statMonthReserved').textContent = 0;
        }

        function refreshData() {
            tables = getTables();
        }

        function getStatusBadge(status) {
            const badges = {
                'empty': { class: 'status-empty', text: '空闲' },
                'using': { class: 'status-using', text: '使用中' },
                'reserved': { class: 'status-reserved', text: '已预约' }
            };
            const b = badges[status] || badges['empty'];
            return `<span class="status-badge ${b.class}">${b.text}</span>`;
        }

        function getStatusText(status) {
            const texts = {
                'empty': '空闲',
                'using': '使用中',
                'reserved': '已预约'
            };
            return texts[status] || '空闲';
        }

        function renderGrid() {
            const grid = document.getElementById('tableGrid');
            let filtered = tables;

            if (currentStatusFilter !== 'all') {
                filtered = filtered.filter(t => t.status === currentStatusFilter);
            }

            if (currentSearchText) {
                const search = currentSearchText.toLowerCase();
                filtered = filtered.filter(t =>
                    t.number.toLowerCase().includes(search) ||
                    (t.desc || '').toLowerCase().includes(search)
                );
            }

            if (filtered.length === 0) {
                grid.innerHTML = `<div class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3,3H21V7H3V3M4,8H20V21H4V8M9.5,11A0.5,0.5 0 0,0 9,11.5A0.5,0.5 0 0,0 9.5,12A0.5,0.5 0 0,0 10,11.5A0.5,0.5 0 0,0 9.5,11Z"/></svg><br>暂无桌台数据</div>`;
                return;
            }

            grid.innerHTML = filtered.map(table => `
                <div class="table-card">
                    <div class="table-number">${table.number}</div>
                    <div class="table-status">${getStatusBadge(table.status)}</div>
                    <div class="table-desc">${table.desc || '暂无介绍'}</div>
                    <div class="table-actions">
                        ${table.status === 'empty' ? `
                        <button class="btn-use" onclick="changeTableStatus('${table.id}', 'using')">使用</button>
                        <button class="btn-reserve" onclick="changeTableStatus('${table.id}', 'reserved')">预定</button>
                        ` : `
                        <button class="btn-release" onclick="changeTableStatus('${table.id}', 'empty')">释放</button>
                        `}
                        <button class="btn-edit" onclick="editTable('${table.id}')">编辑</button>
                        <button class="btn-delete" onclick="deleteTable('${table.id}')">删除</button>
                    </div>
                </div>
            `).join('');
        }

        function renderTable() {
            const tbody = document.getElementById('tablesTableBody');
            let filtered = tables;

            if (currentStatusFilter !== 'all') {
                filtered = filtered.filter(t => t.status === currentStatusFilter);
            }

            if (currentSearchText) {
                const search = currentSearchText.toLowerCase();
                filtered = filtered.filter(t =>
                    t.number.toLowerCase().includes(search) ||
                    (t.desc || '').toLowerCase().includes(search)
                );
            }

            const totalPages = Math.ceil(filtered.length / pageSize);
            currentPage = Math.min(currentPage, totalPages);
            currentPage = Math.max(currentPage, 1);

            const start = (currentPage - 1) * pageSize;
            const end = start + pageSize;
            const pageData = filtered.slice(start, end);

            if (pageData.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3,3H21V7H3V3M4,8H20V21H4V8M9.5,11A0.5,0.5 0 0,0 9,11.5A0.5,0.5 0 0,0 9.5,12A0.5,0.5 0 0,0 10,11.5A0.5,0.5 0 0,0 9.5,11Z"/></svg><br>暂无桌台数据</td></tr>`;
                document.getElementById('tablesPagination').innerHTML = '';
                return;
            }

            tbody.innerHTML = pageData.map(table => `
                <tr>
                    <td><input type="checkbox" class="table-checkbox" data-id="${table.id}"></td>
                    <td>${table.number}</td>
                    <td>${getStatusBadge(table.status)}</td>
                    <td>${table.desc || '-'}</td>
                    <td>${table.createDate || '-'}</td>
                    <td class="btn-group">
                        ${table.status === 'empty' ? `
                        <button class="btn-action btn-use" onclick="changeTableStatus('${table.id}', 'using')">使用</button>
                        <button class="btn-action btn-reserve" onclick="changeTableStatus('${table.id}', 'reserved')">预定</button>
                        ` : `
                        <button class="btn-action btn-release" onclick="changeTableStatus('${table.id}', 'empty')">释放</button>
                        `}
                        <button class="btn-action btn-edit" onclick="editTable('${table.id}')">编辑</button>
                        <button class="btn-action btn-delete" onclick="deleteTable('${table.id}')">删除</button>
                    </td>
                </tr>
            `).join('');

            renderPagination('tablesPagination', currentPage, totalPages);
        }

        function renderPagination(containerId, currentPage, totalPages) {
            if (totalPages <= 1) {
                document.getElementById(containerId).innerHTML = '';
                return;
            }

            let html = `<button onclick="currentPage=1;renderTable()" ${currentPage === 1 ? 'disabled' : ''}>首页</button>`;
            html += `<button onclick="currentPage--;renderTable()" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>`;

            for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
                if (i === currentPage) {
                    html += `<span style="font-weight: 600;">${i}</span>`;
                } else {
                    html += `<button onclick="currentPage=${i};renderTable()">${i}</button>`;
                }
            }

            html += `<button onclick="currentPage++;renderTable()" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>`;
            html += `<button onclick="currentPage=${totalPages};renderTable()" ${currentPage === totalPages ? 'disabled' : ''}>末页</button>`;

            document.getElementById(containerId).innerHTML = html;
        }

        function renderTables() {
            refreshData();
            currentSearchText = document.getElementById('searchInput').value;
            currentPage = 1;

            renderGrid();
            renderTable();
        }

        function setStatusFilter(status, btn) {
            currentStatusFilter = status;

            document.querySelectorAll('.filter-group .btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            renderTables();
        }

        function toggleSelectAll() {
            const checkbox = document.getElementById('selectAllTables');
            const checkboxes = document.querySelectorAll('.table-checkbox');
            checkboxes.forEach(cb => cb.checked = checkbox.checked);
        }

        function openAddTableModal() {
            currentEditId = null;
            document.getElementById('modalTitle').textContent = '添加桌台';
            document.getElementById('tableForm').reset();
            document.getElementById('modalOverlay').style.display = 'flex';
        }

        function closeModal() {
            document.getElementById('modalOverlay').style.display = 'none';
            currentEditId = null;
        }

        document.getElementById('tableForm').addEventListener('submit', function (e) {
            e.preventDefault();

            const number = document.getElementById('tableNumber').value;
            const status = document.getElementById('tableStatus').value;
            const desc = document.getElementById('tableDesc').value;

            if (currentEditId) {
                const table = tables.find(t => t.id === currentEditId);
                if (table) {
                    table.number = number;
                    table.status = status;
                    table.desc = desc;
                }
            } else {
                const newTable = {
                    id: 'T' + String(tables.length + 1).padStart(3, '0'),
                    number: number,
                    status: status,
                    desc: desc,
                    createDate: new Date().toISOString().split('T')[0]
                };
                tables.push(newTable);
            }

            saveTables(tables);
            updateStats();
            renderTables();
            closeModal();
        });

        function editTable(id) {
            const table = tables.find(t => t.id === id);
            if (!table) return;

            currentEditId = id;
            document.getElementById('modalTitle').textContent = '编辑桌台';
            document.getElementById('tableNumber').value = table.number;
            document.getElementById('tableStatus').value = table.status;
            document.getElementById('tableDesc').value = table.desc || '';
            document.getElementById('modalOverlay').style.display = 'flex';
        }

        function deleteTable(id) {
            const table = tables.find(t => t.id === id);
            const message = `确定要删除桌台「${table ? table.number : id}」吗？`;
            openDeleteModal(message, function () {
                tables = tables.filter(t => t.id !== id);
                saveTables(tables);
                updateStats();
                renderTables();
            }, id);
        }

        function deleteSelected() {
            const selectedTables = document.querySelectorAll('.table-checkbox:checked');
            if (selectedTables.length === 0) {
                alert('请先选择要删除的桌台');
                return;
            }

            const message = `确定要删除选中的 ${selectedTables.length} 个桌台吗？`;
            openDeleteModal(message, function () {
                const idsToDelete = Array.from(document.querySelectorAll('.table-checkbox:checked')).map(cb => cb.dataset.id);
                tables = tables.filter(t => !idsToDelete.includes(t.id));
                saveTables(tables);
                updateStats();
                renderTables();
            }, null);
        }

        function changeTableStatus(id, newStatus) {
            const table = tables.find(t => t.id === id);
            if (!table) return;

            table.status = newStatus;
            saveTables(tables);
            updateStats();
            renderTables();
        }

        function importJSON() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = function (e) {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function (event) {
                    try {
                        const data = JSON.parse(event.target.result);
                        if (data.tables) tables = [...tables, ...data.tables];

                        saveTables(tables);
                        updateStats();
                        renderTables();
                        alert('导入成功');
                    } catch (err) {
                        alert('导入失败：JSON格式错误');
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        }

        function importCSV() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv';
            input.onchange = function (e) {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function (event) {
                    try {
                        const lines = event.target.result.split('\n');
                        const headers = lines[0].split(',');

                        for (let i = 1; i < lines.length; i++) {
                            const values = lines[i].split(',');
                            if (values.length >= headers.length) {
                                const table = {};
                                headers.forEach((h, idx) => {
                                    table[h.trim()] = values[idx] ? values[idx].trim() : '';
                                });
                                if (table.number) {
                                    table.id = table.id || 'T' + String(tables.length + 1).padStart(3, '0');
                                    table.status = table.status || 'empty';
                                    table.createDate = table.createDate || new Date().toISOString().split('T')[0];
                                    tables.push(table);
                                }
                            }
                        }

                        saveTables(tables);
                        updateStats();
                        renderTables();
                        alert('导入成功');
                    } catch (err) {
                        alert('导入失败：CSV格式错误');
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        }

        function exportJSON() {
            const data = { tables };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '桌台数据_' + new Date().toISOString().split('T')[0] + '.json';
            a.click();
            URL.revokeObjectURL(url);
        }

        function exportCSV() {
            let csv = '桌台编号,状态,介绍,创建日期\n';
            tables.forEach(t => {
                csv += `${t.number},${getStatusText(t.status)},${t.desc || ''},${t.createDate || ''}\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '桌台数据_' + new Date().toISOString().split('T')[0] + '.csv';
            a.click();
            URL.revokeObjectURL(url);
        }

        function clearAllData() {
            const message = '确定要清空所有桌台数据吗？此操作不可恢复！';
            openDeleteModal(message, function () {
                tables = [];
                saveTables(tables);
                updateStats();
                renderTables();
            }, null);
        }

        document.addEventListener('DOMContentLoaded', function () {
            initData();
            updateStats();
            renderTables();
        });

        window.addEventListener('storage', function (e) {
            if (e.key === 'tables') {
                refreshData();
                updateStats();
                renderTables();
            }
        });

        document.getElementById('modalOverlay').addEventListener('click', function (e) {
            if (e.target === this) {
                closeModal();
            }
        });

        document.getElementById('deleteModal').addEventListener('click', function (e) {
            if (e.target === this) {
                closeDeleteModal();
            }
        });
    