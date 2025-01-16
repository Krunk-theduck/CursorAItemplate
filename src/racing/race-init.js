class RaceInitializer {
    constructor() {
        this.raceData = JSON.parse(localStorage.getItem('raceData'));
        if (!this.raceData) {
            console.error('No race data found');
            window.location.href = '/index.html';
            return;
        }
        this.initialize();
    }

    async initialize() {
        try {
            // Initialize race session
            const sessionId = await window.raceSessionManager.createSession(
                this.raceData.players,
                this.raceData.track
            );

            // Initialize race UI
            if (window.raceUIManager) {
                await window.raceUIManager.initializeRace(sessionId);
            }

            // Start physics engine
            if (window.physicsManager) {
                window.physicsManager.startRaceLoop(sessionId);
            }

            console.log('Race initialized:', sessionId);

        } catch (error) {
            console.error('Failed to initialize race:', error);
            alert('Failed to start race. Returning to lobby...');
            window.location.href = '/index.html';
        }
    }
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', () => {
    window.raceInitializer = new RaceInitializer();
}); 