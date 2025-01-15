class RaceSessionManager {
    constructor() {
        this.database = firebase.database();
        this.auth = firebase.auth();
        this.activeSession = null;
        this.playerRefs = new Map();
        this.disconnectHandlers = new Map();
    }

    async joinSession(sessionId) {
        try {
            const sessionRef = this.database.ref(`race_sessions/${sessionId}`);
            const snapshot = await sessionRef.once('value');
            const sessionData = snapshot.val();

            if (!sessionData) {
                throw new Error('Race session not found');
            }

            // Verify player is part of this race
            if (!sessionData.players[this.auth.currentUser.uid]) {
                throw new Error('Not authorized to join this race');
            }

            this.activeSession = sessionId;

            // Set up presence system
            this.setupPresence(sessionId);

            return sessionData;
        } catch (error) {
            console.error('Error joining race session:', error);
            throw error;
        }
    }

    setupPresence(sessionId) {
        const playerId = this.auth.currentUser.uid;
        const playerRef = this.database.ref(`race_sessions/${sessionId}/players/${playerId}`);
        const connectedRef = this.database.ref('.info/connected');

        connectedRef.on('value', (snap) => {
            if (snap.val() === true) {
                // Set up disconnect cleanup
                const onDisconnect = playerRef.child('connected').onDisconnect();
                onDisconnect.set(false);

                // Set connected status
                playerRef.child('connected').set(true);

                this.disconnectHandlers.set(playerId, onDisconnect);
            }
        });

        this.playerRefs.set(playerId, playerRef);
    }

    async leaveSession() {
        if (!this.activeSession) return;

        try {
            const playerId = this.auth.currentUser.uid;
            
            // Clear disconnect handlers
            if (this.disconnectHandlers.has(playerId)) {
                await this.disconnectHandlers.get(playerId).cancel();
                this.disconnectHandlers.delete(playerId);
            }

            // Update player status
            if (this.playerRefs.has(playerId)) {
                await this.playerRefs.get(playerId).child('connected').set(false);
                this.playerRefs.delete(playerId);
            }

            // Check if last player and cleanup if needed
            const sessionRef = this.database.ref(`race_sessions/${this.activeSession}`);
            const snapshot = await sessionRef.child('players').once('value');
            const players = snapshot.val();
            
            const connectedPlayers = Object.values(players).filter(p => p.connected);
            if (connectedPlayers.length === 0) {
                await sessionRef.remove();
            }

            this.activeSession = null;
        } catch (error) {
            console.error('Error leaving race session:', error);
        }
    }

    // Add method to update player state
    async updatePlayerState(state) {
        if (!this.activeSession || !this.auth.currentUser) return;

        const playerRef = this.database.ref(
            `race_sessions/${this.activeSession}/players/${this.auth.currentUser.uid}`
        );

        try {
            await playerRef.update({
                state: state,
                lastUpdate: firebase.database.ServerValue.TIMESTAMP
            });
        } catch (error) {
            console.error('Error updating player state:', error);
        }
    }
}

// Initialize and export
window.raceSessionManager = new RaceSessionManager(); 