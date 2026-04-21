const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../server');

const USERS_FILE = path.join(__dirname, '../users.json');

// Helper para limpar usuarios persistidos antes/depois dos testes
const clearDB = () => {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
};

beforeAll(() => {
    clearDB();
});

afterAll(() => {
    clearDB();
});

describe('E2E Auth Integration', () => {
    
    let jwtToken = '';

    describe('POST /auth/register', () => {
        it('deve rejeitar email inválido formatado', async () => {
            const res = await request(app)
                .post('/auth/register')
                .send({
                    name: 'Bad Email',
                    email: 'bad-email@.com.',
                    password: 'T3stUser123!'
                });
            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toBe('E-mail em formato inválido.');
        });

        it('deve rejeitar senha que nao atende requisitos mínimos de forca', async () => {
            const res = await request(app)
                .post('/auth/register')
                .send({
                    name: 'Zoe',
                    email: 'zoe@test.com',
                    password: 'weak'
                });
            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toMatch(/A senha exige no mínimo/);
        });

        it('deve cadastrar com credenciais válidas seguindo E2E flow', async () => {
            const res = await request(app)
                .post('/auth/register')
                .send({
                    name: 'Jest E2E Runner',
                    email: 'jest@example.com',
                    password: 'T3stUser123!'
                });
            
            expect(res.statusCode).toEqual(201);
            expect(res.body.message).toBe('Usuário cadastrado com sucesso.');
        });
    });

    describe('POST /auth/login e Segurança de Sessao', () => {
        it('não deve logar com senha incorreta e nao deve vazar por que erro explodiu', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({ email: 'jest@example.com', password: 'WrongPassword!' });
            
            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toBe('E-mail ou senha incorretos.');
        });

        it('deve logar e devolver JWT no login correto', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({ email: 'jest@example.com', password: 'T3stUser123!' });
            
            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('Login realizado com sucesso');
            expect(res.body.token).toBeDefined();

            jwtToken = res.body.token; 
        });
    });

    describe('Acesso a Rota Protegida (Rate limit & JWT check GET /user/me)', () => {
        
        it('deve negar o request sem Authorization Bearer Token', async () => {
            const res = await request(app).get('/user/me');
            expect(res.statusCode).toEqual(401);
        });

        it('deve liberar se o JWT verdadeiro for repassado como Header', async () => {
            const res = await request(app)
                .get('/user/me')
                .set('Authorization', `Bearer ${jwtToken}`);
            
            expect(res.statusCode).toEqual(200);
            expect(res.body.user.email).toBe('jest@example.com');
        });
    });

    describe('POST /auth/logout', () => {
        it('deve invalidar o jwt ao relizar o logout, impedindo acesso futuro as rotas protegidas (Blocklist check)', async () => {
            const resLogout = await request(app)
                .post('/auth/logout')
                .set('Authorization', `Bearer ${jwtToken}`);

            expect(resLogout.statusCode).toEqual(200);

            // Recomprova a rota /me que anteriormente funcionava
            const resMe = await request(app)
                .get('/user/me')
                .set('Authorization', `Bearer ${jwtToken}`);
            
            expect(resMe.statusCode).toEqual(401);
            expect(resMe.body.message).toBe('Sessão encerrada (Token revogado).');
        });
    });
});
