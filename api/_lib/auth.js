const jwt = require('jsonwebtoken');

const tokenBlocklist = new Set();

const verifyToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: 'Token não fornecido.', status: 401 };
    }

    const token = authHeader.split(' ')[1];
    if (tokenBlocklist.has(token)) {
        return { error: 'Sessão encerrada.', status: 401 };
    }

    try {
        const secret = process.env.JWT_SECRET || 'fallback-secret-para-teste';
        const decoded = jwt.verify(token, secret);
        return { user: decoded };
    } catch (error) {
        return { error: 'Token inválido ou expirado.', status: 403 };
    }
};

module.exports = { verifyToken, tokenBlocklist };
