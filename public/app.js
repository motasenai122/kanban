// ============================================
// LÓGICA DE UI E AUTENTICAÇÃO FRONT-END
// ============================================

// Elementos da Interface
const authContainer = document.getElementById('auth-container');
const secureContainer = document.getElementById('secure-container');

// Forms & Tabs
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');

// Referências p/ Segurança UI
const loginErrorBox = document.getElementById('login-error');
const regErrorBox = document.getElementById('reg-error');
const regSuccessBox = document.getElementById('reg-success');

const btnLoginSubmit = document.getElementById('btn-submit-login');
const btnRegSubmit = document.getElementById('btn-submit-reg');
const btnLogoff = document.getElementById('btn-logoff');

// ============================================
// CONTROLE DE INTERFACE E EVENTOS (TABS E ALERTAS)
// ============================================
tabLogin.addEventListener('click', () => switchTab('login'));
tabRegister.addEventListener('click', () => switchTab('register'));
btnLogoff.addEventListener('click', performLogoff);
// ============================================
function switchTab(tab) {
    // Esconder mensagens antigas
    hideAllAlerts();

    if (tab === 'login') {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        formLogin.classList.add('active');
        formRegister.classList.remove('active');
    } else {
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
        formLogin.classList.remove('active');
        formRegister.classList.add('active');
    }
}

function showBox(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}

function hideBox(element) {
    element.style.display = 'none';
}

function hideAllAlerts() {
    hideBox(loginErrorBox);
    hideBox(regErrorBox);
    hideBox(regSuccessBox);
}

// ============================================
// REQUISIÇÕES DA API - FETCH WRAPPER
// ============================================
const API_URL = window.location.origin; // Assume que o front está servido pelo próprio express no "/"

// ============================================
// FLUXO DE LOGIN
// ============================================
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAllAlerts();

    const emailInput = document.getElementById('login-email').value;
    const passwordInput = document.getElementById('login-password').value;

    btnLoginSubmit.textContent = 'Autenticando...';
    btnLoginSubmit.disabled = true;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailInput, password: passwordInput })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erro de autenticação');
        }

        // Sucesso: Salvar Token e Atualizar Estado
        localStorage.setItem('auth_token', data.token);
        
        // Carrega o Perfil logado
        fetchUserProfile();

    } catch (error) {
        showBox(loginErrorBox, error.message);
    } finally {
        btnLoginSubmit.textContent = 'Entrar no sistema';
        btnLoginSubmit.disabled = false;
        document.getElementById('login-password').value = '';
    }
});


// ============================================
// FLUXO DE REGISTRO
// ============================================
formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAllAlerts();

    const nameInput = document.getElementById('reg-name').value;
    const emailInput = document.getElementById('reg-email').value;
    const passwordInput = document.getElementById('reg-password').value;

    btnRegSubmit.textContent = 'Registrando...';
    btnRegSubmit.disabled = true;

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: nameInput, email: emailInput, password: passwordInput })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erro ao registrar usuário');
        }

        showBox(regSuccessBox, 'Cadastro efetuado! Retorne na aba "Acessar" para logar.');
        formRegister.reset();

    } catch (error) {
        showBox(regErrorBox, error.message);
    } finally {
        btnRegSubmit.textContent = 'Finalizar Cadastro';
        btnRegSubmit.disabled = false;
    }
});


// ============================================
// VALIDAÇÃO E FLUXO PROTEGIDO (ÁREA LOGADA)
// ============================================
async function fetchUserProfile() {
    const token = localStorage.getItem('auth_token');
    
    // Nao tenta acessar a API sem o token
    if (!token) {
        showAuthScreen();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/user/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        // Mostrar dados e liberar tela
        renderSecureView(data.user);

    } catch (error) {
        console.error('Sessão invalida:', error);
        localStorage.removeItem('auth_token'); // Limpa preventivo
        showAuthScreen();
    }
}

function renderSecureView(user) {
    window.location.href = '/kanban.html';
}

function showAuthScreen() {
    secureContainer.style.opacity = '0';
    setTimeout(() => {
        secureContainer.classList.add('hidden');
        secureContainer.style.display = 'none';
        
        authContainer.classList.remove('hidden');
        authContainer.style.display = 'block';
    }, 300);
}

// ============================================
// LOGOFF
// ============================================
async function performLogoff() {
    const token = localStorage.getItem('auth_token');
    if (token) {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.log('Logoff API silencioso falhou', error);
        }
    }
    
    // Independente da API, sempre deleta localmente
    localStorage.removeItem('auth_token');
    showAuthScreen();
    
    // Limpa views para nova entrada
    formLogin.reset();
}

// ============================================
// BOOTSTRAP (VERIFICA SESSÃO AO ABRIR)
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    fetchUserProfile(); // Tenta carregar token salvo
});
