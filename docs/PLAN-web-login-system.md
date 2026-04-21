# Planejamento: Sistema de Login Web

## 🌟 Visão Geral
Sistema de autenticação web seguro, consistindo em um back-end Express.js gerando tokens JWT e um front-end em Vanilla JS. O armazenamento inicial de usuários será feito num arquivo local `users.json` por simplicidade, aplicando hash bcrypt para senhas. O design prioriza a segurança e mitigação de vulnerabilidades com middlewares e headers apropriados.

## 🏗 Tipo de Projeto
**WEB / BACKEND** (Fullstack Simplificado)

## 🎯 Critérios de Sucesso
- Cadastro e login funcionais usando API REST e fetch.
- Armazenamento com senhas protegidas via Bcrypt em `users.json`.
- Rotas protegidas exigindo token JWT (Bearer).
- Invalidação de token funcional via `blocklist` em memória em eventos de logout.
- Segurança de rede e transporte (Rate Limit, Helmet, CORS devidamente configurados).
- Senhas seguindo políticas estritas (8 caracteres, letras maiúsculas, números e especiais).

## 🛠 Stack Tecnológico
- **Back-end:** Node.js, Express.js
- **Segurança Backend:** JWT (jsonwebtoken), bcrypt, helmet, express-rate-limit, cors, dotenv
- **Armazenamento:** Arquivo do sistema (`users.json`)
- **Front-end:** HTML5, CSS3, JS Vanilla (Fetch API, DOM manipulation)

## 📁 Estrutura de Arquivos
```text
projeto/
├── server.js             # Entrada do servidor Node
├── users.json            # Banco de dados simulado (gerado magicamente)
├── .env                  # Variáveis de Configuração e Segredos
├── middleware/
│   └── auth.js           # Verificação JWT, proteção e Blocklist
├── routes/
│   ├── auth.js           # Serviços de Auth (/register, /login, /logout)
│   └── user.js           # Acesso as Rotas de usuário (/me)
└── public/
    ├── index.html        # Estrutura visual combinada
    ├── style.css         # Aparência (com observação para ban de template)
    └── app.js            # Lógica cliente para formulários
```

## 📋 Detalhamento de Tarefas

### Tarefa 1: Fundação do Servidor
- **Agente:** `@backend-specialist`
- **Habilidade:** `nodejs-best-practices`
- **INPUT:** Pacotes base npm e `.env`.
- **OUTPUT:** `server.js` exportando express rodando na porta correta e servindo `public` de forma segura.
- **VERIFY:** `node server.js` sobe sem erros na porta escolhida e renderiza index da pasta estática.

### Tarefa 2: Tratamento de Arquivo e Segurança
- **Agente:** `@security-auditor`
- **Habilidade:** `nodejs-best-practices`
- **INPUT:** Biblioteca bcrypt, pacote JWT.
- **OUTPUT:** Interações de leitura/escrita garantidas para `users.json`. Middleware autônomo `auth.js` com listagem bloqueada.
- **VERIFY:** Hash salt 10 gravado corretamente e blocos de memory arrays valendo como blocklits.

### Tarefa 3: Endpoints de Autenticação (Controllers/Routes)
- **Agente:** `@backend-specialist`
- **Habilidade:** `api-patterns`
- **INPUT:** Rotas do Express invocando arquivo de Auth.
- **OUTPUT:** `auth.js` e `user.js` (Rotas).
- **VERIFY:** Statuses de retorno omitidos para "falhas específicas" sem vazar se email já existe. Sucessos entregam um JSON com Tokens válidos. Validações nas rotas usando Express e regex.

### Tarefa 4: Reforço com Escudos Digitais
- **Agente:** `@security-auditor`
- **Habilidade:** `vulnerability-scanner`
- **INPUT:** Stack rodando internamente.
- **OUTPUT:** Proteção ativa de `Helmet`, políticas de `CORS` seguras, e defesas via `Rate limit` implantadas no index da API.
- **VERIFY:** Requests exaustivos falham (429 HTTP Too Many Requests). Headers HTTP não expõem frameworks usando X-Powered-By na inspeção HTTP.

### Tarefa 5: Desenvolvimento da UI Front-End
- **Agente:** `@frontend-specialist`
- **Habilidade:** `frontend-design`
- **INPUT:** `public/index.html` e `public/style.css`.
- **OUTPUT:** Interface moderna em Vanilla HTML e CSS mantendo SPA. Telas dinamicamente ocultadas baseado no status, com visuais Premium ("wow effect"). Cor rosa/violeta está estritamente desabilitada.
- **VERIFY:** Transições fluidas visíveis no navegador e Layouts adequados em mobile ou em telas longas. Interação do toggle (Login/Cadastro) ativa.

### Tarefa 6: Interação, Lógica DOM e Local Storage
- **Agente:** `@frontend-specialist`
- **Habilidade:** `react-best-practices` (Aplicado a Javascript puro)
- **INPUT:** Elementos DOM construidos na fase de design.
- **OUTPUT:** `public/app.js` final operante gerenciando `fetch()` Requests (headers Autorization configurados) e guardando/apagando `JWT` baseados nas lógicas seguras.
- **VERIFY:** Cadastro reage com mensagem. Logar renderiza View protegida de `me`. Evento Logoff reseta View.

---

## ✅ FASE X: VERIFICAÇÃO FINAL
- [ ] Verificações Scripts Run:  Auditorias com Script (Socratic check pass, Template e Cores não violetas respeitadas).
- [ ] Build & Testes manuais: Testamos rodando local server (`npm run dev`) para conferir se Front-End envia tudo em formato esperado.
- [ ] Segurança confirmada via manual checklist (CORS, JWT expirações).
