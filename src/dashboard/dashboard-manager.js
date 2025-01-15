class DashboardManager {
    constructor() {
        this.sections = {
            garage: document.getElementById('garage-section'),
            race: document.getElementById('race-section'),
            shop: document.getElementById('shop-section'),
            profile: document.getElementById('profile-section')
        };
        
        this.garageUI = window.garageUI;
        this.garageInitialized = false;
    }

    async initialize() {
        // Wait for auth to be ready
        await new Promise(resolve => {
            const unsubscribe = firebase.auth().onAuthStateChanged(user => {
                unsubscribe();
                resolve(user);
            });
        });

        // Initialize garage by default since it's the landing section
        try {
            await this.garageUI.initialize();
            this.garageInitialized = true;
            
            // Load user's cars immediately
            await this.garageUI.refreshGarage();
        } catch (error) {
            console.error('Failed to initialize garage:', error);
        }

        // Add navigation listeners
        document.querySelectorAll('.nav-btn').forEach(button => {
            button.addEventListener('click', () => {
                this.showSection(button.dataset.section);
            });
        });
    }

    async showSection(sectionId) {
        // Update active button
        document.querySelectorAll('.nav-btn').forEach(button => {
            button.classList.toggle('active', button.dataset.section === sectionId);
        });

        // Hide all sections
        Object.values(this.sections).forEach(section => {
            if (section) {
                section.classList.add('hidden');
            }
        });

        // Show selected section
        const section = this.sections[sectionId];
        if (section) {
            section.classList.remove('hidden');
            console.log(`Showing section: ${sectionId}`);
        } else {
            console.error(`Section not found: ${sectionId}`);
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
    window.dashboardManager.initialize();
}); 