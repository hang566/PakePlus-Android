function setTheme(theme) {
  let targetTheme = '';
  if (theme === 'light') {
    targetTheme = '';
  } else if (theme === 'system') {
    targetTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'theme-dark' : '';
  } else if (theme === 'time') {
    const hour = new Date().getHours();
    targetTheme = (hour >= 19 || hour < 7) ? 'theme-light' : '';
  } else {
    targetTheme = 'theme-' + theme;
  }
  document.body.className = targetTheme;
  localStorage.setItem('primoUI_theme', theme);
}

function resetTheme() {
  localStorage.removeItem('primoUI_theme');
  document.body.className = 'theme-light';
}

document.addEventListener('DOMContentLoaded', function() {
  const savedTheme = localStorage.getItem('primoUI_theme') || 'light';
  setTheme(savedTheme);
});

function switchTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
  document.querySelectorAll('.tab-browser').forEach(tab => tab.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  event.target.classList.add('active');
}

function openModal() {
  document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

function showToast() {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = '这是一条消息提示';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function showPopconfirm() {
  alert('确认执行此操作？');
}

function showNotification() {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('通知标题', { body: '这是一条通知内容' });
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification('通知标题', { body: '这是一条通知内容' });
      }
    });
  }
}
