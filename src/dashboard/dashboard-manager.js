class DashboardManager {
    constructor() {
        this.initializeNavigation();
        this.loadUserData();
    }

    initializeNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.switchSection(button.dataset.section);
            });
        });

        // Logout handler
        document.getElementById('logout-btn').addEventListener('click', () => {
            firebase.auth().signOut();
        });
    }

    switchSection(sectionId) {
        // Update navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.section === sectionId) {
                btn.classList.add('active');
            }
        });

        // Update sections
        document.querySelectorAll('.dashboard-section').forEach(section => {
            section.classList.remove('active');
            section.classList.add('hidden');
            if (section.id === `${sectionId}-section`) {
                section.classList.remove('hidden');
                section.classList.add('active');
            }
        });
    }

    async loadUserData() {
        const user = firebase.auth().currentUser;
        if (user) {
            try {
                const userDoc = await firebase.firestore()
                    .collection('users')
                    .doc(user.uid)
                    .get();
                
                const userData = userDoc.data();
                if (userData) {
                    document.getElementById('user-credits').textContent = 
                        `₢ ${userData.credits?.toLocaleString() || 0}`;
                }
            } catch (error) {
                console.error('Error loading user data:', error);
            }
        }
    }
}

// Initialize dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
}); 