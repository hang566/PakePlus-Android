// Calendar.js - 日历组件

class Calendar {
  constructor(container) {
    this.container = container;
    this.currentDate = new Date();
    this.selectedDate = null;
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = [];
    const startDay = firstDay.getDay();
    
    for (let i = startDay - 1; i >= 0; i--) {
      const prevMonthDay = new Date(year, month, -i);
      days.push({
        date: prevMonthDay,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false
      });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const day = new Date(year, month, i);
      const isToday = day.getTime() === today.getTime();
      const isSelected = this.selectedDate && day.getTime() === this.selectedDate.getTime();
      
      days.push({
        date: day,
        isCurrentMonth: true,
        isToday: isToday,
        isSelected: isSelected
      });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonthDay = new Date(year, month + 1, i);
      days.push({
        date: nextMonthDay,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false
      });
    }

    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

    const html = `
      <div class="calendar">
        <div class="calendar-header">
          <div class="calendar-nav">
            <button class="calendar-prev">&lt;</button>
          </div>
          <div class="calendar-title">${year}年${month + 1}月</div>
          <div class="calendar-nav">
            <button class="calendar-next">&gt;</button>
          </div>
        </div>
        <div class="calendar-weekdays">
          ${weekdays.map(day => `<div class="calendar-weekday">${day}</div>`).join('')}
        </div>
        <div class="calendar-days">
          ${days.map((day, index) => {
            const isWeekend = index % 7 === 0 || index % 7 === 6;
            let classes = 'calendar-day';
            if (!day.isCurrentMonth) classes += ' other-month';
            if (day.isToday) classes += ' today';
            if (day.isSelected) classes += ' selected';
            if (isWeekend && day.isCurrentMonth) classes += ' weekend';
            return `<div class="${classes}" data-date="${day.date.toISOString()}">${day.date.getDate()}</div>`;
          }).join('')}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  }

  bindEvents() {
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('calendar-prev')) {
        this.previousMonth();
      } else if (e.target.classList.contains('calendar-next')) {
        this.nextMonth();
      } else if (e.target.classList.contains('calendar-day')) {
        const date = new Date(e.target.dataset.date);
        this.selectDate(date);
      }
    });
  }

  previousMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.render();
  }

  nextMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.render();
  }

  selectDate(date) {
    this.selectedDate = date;
    this.render();
    
    const event = new CustomEvent('calendarSelect', {
      detail: { date: this.selectedDate }
    });
    this.container.dispatchEvent(event);
  }

  getSelectedDate() {
    return this.selectedDate;
  }

  setDate(date) {
    this.currentDate = date;
    this.render();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const calendarContainer = document.getElementById('calendar');
  if (calendarContainer) {
    window.calendar = new Calendar(calendarContainer);
  }
});
