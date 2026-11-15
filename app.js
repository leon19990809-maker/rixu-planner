(() => {
  'use strict';

  const STORAGE_KEY = 'rixu-planner-v1';
  const APP_VERSION = 1;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const MAX_TASKS = 5000;

  const CATEGORIES = {
    life: {
      name: '生活',
      description: '日常、家务与自我照顾',
      icon: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 17h17M6.5 17a5.5 5.5 0 0 1 11 0" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 4.2v2M5.6 7.8l1.35 1.35M18.4 7.8l-1.35 1.35M3 13.2h1.5M19.5 13.2H21M9.2 20h5.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="m17.7 2.2.5 1.25 1.25.5-1.25.5-.5 1.25-.5-1.25-1.25-.5 1.25-.5.5-1.25Z" fill="currentColor"/></svg>`
    },
    sport: {
      name: '体育',
      description: '训练、运动与身体状态',
      icon: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13.4 2.7 5.6 13.1h5.2l-.9 8.2 7.9-10.6h-5.1l.7-8Z" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.6 4.2h2.7M20 2.8v2.8M3.1 17.4h2.5M4.35 16.15v2.5" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/></svg>`
    },
    study: {
      name: '学习',
      description: '课程、阅读与长期积累',
      icon: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.2 5.6A2.3 2.3 0 0 1 6.5 3.3H11v15.9H6.5a2.3 2.3 0 0 0-2.3 2.3V5.6Z" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M19.8 5.6a2.3 2.3 0 0 0-2.3-2.3H13v15.9h4.5a2.3 2.3 0 0 1 2.3 2.3V5.6Z" fill="currentColor" fill-opacity=".04" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="m17.8 3.1.45 1.15 1.15.45-1.15.45-.45 1.15-.45-1.15-1.15-.45 1.15-.45.45-1.15Z" fill="currentColor"/></svg>`
    }
  };

  // 2026 official mainland China holiday / make-up workday arrangement.
  // Source: State Council General Office notice (国办发明电〔2025〕7号).
  const FESTIVALS_2026 = {
    '2026-02-16': '除夕',
    '2026-03-03': '元宵节',
    '2026-08-19': '七夕节',
    '2026-10-18': '重阳节'
  };

  const HOLIDAY_PERIODS_2026 = [
    { start: '2026-01-01', end: '2026-01-03', name: '元旦', kind: 'holiday' },
    { start: '2026-01-04', end: '2026-01-04', name: '元旦调休', kind: 'workday' },
    { start: '2026-02-14', end: '2026-02-14', name: '春节调休', kind: 'workday' },
    { start: '2026-02-15', end: '2026-02-23', name: '春节', kind: 'holiday' },
    { start: '2026-02-28', end: '2026-02-28', name: '春节调休', kind: 'workday' },
    { start: '2026-04-04', end: '2026-04-06', name: '清明节', kind: 'holiday' },
    { start: '2026-05-01', end: '2026-05-05', name: '劳动节', kind: 'holiday' },
    { start: '2026-05-09', end: '2026-05-09', name: '劳动节调休', kind: 'workday' },
    { start: '2026-06-19', end: '2026-06-21', name: '端午节', kind: 'holiday' },
    { start: '2026-09-20', end: '2026-09-20', name: '国庆调休', kind: 'workday' },
    { start: '2026-09-25', end: '2026-09-27', name: '中秋节', kind: 'holiday' },
    { start: '2026-10-01', end: '2026-10-07', name: '国庆节', kind: 'holiday' },
    { start: '2026-10-10', end: '2026-10-10', name: '国庆调休', kind: 'workday' }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const elements = {
    brandHome: $('#brandHome'),
    homeMonthLabel: $('#homeMonthLabel'),
    homeMonthGrid: $('#homeMonthGrid'),
    homePrevMonth: $('#homePrevMonth'),
    homeNextMonth: $('#homeNextMonth'),
    goToday: $('#goToday'),
    planHeading: $('#planHeading'),
    planCount: $('#planCount'),
    categoryStack: $('#categoryStack'),
    addTask: $('#addTask'),
    taskDialog: $('#taskDialog'),
    taskForm: $('#taskForm'),
    taskId: $('#taskId'),
    taskTitle: $('#taskTitle'),
    taskDate: $('#taskDate'),
    taskTime: $('#taskTime'),
    taskNote: $('#taskNote'),
    taskFormKicker: $('#taskFormKicker'),
    taskFormTitle: $('#taskFormTitle'),
    deleteTask: $('#deleteTask'),
    openSettings: $('#openSettings'),
    settingsDialog: $('#settingsDialog'),
    exportData: $('#exportData'),
    importData: $('#importData'),
    clearData: $('#clearData'),
    installTipText: $('#installTipText'),
    toast: $('#toast')
  };

  let appData = loadData();
  let today = dateKey(new Date());
  let selectedDate = today;
  let homeMonth = startOfMonth(parseDateKey(selectedDate));
  let toastTimer = 0;

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function dateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseDateKey(key) {
    const [year, month, day] = String(key).split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function addDays(date, amount) {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
  }

  function startOfWeek(date) {
    const copy = new Date(date);
    copy.setHours(12, 0, 0, 0);
    const mondayOffset = (copy.getDay() + 6) % 7;
    copy.setDate(copy.getDate() - mondayOffset);
    return copy;
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
  }

  function isSameDay(a, b) {
    return dateKey(a) === dateKey(b);
  }

  function diffDays(fromKey, toKey) {
    const from = parseDateKey(fromKey);
    const to = parseDateKey(toKey);
    const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.round((toUtc - fromUtc) / DAY_MS);
  }

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function isValidDateKey(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
    const parsed = parseDateKey(value);
    return !Number.isNaN(parsed.getTime()) && dateKey(parsed) === value;
  }

  function buildHolidayStatus() {
    const status = {};
    HOLIDAY_PERIODS_2026.forEach(period => {
      let cursor = parseDateKey(period.start);
      const end = parseDateKey(period.end);
      while (cursor <= end) {
        status[dateKey(cursor)] = { name: period.name, kind: period.kind };
        cursor = addDays(cursor, 1);
      }
    });
    return status;
  }

  const holidayStatus = buildHolidayStatus();

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function uid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function cleanTask(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const category = ['life', 'sport', 'study'].includes(raw.category) ? raw.category : 'life';
    const date = isValidDateKey(raw.date) ? raw.date : today;
    const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, 80) : '';
    if (!title) return null;
    const time = typeof raw.time === 'string' && /^\d{2}:\d{2}$/.test(raw.time) ? raw.time : '';
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
      date,
      category,
      title,
      time,
      note: typeof raw.note === 'string' ? raw.note.trim().slice(0, 240) : '',
      done: Boolean(raw.done),
      createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now(),
      updatedAt: Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : Date.now()
    };
  }

  function normalizeData(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.tasks)) {
      throw new Error('备份文件格式不正确');
    }
    const seen = new Set();
    const tasks = raw.tasks
      .slice(0, MAX_TASKS)
      .map(cleanTask)
      .filter(Boolean)
      .filter(task => {
        if (seen.has(task.id)) return false;
        seen.add(task.id);
        return true;
      });
    return { version: APP_VERSION, tasks };
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { version: APP_VERSION, tasks: [] };
      return normalizeData(JSON.parse(raw));
    } catch (error) {
      console.warn('无法读取本地计划数据：', error);
      return { version: APP_VERSION, tasks: [] };
    }
  }

  function saveData({ quiet = false } = {}) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
      return true;
    } catch (error) {
      console.error('无法保存计划数据：', error);
      if (!quiet) showToast('保存失败，请检查浏览器存储权限');
      return false;
    }
  }

  function getTasksForDate(key) {
    return appData.tasks
      .filter(task => task.date === key)
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (a.time && b.time && a.time !== b.time) return a.time.localeCompare(b.time);
        if (a.time && !b.time) return -1;
        if (!a.time && b.time) return 1;
        return a.createdAt - b.createdAt;
      });
  }

  function weekdayName(date, style = 'long') {
    return new Intl.DateTimeFormat('zh-CN', { weekday: style }).format(date);
  }

  function friendlyDay(key) {
    const delta = diffDays(today, key);
    if (delta === 0) return '今天';
    if (delta === 1) return '明天';
    if (delta === 2) return '后天';
    if (delta === -1) return '昨天';
    return weekdayName(parseDateKey(key), 'short');
  }

  function formatSelectedDate(date) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function renderAll() {
    renderHomeCalendar();
    renderPlans();
  }

  function renderHomeCalendar() {
    const year = homeMonth.getFullYear();
    const month = homeMonth.getMonth();
    const firstDay = new Date(year, month, 1, 12);
    const gridStart = startOfWeek(firstDay);

    elements.homeMonthLabel.textContent = `${year}年${month + 1}月`;
    elements.homeMonthGrid.innerHTML = Array.from({ length: 42 }, (_, index) => {
      const date = addDays(gridStart, index);
      const key = dateKey(date);
      const tasks = getTasksForDate(key);
      const selected = key === selectedDate;
      const isToday = key === today;
      const outside = date.getMonth() !== month;
      const holiday = holidayStatus[key];
      const festival = FESTIVALS_2026[key];
      const classes = [
        'month-day',
        outside ? 'is-outside' : '',
        selected ? 'is-selected' : '',
        isToday ? 'is-today' : '',
        holiday ? `is-${holiday.kind}` : ''
      ].filter(Boolean).join(' ');
      const holidayMarkup = holiday
        ? `<span class="day-status ${holiday.kind}" title="${holiday.name}${holiday.kind === 'holiday' ? '放假' : '调休上班'}"><span>${holiday.name}</span><i>${holiday.kind === 'holiday' ? '休' : '班'}</i></span>`
        : festival
          ? `<span class="day-status festival" title="${festival}"><span>${festival}</span></span>`
          : '';
      const previewTasks = tasks.slice(0, 2);
      const remaining = tasks.length - previewTasks.length;
      const taskMarkup = previewTasks.map(task => `
        <button class="month-task-preview ${task.done ? 'is-done' : ''}" data-category="${task.category}" type="button" data-action="edit-day" data-id="${escapeHtml(task.id)}" title="${escapeHtml(task.title)}${task.time ? ` · ${task.time}` : ''}" aria-label="编辑计划：${escapeHtml(task.title)}">
          <i class="category-dot ${task.category}" aria-hidden="true"></i>
          <span>${escapeHtml(task.title)}</span>
        </button>
      `).join('');

      return `
        <article class="${classes}" data-date="${key}" aria-label="${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日${holiday ? `，${holiday.name}${holiday.kind === 'holiday' ? '放假' : '调休上班'}` : festival ? `，${festival}` : ''}，${tasks.length} 项计划">
          <div class="month-day-top">
            <button class="month-day-number" type="button" data-action="select-day" data-date="${key}" aria-label="选择 ${date.getMonth() + 1}月${date.getDate()}日" ${selected ? 'aria-current="date"' : ''}>
              ${date.getDate()}
            </button>
            <button class="month-quick-add" type="button" data-action="add-day" data-date="${key}" aria-label="给 ${date.getMonth() + 1}月${date.getDate()}日 添加计划">
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            </button>
          </div>
          ${holidayMarkup}
          <div class="month-task-list">
            ${taskMarkup}
            ${remaining > 0 ? `<button class="month-more" type="button" data-action="select-day" data-date="${key}">还有 ${remaining} 项</button>` : ''}
          </div>
        </article>
      `;
    }).join('');
  }

  function renderPlans() {
    const date = parseDateKey(selectedDate);
    const delta = diffDays(today, selectedDate);
    elements.planHeading.textContent = delta === 0 ? `今天 · ${formatSelectedDate(date)}` : formatSelectedDate(date);
    const allTasks = getTasksForDate(selectedDate);
    elements.planCount.textContent = `${allTasks.length} 项${allTasks.length ? ` · ${allTasks.filter(task => task.done).length} 项完成` : ''}`;

    elements.categoryStack.innerHTML = Object.entries(CATEGORIES).map(([category, meta]) => {
      const tasks = allTasks.filter(task => task.category === category);
      const done = tasks.filter(task => task.done).length;
      const summary = tasks.length ? `${done}/${tasks.length} 已完成` : (delta === 0 ? '今天留白，也很好' : '这天留白，也很好');
      const taskMarkup = tasks.length
        ? `<div class="task-list">${tasks.map(task => renderTask(task)).join('')}</div>`
        : `
          <div class="category-empty">
            <span>还没有安排</span>
            <button class="empty-add" type="button" data-action="add-category" data-category="${category}">＋ 写一项</button>
          </div>
        `;

      return `
        <section class="category-card" data-category="${category}" aria-labelledby="category-${category}">
          <div class="category-header">
            <span class="category-icon">${meta.icon}</span>
            <div class="category-title-wrap">
              <h3 class="category-title" id="category-${category}">${meta.name}</h3>
              <span class="category-summary">${summary}</span>
            </div>
            <button class="category-add" type="button" data-action="add-category" data-category="${category}" aria-label="添加${meta.name}计划">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
          ${taskMarkup}
        </section>
      `;
    }).join('');

    // Keep the displayed date accessible to assistive technology.
    elements.categoryStack.setAttribute('aria-label', `${formatSelectedDate(date)}的计划`);
  }

  function renderTask(task) {
    const timeMarkup = task.time
      ? `<span class="task-meta"><svg class="task-time-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.8V8l2 1.35" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>${task.time}</span>`
      : '';
    return `
      <div class="task-row ${task.done ? 'is-done' : ''}" data-task-id="${escapeHtml(task.id)}">
        <button class="task-check" type="button" data-action="toggle" data-id="${escapeHtml(task.id)}" aria-label="${task.done ? '标记为未完成' : '标记为已完成'}：${escapeHtml(task.title)}" aria-pressed="${task.done ? 'true' : 'false'}">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3.5 8.2 2.7 2.7 6.3-6.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="task-main">
          <button class="task-title" type="button" data-action="edit" data-id="${escapeHtml(task.id)}">${escapeHtml(task.title)}</button>
          ${task.note ? `<p class="task-note">${escapeHtml(task.note)}</p>` : ''}
          ${timeMarkup}
        </div>
      </div>
    `;
  }

  function selectDate(key, { scrollToPlans = false } = {}) {
    if (!isValidDateKey(key)) return;
    selectedDate = key;
    homeMonth = startOfMonth(parseDateKey(key));
    renderAll();
    if (scrollToPlans) {
      $('.plan-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function changeHomeMonth(amount) {
    const targetMonth = new Date(homeMonth.getFullYear(), homeMonth.getMonth() + amount, 1, 12);
    const currentDay = parseDateKey(selectedDate).getDate();
    const targetDay = Math.min(currentDay, daysInMonth(targetMonth.getFullYear(), targetMonth.getMonth()));
    selectedDate = dateKey(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), targetDay, 12));
    homeMonth = startOfMonth(targetMonth);
    renderAll();
  }

  function goToToday() {
    selectedDate = today;
    homeMonth = startOfMonth(parseDateKey(today));
    renderAll();
  }

  function openTaskForm({ task = null, category = 'life', date = selectedDate } = {}) {
    elements.taskForm.reset();
    elements.taskTitle.classList.remove('is-invalid');

    if (task) {
      elements.taskId.value = task.id;
      elements.taskTitle.value = task.title;
      elements.taskDate.value = task.date;
      elements.taskTime.value = task.time || '';
      elements.taskNote.value = task.note || '';
      const radio = elements.taskForm.querySelector(`input[name="category"][value="${task.category}"]`);
      if (radio) radio.checked = true;
      elements.taskFormKicker.textContent = 'EDIT PLAN';
      elements.taskFormTitle.textContent = '编辑计划';
      elements.deleteTask.classList.remove('is-hidden');
    } else {
      elements.taskId.value = '';
      elements.taskDate.value = date;
      const radio = elements.taskForm.querySelector(`input[name="category"][value="${category}"]`);
      if (radio) radio.checked = true;
      elements.taskFormKicker.textContent = 'NEW PLAN';
      elements.taskFormTitle.textContent = '添加计划';
      elements.deleteTask.classList.add('is-hidden');
    }

    openDialog(elements.taskDialog);
    window.setTimeout(() => elements.taskTitle.focus(), 120);
  }

  function openDialog(dialog) {
    if (dialog.open) return;
    dialog.showModal();
  }

  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
  }

  function submitTask(event) {
    event.preventDefault();
    const title = elements.taskTitle.value.trim();
    const date = elements.taskDate.value;
    const categoryInput = elements.taskForm.querySelector('input[name="category"]:checked');
    const category = categoryInput ? categoryInput.value : 'life';
    const time = elements.taskTime.value || '';
    const note = elements.taskNote.value.trim();
    const existingId = elements.taskId.value;

    if (!title) {
      elements.taskTitle.classList.add('is-invalid');
      elements.taskTitle.focus();
      showToast('先写下要做什么');
      return;
    }
    if (!isValidDateKey(date)) {
      showToast('请选择有效日期');
      return;
    }

    if (existingId) {
      const task = appData.tasks.find(item => item.id === existingId);
      if (!task) {
        showToast('这条计划已不存在');
        closeDialog(elements.taskDialog);
        return;
      }
      Object.assign(task, { title, date, category, time, note, updatedAt: Date.now() });
    } else {
      if (appData.tasks.length >= MAX_TASKS) {
        showToast('计划数量已达上限');
        return;
      }
      appData.tasks.push({
        id: uid(),
        title,
        date,
        category,
        time,
        note,
        done: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    saveData();
    closeDialog(elements.taskDialog);
    renderAll();
    showToast(existingId ? '计划已更新' : '计划已添加');
  }

  function toggleTask(id) {
    const task = appData.tasks.find(item => item.id === id);
    if (!task) return;
    task.done = !task.done;
    task.updatedAt = Date.now();
    saveData();
    renderAll();
    showToast(task.done ? '完成一项，继续保持' : '已恢复为待办');
  }

  function deleteCurrentTask() {
    const id = elements.taskId.value;
    const task = appData.tasks.find(item => item.id === id);
    if (!task) return;
    if (!window.confirm(`确定删除“${task.title}”吗？`)) return;
    appData.tasks = appData.tasks.filter(item => item.id !== id);
    saveData();
    closeDialog(elements.taskDialog);
    renderAll();
    showToast('计划已删除');
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove('is-visible');
    }, 2100);
  }

  function exportBackup() {
    const payload = {
      app: '日序',
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      tasks: appData.tasks
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `rixu-backup-${today}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('备份文件已导出');
  }

  async function importBackup(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const nextData = normalizeData(parsed);
      if (!window.confirm(`将导入 ${nextData.tasks.length} 项计划，并覆盖当前设备上的全部数据。要继续吗？`)) {
        elements.importData.value = '';
        return;
      }
      appData = nextData;
      saveData();
      selectedDate = today;
      renderAll();
      closeDialog(elements.settingsDialog);
      showToast(`已导入 ${appData.tasks.length} 项计划`);
    } catch (error) {
      console.error('导入失败：', error);
      showToast(error.message || '导入失败，请检查备份文件');
    } finally {
      elements.importData.value = '';
    }
  }

  function clearAllData() {
    if (!appData.tasks.length) {
      showToast('现在没有可清除的计划');
      return;
    }
    if (!window.confirm(`确定清除全部 ${appData.tasks.length} 项计划吗？此操作无法撤销，建议先导出备份。`)) return;
    appData = { version: APP_VERSION, tasks: [] };
    saveData();
    closeDialog(elements.settingsDialog);
    renderAll();
    showToast('全部计划已清除');
  }

  function updateInstallTip() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (standalone) {
      elements.installTipText.textContent = '你已经从主屏幕打开日序，可以像 App 一样每天使用。';
      return;
    }
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    elements.installTipText.textContent = isIOS
      ? '用 Safari 打开后，点击底部分享按钮，再选择“添加到主屏幕”。'
      : '在浏览器菜单中选择“添加到主屏幕”或“安装应用”，以后可一键打开。';
  }

  function refreshForNewDay() {
    const newToday = dateKey(new Date());
    if (newToday === today) return;
    const wasFollowingToday = selectedDate === today;
    today = newToday;
    if (wasFollowingToday) {
      selectedDate = today;
      homeMonth = startOfMonth(parseDateKey(today));
      showToast('新的一天，今天的计划已准备好');
    }
    renderAll();
  }

  // Month calendar: horizontal Monday–Sunday grid with plan previews in each day.
  elements.homeMonthGrid.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'select-day') {
      selectDate(target.dataset.date);
      return;
    }
    if (action === 'add-day') {
      selectDate(target.dataset.date);
      openTaskForm({ date: target.dataset.date });
      return;
    }
    if (action === 'edit-day') {
      const task = appData.tasks.find(item => item.id === target.dataset.id);
      if (task) openTaskForm({ task });
    }
  });

  elements.homePrevMonth.addEventListener('click', () => changeHomeMonth(-1));
  elements.homeNextMonth.addEventListener('click', () => changeHomeMonth(1));
  elements.goToday.addEventListener('click', goToToday);
  elements.brandHome.addEventListener('click', event => {
    event.preventDefault();
    goToToday();
  });

  // Plan interactions.
  elements.categoryStack.addEventListener('click', event => {
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) return;
    const action = actionTarget.dataset.action;
    if (action === 'toggle') {
      toggleTask(actionTarget.dataset.id);
      return;
    }
    if (action === 'edit') {
      const task = appData.tasks.find(item => item.id === actionTarget.dataset.id);
      if (task) openTaskForm({ task });
      return;
    }
    if (action === 'add-category') {
      openTaskForm({ category: actionTarget.dataset.category, date: selectedDate });
    }
  });

  elements.addTask.addEventListener('click', () => openTaskForm({ date: selectedDate }));
  elements.taskForm.addEventListener('submit', submitTask);
  elements.deleteTask.addEventListener('click', deleteCurrentTask);
  elements.taskTitle.addEventListener('input', () => elements.taskTitle.classList.remove('is-invalid'));

  // Dialog helpers.
  $$('[data-close]').forEach(button => {
    button.addEventListener('click', () => {
      const dialog = document.getElementById(button.dataset.close);
      if (dialog) closeDialog(dialog);
    });
  });

  [elements.taskDialog, elements.settingsDialog].forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeDialog(dialog);
    });
  });

  // Settings and backup.
  elements.openSettings.addEventListener('click', () => {
    updateInstallTip();
    openDialog(elements.settingsDialog);
  });
  elements.exportData.addEventListener('click', exportBackup);
  elements.importData.addEventListener('change', () => importBackup(elements.importData.files[0]));
  elements.clearData.addEventListener('click', clearAllData);

  // Midnight rollover and tab restore.
  window.setInterval(refreshForNewDay, 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshForNewDay();
  });
  window.addEventListener('pageshow', refreshForNewDay);

  renderAll();
  updateInstallTip();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(error => {
        console.warn('离线缓存注册失败：', error);
      });
    });
  }
})();
