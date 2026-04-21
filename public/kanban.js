document.addEventListener('DOMContentLoaded', initApp);
let state = { tasks: [], token: null, user: null };
function initApp() {
    const tokenStr = localStorage.getItem('auth_token');
    if (!tokenStr) { window.location.href = '/index.html'; return; }
    try {
        const payload = JSON.parse(atob(tokenStr.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) { logout(); return; }
        state.token = tokenStr; state.user = payload;
        document.getElementById('userNameDisplay').textContent = `Olá, ${payload.name || payload.email}`;
    } catch (e) { logout(); return; }
    setupEventListeners(); fetchTasks();
}
function logout() {
    if (state.token) { fetch('/api/usuarios?route=logout', { method: 'POST', headers: { 'Authorization': `Bearer ${state.token}` } }).catch(() => {}); }
    localStorage.removeItem('auth_token'); window.location.href = '/index.html';
}
async function apiFetch(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}`, ...(options.headers || {}) };
    try {
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) { logout(); return null; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Erro na requisição');
        return data;
    } catch (error) { throw error; }
}
async function fetchTasks() {
    try {
        const tasks = await apiFetch('/api/tarefas');
        if (tasks) { state.tasks = tasks; renderAll(); }
    } catch (err) { alert(err.message); }
}
const prioritySortValue = { 'high': 3, 'medium': 2, 'low': 1 };
function renderAll() {
    updateDashboard();
    const sortedTasks = [...state.tasks].sort((a, b) => prioritySortValue[b.priority] - prioritySortValue[a.priority]);
    const cols = { todo: document.getElementById('drop-todo'), doing: document.getElementById('drop-doing'), done: document.getElementById('drop-done') };
    Object.values(cols).forEach(col => col.innerHTML = '');
    let counts = { todo: 0, doing: 0, done: 0 };
    sortedTasks.forEach(task => {
        if (cols[task.status]) { cols[task.status].appendChild(createCard(task)); counts[task.status]++; }
    });
    document.getElementById('count-todo').textContent = counts.todo;
    document.getElementById('count-doing').textContent = counts.doing;
    document.getElementById('count-done').textContent = counts.done;
}
function updateDashboard() {
    const total = state.tasks.length;
    let todo = 0, doing = 0, done = 0, overdue = 0;
    const now = new Date();
    state.tasks.forEach(t => {
        if (t.status === 'todo') todo++; if (t.status === 'doing') doing++; if (t.status === 'done') done++;
        if (t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now) overdue++;
    });
    document.getElementById('stat-total').textContent = total; document.getElementById('stat-todo').textContent = todo;
    document.getElementById('stat-doing').textContent = doing; document.getElementById('stat-done').textContent = done;
    document.getElementById('stat-overdue').textContent = overdue;
    document.getElementById('stat-rate').textContent = `${total === 0 ? 0 : Math.round((done / total) * 100)}%`;
}
function createCard(task) {
    const template = document.getElementById('card-template');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.task-card');
    card.dataset.id = task.id;
    card.querySelector('.card-title').textContent = task.title;
    const badge = card.querySelector('.badge'); badge.classList.add(task.priority);
    badge.textContent = { 'low': 'Baixa', 'medium': 'Média', 'high': 'Alta' }[task.priority];
    const datesContainer = card.querySelector('.dates-info');
    if (task.startDate) datesContainer.innerHTML += `<p>Início: ${new Date(task.startDate).toLocaleDateString('pt-BR')}</p>`;
    if (task.dueDate) {
        const p = document.createElement('p'); p.textContent = `Prazo: ${new Date(task.dueDate).toLocaleDateString('pt-BR')}`;
        if (task.status !== 'done' && new Date(task.dueDate) < new Date()) { p.classList.add('overdue-text'); card.classList.add('is-overdue'); }
        datesContainer.appendChild(p);
    }
    card.querySelector('.complete-action').addEventListener('click', () => changeTaskStatus(task.id, 'done'));
    card.querySelector('.delete-action').addEventListener('click', () => deleteTask(task.id));
    card.querySelector('.edit-action').addEventListener('click', () => openModal(task));
    return card;
}
async function changeTaskStatus(taskId, newStatus) {
    try {
        const updatedTask = await apiFetch(`/api/tarefas?id=${taskId}&action=status`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
        if (updatedTask) updateLocalTask(updatedTask);
    } catch (err) { alert(err.message); }
}
async function deleteTask(taskId) {
    if (!confirm('Excluir esta tarefa?')) return;
    try { await apiFetch(`/api/tarefas?id=${taskId}`, { method: 'DELETE' }); state.tasks = state.tasks.filter(t => t.id !== taskId); renderAll(); }
    catch (err) { alert(err.message); }
}
function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('newTaskBtn').addEventListener('click', () => openModal());
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('taskForm').addEventListener('submit', handleTaskFormSubmit);
}
function openModal(task = null) {
    const form = document.getElementById('taskForm'); form.reset();
    if (task) {
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskStatus').value = task.status;
    }
    document.getElementById('taskModal').classList.remove('hidden');
}
function closeModal() { document.getElementById('taskModal').classList.add('hidden'); }
async function handleTaskFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('taskId').value;
    const payload = { title: document.getElementById('taskTitle').value, priority: document.getElementById('taskPriority').value, status: document.getElementById('taskStatus').value };
    try {
        const savedTask = await apiFetch(id ? `/api/tarefas?id=${id}` : `/api/tarefas`, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
        if (savedTask) { updateLocalTask(savedTask); closeModal(); }
    } catch (err) { alert(err.message); }
}
function updateLocalTask(taskObj) {
    const idx = state.tasks.findIndex(t => t.id === taskObj.id);
    if (idx !== -1) state.tasks[idx] = taskObj; else state.tasks.push(taskObj);
    renderAll();
}
