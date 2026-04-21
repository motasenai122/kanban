const crypto = require('crypto');
const { verifyToken } = require('./_lib/auth');

let tasks = [];

export default async function handler(req, res) {
    const auth = verifyToken(req);
    if (auth.error) return res.status(auth.status).json({ message: auth.error });

    const userId = auth.user.id;
    const { id, action } = req.query;

    if (req.method === 'GET') {
        const userTasks = tasks.filter(t => t.userId === userId);
        return res.status(200).json(userTasks);
    }

    if (req.method === 'POST') {
        const { title, description, status, priority, startDate, dueDate } = req.body;
        const newTask = {
            id: crypto.randomUUID(),
            userId,
            title,
            description: description || "",
            status: status || 'todo',
            priority: priority || 'low',
            startDate: startDate || null,
            dueDate: dueDate || null,
            createdAt: new Date().toISOString()
        };
        tasks.push(newTask);
        return res.status(201).json(newTask);
    }

    if (req.method === 'PATCH') {
        const taskIndex = tasks.findIndex(t => t.id === id && t.userId === userId);
        if (taskIndex === -1) return res.status(404).json({ message: 'Tarefa não encontrada.' });

        if (action === 'status') {
            tasks[taskIndex].status = req.body.status;
            if (req.body.status === 'done') tasks[taskIndex].completedAt = new Date().toISOString();
        } else {
            tasks[taskIndex] = { ...tasks[taskIndex], ...req.body, updatedAt: new Date().toISOString() };
        }
        return res.status(200).json(tasks[taskIndex]);
    }

    if (req.method === 'DELETE') {
        tasks = tasks.filter(t => !(t.id === id && t.userId === userId));
        return res.status(200).json({ message: 'Tarefa removida.' });
    }

    return res.status(405).json({ message: 'Método não permitido.' });
}
