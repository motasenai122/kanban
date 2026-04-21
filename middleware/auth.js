const jwt = require('jsonwebtoken');

// Blocklist em memória
const tokenBlocklist = new Set();

const addTokenToBlocklist = (token) => {
    tokenBlocklist.add(token);
};

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token não fornecido ou inválido.' });
    }

    const token = authHeader.split(' ')[1];

    if (tokenBlocklist.has(token)) {
        return res.status(401).json({ message: 'Sessão encerrada (Token revogado).' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Adiciona os dados do utilizador no request
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Falha na autenticação do token ou token expirado.' });
    }
};

module.exports = {
    verifyToken,
    addTokenToBlocklist
};
