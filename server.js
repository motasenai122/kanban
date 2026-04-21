const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mock para req.query e outros padrões da Vercel
const wrapHandler = (handler) => async (req, res) => {
    try {
        await handler(req, res);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno no servidor adaptador.' });
    }
};

// Importar handlers
const usuariosHandler = require('./api/usuarios').default;
const tarefasHandler = require('./api/tarefas').default;

// Rotas API
app.all('/api/usuarios', wrapHandler(usuariosHandler));
app.all('/api/tarefas', wrapHandler(tarefasHandler));

// Fallback para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor adaptador rodando na porta ${PORT}`);
});
