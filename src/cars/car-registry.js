class CarRegistry {
    constructor() {
        this.carsData = null;
        this.CARS_REPO_URL = 'https://raw.githubusercontent.com/Krunk-theduck/NeonRacers/refs/heads/main/REGISTRY/cars.json';
        this.loadedCars = new Map();
    }

    async initialize() {
        try {
            const response = await fetch(this.CARS_REPO_URL);
            if (!response.ok) throw new Error('Failed to fetch cars data');
            const data = await response.json();
            // The cars data is in the "cars" array of our JSON
            this.carsData = data.cars;
            console.log('Loaded cars data:', this.carsData);
        } catch (error) {
            console.error('Failed to initialize car registry:', error);
            // Fallback to local data for testing
            this.carsData = [
                {
                    "vid": "NEON_COMPACT_2024",
                    "make": "Neon Motors",
                    "model": "Compact",
                    "year": 2024,
                    "class": "entry",
                    "baseStats": {
                        "acceleration": 55,
                        "topSpeed": 165,
                        "handling": 65,
                        "braking": 60,
                        "nitro": 40
                    },
                    "price": 15000,
                    "rarity": "common",
                    "description": "The perfect starter car for new racers. Reliable and forgiving."
                }
                // ... other cars can be added here
            ];
        }
    }

    generateUID() {
        return 'UID_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async getCarByVID(vid) {
        if (!this.carsData) {
            await this.initialize();
        }
        
        const carTemplate = this.carsData.find(car => car.vid === vid);
        if (!carTemplate) {
            throw new Error(`Car with VID ${vid} not found`);
        }
        
        return carTemplate;
    }

    async createNewCar(vid, ownerUID) {
        const carTemplate = await this.getCarByVID(vid);
        
        const newCar = {
            ...carTemplate,
            uid: this.generateUID(),
            ownerUID: ownerUID,
            created: firebase.database.ServerValue.TIMESTAMP,
            stats: {
                ...carTemplate.baseStats,
                mileage: 0,
                condition: 100,
            },
            modifications: [],
            history: [{
                type: 'created',
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                ownerUID: ownerUID
            }],
            rarity: carTemplate.rarity,
            class: carTemplate.class
        };

        return newCar;
    }
}

// Initialize the registry
window.carRegistry = new CarRegistry(); 
