/**
 * ============================================================
 * theme.js - 主题切换功能
 * 
 * 定义主题切换和持久化相关的JavaScript功能
 * 支持多种主题模式：浅色、深色、系统跟随、时间自动切换等
 * ============================================================ */

/**
 * 设置主题
 * 根据传入的主题名称设置页面主题，并持久化到localStorage
 * 
 * @param {string} theme - 主题名称
 *                         可选值: 'light' | 'dark' | 'system' | 'time' | 其他自定义主题名
 */
function setTheme(theme) {
  let targetTheme = '';
  
  // 根据主题参数确定目标主题类名
  if (theme === 'light') {
    // 浅色模式：移除所有主题类
    targetTheme = '';
  } else if (theme === 'system') {
    // 系统跟随：根据系统偏好设置选择主题
    targetTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-dark' : '';
  } else if (theme === 'time') {
    // 时间自动切换：晚上19点到早上7点使用深色模式
    const hour = new Date().getHours();
    targetTheme = (hour >= 19 || hour < 7) ? 'theme-dark' : '';
  } else {
    // 自定义主题：拼接主题类名前缀
    targetTheme = 'theme-' + theme;
  }
  
  // 应用主题到页面
  document.body.className = targetTheme;
  
  // 持久化主题设置到localStorage
  localStorage.setItem('primoUI_theme', theme);
}

/**
 * 重置主题
 * 清除localStorage中的主题设置，恢复到默认浅色主题
 */
function resetTheme() {
  localStorage.removeItem('primoUI_theme');
  document.body.className = 'theme-light';
}

/**
 * DOM加载完成后初始化主题
 * 从localStorage读取保存的主题设置，若无则使用默认浅色主题
 */
document.addEventListener('DOMContentLoaded', function() {
  const savedTheme = localStorage.getItem('primoUI_theme') || 'light';
  setTheme(savedTheme);
});
