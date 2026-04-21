const bcrypt = require('bcryptjs'); // Usando bcryptjs para melhor compatibilidade serverless
const jwt = require('jsonwebtoken');
const { verifyToken } = require('./_lib/auth');

// SIMULAÇÃO DE BANCO DE DADOS EM MEMÓRIA
// IMPORTANTE: Em produção, substitua este array por uma conexão com MongoDB, PostgreSQL ou Supabase.
let users = []; 

export default async function handler(req, res) {
    // Configuração básica de CORS para Vercel
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { route } = req.query;

    // ROTA: POST /api/usuarios?route=register
    if (req.method === 'POST' && route === 'register') {
        const { email, password, name } = req.body;
        if (!email || !password || !name) return res.status(400).json({ message: 'Campos obrigatórios faltando.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { id: Date.now().toString(), name, email, password: hashedPassword };
        
        users.push(newUser);
        return res.status(201).json({ message: 'Usuário criado com sucesso!' });
    }

    // ROTA: POST /api/usuarios?route=login
    if (req.method === 'POST' && route === 'login') {
        const { email, password } = req.body;
        const user = users.find(u => u.email === email);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '1h' });
        return res.status(200).json({ token, user: { name: user.name, email: user.email } });
    }

    // ROTA: GET /api/usuarios?route=me (Perfil)
    if (req.method === 'GET' && route === 'me') {
        const auth = verifyToken(req);
        if (auth.error) return res.status(auth.status).json({ message: auth.error });

        return res.status(200).json({ user: auth.user });
    }

    return res.status(404).json({ message: 'Rota não encontrada.' });
}
