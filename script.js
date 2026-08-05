/**
 * daily-deck
 * ----------
 * A small Notion-style task manager. Tasks live in localStorage under
 * TASKS_KEY, deliberately the same key that the jarvis project reads
 * from. Since every project here is deployed under the same
 * niloufersanahmohammed-dev.github.io domain, they share one browser
 * storage origin, so as long as both are opened in the same browser,
 * jarvis can genuinely read what's saved here. No API, no backend,
 * just a shared storage key both projects agree on.
 */

const TASKS_KEY = "sanah-shared-tasks-v1";
const LISTS_KEY = "daily-deck-lists-v1";

/* ---------------- Storage ---------------- */

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(TASKS_KEY)) || [];
  } catch {
    return [];
  }
}
function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function loadLists() {
  try {
    const saved = JSON.parse(localStorage.getItem(LISTS_KEY));
    if (saved && saved.length) return saved;
  } catch {}
  return [{ id: "inbox", name: "inbox" }];
}
function saveLists(lists) {
  localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
}

let tasks = loadTasks();
let lists = loadLists();
let currentView = "today";

/* ---------------- DOM refs ---------------- */

const listNav = document.getElementById("listNav");
const newListForm = document.getElementById("newListForm");
const newListInput = document.getElementById("newListInput");
const boardTitle = document.getElementById("boardTitle");
const boardSub = document.getElementById("boardSub");
const addTaskForm = document.getElementById("addTaskForm");
const taskTitleInput = document.getElementById("taskTitleInput");
const taskDateInput = document.getElementById("taskDateInput");
const taskPriorityInput = document.getElementById("taskPriorityInput");
const taskListEl = document.getElementById("taskList");
const icsInput = document.getElementById("icsInput");

const notesOverlay = document.getElementById("notesOverlay");
const notesTaskTitle = document.getElementById("notesTaskTitle");
const notesTextarea = document.getElementById("notesTextarea");
const closeNotesBtn = document.getElementById("closeNotesBtn");
const saveNotesBtn = document.getElementById("saveNotesBtn");
const deleteTaskBtn = document.getElementById("deleteTaskBtn");

let activeNotesTaskId = null;

/* ---------------- Date helpers ---------------- */

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateBadge(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00");
  const today = todayStr();
  if (dateStr === today) return "today";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ---------------- Rendering ---------------- */

function renderSidebar() {
  listNav.innerHTML = "";

  const todayItem = document.createElement("div");
  todayItem.className = `list-item${currentView === "today" ? " active" : ""}`;
  const todayCount = tasksForView("today").filter((t) => !t.done).length;
  todayItem.innerHTML = `<span>☀️ today</span><span class="list-item-count">${todayCount}</span>`;
  todayItem.addEventListener("click", () => setView("today"));
  listNav.appendChild(todayItem);

  lists.forEach((list) => {
    const count = tasks.filter((t) => t.listId === list.id && !t.done).length;
    const item = document.createElement("div");
    item.className = `list-item${currentView === list.id ? " active" : ""}`;
    item.innerHTML = `
      <span>${list.id === "inbox" ? "🧺" : "📝"} ${list.name}</span>
      <span style="display:flex; align-items:center; gap:6px;">
        <span class="list-item-count">${count}</span>
        ${list.id !== "inbox" ? `<button class="list-remove" data-id="${list.id}">&times;</button>` : ""}
      </span>
    `;
    item.addEventListener("click", (e) => {
      if (e.target.closest(".list-remove")) return;
      setView(list.id);
    });
    listNav.appendChild(item);
  });

  listNav.querySelectorAll(".list-remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      lists = lists.filter((l) => l.id !== id);
      tasks = tasks.map((t) => (t.listId === id ? { ...t, listId: "inbox" } : t));
      saveLists(lists);
      saveTasks(tasks);
      if (currentView === id) currentView = "inbox";
      renderAll();
    });
  });
}

function tasksForView(view) {
  if (view === "today") {
    const today = todayStr();
    return tasks.filter((t) => t.dueDate && t.dueDate <= today);
  }
  return tasks.filter((t) => t.listId === view);
}

function renderBoard() {
  const viewTasks = tasksForView(currentView);
  const listName = currentView === "today" ? "today" : (lists.find((l) => l.id === currentView)?.name || currentView);
  boardTitle.textContent = listName;

  const openCount = viewTasks.filter((t) => !t.done).length;
  boardSub.textContent = viewTasks.length === 0
    ? "nothing here yet"
    : `${openCount} open, ${viewTasks.length - openCount} done`;

  taskListEl.innerHTML = "";

  if (viewTasks.length === 0) {
    taskListEl.innerHTML = `<p class="empty-state">nothing here. add something above.</p>`;
    return;
  }

  const sorted = [...viewTasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
  });

  sorted.forEach((task) => {
    const row = document.createElement("div");
    row.className = `task-row${task.done ? " done" : ""}`;
    row.innerHTML = `
      <button class="task-checkbox" data-id="${task.id}" aria-label="Toggle complete"></button>
      <div class="task-main" data-id="${task.id}">
        <div class="task-title">${task.title}</div>
        <div class="task-meta">
          <span class="priority-dot ${task.priority}"></span>
          ${task.dueDate ? `<span class="task-date">${formatDateBadge(task.dueDate)}</span>` : ""}
        </div>
      </div>
    `;
    taskListEl.appendChild(row);
  });

  taskListEl.querySelectorAll(".task-checkbox").forEach((btn) => {
    btn.addEventListener("click", () => toggleTask(btn.dataset.id));
  });
  taskListEl.querySelectorAll(".task-main").forEach((el) => {
    el.addEventListener("click", () => openNotes(el.dataset.id));
  });
}

function renderAll() {
  renderSidebar();
  renderBoard();
}

function setView(view) {
  currentView = view;
  renderAll();
}

/* ---------------- Task actions ---------------- */

function toggleTask(id) {
  tasks = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
  saveTasks(tasks);
  renderAll();
}

addTaskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = taskTitleInput.value.trim();
  if (!title) return;

  const listId = currentView === "today" ? "inbox" : currentView;
  const dueDate = taskDateInput.value || (currentView === "today" ? todayStr() : "");

  tasks.push({
    id: `t-${Date.now()}`,
    title,
    listId,
    dueDate: dueDate || null,
    priority: taskPriorityInput.value,
    notes: "",
    done: false,
    createdAt: Date.now(),
  });
  saveTasks(tasks);
  taskTitleInput.value = "";
  taskDateInput.value = "";
  renderAll();
});

/* ---------------- Lists ---------------- */

newListForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = newListInput.value.trim();
  if (!name) return;
  const id = `list-${Date.now()}`;
  lists.push({ id, name });
  saveLists(lists);
  newListInput.value = "";
  setView(id);
});

/* ---------------- Notes modal ---------------- */

function openNotes(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  activeNotesTaskId = id;
  notesTaskTitle.textContent = task.title;
  notesTextarea.value = task.notes || "";
  notesOverlay.classList.add("open");
}

closeNotesBtn.addEventListener("click", () => notesOverlay.classList.remove("open"));
notesOverlay.addEventListener("click", (e) => {
  if (e.target === notesOverlay) notesOverlay.classList.remove("open");
});

saveNotesBtn.addEventListener("click", () => {
  tasks = tasks.map((t) => (t.id === activeNotesTaskId ? { ...t, notes: notesTextarea.value } : t));
  saveTasks(tasks);
  notesOverlay.classList.remove("open");
  renderAll();
});

deleteTaskBtn.addEventListener("click", () => {
  tasks = tasks.filter((t) => t.id !== activeNotesTaskId);
  saveTasks(tasks);
  notesOverlay.classList.remove("open");
  renderAll();
});

/* ---------------- ICS calendar import ---------------- */

function parseICS(text) {
  const events = [];
  const veventBlocks = text.split("BEGIN:VEVENT").slice(1);

  veventBlocks.forEach((block) => {
    const summaryMatch = block.match(/SUMMARY:(.+)/);
    const dtstartMatch = block.match(/DTSTART[^:]*:(\d{8})/);
    if (!summaryMatch || !dtstartMatch) return;

    const raw = dtstartMatch[1]; // YYYYMMDD
    const dueDate = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;

    events.push({
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: summaryMatch[1].trim(),
      listId: "inbox",
      dueDate,
      priority: "medium",
      notes: "imported from calendar",
      done: false,
      createdAt: Date.now(),
    });
  });

  return events;
}

icsInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const imported = parseICS(text);
  tasks = [...tasks, ...imported];
  saveTasks(tasks);
  renderAll();
  icsInput.value = "";
  alert(`imported ${imported.length} event${imported.length === 1 ? "" : "s"} from your calendar.`);
});

/* ---------------- Boot ---------------- */

renderAll();
