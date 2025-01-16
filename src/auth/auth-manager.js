class AuthManager {
    constructor() {
        this.auth = firebase.auth();
        this.setupAuthListeners();
        this.setupUIHandlers();
    }

    setupAuthListeners() {
        this.auth.onAuthStateChanged(user => {
            console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
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

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    console.log('Attempting to log out...');
                    await this.auth.signOut();
                    console.log('Successfully logged out');
                    // Redirect to login page or show login UI
                    document.getElementById('game-container').classList.add('hidden');
                    document.getElementById('auth-container').classList.remove('hidden');
                } catch (error) {
                    console.error('Logout error:', error);
                    // Show error to user
                    alert('Failed to log out: ' + error.message);
                }
            });
        } else {
            console.error('Logout button not found in the DOM');
        }
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

    async onLoginSuccess(user) {
        console.log('Login successful, initializing game systems...');
        
        try {
            // Hide auth container
            document.getElementById('auth-container').classList.add('hidden');
            // Show game container
            document.getElementById('game-container').classList.remove('hidden');

            // Initialize garage
            if (window.garageUI) {
                console.log('Initializing garage...');
                await window.garageUI.initialize();
                // Load and display user's cars
                await window.garageUI.refreshGarage();
                console.log('Garage initialized and populated');
            } else {
                console.error('GarageUI not found');
            }

            // Update user info (credits, etc.)
            const userRef = firebase.database().ref(`users/${user.uid}`);
            const snapshot = await userRef.once('value');
            const userData = snapshot.val() || {};
            
            // Update credits display
            const creditsDisplay = document.getElementById('user-credits');
            if (creditsDisplay) {
                creditsDisplay.textContent = `₢ ${userData.credits || 0}`;
            }

        } catch (error) {
            console.error('Error initializing game systems:', error);
            alert('There was an error loading your garage. Please try refreshing the page.');
        }
    }

    onLogout() {
        console.log('Executing onLogout handler');
        // Hide game UI
        document.getElementById('game-container').classList.add('hidden');
        // Show auth UI
        document.getElementById('auth-container').classList.remove('hidden');
        // Clear any user data
        localStorage.removeItem('userData');
        // Reset any game state
        if (window.garageUI) {
            window.garageUI.reset();
        }
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