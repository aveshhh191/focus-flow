const TASKS_KEY = "focusflow-tasks-v2";
const HISTORY_KEY = "focusflow-history-v2";
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const priorityInput = document.getElementById("priorityInput");
const durationInput = document.getElementById("durationInput");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const historyList = document.getElementById("historyList");
const historyEmpty = document.getElementById("historyEmpty");
let currentFilter = "all";
let tasks = readStorage(TASKS_KEY, []);
let history = readStorage(HISTORY_KEY, []);

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    return Array.isArray(value) ? value : fallback;
  } catch { return fallback; }
}
function saveTasks() { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); }
function saveHistory() { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }
function formatDuration(minutes) {
  const mins = Number(minutes) || 0;
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainder = mins % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours} ${hours === 1 ? "hour" : "hours"}`;
}
function timestamp() {
  return new Date().toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function addHistory(task, action) {
  history.unshift({
    id: `${Date.now()}-${Math.random()}`,
    title: task.title,
    priority: task.priority,
    duration: task.duration,
    action,
    recordedAt: timestamp()
  });
  history = history.slice(0, 100);
  saveHistory();
}
function updateDate() {
  const now = new Date();
  document.getElementById("dayName").textContent = now.toLocaleDateString(undefined, { weekday: "long" });
  document.getElementById("fullDate").textContent = now.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function renderTasks() {
  taskList.innerHTML = "";
  const visibleTasks = tasks.filter(task => {
    if (currentFilter === "active") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
  });
  emptyState.style.display = visibleTasks.length ? "none" : "block";

  visibleTasks.forEach(task => {
    const item = document.createElement("article");
    item.className = `task-item${task.completed ? " done" : ""}`;

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "task-check";
    check.checked = task.completed;
    check.setAttribute("aria-label", `Mark ${task.title} as completed`);
    check.addEventListener("change", () => {
      task.completed = check.checked;
      if (task.completed) {
        task.completedAt = timestamp();
        addHistory(task, "Completed");
      } else {
        task.completedAt = null;
        addHistory(task, "Reopened");
      }
      saveTasks();
      renderAll();
    });

    const content = document.createElement("div");
    content.className = "task-content";
    const name = document.createElement("span");
    name.className = "task-name";
    name.textContent = task.title;
    const meta = document.createElement("div");
    meta.className = "task-meta";
    const priority = document.createElement("span");
    priority.className = `priority ${task.priority}`;
    priority.textContent = `${task.priority} priority`;
    const duration = document.createElement("span");
    duration.className = "duration-chip";
    duration.textContent = `◷ ${formatDuration(task.duration)}`;
    const date = document.createElement("time");
    date.textContent = `Added ${task.createdAt}`;
    meta.append(priority, duration, date);
    content.append(name, meta);

    const remove = document.createElement("button");
    remove.className = "delete-btn";
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Delete ${task.title}`);
    remove.addEventListener("click", () => {
      addHistory(task, "Deleted");
      tasks = tasks.filter(item => item.id !== task.id);
      saveTasks();
      renderAll();
    });
    item.append(check, content, remove);
    taskList.append(item);
  });

  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const planned = tasks.filter(task => !task.completed).reduce((sum, task) => sum + Number(task.duration || 0), 0);
  const percent = total ? Math.round((completed / total) * 100) : 0;
  document.getElementById("totalCount").textContent = total;
  document.getElementById("completedCount").textContent = completed;
  document.getElementById("plannedTime").textContent = formatDuration(planned);
  document.getElementById("taskTotalLabel").textContent = `${total} ${total === 1 ? "item" : "items"}`;
  document.getElementById("progressPercent").textContent = `${percent}%`;
  document.getElementById("progressRing").style.background = `conic-gradient(var(--purple) ${percent}%, #292b39 ${percent}%)`;
  document.getElementById("progressCaption").textContent = total === 0 ? "Every task is a fresh start." : percent === 100 ? "Amazing work — everything is done!" : `${total - completed} task${total - completed === 1 ? "" : "s"} left. Keep going!`;
}
function renderHistory() {
  historyList.innerHTML = "";
  historyEmpty.style.display = history.length ? "none" : "block";
  history.forEach(entry => {
    const item = document.createElement("article");
    item.className = "history-item";
    const icon = document.createElement("span");
    icon.className = `history-icon${entry.action === "Deleted" ? " deleted" : ""}`;
    icon.textContent = entry.action === "Completed" ? "✓" : entry.action === "Deleted" ? "×" : "↺";
    const details = document.createElement("div");
    details.className = "history-details";
    const title = document.createElement("p");
    title.className = "history-title";
    title.textContent = entry.title;
    const meta = document.createElement("div");
    meta.className = "history-meta";
    meta.textContent = `${entry.action} • ${formatDuration(entry.duration)} planned • ${entry.recordedAt}`;
    details.append(title, meta);
    item.append(icon, details);
    historyList.append(item);
  });
}
function renderAll() { renderTasks(); renderHistory(); }

taskForm.addEventListener("submit", event => {
  event.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;
  const task = {
    id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    title,
    priority: priorityInput.value,
    duration: Number(durationInput.value),
    completed: false,
    createdAt: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })
  };
  tasks.unshift(task);
  saveTasks();
  taskInput.value = "";
  priorityInput.value = "Medium";
  durationInput.value = "30";
  currentFilter = "all";
  document.querySelectorAll(".filter").forEach(button => button.classList.toggle("active", button.dataset.filter === "all"));
  renderAll();
  taskInput.focus();
});
document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item === button));
    renderTasks();
  });
});
document.getElementById("clearHistoryBtn").addEventListener("click", () => {
  if (!history.length) return;
  if (confirm("Clear all task history? This will not delete your current tasks.")) {
    history = [];
    saveHistory();
    renderHistory();
  }
});
updateDate();
renderAll();
