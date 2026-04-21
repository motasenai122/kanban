document.addEventListener('DOMContentLoaded', initApp);

let state = {
    tasks: [],
    token: null,
    user: null
};

// ==========================================
// AUTH & SETUP
// ==========================================
function initApp() {
    const tokenStr = localStorage.getItem('auth_token');
    
    // Check if token exists
    if (!tokenStr) {
        window.location.href = '/index.html';
        return;
    }

    try {
        const payloadStr = atob(tokenStr.split('.')[1]);
        const payload = JSON.parse(payloadStr);

        // Check expiration
        if (payload.exp * 1000 < Date.now()) {
            logout();
            return;
        }

        state.token = tokenStr;
        state.user = payload;
        
        // Show username
        document.getElementById('userNameDisplay').textContent = `Olá, ${payload.name || payload.email}`;
    } catch (e) {
        logout();
        return;
    }

    setupEventListeners();
    fetchTasks();
}

function logout() {
    // If we have token, tell server
    if (state.token) {
        fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.token}` }
        }).catch(err => console.error(err));
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

// Interceptor-like fetch wrapper
async function apiFetch(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`,
        ...(options.headers || {})
    };
    
    try {
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) {
            alert('Sessão expirada. Faça login novamente.');
            logout();
            return null;
        }
        if (res.status === 429) {
             alert('Muitas requisições. Por favor, tente novamente mais tarde.');
             return null;
        }
        
        let data;
        try { data = await res.clone().json(); } catch(e) { data = null; }
        
        if (!res.ok) {
            throw new Error((data && data.message) ? data.message : 'Erro na requisição');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ==========================================
// TASKS LOGIC
// ==========================================
async function fetchTasks() {
    try {
        const tasks = await apiFetch('/api/tasks');
        if (tasks) {
            state.tasks = tasks;
            renderAll();
        }
    } catch (err) {
        alert(err.message || 'Erro ao carregar tarefas.');
    }
}

// Sorting: High -> Medium -> Low
const prioritySortValue = { 'high': 3, 'medium': 2, 'low': 1 };

function renderAll() {
    updateDashboard();
    
    // Sort tasks globally before distributing
    const sortedTasks = [...state.tasks].sort((a, b) => {
        return prioritySortValue[b.priority] - prioritySortValue[a.priority];
    });

    const cols = {
        todo: document.getElementById('drop-todo'),
        doing: document.getElementById('drop-doing'),
        done: document.getElementById('drop-done')
    };
    
    // Clear cols
    Object.values(cols).forEach(col => col.innerHTML = '');

    let counts = { todo: 0, doing: 0, done: 0 };

    sortedTasks.forEach(task => {
        if (cols[task.status]) {
            cols[task.status].appendChild(createCard(task));
            counts[task.status]++;
        }
    });

    // Update column counters
    document.getElementById('count-todo').textContent = counts.todo;
    document.getElementById('count-doing').textContent = counts.doing;
    document.getElementById('count-done').textContent = counts.done;
}

function updateDashboard() {
    const total = state.tasks.length;
    let todo = 0, doing = 0, done = 0, overdue = 0;
    
    const now = new Date();
    // zerar hora para comparar puramente o dia se necessário, mas new Date(dueDate) < now funciona p/ prazos absolutos
    
    state.tasks.forEach(t => {
        if (t.status === 'todo') todo++;
        if (t.status === 'doing') doing++;
        if (t.status === 'done') done++;
        
        if (t.dueDate && t.status !== 'done') {
            if (new Date(t.dueDate) < now) {
                overdue++;
            }
        }
    });

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-todo').textContent = todo;
    document.getElementById('stat-doing').textContent = doing;
    document.getElementById('stat-done').textContent = done;
    document.getElementById('stat-overdue').textContent = overdue;
    
    const rate = total === 0 ? 0 : Math.round((done / total) * 100);
    document.getElementById('stat-rate').textContent = `${rate}%`;
}

function createCard(task) {
    const template = document.getElementById('card-template');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.task-card');
    
    card.dataset.id = task.id;
    card.dataset.status = task.status;
    
    // Title
    card.querySelector('.card-title').textContent = task.title;
    
    // Priority badge
    const badge = card.querySelector('.badge');
    badge.classList.add(task.priority);
    const pNames = { 'low': 'Baixa', 'medium': 'Média', 'high': 'Alta' };
    badge.textContent = pNames[task.priority];

    // Dates
    const datesContainer = card.querySelector('.dates-info');
    if (task.startDate) {
        const d = new Date(task.startDate).toLocaleDateString('pt-BR');
        datesContainer.innerHTML += `<p>Início: ${d}</p>`;
    }
    
    let isOverdue = false;
    if (task.dueDate) {
        const dueObj = new Date(task.dueDate);
        const d = dueObj.toLocaleDateString('pt-BR');
        const p = document.createElement('p');
        p.textContent = `Prazo: ${d}`;
        if (task.status !== 'done' && dueObj < new Date()) {
            p.classList.add('overdue-text');
            card.classList.add('is-overdue');
            isOverdue = true;
        }
        datesContainer.appendChild(p);
    }

    if (task.completedAt) {
        const d = new Date(task.completedAt).toLocaleDateString('pt-BR');
        datesContainer.innerHTML += `<p>Concluída em: ${d}</p>`;
    }
    
    // Actions visibility
    const completeBtn = card.querySelector('.complete-action');
    if (task.status === 'done') {
        completeBtn.style.display = 'none';
        card.querySelector('.move-right').disabled = true;
    } else {
        completeBtn.addEventListener('click', () => changeTaskStatus(task.id, 'done'));
    }

    if (task.status === 'todo') {
        card.querySelector('.move-left').disabled = true;
    }

    // Buttons Actions
    card.querySelector('.delete-action').addEventListener('click', () => deleteTask(task.id));
    card.querySelector('.edit-action').addEventListener('click', () => openModal(task));
    
    // Mobile actions logic mapped to order: todo -> doing -> done
    const currIdx = ['todo', 'doing', 'done'].indexOf(task.status);
    card.querySelector('.move-left').addEventListener('click', () => {
        if (currIdx > 0) changeTaskStatus(task.id, ['todo', 'doing', 'done'][currIdx - 1]);
    });
    card.querySelector('.move-right').addEventListener('click', () => {
        if (currIdx < 2) changeTaskStatus(task.id, ['todo', 'doing', 'done'][currIdx + 1]);
    });

    // Drag events
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    return card;
}

// ==========================================
// DRAG AND DROP
// ==========================================
let draggedCardId = null;

function handleDragStart(e) {
    draggedCardId = this.dataset.id;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => this.style.opacity = '0.5', 0);
}

function handleDragEnd(e) {
    this.style.opacity = '1';
    draggedCardId = null;
    document.querySelectorAll('.column-body').forEach(col => col.classList.remove('drag-over'));
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!this.classList.contains('drag-over')) {
         this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

async function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    if (!draggedCardId) return;
    
    const newStatus = this.parentElement.dataset.status;
    const task = state.tasks.find(t => t.id === draggedCardId);
    
    if (task && task.status !== newStatus) {
        await changeTaskStatus(draggedCardId, newStatus);
    }
}

// ==========================================
// API ACTIONS
// ==========================================
async function changeTaskStatus(taskId, newStatus) {
    try {
        const updatedTask = await apiFetch(`/api/tasks/${taskId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        
        if (updatedTask) {
            updateLocalTask(updatedTask);
        }
    } catch (err) {
        alert(err.message || 'Erro ao mover tarefa.');
    }
}

async function deleteTask(taskId) {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    
    try {
        await apiFetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
        state.tasks = state.tasks.filter(t => t.id !== taskId);
        renderAll();
    } catch (err) {
        alert(err.message || 'Erro ao deletar tarefa.');
    }
}

// ==========================================
// MODAL & FORM
// ==========================================
function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    document.getElementById('newTaskBtn').addEventListener('click', () => openModal());
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
    
    document.getElementById('taskForm').addEventListener('submit', handleTaskFormSubmit);

    // Setup drag zones
    document.querySelectorAll('.column-body').forEach(col => {
        col.addEventListener('dragover', handleDragOver);
        col.addEventListener('dragleave', handleDragLeave);
        col.addEventListener('drop', handleDrop);
    });
}

function openModal(task = null) {
    const errorEl = document.getElementById('formError');
    errorEl.textContent = '';
    
    const form = document.getElementById('taskForm');
    form.reset();

    if (task) {
        document.getElementById('modalTitle').textContent = 'Editar Tarefa';
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDesc').value = task.description || '';
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskStatus').value = task.status;
        
        if (task.startDate) {
            document.getElementById('taskStart').value = task.startDate.split('T')[0];
        }
        if (task.dueDate) {
            document.getElementById('taskDue').value = task.dueDate.split('T')[0];
        }
    } else {
        document.getElementById('modalTitle').textContent = 'Nova Tarefa';
        document.getElementById('taskId').value = '';
    }

    document.getElementById('taskModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('taskModal').classList.add('hidden');
}

async function handleTaskFormSubmit(e) {
    e.preventDefault();
    const errorEl = document.getElementById('formError');
    errorEl.textContent = '';

    const id = document.getElementById('taskId').value;
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDesc').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const status = document.getElementById('taskStatus').value;
    const startDate = document.getElementById('taskStart').value;
    const dueDate = document.getElementById('taskDue').value;

    // Validate dates in DOM just in case, though API validates too
    if (startDate && dueDate) {
        if (new Date(dueDate) < new Date(startDate)) {
            errorEl.textContent = 'O prazo não pode ser inferior à data de início.';
            return;
        }
    }

    const payload = { title, description, priority, status };
    if (startDate) payload.startDate = new Date(startDate).toISOString();
    if (dueDate) payload.dueDate = new Date(dueDate).toISOString();

    try {
        let savedTask;
        if (id) {
            savedTask = await apiFetch(`/api/tasks/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            });
        } else {
            savedTask = await apiFetch(`/api/tasks`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }

        if (savedTask) {
            updateLocalTask(savedTask);
            closeModal();
        }
    } catch (err) {
        errorEl.textContent = err.message || 'Erro ao salvar tarefa.';
    }
}

function updateLocalTask(taskObj) {
    const idx = state.tasks.findIndex(t => t.id === taskObj.id);
    if (idx !== -1) {
        state.tasks[idx] = taskObj;
    } else {
        state.tasks.push(taskObj);
    }
    renderAll();
}
