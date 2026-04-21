const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('./_lib/auth');

// SIMULAÇÃO DE BANCO DE DADOS EM MEMÓRIA
let users = []; 

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { route } = req.query;
        // Garantir que o body existe
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        // ROTA: POST /api/usuarios?route=register
        if (req.method === 'POST' && route === 'register') {
            const { email, password, name } = body || {};
            if (!email || !password || !name) {
                return res.status(400).json({ message: 'Campos obrigatórios faltando (nome, email ou senha).' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = { id: Date.now().toString(), name, email, password: hashedPassword };
            
            users.push(newUser);
            return res.status(201).json({ message: 'Usuário criado com sucesso!', email: newUser.email });
        }

        // ROTA: POST /api/usuarios?route=login
        if (req.method === 'POST' && route === 'login') {
            const { email, password } = body || {};
            if (!email || !password) {
                return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
            }

            const user = users.find(u => u.email === email);
            if (!user) {
                return res.status(401).json({ message: 'Usuário não encontrado.' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Senha incorreta.' });
            }

            // Fallback para secret caso não esteja no env
            const secret = process.env.JWT_SECRET || 'fallback-secret-para-teste';
            const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, secret, { expiresIn: '1h' });
            
            return res.status(200).json({ token, user: { name: user.name, email: user.email } });
        }

        // ROTA: GET /api/usuarios?route=me
        if (req.method === 'GET' && route === 'me') {
            const auth = verifyToken(req);
            if (auth.error) return res.status(auth.status).json({ message: auth.error });
            return res.status(200).json({ user: auth.user });
        }

        return res.status(404).json({ message: `Rota não encontrada: ${route}` });

    } catch (error) {
        console.error('Erro na função usuarios:', error);
        return res.status(500).json({ 
            message: 'Erro interno no servidor.', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
