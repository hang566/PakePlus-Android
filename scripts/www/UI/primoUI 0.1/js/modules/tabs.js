/**
 * ============================================================
 * tabs.js - 标签页组件功能
 * 
 * 定义浏览器风格标签页的切换功能
 * ============================================================ */

/**
 * 切换标签页
 * 隐藏所有标签内容面板，显示指定的标签内容
 * 
 * @param {string} tabId - 要激活的标签内容面板的ID
 */
function switchTab(tabId) {
  // 移除所有标签内容面板的active类（隐藏所有面板）
  document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
  
  // 移除所有标签的active类
  document.querySelectorAll('.tab-browser').forEach(tab => tab.classList.remove('active'));
  
  // 激活指定的标签内容面板
  document.getElementById(tabId).classList.add('active');
  
  // 激活点击的标签（通过event.target）
  event.target.classList.add('active');
}
