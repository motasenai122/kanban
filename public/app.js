const authContainer = document.getElementById('auth-container');
const secureContainer = document.getElementById('secure-container');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const loginErrorBox = document.getElementById('login-error');
const regErrorBox = document.getElementById('reg-error');
const regSuccessBox = document.getElementById('reg-success');
const btnLoginSubmit = document.getElementById('btn-submit-login');
const btnRegSubmit = document.getElementById('btn-submit-reg');
const btnLogoff = document.getElementById('btn-logoff');

tabLogin.addEventListener('click', () => switchTab('login'));
tabRegister.addEventListener('click', () => switchTab('register'));
btnLogoff.addEventListener('click', performLogoff);

function switchTab(tab) {
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
const API_URL = '/api';
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAllAlerts();
    const emailInput = document.getElementById('login-email').value;
    const passwordInput = document.getElementById('login-password').value;
    btnLoginSubmit.textContent = 'Autenticando...';
    btnLoginSubmit.disabled = true;
    try {
        const response = await fetch(`${API_URL}/usuarios?route=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailInput, password: passwordInput })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Erro de autenticação');
        localStorage.setItem('auth_token', data.token);
        fetchUserProfile();
    } catch (error) {
        showBox(loginErrorBox, error.message);
    } finally {
        btnLoginSubmit.textContent = 'Entrar no sistema';
        btnLoginSubmit.disabled = false;
        document.getElementById('login-password').value = '';
    }
});
formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAllAlerts();
    const nameInput = document.getElementById('reg-name').value;
    const emailInput = document.getElementById('reg-email').value;
    const passwordInput = document.getElementById('reg-password').value;
    btnRegSubmit.textContent = 'Registrando...';
    btnRegSubmit.disabled = true;
    try {
        const response = await fetch(`${API_URL}/usuarios?route=register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: nameInput, email: emailInput, password: passwordInput })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Erro ao registrar usuário');
        showBox(regSuccessBox, 'Cadastro efetuado! Retorne na aba "Acessar" para logar.');
        formRegister.reset();
    } catch (error) {
        showBox(regErrorBox, error.message);
    } finally {
        btnRegSubmit.textContent = 'Finalizar Cadastro';
        btnRegSubmit.disabled = false;
    }
});
async function fetchUserProfile() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        showAuthScreen();
        return;
    }
    try {
        const response = await fetch(`${API_URL}/usuarios?route=me`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        renderSecureView(data.user);
    } catch (error) {
        localStorage.removeItem('auth_token');
        showAuthScreen();
    }
}
function renderSecureView(user) {
    window.location.href = '/kanban.html';
}
function showAuthScreen() {
    secureContainer.classList.add('hidden');
    secureContainer.style.display = 'none';
    authContainer.classList.remove('hidden');
    authContainer.style.display = 'block';
}
async function performLogoff() {
    const token = localStorage.getItem('auth_token');
    if (token) {
        try {
            await fetch(`${API_URL}/usuarios?route=logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {}
    }
    localStorage.removeItem('auth_token');
    showAuthScreen();
    formLogin.reset();
}
window.addEventListener('DOMContentLoaded', () => {
    fetchUserProfile();
});
