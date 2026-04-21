const express = require('express');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /me - Retorna informações de contexto do usuario ativo
router.get('/me', verifyToken, (req, res) => {
    // req.user foi provido pelo middleware verifyToken após a decodificação
    res.status(200).json({ 
        message: 'Acesso autorizado.',
        user: { 
            name: req.user.name, 
            email: req.user.email 
        }
    });
});

module.exports = router;
