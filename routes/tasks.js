const express = require('express');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const TASKS_FILE = path.join(__dirname, '../tasks.json');

const getTasks = async () => {
    try {
        const data = await fs.readFile(TASKS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

const saveTasks = async (tasks) => {
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
};

const sanitize = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<\/?[^>]+(>|$)/g, "").trim();
};

const validateDates = (startDate, dueDate) => {
    if (startDate && dueDate) {
        if (new Date(dueDate) < new Date(startDate)) {
            return false;
        }
    }
    return true;
};

// Autenticação obrigatória para todas as rotas de tasks
router.use(verifyToken);

// GET /api/tasks
router.get('/', async (req, res) => {
    const tasks = await getTasks();
    const userTasks = tasks.filter(t => t.userId === req.user.id);
    res.json(userTasks);
});

// POST /api/tasks
router.post('/', async (req, res) => {
    let { title, description, status, priority, startDate, dueDate } = req.body;
    
    if (!title || typeof title !== 'string') {
        return res.status(400).json({ message: "O título é obrigatório." });
    }
    
    title = sanitize(title).substring(0, 100);
    description = description ? sanitize(description).substring(0, 500) : "";
    
    status = ['todo', 'doing', 'done'].includes(status) ? status : 'todo';
    priority = ['low', 'medium', 'high'].includes(priority) ? priority : 'low';
    
    if (!validateDates(startDate, dueDate)) {
        return res.status(400).json({ message: "dueDate deve ser igual ou posterior a startDate." });
    }

    const tasks = await getTasks();
    
    const newTask = {
        id: crypto.randomUUID(),
        userId: req.user.id,
        title,
        description,
        status,
        priority,
        startDate: startDate || null,
        dueDate: dueDate || null,
        completedAt: status === 'done' ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    tasks.push(newTask);
    await saveTasks(tasks);
    
    res.status(201).json(newTask);
});

// PATCH /api/tasks/:id
router.patch('/:id', async (req, res) => {
    const { title, description, priority, startDate, dueDate } = req.body;
    const tasks = await getTasks();
    const taskIndex = tasks.findIndex(t => t.id === req.params.id && t.userId === req.user.id);
    
    if (taskIndex === -1) {
        return res.status(403).json({ message: 'Tarefa não encontrada ou acesso negado.' });
    }
    
    const task = tasks[taskIndex];
    
    const newStartDate = startDate !== undefined ? startDate : task.startDate;
    const newDueDate = dueDate !== undefined ? dueDate : task.dueDate;
    
    if (!validateDates(newStartDate, newDueDate)) {
         return res.status(400).json({ message: "dueDate deve ser igual ou posterior a startDate." });
    }
    
    if (title) task.title = sanitize(title).substring(0, 100);
    if (description !== undefined) task.description = sanitize(description).substring(0, 500);
    if (priority && ['low', 'medium', 'high'].includes(priority)) task.priority = priority;
    
    task.startDate = newStartDate || null;
    task.dueDate = newDueDate || null;
    task.updatedAt = new Date().toISOString();
    
    await saveTasks(tasks);
    res.json(task);
});

// PATCH /api/tasks/:id/status
router.patch('/:id/status', async (req, res) => {
    const { status } = req.body;
    if (!['todo', 'doing', 'done'].includes(status)) {
        return res.status(400).json({ message: "Status inválido." });
    }
    
    const tasks = await getTasks();
    const taskIndex = tasks.findIndex(t => t.id === req.params.id && t.userId === req.user.id);
    
    if (taskIndex === -1) {
        return res.status(403).json({ message: 'Tarefa não encontrada ou acesso negado.' });
    }
    
    const task = tasks[taskIndex];
    const oldStatus = task.status;
    task.status = status;
    task.updatedAt = new Date().toISOString();
    
    if (status === 'done' && oldStatus !== 'done') {
        task.completedAt = new Date().toISOString();
    } else if (status !== 'done') {
        task.completedAt = null;
    }
    
    await saveTasks(tasks);
    res.json(task);
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
    const tasks = await getTasks();
    const initialLength = tasks.length;
    const filteredTasks = tasks.filter(t => !(t.id === req.params.id && t.userId === req.user.id));
    
    if (filteredTasks.length === initialLength) {
         return res.status(403).json({ message: 'Tarefa não encontrada ou acesso negado.' });
    }
    
    await saveTasks(filteredTasks);
    res.status(200).json({ message: "A tarefa foi removida com sucesso." });
});

module.exports = router;
