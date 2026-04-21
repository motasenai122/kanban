require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middlewares
app.use(helmet());
app.use(cors());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limit each IP to 100 requests per windowMs
  message: '{"message": "Muitas requisições deste IP, por favor tente novamente mais tarde."}'
});
app.use('/auth/login', limiter); // Aplicando rate limit mais rigoroso ao login
app.use('/auth/register', limiter); // E registro

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Frontend
app.use(express.static(path.join(__dirname, 'public')));

const tasksRoutes = require('./routes/tasks');

// Routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);

const tasksLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // Limite de 60 requests por IP para api/tasks
  message: '{"message": "Muitas requisições deste IP, por favor tente novamente mais tarde."}'
});
app.use('/api/tasks', tasksLimiter, tasksRoutes);

// Iniciar servidor somente se chamado diretamente
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  });
}

module.exports = app;
