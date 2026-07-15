/**
 * ============================================================
 * feedback.js - 反馈类组件功能
 * 
 * 定义用户交互反馈相关的JavaScript功能
 * 包括：Toast消息提示、确认弹窗、浏览器通知等
 * ============================================================ */

/**
 * 显示Toast消息提示
 * 在页面底部居中位置显示一条临时消息，2秒后自动消失
 */
function showToast() {
  // 创建Toast元素
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = '这是一条消息提示';
  document.body.appendChild(toast);
  
  // 2秒后自动移除Toast
  setTimeout(() => toast.remove(), 2000);
}

/**
 * 显示确认弹窗
 * 使用原生alert显示确认提示
 */
function showPopconfirm() {
  alert('确认执行此操作？');
}

/**
 * 显示浏览器通知
 * 检查浏览器通知权限并显示桌面通知
 * 如果未授权则请求权限
 */
function showNotification() {
  // 检查浏览器是否支持通知API且已授权
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('通知标题', { body: '这是一条通知内容' });
  } 
  // 如果未授权且未拒绝，则请求权限
  else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification('通知标题', { body: '这是一条通知内容' });
      }
    });
  }
}
