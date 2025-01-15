class RaceUIManager {
    constructor() {
        this.initializeEventListeners();
        this.setupRoomListeners();
        this.setupRoomEvents();
        this.countdownInterval = null;
        this.isStarting = false;
        this.isHost = false;
    }

    initializeEventListeners() {
        // Create public race
        document.getElementById('create-public-race').addEventListener('click', async () => {
            try {
                await window.raceRoomManager.createRoom(false);
                console.log('Public race room created');
            } catch (error) {
                console.error('Error creating public race:', error);
            }
        });

        // Create private race
        document.getElementById('create-private-race').addEventListener('click', async () => {
            try {
                const roomKey = await window.raceRoomManager.createRoom(true);
                const roomData = await window.rtdb.ref(`rooms/${roomKey}`).once('value');
                const accessKey = roomData.val().accessKey;
                alert(`Room created! Access key: ${accessKey}`);
            } catch (error) {
                console.error('Error creating private race:', error);
            }
        });

        // Join race handler (delegated)
        document.getElementById('available-races').addEventListener('click', async (e) => {
            if (e.target.classList.contains('join-race')) {
                const roomKey = e.target.closest('.race-room').dataset.roomKey;
                const isPrivate = e.target.closest('.race-room').dataset.private === 'true';
                
                try {
                    if (isPrivate) {
                        const accessKey = prompt('Enter room access key:');
                        if (!accessKey) return;
                        await window.raceRoomManager.joinRoom(roomKey, accessKey);
                    } else {
                        await window.raceRoomManager.joinRoom(roomKey);
                    }
                } catch (error) {
                    alert(error.message);
                }
            }
        });
    }

    setupRoomListeners() {
        // Listen for available rooms
        const roomsRef = window.rtdb.ref('rooms');
        roomsRef.on('value', (snapshot) => {
            this.updateRoomsList(snapshot.val() || {});
        });
    }

    updateRoomsList(rooms) {
        const container = document.getElementById('available-races');
        container.innerHTML = '';

        Object.entries(rooms).forEach(([roomKey, room]) => {
            if (room.status === 'waiting') {
                const roomElement = this.createRoomElement(roomKey, room);
                container.appendChild(roomElement);
            }
        });
    }

    createRoomElement(roomKey, room) {
        const template = document.getElementById('race-room-template');
        const roomElement = template.content.cloneNode(true);
        
        const roomDiv = roomElement.querySelector('.race-room');
        roomDiv.dataset.roomKey = roomKey;
        roomDiv.dataset.private = room.isPrivate;

        const readyCount = Object.values(room.players || {}).filter(p => p.ready).length;
        const totalPlayers = Object.keys(room.players || {}).length;

        roomElement.querySelector('.host-name').textContent = room.hostName;
        roomElement.querySelector('.player-count').textContent = 
            `Ready: ${readyCount}/${totalPlayers}`;
        roomElement.querySelector('.room-status').textContent = 
            room.isPrivate ? 'Private' : 'Open';

        return roomElement.firstElementChild;
    }

    setupRoomEvents() {
        // Handle room joined
        document.addEventListener('roomJoined', (event) => {
            const { roomKey, isHost } = event.detail;
            this.updateUIForActiveRoom(roomKey, isHost);
        });

        // Handle room left
        document.addEventListener('roomLeft', () => {
            this.resetRoomUI();
        });

        // Handle window close/refresh
        window.addEventListener('beforeunload', () => {
            if (window.raceRoomManager) {
                window.raceRoomManager.leaveRoom();
            }
        });

        // Handle race starting
        document.addEventListener('raceStarting', (event) => {
            this.startCountdown(event.detail.countdown);
        });

        // Handle race cancellation
        document.addEventListener('raceCancelled', () => {
            this.cleanupCountdown();
            this.isStarting = false;
            this.updateButtonStates();
            
            // Show cancellation message
            const message = document.createElement('div');
            message.className = 'race-cancelled-message';
            message.textContent = 'Race start cancelled';
            document.body.appendChild(message);
            
            setTimeout(() => {
                message.remove();
            }, 3000);
        });
    }

    updateUIForActiveRoom(roomKey, isHost) {
        this.isHost = isHost; // Store host status
        const raceControls = document.querySelector('.race-controls');
        raceControls.innerHTML = `
            <div class="active-room-info">
                <span>Room: ${roomKey}</span>
                <span>${isHost ? '(Host)' : '(Player)'}</span>
            </div>
            <button id="ready-btn" class="neon-button">Ready</button>
            ${isHost ? '<button id="force-start" class="neon-button">Force Start</button>' : ''}
            <button id="leave-room" class="neon-button warning">Leave Room</button>
        `;

        // Add event listeners
        document.getElementById('ready-btn').addEventListener('click', (e) => {
            if (!this.isStarting) {
                window.raceRoomManager.toggleReady();
            }
        });

        if (isHost) {
            document.getElementById('force-start').addEventListener('click', (e) => {
                if (!this.isStarting) {
                    window.raceRoomManager.forceStart();
                }
            });
        }

        document.getElementById('leave-room').addEventListener('click', () => {
            window.raceRoomManager.leaveRoom();
        });

        this.updateButtonStates();
    }

    resetRoomUI() {
        const raceControls = document.querySelector('.race-controls');
        raceControls.innerHTML = `
            <button id="create-public-race" class="neon-button">Create Public Race</button>
            <button id="create-private-race" class="neon-button">Create Private Race</button>
        `;
        this.initializeEventListeners();
    }

    startCountdown(seconds) {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        this.isStarting = true;
        this.updateButtonStates();

        const countdownOverlay = document.createElement('div');
        countdownOverlay.className = 'countdown-overlay';
        
        // Add cancel button if host
        if (this.isHost) {
            countdownOverlay.innerHTML = `
                <div class="countdown-content">
                    <div class="countdown-number"></div>
                    <div class="countdown-text">Race Starting</div>
                    <button id="cancel-race" class="neon-button warning">Cancel Start</button>
                </div>
            `;

            // Add cancel listener
            countdownOverlay.querySelector('#cancel-race').addEventListener('click', () => {
                window.raceRoomManager.cancelRaceStart();
            });
        } else {
            countdownOverlay.innerHTML = `
                <div class="countdown-content">
                    <div class="countdown-number"></div>
                    <div class="countdown-text">Race Starting</div>
                </div>
            `;
        }

        document.body.appendChild(countdownOverlay);

        let timeLeft = seconds;
        this.updateCountdown(countdownOverlay, timeLeft);

        this.countdownInterval = setInterval(() => {
            timeLeft--;
            this.updateCountdown(countdownOverlay, timeLeft);

            if (timeLeft <= 0) {
                this.cleanupCountdown();
                this.startRace();
            }
        }, 1000);
    }

    updateCountdown(overlay, time) {
        const numberElement = overlay.querySelector('.countdown-number');
        if (numberElement) {
            numberElement.textContent = time;
        }
    }

    cleanupCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        const overlay = document.querySelector('.countdown-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    startRace() {
        // We'll implement this when we create the race mechanics
        console.log('Race starting!');
    }

    updateButtonStates() {
        const readyBtn = document.getElementById('ready-btn');
        const forceStartBtn = document.getElementById('force-start');
        
        if (readyBtn) {
            if (this.isStarting) {
                readyBtn.disabled = true;
                readyBtn.classList.add('disabled');
            } else {
                readyBtn.disabled = false;
                readyBtn.classList.remove('disabled');
            }
        }

        if (forceStartBtn) {
            if (this.isStarting) {
                forceStartBtn.disabled = true;
                forceStartBtn.classList.add('disabled');
            } else {
                forceStartBtn.disabled = false;
                forceStartBtn.classList.remove('disabled');
            }
        }
    }
}

// Initialize UI manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.raceUIManager = new RaceUIManager();
}); 