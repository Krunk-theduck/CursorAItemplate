class RaceScene {
    constructor(container) {
        this.container = container;
        this.players = new Map();
        this.track = null;
        this.trafficLight = null;
        this.initialized = false;
    }

    initialize() {
        // Create main container
        this.container.innerHTML = `
            <div class="race-viewport">
                ${TrackAsset.createSVG()}
                <div class="traffic-light-container">
                    ${TrafficLightAsset.createSVG()}
                </div>
                <div class="players-container"></div>
            </div>
        `;

        // Store references
        this.track = this.container.querySelector('.track');
        this.trafficLight = this.container.querySelector('.traffic-light');
        this.playersContainer = this.container.querySelector('.players-container');

        this.initialized = true;
    }

    addPlayer(id, name, color, lane) {
        const playerElement = document.createElement('div');
        playerElement.className = 'player';
        playerElement.style.zIndex = lane;
        playerElement.innerHTML = CarAsset.createSVG(color);
        
        // Position player in their lane
        playerElement.style.transform = `translateY(${80 * lane}px)`;
        
        this.playersContainer.appendChild(playerElement);
        this.players.set(id, {
            element: playerElement,
            name,
            color,
            lane,
            position: 0,
            speed: 0
        });
    }

    updatePlayer(id, data) {
        const player = this.players.get(id);
        if (!player) return;

        // Update position
        player.position = data.position;
        player.element.style.transform = 
            `translateY(${80 * player.lane}px) translateX(${data.position}px)`;
        
        // Add motion blur based on speed
        if (data.speed > 0) {
            player.element.style.filter = `blur(${Math.min(data.speed / 10, 5)}px)`;
        }
    }
} 