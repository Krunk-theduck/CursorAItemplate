class RaceRoomManager {
    constructor() {
        this.database = firebase.database();
        this.auth = firebase.auth();
        this.activeRoom = null;
        this.roomListeners = new Map();
        this.setupConnectionMonitoring();
        this.isStarting = false;
    }

    // Add this new method for connection monitoring
    setupConnectionMonitoring() {
        const connectedRef = this.database.ref('.info/connected');
        connectedRef.on('value', (snap) => {
            if (snap.val() === true && this.activeRoom) {
                this.setupDisconnectHandlers();
            }
        });
    }

    // Add this new method for disconnect handlers
    setupDisconnectHandlers() {
        if (!this.activeRoom || !this.auth.currentUser) return;

        const roomRef = this.database.ref(`rooms/${this.activeRoom}`);
        const playerRef = roomRef.child(`players/${this.auth.currentUser.uid}`);
        const hostRef = roomRef.child('hostId');

        // Set up disconnect cleanup
        playerRef.onDisconnect().remove();

        // Check if user is host
        hostRef.get().then((snapshot) => {
            if (snapshot.val() === this.auth.currentUser.uid) {
                roomRef.onDisconnect().remove();
            }
        });
    }

    // Create a new race room
    async createRoom(isPrivate = false) {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('Must be logged in to create a room');

            // Clear any existing room connection
            await this.leaveRoom();

            const roomRef = this.database.ref('rooms').push();
            const roomKey = roomRef.key;
            const roomData = {
                hostId: user.uid,
                hostName: user.displayName || 'Unknown Driver',
                isPrivate: isPrivate,
                status: 'waiting',
                players: {
                    [user.uid]: {
                        id: user.uid,
                        name: user.displayName || 'Unknown Driver',
                        ready: false,
                        position: { x: 0, y: 0, rotation: 0 },
                        checkpoint: 0,
                        lastActive: firebase.database.ServerValue.TIMESTAMP
                    }
                },
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                accessKey: isPrivate ? this.generateAccessKey() : null
            };

            await roomRef.set(roomData);
            this.activeRoom = roomKey;
            this.listenToRoom(roomKey);
            this.setupDisconnectHandlers();
            
            // Emit room joined event
            document.dispatchEvent(new CustomEvent('roomJoined', { 
                detail: { roomKey, isHost: true }
            }));

            return roomKey;
        } catch (error) {
            console.error('Error creating room:', error);
            throw error;
        }
    }

    // Join an existing room
    async joinRoom(roomKey, accessKey = null) {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('Must be logged in to join a room');

            // Clear any existing room connection
            await this.leaveRoom();

            const roomRef = this.database.ref(`rooms/${roomKey}`);
            const roomSnapshot = await roomRef.once('value');
            const roomData = roomSnapshot.val();

            if (!roomData) throw new Error('Room not found');
            if (roomData.isPrivate && roomData.accessKey !== accessKey) {
                throw new Error('Invalid access key');
            }
            if (roomData.status !== 'waiting') {
                throw new Error('Race has already started');
            }

            // Add player to room
            await roomRef.child('players').update({
                [user.uid]: {
                    id: user.uid,
                    name: user.displayName || 'Unknown Driver',
                    ready: false,
                    position: { x: 0, y: 0, rotation: 0 },
                    checkpoint: 0,
                    lastActive: firebase.database.ServerValue.TIMESTAMP
                }
            });

            this.activeRoom = roomKey;
            this.listenToRoom(roomKey);
            this.setupDisconnectHandlers();

            // Emit room joined event
            document.dispatchEvent(new CustomEvent('roomJoined', { 
                detail: { roomKey, isHost: false }
            }));

            return roomKey;
        } catch (error) {
            console.error('Error joining room:', error);
            throw error;
        }
    }

    // Listen to room updates
    listenToRoom(roomKey) {
        if (this.roomListeners.has(roomKey)) return;

        const roomRef = this.database.ref(`rooms/${roomKey}`);
        const listener = roomRef.on('value', (snapshot) => {
            const roomData = snapshot.val();
            if (!roomData) return;

            // Emit room update event
            const event = new CustomEvent('roomUpdate', { detail: roomData });
            document.dispatchEvent(event);
        });

        this.roomListeners.set(roomKey, listener);
    }

    // Update player position
    async updatePosition(position) {
        if (!this.activeRoom) return;
        const user = this.auth.currentUser;
        if (!user) return;

        try {
            await this.database.ref(`rooms/${this.activeRoom}/players/${user.uid}/position`)
                .update(position);
        } catch (error) {
            console.error('Error updating position:', error);
        }
    }

    // Leave room
    async leaveRoom() {
        if (!this.activeRoom) return;
        const user = this.auth.currentUser;
        if (!user) return;

        try {
            const roomRef = this.database.ref(`rooms/${this.activeRoom}`);
            const playerRef = roomRef.child(`players/${user.uid}`);
            
            // Cancel all onDisconnect operations
            await roomRef.onDisconnect().cancel();
            await playerRef.onDisconnect().cancel();

            const roomSnapshot = await roomRef.once('value');
            const roomData = roomSnapshot.val();

            if (!roomData) return; // Room already deleted

            if (roomData.hostId === user.uid) {
                // If host leaves, remove the room
                await roomRef.remove();
            } else {
                // Otherwise just remove the player
                await playerRef.remove();

                // Check if room is empty
                const playersSnapshot = await roomRef.child('players').once('value');
                if (!playersSnapshot.exists()) {
                    await roomRef.remove();
                }
            }

            // Clean up listeners
            if (this.roomListeners.has(this.activeRoom)) {
                roomRef.off('value', this.roomListeners.get(this.activeRoom));
                this.roomListeners.delete(this.activeRoom);
            }

            this.activeRoom = null;

            // Emit room left event
            document.dispatchEvent(new CustomEvent('roomLeft'));

        } catch (error) {
            console.error('Error leaving room:', error);
        }
    }

    // Generate random access key for private rooms
    generateAccessKey() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    async toggleReady() {
        if (!this.activeRoom || !this.auth.currentUser) return;

        const roomRef = this.database.ref(`rooms/${this.activeRoom}`);
        
        try {
            // Check if room is still accepting input
            const roomSnapshot = await roomRef.once('value');
            const roomData = roomSnapshot.val();
            
            if (!roomData || roomData.status !== 'waiting' || roomData.acceptingInput === false) {
                return; // Prevent ready toggle if race is starting/started
            }

            const playerRef = roomRef.child(`players/${this.auth.currentUser.uid}`);
            const snapshot = await playerRef.child('ready').once('value');
            const currentReady = snapshot.val() || false;
            
            await playerRef.update({ ready: !currentReady });

            if (this.areAllPlayersReady(roomData.players)) {
                this.startRace(roomRef);
            }
        } catch (error) {
            console.error('Error toggling ready status:', error);
        }
    }

    areAllPlayersReady(players) {
        return Object.values(players).every(player => player.ready);
    }

    async startRace(roomRef) {
        if (this.isStarting) return;
        
        try {
            this.isStarting = true;
            
            // Update room status to starting
            await roomRef.update({
                status: 'starting',
                acceptingInput: false,
                canBeCancelled: true
            });

            // Create and show countdown UI
            const countdownOverlay = document.createElement('div');
            countdownOverlay.className = 'countdown-overlay';
            countdownOverlay.innerHTML = `
                <div class="countdown-container">
                    <div class="countdown-number">3</div>
                    <button class="cancel-countdown-btn">Cancel</button>
                </div>
            `;
            document.body.appendChild(countdownOverlay);

            // Add cancel button listener
            const cancelBtn = countdownOverlay.querySelector('.cancel-countdown-btn');
            cancelBtn.addEventListener('click', () => this.cancelRaceStart());

            // Countdown animation
            for (let i = 3; i > 0; i--) {
                const numberEl = countdownOverlay.querySelector('.countdown-number');
                numberEl.textContent = i;
                numberEl.classList.add('countdown-pulse');
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                numberEl.classList.remove('countdown-pulse');
            }

            // Show GO!
            const numberEl = countdownOverlay.querySelector('.countdown-number');
            numberEl.textContent = 'GO!';
            numberEl.classList.add('countdown-pulse');

            // Remove countdown after a short delay
            setTimeout(() => {
                countdownOverlay.remove();
            }, 1000);

            // Continue with race initialization
            await this.initializeRaceSession(roomRef);

        } catch (error) {
            this.isStarting = false;
            console.error('Error starting race:', error);
            alert(`Failed to start race: ${error.message}`);
            throw error;
        }
    }

    async cancelRaceStart() {
        if (!this.activeRoom || !this.auth.currentUser) return;

        const roomRef = this.database.ref(`rooms/${this.activeRoom}`);
        try {
            const snapshot = await roomRef.once('value');
            const roomData = snapshot.val();

            // Only host can cancel and only during starting phase
            if (roomData.hostId !== this.auth.currentUser.uid || 
                roomData.status !== 'starting' || 
                !roomData.canBeCancelled) {
                return;
            }

            await roomRef.update({
                status: 'waiting',
                acceptingInput: true,
                canBeCancelled: false,
                raceStartTime: null
            });

            this.isStarting = false;
            document.dispatchEvent(new CustomEvent('raceCancelled'));

        } catch (error) {
            console.error('Error cancelling race:', error);
        }
    }

    async forceStart() {
        if (!this.activeRoom || !this.auth.currentUser) return;

        const roomRef = this.database.ref(`rooms/${this.activeRoom}`);
        try {
            const snapshot = await roomRef.once('value');
            const roomData = snapshot.val();

            if (roomData.hostId !== this.auth.currentUser.uid) {
                throw new Error('Only the host can force start the race');
            }

            this.startRace(roomRef);
        } catch (error) {
            console.error('Error force starting race:', error);
            throw error;
        }
    }

    async initializeRace() {
        if (!this.activeRoom || !this.auth.currentUser) return;
        
        const roomRef = this.database.ref(`rooms/${this.activeRoom}`);
        try {
            const snapshot = await roomRef.once('value');
            const roomData = snapshot.val();
            
            // Store race data in localStorage for the race page
            localStorage.setItem('raceData', JSON.stringify({
                roomId: this.activeRoom,
                playerId: this.auth.currentUser.uid,
                isHost: roomData.hostId === this.auth.currentUser.uid,
                players: roomData.players,
                track: 'neon_city_1', // We'll implement track selection later
                laps: 3
            }));

            // Redirect to race page
            window.location.href = '/public/race.html';

        } catch (error) {
            console.error('Error initializing race:', error);
        }
    }

    async initializeRaceSession(roomRef) {
        try {
            const roomSnapshot = await roomRef.once('value');
            const roomData = roomSnapshot.val();
            
            if (!roomData) {
                throw new Error('Race room not found');
            }

            // Store race data in localStorage for the race page
            const raceData = {
                roomId: roomRef.key,
                playerId: this.auth.currentUser.uid,
                isHost: roomData.hostId === this.auth.currentUser.uid,
                players: roomData.players,
                track: roomData.trackId || 'neon_city_1', // Default track
                laps: roomData.laps || 3
            };

            // Store data for race.html to access
            localStorage.setItem('raceData', JSON.stringify(raceData));

            // Redirect to race page
            window.location.href = '/race.html';

        } catch (error) {
            console.error('Failed to initialize race session:', error);
            await roomRef.update({ status: 'error' });
            throw error;
        }
    }
}

// Initialize and export
window.raceRoomManager = new RaceRoomManager(); 