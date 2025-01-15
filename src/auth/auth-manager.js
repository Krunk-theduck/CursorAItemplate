class AuthManager {
    constructor() {
        this.auth = firebase.auth();
        this.setupAuthListeners();
        this.setupUIHandlers();
    }

    setupAuthListeners() {
        this.auth.onAuthStateChanged(user => {
            if (user) {
                this.onLoginSuccess(user);
            } else {
                this.onLogout();
            }
        });
    }

    setupUIHandlers() {
        // Login button
        document.getElementById('login-btn').addEventListener('click', () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            this.emailLogin(email, password);
        });

        // Google login
        document.getElementById('google-login').addEventListener('click', () => {
            this.googleLogin();
        });

        // Toggle between login/register
        document.getElementById('toggle-auth').addEventListener('click', () => {
            this.toggleAuthMode();
        });
    }

    async emailLogin(email, password) {
        try {
            this.showLoading(true);
            await this.auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            console.error('Login error:', error);
            // Handle error appropriately
        } finally {
            this.showLoading(false);
        }
    }

    async googleLogin() {
        try {
            this.showLoading(true);
            const provider = new firebase.auth.GoogleAuthProvider();
            await this.auth.signInWithPopup(provider);
        } catch (error) {
            console.error('Google login error:', error);
            // Handle error appropriately
        } finally {
            this.showLoading(false);
        }
    }

    onLoginSuccess(user) {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('game-container').classList.remove('hidden');
        // Initialize game here
    }

    onLogout() {
        document.getElementById('game-container').classList.add('hidden');
        document.getElementById('auth-container').classList.remove('hidden');
    }

    showLoading(show) {
        document.getElementById('loading-spinner').classList.toggle('hidden', !show);
        document.getElementById('auth-ui').classList.toggle('hidden', show);
    }

    toggleAuthMode() {
        // Toggle between login and register modes
        const isLogin = document.getElementById('login-btn').textContent === 'Login';
        document.getElementById('login-btn').textContent = isLogin ? 'Register' : 'Login';
        document.getElementById('toggle-auth').textContent = isLogin ? 'Login Instead' : 'Create Account';
    }
}

// Initialize auth manager
const authManager = new AuthManager(); 