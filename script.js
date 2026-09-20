// ================= STARLIGHT TODOLIST =================

const STORAGE_KEY = 'starlight_tasks';
let tasks = loadTasks();
let currentFilter = 'all';
let currentCatFilter = 'all';
let calendarDate = new Date();
let selectedDate = formatDate(new Date());

// ---------- Storage ----------
function loadTasks(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    let loaded = raw ? JSON.parse(raw) : [];
    // Migrate old task shape (priority easy/medium/hard, boolean done, no category/status)
    const priorityMap = { easy:'low', medium:'medium', hard:'high' };
    loaded = loaded.map(t => {
      let priority = t.priority;
      if(priority && priorityMap[priority]) priority = priorityMap[priority];
      if(!['high','medium','low'].includes(priority)) priority = 'medium';
      let category = t.category;
      if(!['personal','work','college'].includes(category)) category = 'personal';
      let status = t.status;
      if(!['todo','inprogress','done'].includes(status)){
        status = t.done ? 'done' : 'todo';
      }
      return {
        id: t.id || uid(),
        title: t.title,
        date: t.date,
        priority,
        category,
        status,
        done: status === 'done',
        pomodoros: t.pomodoros || 0,
        order: typeof t.order === 'number' ? t.order : 9999,
        notified: t.notified || false
      };
    });
    loaded.sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
    loaded.forEach((t,i) => t.order = i);
    return loaded;
  }catch(e){
    return [];
  }
}
function saveTasks(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ---------- Helpers ----------
function formatDate(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function formatDateReadable(dateStr){
  const [y,m,d] = dateStr.split('-').map(Number);
  const date = new Date(y, m-1, d);
  return date.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}
function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

const categoryLabel = { personal:'Pribadi', work:'Kerja', college:'Kuliah/Project' };
const priorityLabel = { high:'High', medium:'Medium', low:'Low' };

// ================= NAVBAR =================
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    playSwooshSound();
  });
});

// Highlight active nav link based on scroll position
const sections = ['home','menu','board','pomodoro','progress','pricing','about']
  .map(id => document.getElementById(id))
  .filter(Boolean);
window.addEventListener('scroll', () => {
  let currentId = 'home';
  sections.forEach(sec => {
    const rect = sec.getBoundingClientRect();
    if(rect.top <= 120) currentId = sec.id;
  });
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.section === currentId);
  });
});

// ================= TODO LIST =================
const todoForm = document.getElementById('todoForm');
const todoInput = document.getElementById('todoInput');
const todoDate = document.getElementById('todoDate');
const todoCategory = document.getElementById('todoCategory');
const todoPriority = document.getElementById('todoPriority');
const todoList = document.getElementById('todoList');
const todoEmpty = document.getElementById('todoEmpty');
const filterBtns = document.querySelectorAll('.filter-btn[data-filter]');
const catBtns = document.querySelectorAll('.cat-btn[data-cat]');

// Default date input to today
todoDate.value = formatDate(new Date());

todoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = todoInput.value.trim();
  const date = todoDate.value;
  const category = todoCategory.value;
  const priority = todoPriority.value;
  if(!title || !date || !category || !priority) return;

  if(!isPro() && tasks.length >= FREE_TASK_LIMIT){
    showPromoMsg(`Batas ${FREE_TASK_LIMIT} tugas untuk paket Gratis sudah tercapai. Upgrade ke Pro untuk tugas tanpa batas!`, 'err', true);
    document.getElementById('pricing').scrollIntoView({ behavior:'smooth' });
    return;
  }

  tasks.push({
    id: uid(),
    title,
    date,
    category,
    priority,
    status: 'todo',
    done: false,
    pomodoros: 0,
    order: tasks.length,
    notified: false
  });
  saveTasks();
  todoForm.reset();
  todoDate.value = formatDate(new Date());
  renderAll();
});

// ---------- Search ----------
let searchTerm = '';
const todoSearchInput = document.getElementById('todoSearch');
if(todoSearchInput){
  todoSearchInput.addEventListener('input', () => {
    searchTerm = todoSearchInput.value.trim().toLowerCase();
    renderTodoList();
  });
}

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    playSwooshSound();
    renderTodoList(true);
  });
});

catBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    catBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCatFilter = btn.dataset.cat;
    playSwooshSound();
    renderTodoList(true);
  });
});

// ---------- Celebration confetti burst ----------
const CONFETTI_COLORS = ['#8a9a86','#c99a3e','#b5533f','#6f88a6','#f4f1ea','#ab8a3d'];
function burstConfetti(x, y){
  if(typeof anime === 'undefined') return;
  const count = 14;
  for(let i = 0; i < count; i++){
    const el = document.createElement('div');
    const isStar = i % 3 === 0;
    el.className = 'confetti-particle' + (isStar ? ' is-star' : '');
    if(isStar){
      el.textContent = '✦';
      el.style.color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    }else{
      el.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      el.style.borderRadius = (i % 2 === 0) ? '50%' : '2px';
    }
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);

    const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.6 - 0.3);
    const dist = 40 + Math.random() * 55;
    anime({
      targets: el,
      translateX: Math.cos(angle) * dist,
      translateY: Math.sin(angle) * dist - 10,
      rotate: (Math.random() * 360) - 180,
      opacity: [1, 0],
      scale: [1, 0.4],
      duration: 650 + Math.random() * 300,
      easing: 'easeOutCubic',
      complete: () => el.remove()
    });
  }
}

// ---------- Animated counter (smooth counting) ----------
function animateCounter(el, toValue, suffix){
  if(!el || typeof anime === 'undefined'){
    if(el) el.textContent = toValue + (suffix || '');
    return;
  }
  const from = parseFloat(el.textContent) || 0;
  const obj = { val: from };
  anime({
    targets: obj,
    val: toValue,
    round: 1,
    duration: 700,
    easing: 'easeOutCubic',
    update: () => { el.textContent = Math.round(obj.val) + (suffix || ''); }
  });
}

// ---------- Strikethrough-then-fade animation on completion ----------
function animateCompleteAndSettle(li, onDone){
  const titleEl = li.querySelector('.todo-title');
  if(!titleEl || typeof anime === 'undefined'){ onDone(); return; }
  titleEl.classList.add('done');
  const line = document.createElement('span');
  line.className = 'strike-line';
  titleEl.appendChild(line);

  const tl = anime.timeline({ easing: 'easeInOutQuad' });
  tl.add({
    targets: line,
    width: ['0%', '100%'],
    duration: 380
  }).add({
    targets: titleEl,
    color: '#565e69',
    opacity: [1, 0.68],
    duration: 420
  }, '-=80');
  tl.finished.then(onDone).catch(onDone);
}

// ---------- Slide & collapse-out animation on delete ----------
function animateRemoveItem(li, onDone){
  if(!li || typeof anime === 'undefined'){ onDone(); return; }
  const height = li.getBoundingClientRect().height;
  li.style.height = height + 'px';
  anime({
    targets: li,
    opacity: [1, 0],
    translateX: [0, 70],
    height: [height, 0],
    paddingTop: [12, 0],
    paddingBottom: [12, 0],
    marginBottom: [0, 0],
    duration: 380,
    easing: 'easeInOutQuad',
    complete: onDone
  });
}

let todoSortable = null;
function initTodoSortable(){
  if(typeof Sortable === 'undefined' || todoSortable) return;
  todoSortable = Sortable.create(todoList, {
    animation: 180,
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    onEnd: (evt) => {
      const item = evt.item;
      const idsInOrder = [...todoList.querySelectorAll('.todo-item')].map(li => li.dataset.id);
      const visibleSet = new Set(idsInOrder);
      const fullOrdered = [...tasks].sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
      const merged = [];
      let insertedVisible = false;
      fullOrdered.forEach(t => {
        if(visibleSet.has(t.id)){
          if(!insertedVisible){
            idsInOrder.forEach(id => {
              const task = tasks.find(x => x.id === id);
              if(task) merged.push(task);
            });
            insertedVisible = true;
          }
        }else{
          merged.push(t);
        }
      });
      merged.forEach((t, i) => { t.order = i; });
      saveTasks();
      if(typeof anime !== 'undefined'){
        anime({ targets: item, scale: [1.05, 1], duration: 320, easing: 'easeOutElastic(1, .6)' });
      }
    }
  });
}

function renderTodoList(animateEntrance){
  todoList.innerHTML = '';

  let visibleTasks = [...tasks].sort((a,b) => (a.order ?? 0) - (b.order ?? 0) || a.date.localeCompare(b.date));
  if(currentFilter === 'active') visibleTasks = visibleTasks.filter(t => !t.done);
  if(currentFilter === 'done') visibleTasks = visibleTasks.filter(t => t.done);
  if(currentCatFilter !== 'all') visibleTasks = visibleTasks.filter(t => t.category === currentCatFilter);
  if(searchTerm) visibleTasks = visibleTasks.filter(t => t.title.toLowerCase().includes(searchTerm));

  todoEmpty.style.display = visibleTasks.length === 0 ? 'block' : 'none';

  visibleTasks.forEach(task => {
    const priority = task.priority || 'medium';
    const category = task.category || 'personal';
    const li = document.createElement('li');
    li.className = `todo-item cat-${category}`;
    li.dataset.id = task.id;
    li.innerHTML = `
      <div class="todo-check ${task.done ? 'checked' : ''}" data-id="${task.id}"></div>
      <div class="todo-text-wrap">
        <div class="todo-title ${task.done ? 'done' : ''}">${escapeHtml(task.title)}</div>
        <div class="todo-meta">
          <span class="todo-date-tag">${formatDateReadable(task.date)}</span>
          <span class="category-tag ${category}">${categoryLabel[category]}</span>
          <span class="priority-tag ${priority}">${priorityLabel[priority]}</span>
        </div>
      </div>
      <button class="todo-del" data-id="${task.id}" aria-label="Hapus tugas">✕</button>
    `;
    todoList.appendChild(li);
  });

  // Bind check + delete events
  document.querySelectorAll('.todo-check').forEach(el => {
    el.addEventListener('click', () => toggleTask(el.dataset.id));
  });
  document.querySelectorAll('.todo-del').forEach(el => {
    el.addEventListener('click', () => deleteTask(el.dataset.id));
  });

  // Drag & drop reordering (SortableJS)
  initTodoSortable();

  // Entrance animation: staggered elastic pop on first load / filter change,
  // lighter fade+scale on every other re-render.
  const items = todoList.querySelectorAll('.todo-item');
  if(typeof anime !== 'undefined' && items.length){
    if(animateEntrance){
      anime({
        targets: items,
        translateY: [22, 0],
        opacity: [0, 1],
        scale: [0.9, 1],
        delay: anime.stagger(55),
        duration: 650,
        easing: 'easeOutElastic(1, .65)'
      });
    }else{
      anime({
        targets: items,
        translateY: [10, 0],
        opacity: [0, 1],
        scale: [0.96, 1],
        delay: anime.stagger(30),
        duration: 320,
        easing: 'easeOutQuad'
      });
    }
  }
}

function toggleTask(id){
  const task = tasks.find(t => t.id === id);
  if(!task) return;
  const li = todoList.querySelector(`.todo-item[data-id="${id}"]`);
  const willBeDone = !task.done;

  if(willBeDone && li){
    // Celebration: confetti + animated strikethrough + fade, then commit state
    const checkEl = li.querySelector('.todo-check');
    if(checkEl){
      checkEl.classList.add('checked');
      const rect = checkEl.getBoundingClientRect();
      burstConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
    playPopSound();
    animateCompleteAndSettle(li, () => {
      task.done = true;
      task.status = 'done';
      saveTasks();
      renderAll();
    });
    return;
  }

  task.done = willBeDone;
  task.status = willBeDone ? 'done' : 'todo';
  saveTasks();
  renderAll();
}

function deleteTask(id){
  const li = todoList.querySelector(`.todo-item[data-id="${id}"]`);
  if(li){
    animateRemoveItem(li, () => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      renderAll();
    });
    return;
  }
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderAll();
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ================= CALENDAR =================
const calendarTitle = document.getElementById('calendarTitle');
const calendarGrid = document.getElementById('calendarGrid');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const calDetailDate = document.getElementById('calDetailDate');
const calDetailList = document.getElementById('calDetailList');

const monthNames = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
];

prevMonthBtn.addEventListener('click', () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});
nextMonthBtn.addEventListener('click', () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});

function renderCalendar(){
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  calendarTitle.textContent = `${monthNames[month]} ${year}`;
  calendarGrid.innerHTML = '';

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = formatDate(new Date());

  // Tasks grouped by date for quick lookup
  const taskDates = new Set(tasks.map(t => t.date));

  // Empty leading cells
  for(let i = 0; i < firstDay; i++){
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    calendarGrid.appendChild(empty);
  }

  for(let d = 1; d <= daysInMonth; d++){
    const dateObj = new Date(year, month, d);
    const dateStr = formatDate(dateObj);

    const cell = document.createElement('div');
    cell.className = 'cal-day';
    if(dateStr === todayStr) cell.classList.add('today');
    if(dateStr === selectedDate) cell.classList.add('selected');

    let dotHtml = '';
    if(taskDates.has(dateStr)) dotHtml = '<span class="dot"></span>';

    cell.innerHTML = `<span>${d}</span>${dotHtml}`;
    cell.addEventListener('click', () => {
      selectedDate = dateStr;
      renderCalendar();
      renderCalDetail();
    });

    calendarGrid.appendChild(cell);
  }
}

function renderCalDetail(){
  calDetailDate.textContent = formatDateReadable(selectedDate);
  const dayTasks = tasks.filter(t => t.date === selectedDate);

  calDetailList.innerHTML = '';
  if(dayTasks.length === 0){
    calDetailList.innerHTML = '<li class="cal-empty-msg">Tidak ada kegiatan pada tanggal ini.</li>';
    return;
  }
  dayTasks.forEach(t => {
    const li = document.createElement('li');
    li.textContent = `${t.done ? '✅ ' : '⭐ '}${t.title}`;
    calDetailList.appendChild(li);
  });
}

// ================= KANBAN BOARD =================
const colTodo = document.getElementById('colTodo');
const colInprogress = document.getElementById('colInprogress');
const colDone = document.getElementById('colDone');
const countTodo = document.getElementById('countTodo');
const countInprogress = document.getElementById('countInprogress');
const countDone = document.getElementById('countDone');
const boardEmpty = document.getElementById('boardEmpty');

function renderBoard(){
  colTodo.innerHTML = '';
  colInprogress.innerHTML = '';
  colDone.innerHTML = '';

  boardEmpty.style.display = tasks.length === 0 ? 'block' : 'none';

  const cols = { todo: colTodo, inprogress: colInprogress, done: colDone };
  const counts = { todo:0, inprogress:0, done:0 };

  [...tasks].sort((a,b) => a.date.localeCompare(b.date)).forEach(task => {
    counts[task.status] = (counts[task.status] || 0) + 1;
    const card = document.createElement('div');
    card.className = `kanban-card cat-${task.category}`;
    card.draggable = true;
    card.dataset.id = task.id;
    card.innerHTML = `
      <div class="kanban-card-title">${escapeHtml(task.title)}</div>
      <div class="kanban-card-meta">
        <span class="category-tag ${task.category}">${categoryLabel[task.category]}</span>
        <span class="priority-tag ${task.priority}">${priorityLabel[task.priority]}</span>
      </div>
    `;
    card.addEventListener('dragstart', () => {
      card.classList.add('dragging');
      card.dataset.dragId = task.id;
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
    cols[task.status].appendChild(card);
  });

  countTodo.textContent = counts.todo;
  countInprogress.textContent = counts.inprogress;
  countDone.textContent = counts.done;
}

document.querySelectorAll('.kanban-drop').forEach(dropzone => {
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const dragging = document.querySelector('.kanban-card.dragging');
    if(!dragging) return;
    const id = dragging.dataset.id;
    const task = tasks.find(t => t.id === id);
    if(!task) return;
    const newStatus = dropzone.closest('.kanban-col').dataset.status;
    task.status = newStatus;
    task.done = newStatus === 'done';
    saveTasks();
    renderAll();
    if(typeof anime !== 'undefined'){
      requestAnimationFrame(() => {
        const card = document.querySelector(`.kanban-card[data-id="${id}"]`);
        if(card){
          anime({ targets: card, scale: [0.85, 1.06, 1], duration: 420, easing: 'easeOutElastic(1, .6)' });
        }
      });
    }
  });
});

// ================= PROGRESS & STREAK =================
const dailyRingFill = document.getElementById('dailyRingFill');
const dailyPercentEl = document.getElementById('dailyPercent');
const weekBarsEl = document.getElementById('weekBars');
const streakCountEl = document.getElementById('streakCount');

const RING_CIRCUMFERENCE_DAILY = 427; // matches r=68 in CSS

const weekdayShort = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

function tasksOnDate(dateStr){
  return tasks.filter(t => t.date === dateStr);
}

function percentDone(list){
  if(list.length === 0) return 0;
  const done = list.filter(t => t.done).length;
  return Math.round((done / list.length) * 100);
}

function renderProgress(){
  const todayStr = formatDate(new Date());

  // Daily ring
  const todayPct = percentDone(tasksOnDate(todayStr));
  animateCounter(dailyPercentEl, todayPct, '%');
  const offset = RING_CIRCUMFERENCE_DAILY - (RING_CIRCUMFERENCE_DAILY * todayPct / 100);
  dailyRingFill.style.strokeDashoffset = offset;

  // Weekly bars (last 7 days, oldest to newest)
  weekBarsEl.innerHTML = '';
  for(let i = 6; i >= 0; i--){
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);
    const pct = percentDone(tasksOnDate(dateStr));

    const col = document.createElement('div');
    col.className = 'week-bar-col';
    col.innerHTML = `
      <div class="week-bar"><div class="week-bar-fill" style="height:${pct}%"></div></div>
      <span class="week-bar-label">${weekdayShort[d.getDay()]}</span>
    `;
    weekBarsEl.appendChild(col);
  }

  // Streak: consecutive days ending today with at least one completed task
  let streak = 0;
  let cursor = new Date();
  while(true){
    const dateStr = formatDate(cursor);
    const dayTasks = tasksOnDate(dateStr);
    const hasCompleted = dayTasks.some(t => t.done);
    if(hasCompleted){
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }else if(dateStr === todayStr && dayTasks.length === 0){
      // no tasks today yet, don't break streak — just check yesterday onward
      cursor.setDate(cursor.getDate() - 1);
      if(formatDate(cursor) === todayStr) break; // safety
      continue;
    }else{
      break;
    }
  }
  animateCounter(streakCountEl, streak);
  checkStreakBadge(streak);
}

// ---------- Streak gamification: badge unlock popup ----------
const STREAK_BADGE_KEY = 'starlight_streak_badge_best';
const STREAK_MILESTONES = [
  { days:3,  icon:'🔥', label:'3 Hari Beruntun!' },
  { days:5,  icon:'🌟', label:'5 Hari Beruntun!' },
  { days:7,  icon:'🏆', label:'Seminggu Penuh!' },
  { days:14, icon:'💎', label:'2 Minggu Konsisten!' },
  { days:21, icon:'🚀', label:'21 Hari Beruntun!' },
  { days:30, icon:'👑', label:'Sebulan Tanpa Putus!' }
];
function checkStreakBadge(streak){
  const best = Number(localStorage.getItem(STREAK_BADGE_KEY) || 0);
  const newlyReached = STREAK_MILESTONES.find(m => streak >= m.days && best < m.days);
  if(newlyReached){
    localStorage.setItem(STREAK_BADGE_KEY, String(newlyReached.days));
    showBadgeUnlock(newlyReached);
  }else if(streak > best){
    localStorage.setItem(STREAK_BADGE_KEY, String(streak));
  }
}
function showBadgeUnlock(badge){
  const overlay = document.createElement('div');
  overlay.className = 'badge-unlock-overlay';
  overlay.innerHTML = `
    <div class="badge-unlock-card">
      <div class="badge-unlock-icon">${badge.icon}</div>
      <div class="badge-unlock-title">${badge.label}</div>
      <div class="badge-unlock-sub">Terus jaga semangatmu ✦</div>
    </div>
  `;
  document.body.appendChild(overlay);
  const card = overlay.querySelector('.badge-unlock-card');
  playChimeSound();

  const rect = { left: window.innerWidth/2, top: window.innerHeight/2 };
  burstConfetti(rect.left, rect.top);
  setTimeout(() => burstConfetti(rect.left - 60, rect.top - 30), 120);
  setTimeout(() => burstConfetti(rect.left + 60, rect.top - 30), 220);

  if(typeof anime !== 'undefined'){
    anime({
      targets: card,
      opacity: [0, 1],
      scale: [0.4, 1.08, 1],
      duration: 650,
      easing: 'easeOutElastic(1, .6)',
      complete: () => {
        setTimeout(() => {
          anime({
            targets: card,
            opacity: [1, 0],
            scale: [1, 0.85],
            duration: 350,
            easing: 'easeInQuad',
            complete: () => overlay.remove()
          });
        }, 1800);
      }
    });
  }else{
    setTimeout(() => overlay.remove(), 2200);
  }
}

// ================= POMODORO TIMER =================
const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;
const RING_CIRCUMFERENCE_POMODORO = 553; // matches r=88 in CSS

const pomodoroRingFill = document.getElementById('pomodoroRingFill');
const pomodoroModeEl = document.getElementById('pomodoroMode');
const pomodoroTimeEl = document.getElementById('pomodoroTime');
const pomodoroTaskSelect = document.getElementById('pomodoroTask');
const pomodoroStart = document.getElementById('pomodoroStart');
const pomodoroPause = document.getElementById('pomodoroPause');
const pomodoroReset = document.getElementById('pomodoroReset');
const pomodoroSessionCountEl = document.getElementById('pomodoroSessionCount');
const pomodoroMsg = document.getElementById('pomodoroMsg');

let pomodoroMode = 'focus'; // 'focus' | 'break'
let pomodoroSecondsLeft = FOCUS_SECONDS;
let pomodoroTimerId = null;
let pomodoroSessionsToday = Number(sessionStorage.getItem('starlight_pomodoro_sessions') || 0);

pomodoroSessionCountEl.textContent = pomodoroSessionsToday;

function populatePomodoroTaskSelect(){
  const prevValue = pomodoroTaskSelect.value;
  pomodoroTaskSelect.innerHTML = '<option value="">Tanpa tugas terpilih</option>';
  tasks.filter(t => t.status !== 'done').forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.title;
    pomodoroTaskSelect.appendChild(opt);
  });
  if([...pomodoroTaskSelect.options].some(o => o.value === prevValue)){
    pomodoroTaskSelect.value = prevValue;
  }
}

function formatTime(totalSeconds){
  const m = Math.floor(totalSeconds / 60).toString().padStart(2,'0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

function updatePomodoroDisplay(){
  pomodoroTimeEl.textContent = formatTime(pomodoroSecondsLeft);
  const total = pomodoroMode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS;
  const fraction = pomodoroSecondsLeft / total;
  pomodoroRingFill.style.strokeDashoffset = RING_CIRCUMFERENCE_POMODORO * (1 - fraction);
  pomodoroModeEl.textContent = pomodoroMode === 'focus' ? 'Fokus' : 'Istirahat';
}

function tickPomodoro(){
  pomodoroSecondsLeft--;
  if(pomodoroSecondsLeft <= 0){
    if(pomodoroMode === 'focus'){
      pomodoroSessionsToday++;
      sessionStorage.setItem('starlight_pomodoro_sessions', pomodoroSessionsToday);
      pomodoroSessionCountEl.textContent = pomodoroSessionsToday;

      const taskId = pomodoroTaskSelect.value;
      if(taskId){
        const task = tasks.find(t => t.id === taskId);
        if(task){
          task.pomodoros = (task.pomodoros || 0) + 1;
          saveTasks();
        }
      }
      pomodoroMsg.textContent = 'Sesi fokus selesai! Waktunya istirahat 5 menit ☕';
      pomodoroMode = 'break';
      pomodoroSecondsLeft = BREAK_SECONDS;
      playBellSound();
      notifyBrowser('Sesi fokus selesai! ☕', 'Waktunya istirahat 5 menit.');
    }else{
      pomodoroMsg.textContent = 'Istirahat selesai! Siap fokus lagi? 🌟';
      pomodoroMode = 'focus';
      pomodoroSecondsLeft = FOCUS_SECONDS;
      playBellSound();
      notifyBrowser('Istirahat selesai! 🌟', 'Siap fokus lagi?');
    }
    const autoStart = document.getElementById('pomodoroAuto');
    if(autoStart && autoStart.checked){
      clearInterval(pomodoroTimerId);
      pomodoroTimerId = setInterval(tickPomodoro, 1000);
      pomodoroStart.disabled = true;
      pomodoroPause.disabled = false;
      pomodoroPause.classList.add('pulse-breathing');
    }else{
      clearInterval(pomodoroTimerId);
      pomodoroTimerId = null;
      pomodoroStart.disabled = false;
      pomodoroPause.disabled = true;
      pomodoroPause.classList.remove('pulse-breathing');
    }
  }
  updatePomodoroDisplay();
}

pomodoroStart.addEventListener('click', () => {
  if(!isPro()){
    document.getElementById('pricing').scrollIntoView({ behavior:'smooth' });
    return;
  }
  if(pomodoroTimerId) return;
  pomodoroMsg.textContent = '';
  pomodoroTimerId = setInterval(tickPomodoro, 1000);
  pomodoroStart.disabled = true;
  pomodoroPause.disabled = false;
  pomodoroPause.classList.add('pulse-breathing');
});

pomodoroPause.addEventListener('click', () => {
  clearInterval(pomodoroTimerId);
  pomodoroTimerId = null;
  pomodoroStart.disabled = false;
  pomodoroPause.disabled = true;
  pomodoroPause.classList.remove('pulse-breathing');
});

pomodoroReset.addEventListener('click', () => {
  clearInterval(pomodoroTimerId);
  pomodoroTimerId = null;
  pomodoroMode = 'focus';
  pomodoroSecondsLeft = FOCUS_SECONDS;
  pomodoroMsg.textContent = '';
  pomodoroStart.disabled = false;
  pomodoroPause.disabled = true;
  pomodoroPause.classList.remove('pulse-breathing');
  updatePomodoroDisplay();
});

// ================= FLASHCARD FLIP =================
document.querySelectorAll('.flash-card').forEach(card => {
  card.addEventListener('click', () => card.classList.toggle('flipped'));
  card.addEventListener('keypress', (e) => {
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      card.classList.toggle('flipped');
    }
  });
});

// ================= STUDY PLAN & GOALS =================
const GOALS_KEY = 'starlight_goals';
let goals = loadGoals();
let goalStepsTemp = [];

const goalForm = document.getElementById('goalForm');
const goalTitleInput = document.getElementById('goalTitle');
const goalMonthsInput = document.getElementById('goalMonths');
const goalStepInput = document.getElementById('goalStepInput');
const goalStepPriority = document.getElementById('goalStepPriority');
const addStepBtn = document.getElementById('addStepBtn');
const goalStepsPreview = document.getElementById('goalStepsPreview');
const goalList = document.getElementById('goalList');
const goalEmpty = document.getElementById('goalEmpty');

function loadGoals(){
  try{
    const raw = localStorage.getItem(GOALS_KEY);
    let loaded = raw ? JSON.parse(raw) : [];
    const priorityMap = { easy:'low', medium:'medium', hard:'high' };
    loaded.forEach(g => {
      (g.steps || []).forEach(s => {
        if(priorityMap[s.priority]) s.priority = priorityMap[s.priority];
        if(!['high','medium','low'].includes(s.priority)) s.priority = 'medium';
      });
    });
    return loaded;
  }catch(e){
    return [];
  }
}
function saveGoals(){
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

// ---- Compose steps before saving the goal ----
addStepBtn.addEventListener('click', () => {
  const text = goalStepInput.value.trim();
  const priority = goalStepPriority.value;
  if(!text || !priority){
    if(!priority) goalStepPriority.focus();
    else goalStepInput.focus();
    return;
  }
  goalStepsTemp.push({ id: uid(), text, priority, done:false });
  goalStepInput.value = '';
  goalStepPriority.selectedIndex = 0;
  goalStepInput.focus();
  renderStepsPreview();
});

function renderStepsPreview(){
  goalStepsPreview.innerHTML = '';
  goalStepsTemp.forEach(step => {
    const li = document.createElement('li');
    li.className = `priority-${step.priority}`;
    li.innerHTML = `
      <span class="step-text">${escapeHtml(step.text)}</span>
      <button type="button" class="remove-step" data-id="${step.id}" aria-label="Hapus langkah">✕</button>
    `;
    goalStepsPreview.appendChild(li);
  });
  document.querySelectorAll('.remove-step').forEach(btn => {
    btn.addEventListener('click', () => {
      goalStepsTemp = goalStepsTemp.filter(s => s.id !== btn.dataset.id);
      renderStepsPreview();
    });
  });
}

goalForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = goalTitleInput.value.trim();
  const months = goalMonthsInput.value;
  if(!title || !months || goalStepsTemp.length === 0){
    if(goalStepsTemp.length === 0) goalStepInput.focus();
    return;
  }

  goals.push({
    id: uid(),
    title,
    months,
    steps: goalStepsTemp
  });
  saveGoals();
  goalForm.reset();
  goalStepsTemp = [];
  renderStepsPreview();
  renderGoals();
});

function renderGoals(){
  goalList.innerHTML = '';
  goalEmpty.style.display = goals.length === 0 ? 'block' : 'none';

  goals.forEach(goal => {
    const card = document.createElement('div');
    card.className = 'goal-card';
    const stepsHtml = goal.steps.map(step => `
      <li class="goal-step-item priority-${step.priority}">
        <div class="goal-step-check ${step.done ? 'checked' : ''}" data-goal="${goal.id}" data-step="${step.id}"></div>
        <span class="goal-step-text ${step.done ? 'done' : ''}">${escapeHtml(step.text)}</span>
        <span class="goal-step-priority-tag ${step.priority}">${priorityLabel[step.priority]}</span>
        <button class="goal-step-remove" data-goal="${goal.id}" data-step="${step.id}" aria-label="Hapus langkah">✕</button>
      </li>
    `).join('');
    card.innerHTML = `
      <div class="goal-card-head">
        <h4>${escapeHtml(goal.title)}</h4>
        <span class="goal-target">${goal.months} bulan</span>
        <button class="goal-del" data-id="${goal.id}" aria-label="Hapus goal">✕</button>
      </div>
      <ul class="goal-steps">${stepsHtml}</ul>
    `;
    goalList.appendChild(card);
  });

  document.querySelectorAll('.goal-del').forEach(el => {
    el.addEventListener('click', () => {
      const card = el.closest('.goal-card');
      const removeIt = () => {
        goals = goals.filter(g => g.id !== el.dataset.id);
        saveGoals();
        renderGoals();
      };
      if(card && typeof anime !== 'undefined'){
        const height = card.getBoundingClientRect().height;
        card.style.overflow = 'hidden';
        anime({
          targets: card,
          opacity: [1, 0],
          translateX: [0, 60],
          height: [height, 0],
          duration: 350,
          easing: 'easeInOutQuad',
          complete: removeIt
        });
      }else{
        removeIt();
      }
    });
  });

  document.querySelectorAll('.goal-step-check').forEach(el => {
    el.addEventListener('click', () => {
      const goal = goals.find(g => g.id === el.dataset.goal);
      if(!goal) return;
      const step = goal.steps.find(s => s.id === el.dataset.step);
      if(!step) return;
      step.done = !step.done;
      saveGoals();
      renderGoals();
    });
  });

  document.querySelectorAll('.goal-step-remove').forEach(el => {
    el.addEventListener('click', () => {
      const goal = goals.find(g => g.id === el.dataset.goal);
      if(!goal) return;
      goal.steps = goal.steps.filter(s => s.id !== el.dataset.step);
      saveGoals();
      renderGoals();
    });
  });
}

// ================= ACCOUNT / SUBSCRIPTION (PAYMENT & GATING) =================
const ACCOUNT_KEY = 'starlight_account';
const FREE_TASK_LIMIT = 7;

const PROMO_CODES = {
  'STARLIGHTPRO': { months: 1 },
  'PROMO50': { months: 1 },
  'STARLIGHT6BULAN': { months: 6 }
};

function loadAccount(){
  try{
    const raw = localStorage.getItem(ACCOUNT_KEY);
    const acc = raw ? JSON.parse(raw) : {};
    return {
      plan: acc.plan === 'pro' ? 'pro' : 'free',
      expiresAt: acc.expiresAt || null,
      theme: acc.theme === 'dark' ? 'dark' : 'light',
      accent: ['sage','gold','slate'].includes(acc.accent) ? acc.accent : 'sage'
    };
  }catch(e){
    return { plan:'free', expiresAt:null, theme:'light', accent:'sage' };
  }
}
function saveAccount(){
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
}
let account = loadAccount();

function isPro(){
  if(account.plan !== 'pro') return false;
  if(account.expiresAt && new Date(account.expiresAt) < new Date()){
    account.plan = 'free';
    account.expiresAt = null;
    saveAccount();
    return false;
  }
  return true;
}

function formatRupiah(n){
  return 'Rp' + Number(n).toLocaleString('id-ID');
}
function formatExpiry(dateStr){
  if(!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
}

function renderAccountUI(){
  const pro = isPro();
  const badges = [document.getElementById('planBadge'), document.getElementById('accountBadge')];
  badges.forEach(b => {
    if(!b) return;
    b.textContent = pro ? 'PRO' : 'FREE';
    b.classList.toggle('is-pro', pro);
  });
  const expiryEl = document.getElementById('accountExpiry');
  const hintEl = document.getElementById('accountHint');
  if(expiryEl) expiryEl.textContent = pro && account.expiresAt ? `Aktif sampai ${formatExpiry(account.expiresAt)}` : '';
  if(hintEl){
    hintEl.textContent = pro
      ? 'Kamu berlangganan Starlight Pro. Semua fitur premium terbuka!'
      : `Kamu masih pakai paket Gratis. Maksimal ${FREE_TASK_LIMIT} tugas aktif, tanpa Pomodoro & backup data.`;
  }
  const freeCta = document.getElementById('freeCta');
  if(freeCta) freeCta.textContent = pro ? 'Downgrade Otomatis Setelah Berakhir' : 'Paket Saat Ini';

  // Feature gating: Pomodoro
  const pomodoroShell = document.getElementById('pomodoroShell');
  if(pomodoroShell) pomodoroShell.classList.toggle('locked', !pro);

  // Feature gating: theme & backup
  const themeShell = document.getElementById('themeShell');
  if(themeShell) themeShell.classList.toggle('locked', !pro);
  const backupShell = document.getElementById('backupShell');
  if(backupShell) backupShell.classList.toggle('locked', !pro);

  updateTodoUsage();
}

function updateTodoUsage(){
  const usageWrap = document.getElementById('todoUsage');
  const fill = document.getElementById('todoUsageFill');
  const text = document.getElementById('todoUsageText');
  if(!usageWrap) return;
  const pro = isPro();
  if(pro){
    usageWrap.style.display = 'none';
    return;
  }
  usageWrap.style.display = 'block';
  const count = tasks.length;
  const pct = Math.min(100, Math.round((count / FREE_TASK_LIMIT) * 100));
  fill.style.width = pct + '%';
  fill.classList.toggle('limit-near', count >= FREE_TASK_LIMIT - 2 && count < FREE_TASK_LIMIT);
  fill.classList.toggle('limit-full', count >= FREE_TASK_LIMIT);
  text.textContent = `${count} / ${FREE_TASK_LIMIT} tugas (Free)`;
}

// ---------- Theme & accent ----------
function applyTheme(){
  document.body.dataset.theme = account.theme;
  document.documentElement.dataset.accent = account.accent;
  const btn = document.getElementById('themeToggleBtn');
  if(btn) btn.textContent = account.theme === 'dark' ? '☀️ Mode Terang' : '🌙 Mode Gelap';
  document.querySelectorAll('.accent-swatch').forEach(sw => {
    sw.classList.toggle('active', sw.dataset.accent === account.accent);
  });
}
const themeToggleBtn = document.getElementById('themeToggleBtn');
if(themeToggleBtn){
  themeToggleBtn.addEventListener('click', () => {
    if(!isPro()) return;
    account.theme = account.theme === 'dark' ? 'light' : 'dark';
    saveAccount();
    applyTheme();
  });
}
document.querySelectorAll('.accent-swatch').forEach(sw => {
  sw.addEventListener('click', () => {
    if(!isPro()) return;
    account.accent = sw.dataset.accent;
    saveAccount();
    applyTheme();
  });
});

// ---------- Promo / license code ----------
function showPromoMsg(msg, type, scrollToAccount){
  const el = document.getElementById('promoMsg');
  if(el){
    el.textContent = msg;
    el.className = 'promo-msg ' + (type || '');
  }
  if(scrollToAccount){
    const accSection = document.getElementById('account');
    if(accSection) accSection.scrollIntoView({ behavior:'smooth' });
  }
}
const promoBtn = document.getElementById('promoBtn');
if(promoBtn){
  promoBtn.addEventListener('click', () => {
    const input = document.getElementById('promoInput');
    const code = input.value.trim().toUpperCase();
    if(!code){ showPromoMsg('Masukkan kode terlebih dahulu.', 'err'); return; }
    const promo = PROMO_CODES[code];
    if(!promo){ showPromoMsg('Kode tidak valid atau sudah kedaluwarsa.', 'err'); return; }
    activatePro(promo.months, `Kode: ${code}`);
    input.value = '';
    showPromoMsg(`Kode berhasil dipakai! Akunmu kini Pro selama ${promo.months} bulan.`, 'ok');
  });
}

function activatePro(months, sourceLabel){
  const base = (account.plan === 'pro' && account.expiresAt && new Date(account.expiresAt) > new Date())
    ? new Date(account.expiresAt) : new Date();
  base.setMonth(base.getMonth() + months);
  account.plan = 'pro';
  account.expiresAt = base.toISOString();
  saveAccount();
  renderAccountUI();
  applyTheme();
  renderAll();
  return account.expiresAt;
}

// ---------- Modal open/close transitions (scale-up + backdrop blur fade) ----------
function openModal(overlay){
  if(!overlay) return;
  overlay.classList.add('open');
  const box = overlay.querySelector('.modal-box');
  if(box && typeof anime !== 'undefined'){
    anime({
      targets: box,
      opacity: [0, 1],
      scale: [0.7, 1],
      duration: 420,
      easing: 'easeOutBack'
    });
  }else if(box){
    box.style.opacity = 1;
    box.style.transform = 'scale(1)';
  }
}
function closeModal(overlay){
  if(!overlay) return;
  const box = overlay.querySelector('.modal-box');
  if(box && typeof anime !== 'undefined'){
    anime({
      targets: box,
      opacity: [1, 0],
      scale: [1, 0.82],
      duration: 260,
      easing: 'easeInQuad',
      complete: () => overlay.classList.remove('open')
    });
  }else{
    overlay.classList.remove('open');
  }
}

// ---------- Checkout modal ----------
const checkoutModal = document.getElementById('checkoutModal');
const invoiceModal = document.getElementById('invoiceModal');
let checkoutState = { label:'', duration:'', price:0, uniqueCode:0, method:'qris', bank:'BCA' };

function genUniqueCode(){ return Math.floor(100 + Math.random() * 899); }
function genVaNumber(bank){
  const prefixes = { BCA:'3901', Mandiri:'8960', BNI:'8808', BRI:'2622' };
  const rand = Math.floor(100000000 + Math.random() * 899999999);
  return (prefixes[bank] || '0000') + rand;
}
function drawQrisPattern(){
  const g = document.getElementById('qrisPattern');
  if(!g) return;
  let rects = '';
  const seed = checkoutState.uniqueCode || 123;
  let n = seed;
  for(let y = 0; y < 10; y++){
    for(let x = 0; x < 10; x++){
      n = (n * 9301 + 49297) % 233280;
      if((n / 233280) > 0.5){
        rects += `<rect x="${x*12}" y="${y*12}" width="11" height="11"></rect>`;
      }
    }
  }
  g.innerHTML = rects;
}

document.querySelectorAll('.price-cta').forEach(btn => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.price-card');
    if(card.dataset.tier !== 'pro') return; // free tier button, no-op
    checkoutState.label = card.dataset.label;
    checkoutState.duration = card.dataset.duration + ' Bulan';
    checkoutState.price = Number(card.dataset.price);
    checkoutState.uniqueCode = genUniqueCode();
    checkoutState.method = 'qris';
    checkoutState.bank = 'BCA';
    openCheckoutModal();
  });
});

function openCheckoutModal(){
  document.getElementById('sumPlan').textContent = `Starlight Pro (${checkoutState.label})`;
  document.getElementById('sumDuration').textContent = checkoutState.duration;
  document.getElementById('sumPrice').textContent = formatRupiah(checkoutState.price);
  document.getElementById('sumCode').textContent = checkoutState.uniqueCode;
  document.getElementById('sumTotal').textContent = formatRupiah(checkoutState.price + checkoutState.uniqueCode);
  document.querySelectorAll('.pay-tab').forEach(t => t.classList.toggle('active', t.dataset.method === 'qris'));
  document.getElementById('payQris').style.display = 'block';
  document.getElementById('payVa').style.display = 'none';
  drawQrisPattern();
  updateVaNumber();
  openModal(checkoutModal);
}
function closeCheckoutModal(){ closeModal(checkoutModal); }
document.getElementById('checkoutClose').addEventListener('click', closeCheckoutModal);
checkoutModal.addEventListener('click', (e) => { if(e.target === checkoutModal) closeCheckoutModal(); });

document.querySelectorAll('.pay-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.pay-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    checkoutState.method = tab.dataset.method;
    document.getElementById('payQris').style.display = tab.dataset.method === 'qris' ? 'block' : 'none';
    document.getElementById('payVa').style.display = tab.dataset.method === 'va' ? 'block' : 'none';
  });
});
document.querySelectorAll('.va-bank').forEach(bankBtn => {
  bankBtn.addEventListener('click', () => {
    document.querySelectorAll('.va-bank').forEach(b => b.classList.remove('active'));
    bankBtn.classList.add('active');
    checkoutState.bank = bankBtn.dataset.bank;
    updateVaNumber();
  });
});
function updateVaNumber(){
  document.getElementById('vaBankName').textContent = checkoutState.bank;
  document.getElementById('vaNumber').textContent = genVaNumber(checkoutState.bank);
}

document.getElementById('confirmPayBtn').addEventListener('click', () => {
  const months = parseInt(checkoutState.duration) || 1;
  const expiresAt = activatePro(months, checkoutState.method);
  closeCheckoutModal();
  openInvoiceModal(expiresAt);
});

function openInvoiceModal(expiresAt){
  const invNo = 'INV-' + Date.now().toString(36).toUpperCase();
  document.getElementById('invNumber').textContent = invNo;
  document.getElementById('invDate').textContent = new Date().toLocaleString('id-ID');
  document.getElementById('invPlan').textContent = `Starlight Pro (${checkoutState.label})`;
  document.getElementById('invMethod').textContent = checkoutState.method === 'qris'
    ? 'QRIS' : `Virtual Account ${checkoutState.bank}`;
  document.getElementById('invExpiry').textContent = formatExpiry(expiresAt);
  document.getElementById('invTotal').textContent = formatRupiah(checkoutState.price + checkoutState.uniqueCode);
  openModal(invoiceModal);
}
document.getElementById('invoiceClose').addEventListener('click', () => closeModal(invoiceModal));
invoiceModal.addEventListener('click', (e) => { if(e.target === invoiceModal) closeModal(invoiceModal); });
document.getElementById('invoicePrintBtn').addEventListener('click', () => window.print());
document.getElementById('invoiceDownloadBtn').addEventListener('click', () => {
  const box = document.getElementById('invoiceBox');
  const content = `
    <html><head><meta charset="UTF-8"><title>Struk Starlight Todolist</title>
    <style>body{font-family:Arial,sans-serif;padding:30px;color:#2b303a;}
    .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #ccc;font-size:14px;}
    h2{color:#8a9a86;}</style></head><body>
    <h2>✦ Starlight Todolist — Struk Pembayaran</h2>
    <div class="row"><span>No. Invoice</span><strong>${document.getElementById('invNumber').textContent}</strong></div>
    <div class="row"><span>Tanggal</span><strong>${document.getElementById('invDate').textContent}</strong></div>
    <div class="row"><span>Paket</span><strong>${document.getElementById('invPlan').textContent}</strong></div>
    <div class="row"><span>Metode</span><strong>${document.getElementById('invMethod').textContent}</strong></div>
    <div class="row"><span>Masa Aktif</span><strong>${document.getElementById('invExpiry').textContent}</strong></div>
    <div class="row"><span>Total Dibayar</span><strong>${document.getElementById('invTotal').textContent}</strong></div>
    <p>Terima kasih telah berlangganan Starlight Todolist Pro!</p>
    </body></html>`;
  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `struk-${document.getElementById('invNumber').textContent}.html`;
  a.click();
  URL.revokeObjectURL(url);
});

// ================= EXPORT / IMPORT (BACKUP) =================
document.getElementById('exportJsonBtn').addEventListener('click', () => {
  if(!isPro()) return;
  const data = JSON.stringify({ tasks, goals }, null, 2);
  downloadFile(data, 'starlight-backup.json', 'application/json');
});
document.getElementById('exportCsvBtn').addEventListener('click', () => {
  if(!isPro()) return;
  const header = 'id,title,date,category,priority,status,done,pomodoros';
  const rows = tasks.map(t => [t.id,`"${(t.title||'').replace(/"/g,'""')}"`,t.date,t.category,t.priority,t.status,t.done,t.pomodoros].join(','));
  const csv = [header, ...rows].join('\n');
  downloadFile(csv, 'starlight-tasks.csv', 'text/csv');
});
function downloadFile(content, filename, mime){
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
document.getElementById('importBtn').addEventListener('click', () => {
  if(!isPro()) return;
  document.getElementById('importFile').click();
});
document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result);
      if(Array.isArray(parsed.tasks)){
        tasks = parsed.tasks;
        saveTasks();
      }
      if(Array.isArray(parsed.goals)){
        goals = parsed.goals;
        saveGoals();
      }
      renderAll();
      renderGoals();
      alert('Data berhasil diimpor!');
    }catch(err){
      alert('File tidak valid. Pastikan file JSON hasil export Starlight.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ================= SOUND EFFECTS (Howler.js, self-synthesized tones) =================
function isSoundOn(){
  const t = document.getElementById('soundToggle');
  return t ? t.checked : true;
}

// --- Tiny WAV synthesizer so we don't need external audio files ---
function synthWavDataUri(segments, sampleRate){
  sampleRate = sampleRate || 8000;
  const totalDur = segments.reduce((max, s) => Math.max(max, (s.delay || 0) + s.dur), 0);
  const numSamples = Math.max(1, Math.floor(totalDur * sampleRate));
  const data = new Float32Array(numSamples);
  segments.forEach(seg => {
    const start = Math.floor((seg.delay || 0) * sampleRate);
    const len = Math.floor(seg.dur * sampleRate);
    const gain = seg.gain != null ? seg.gain : 0.5;
    for(let i = 0; i < len; i++){
      const idx = start + i;
      if(idx >= numSamples) break;
      const t = i / sampleRate;
      const fadeIn = Math.min(1, i / (len * 0.08 + 1));
      const fadeOut = Math.min(1, (len - i) / (len * 0.35 + 1));
      const env = fadeIn * fadeOut;
      let sample;
      if(seg.type === 'noise'){
        sample = (Math.random() * 2 - 1) * 0.6;
      }else if(seg.type === 'triangle'){
        const period = sampleRate / seg.freq;
        const x = (idx % period) / period;
        sample = 4 * Math.abs(x - 0.5) - 1;
      }else{
        sample = Math.sin(2 * Math.PI * seg.freq * t);
      }
      data[idx] += sample * gain * env;
    }
  });
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeStr = (offset, str) => { for(let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  let offset = 44;
  for(let i = 0; i < numSamples; i++){
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for(let i = 0; i < bytes.length; i += chunk){
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

let howlPop = null, howlChime = null, howlSwoosh = null, howlBell = null;
function initSounds(){
  if(typeof Howl === 'undefined') return;
  howlPop = new Howl({ src: [synthWavDataUri([
    { freq:660, dur:0.12, gain:0.5, type:'sine' },
    { freq:880, dur:0.14, gain:0.4, type:'sine', delay:0.06 }
  ])], volume: 0.55 });
  howlChime = new Howl({ src: [synthWavDataUri([
    { freq:523, dur:0.25, gain:0.45, type:'triangle' },
    { freq:659, dur:0.25, gain:0.42, type:'triangle', delay:0.15 },
    { freq:784, dur:0.4, gain:0.4, type:'triangle', delay:0.3 }
  ])], volume: 0.5 });
  howlSwoosh = new Howl({ src: [synthWavDataUri([
    { type:'noise', dur:0.16, gain:0.35 }
  ])], volume: 0.35 });
  howlBell = new Howl({ src: [synthWavDataUri([
    { freq:392, dur:1.1, gain:0.4, type:'sine' },
    { freq:784, dur:0.9, gain:0.18, type:'sine', delay:0.02 },
    { freq:1175, dur:0.6, gain:0.1, type:'sine', delay:0.04 }
  ])], volume: 0.55 });
}
initSounds();

function playPopSound(){ if(isSoundOn() && howlPop) howlPop.play(); }
function playChimeSound(){ if(isSoundOn() && howlChime) howlChime.play(); }
function playSwooshSound(){ if(isSoundOn() && howlSwoosh) howlSwoosh.play(); }
function playBellSound(){ if(isSoundOn() && howlBell) howlBell.play(); }

// ================= BROWSER NOTIFICATIONS =================
const notifPermBtn = document.getElementById('notifPermBtn');
const notifMsg = document.getElementById('notifMsg');
function updateNotifBtn(){
  if(!notifPermBtn || !('Notification' in window)) return;
  if(Notification.permission === 'granted'){
    notifPermBtn.textContent = '🔔 Notifikasi Aktif';
    notifMsg.textContent = 'Kamu akan diberi tahu saat tugas mendekati tenggat.';
  }else if(Notification.permission === 'denied'){
    notifPermBtn.textContent = '🔕 Notifikasi Diblokir Browser';
  }
}
if(notifPermBtn){
  notifPermBtn.addEventListener('click', () => {
    if(!('Notification' in window)){
      notifMsg.textContent = 'Browser ini tidak mendukung notifikasi.';
      return;
    }
    Notification.requestPermission().then(updateNotifBtn);
  });
  updateNotifBtn();
}
function notifyBrowser(title, body){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  try{ new Notification(title, { body, icon: undefined }); }catch(e){ /* ignore */ }
}
function checkDueSoonTasks(){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  const todayStr = formatDate(new Date());
  tasks.forEach(t => {
    if(!t.done && !t.notified && t.date <= todayStr){
      notifyBrowser('Tugas mendekati tenggat ⏰', t.title);
      t.notified = true;
    }
  });
  saveTasks();
}
setInterval(checkDueSoonTasks, 60000);

// ================= RENDER ORCHESTRATION =================
function updateStatCounters(){
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const pending = total - done;
  animateCounter(document.getElementById('statTotal'), total);
  animateCounter(document.getElementById('statDone'), done);
  animateCounter(document.getElementById('statPending'), pending);
}

// ================= 3D TILT (Vanilla-Tilt.js) =================
function initTilt(){
  if(typeof VanillaTilt === 'undefined') return;
  const targets = document.querySelectorAll('.price-card, .stat-card');
  targets.forEach(el => {
    if(el._vanillaTilt) return; // avoid double-init
    VanillaTilt.init(el, {
      max: 10,
      speed: 400,
      glare: true,
      'max-glare': 0.18,
      scale: 1.02
    });
  });
}

function renderAll(){
  renderTodoList();
  renderCalendar();
  renderCalDetail();
  renderBoard();
  renderProgress();
  populatePomodoroTaskSelect();
  renderAccountUI();
  updateStatCounters();
}

// ================= INIT =================
applyTheme();
renderTodoList(true);
renderCalendar();
renderCalDetail();
renderBoard();
renderProgress();
populatePomodoroTaskSelect();
renderAccountUI();
updateStatCounters();
renderGoals();
updatePomodoroDisplay();
checkDueSoonTasks();
initTilt();
