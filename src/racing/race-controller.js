class RaceController {
    constructor() {
        this.raceData = null;
        this.scene = null;
        this.initialized = false;
        this.sessionManager = window.raceSessionManager;
    }

    async initialize(raceData) {
        try {
            this.raceData = raceData;
            
            // Join race session
            const sessionData = await this.sessionManager.joinSession(raceData.sessionId);
            
            // Initialize scene
            this.scene = new RaceScene();
            await this.scene.initialize(sessionData);

            // Show race UI
            document.getElementById('loading-overlay').classList.add('hidden');
            document.getElementById('race-ui').classList.remove('hidden');

            // Handle page unload
            window.addEventListener('beforeunload', () => {
                this.sessionManager.leaveSession();
            });

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize race:', error);
            window.location.href = '/';
        }
    }

    // Additional race control methods will go here
}

// Initialize and export
window.raceController = new RaceController(); 