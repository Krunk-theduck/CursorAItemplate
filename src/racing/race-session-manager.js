class RaceSessionManager {
    constructor() {
        this.database = firebase.database();
        this.auth = firebase.auth();
        this.activeSession = null;
        this.playerRefs = new Map();
        this.disconnectHandlers = new Map();
    }

    async createSession(players, trackId) {
        try {
            const sessionId = `race_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const sessionRef = this.database.ref(`race_sessions/${sessionId}`);

            // Initialize session data
            const sessionData = {
                id: sessionId,
                trackId: trackId,
                status: 'initializing',
                startTime: null,
                players: {},
                checkpoints: {},
                finished: false
            };

            // Add each player to the session
            for (const [playerId, playerData] of Object.entries(players)) {
                sessionData.players[playerId] = {
                    uid: playerId,
                    carId: playerData.carId,
                    position: { x: 0, y: 0, rotation: 0 },
                    checkpoint: 0,
                    finished: false,
                    connected: false,
                    ready: false
                };
            }

            // Create the session in Firebase
            await sessionRef.set(sessionData);
            
            // Join the session
            await this.joinSession(sessionId);
            
            return sessionId;
        } catch (error) {
            console.error('Error creating race session:', error);
            throw error;
        }
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

            // Initialize player state
            await this.initializePlayerState(sessionId);

            return sessionData;
        } catch (error) {
            console.error('Error joining race session:', error);
            throw error;
        }
    }

    async initializePlayerState(sessionId) {
        const playerId = this.auth.currentUser.uid;
        const playerRef = this.database.ref(`race_sessions/${sessionId}/players/${playerId}`);

        // Get player's car data
        const carId = await this.getPlayerCar(playerId);
        
        // Initialize player state
        await playerRef.update({
            carId: carId,
            position: { x: 0, y: 0, rotation: 0 },
            velocity: { x: 0, y: 0 },
            acceleration: 0,
            input: {
                throttle: 0,
                brake: 0,
                steering: 0
            },
            ready: true,
            connected: true,
            lastUpdate: firebase.database.ServerValue.TIMESTAMP
        });
    }

    async getPlayerCar(playerId) {
        // Get the selected car from the garage
        const userRef = this.database.ref(`users/${playerId}/selectedCar`);
        const snapshot = await userRef.once('value');
        return snapshot.val();
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