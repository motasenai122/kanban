const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { addTokenToBlocklist } = require('../middleware/auth');

const router = express.Router();
const USERS_FILE = path.join(__dirname, '../users.json');

// Ajuda a ler/escrever no arquivo
const getUsers = () => {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch(err) {
        return [];
    }
};

const saveUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// Validar requisitos de senha
const isValidPassword = (password) => {
    // Mínimo 8 caracteres, 1 maiúscula, 1 número, 1 especial
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}\[\]:;<>,.?/~`|\\\-]).{8,}$/;
    return regex.test(password);
}

// POST /register
router.post('/register', async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }
    
    // Validar formato de email simples
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ message: 'E-mail em formato inválido.' });
    }

    // Validar forca da senha
    if (!isValidPassword(password)) {
        return res.status(400).json({ message: 'A senha exige no mínimo 8 caracteres, 1 letra maiúscula, 1 número e 1 caractere especial.' });
    }

    const users = getUsers();
    
    if (users.find(u => u.email === email)) {
        // Para fins educacionais ou de negócio que não liguem para vazamento se o email já existe
        return res.status(400).json({ message: 'Este e-mail já está em uso.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: Date.now().toString(),
            name,
            email,
            password: hashedPassword
        };

        users.push(newUser);
        saveUsers(users);

        res.status(201).json({ message: 'Usuário cadastrado com sucesso.' });
    } catch(err) {
        res.status(500).json({ message: 'Erro interno ao criar usuário. Tente novamente mais tarde.' });
    }
});

// POST /login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
         return res.status(400).json({ message: 'Credenciais incompletas.' });
    }

    const users = getUsers();
    const user = users.find(u => u.email === email);

    // Evitar revelar se o erro é no email ou na senha especificamente
    if (!user) {
        return res.status(400).json({ message: 'E-mail ou senha incorretos.' });
    }

    try {
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(400).json({ message: 'E-mail ou senha incorretos.' });
        }

        // Emitir token JWT expira em 1 hora
        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ 
            message: 'Login realizado com sucesso', 
            token, 
            user: { name: user.name, email: user.email }
        });
    } catch(err) {
        res.status(500).json({ message: 'Erro interno durante autenticação.' });
    }
});

// POST /logout
router.post('/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        addTokenToBlocklist(token);
    }
    // Sempre retornar sucesso, mesmo se já não havia token
    res.status(200).json({ message: 'Deslogado com sucesso.' });
});

module.exports = router;
