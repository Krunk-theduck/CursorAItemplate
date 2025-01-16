class GarageUI {
    constructor() {
        this.container = document.getElementById('garage-container');
        this.garageManager = window.garageManager;
        this.currentSort = 'recent';
        this.filters = {
            class: 'all',
            manufacturer: 'all'
        };
    }

    async initialize() {
        if (!this.container) {
            console.error('Garage container not found');
            return;
        }

        this.container.innerHTML = `
            <div class="garage-header">
                <h2>My Garage</h2>
                <div class="garage-controls">
                    <select id="sort-select">
                        <option value="recent">Most Recent</option>
                        <option value="name">Name</option>
                        <option value="value">Value</option>
                        <option value="performance">Performance</option>
                    </select>
                    <select id="class-filter">
                        <option value="all">All Classes</option>
                        <option value="entry">Entry</option>
                        <option value="standard">Standard</option>
                        <option value="performance">Performance</option>
                        <option value="advanced">Advanced</option>
                    </select>
                    <select id="manufacturer-filter">
                        <option value="all">All Manufacturers</option>
                        <option value="Neon Motors">Neon Motors</option>
                        <option value="CyberTech">CyberTech</option>
                    </select>
                </div>
            </div>
            <div class="cars-grid"></div>
        `;

        // Add event listeners
        document.getElementById('sort-select').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.refreshGarage();
        });

        document.getElementById('class-filter').addEventListener('change', (e) => {
            this.filters.class = e.target.value;
            this.refreshGarage();
        });

        document.getElementById('manufacturer-filter').addEventListener('change', (e) => {
            this.filters.manufacturer = e.target.value;
            this.refreshGarage();
        });

        await this.refreshGarage();
    }

    async refreshGarage() {
        const cars = await this.garageManager.loadUserGarage();
        const filteredCars = this.filterCars(cars);
        const sortedCars = this.sortCars(filteredCars);
        this.renderCars(sortedCars);
    }

    filterCars(cars) {
        return cars.filter(car => {
            const classMatch = this.filters.class === 'all' || car.class === this.filters.class;
            const manufacturerMatch = this.filters.manufacturer === 'all' || car.make === this.filters.manufacturer;
            return classMatch && manufacturerMatch;
        });
    }

    sortCars(cars) {
        switch (this.currentSort) {
            case 'name':
                return [...cars].sort((a, b) => `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`));
            case 'value':
                return [...cars].sort((a, b) => b.price - a.price);
            case 'performance':
                return [...cars].sort((a, b) => {
                    const aPerf = Object.values(a.performance).reduce((sum, stat) => sum + stat, 0);
                    const bPerf = Object.values(b.performance).reduce((sum, stat) => sum + stat, 0);
                    return bPerf - aPerf;
                });
            case 'recent':
            default:
                return [...cars].sort((a, b) => b.created - a.created);
        }
    }

    renderCars(cars) {
        const grid = this.container.querySelector('.cars-grid');
        if (!grid) {
            console.error('Cars grid not found');
            return;
        }

        // Clear existing content
        grid.innerHTML = '';
        
        // Create and append each car card
        cars.forEach(car => {
            const card = this.createCarCard(car);
            grid.appendChild(card);
        });

        // Add click listeners to cards
        grid.querySelectorAll('.car-card').forEach(card => {
            card.addEventListener('click', () => this.showCarDetails(card.dataset.uid));
        });
    }

    createCarCard(car) {
        const card = document.createElement('div');
        card.className = `car-card ${car.rarity}`;
        card.dataset.uid = car.uid; // Add the car's UID as a data attribute
        
        card.innerHTML = `
            <div class="car-card-header">
                <span class="car-name">${car.year} ${car.make} ${car.model}</span>
                <span class="car-class">${car.class}</span>
            </div>
            <div class="car-image">
                ${this.getCarSVG(car.vid)}
            </div>
            <div class="car-stats">
                <div class="stat">
                    <span class="stat-label">Top Speed</span>
                    <div class="stat-bar">
                        <div class="stat-fill" style="width: ${car.performance.topSpeed / 3}%"></div>
                    </div>
                </div>
                <div class="stat">
                    <span class="stat-label">Acceleration</span>
                    <div class="stat-bar">
                        <div class="stat-fill" style="width: ${car.performance.acceleration}%"></div>
                    </div>
                </div>
            </div>
            <div class="car-footer">
                <span class="car-condition">Condition: ${car.stats.condition}%</span>
                <span class="car-mileage">${car.stats.mileage}km</span>
            </div>
        `;
        
        return card;
    }

    getCarSVG(vid) {
        // Fetch and cache SVG content
        if (!this.svgCache) {
            this.svgCache = new Map();
        }

        if (!this.svgCache.has(vid)) {
            console.log(`Attempting to load SVG for ${vid}`); // Debug log
            fetch(`/src/assets/cars/${vid}.svg`)
                .then(response => {
                    console.log(`SVG response for ${vid}:`, response.status); // Debug log
                    return response.text();
                })
                .then(svgContent => {
                    console.log(`SVG loaded for ${vid}`); // Debug log
                    this.svgCache.set(vid, svgContent);
                    document.querySelectorAll(`[data-car-vid="${vid}"]`)
                        .forEach(element => {
                            element.innerHTML = svgContent;
                        });
                })
                .catch(error => console.error('Failed to load car SVG:', error));
        }

        return `<div class="car-svg" data-car-vid="${vid}">
                    ${this.svgCache.get(vid) || '<div class="car-placeholder"></div>'}
                </div>`;
    }

    async showCarDetails(uid) {
        const car = this.garageManager.cars.get(uid);
        if (!car) return;

        const modal = document.createElement('div');
        modal.className = 'car-details-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>${car.year} ${car.make} ${car.model}</h2>
                <div class="car-details">
                    <div class="car-image large">
                        ${await this.getHDCarSVG(car.vid)}
                    </div>
                    <div class="car-info">
                        <div class="stats-grid">
                            <div class="stat-box">
                                <span class="stat-label">Top Speed</span>
                                <span class="stat-value">${car.performance.topSpeed} km/h</span>
                            </div>
                            <div class="stat-box">
                                <span class="stat-label">Acceleration</span>
                                <span class="stat-value">${car.performance.acceleration}</span>
                            </div>
                            <div class="stat-box">
                                <span class="stat-label">Handling</span>
                                <span class="stat-value">${car.performance.handling}</span>
                            </div>
                            <div class="stat-box">
                                <span class="stat-label">Braking</span>
                                <span class="stat-value">${car.performance.braking}</span>
                            </div>
                            <div class="stat-box">
                                <span class="stat-label">Nitro</span>
                                <span class="stat-value">${car.performance.nitro}</span>
                            </div>
                        </div>
                        <div class="car-status">
                            <p>Condition: ${car.stats.condition}%</p>
                            <p>Mileage: ${car.stats.mileage}km</p>
                            <p>Class: ${car.class}</p>
                            <p>Rarity: ${car.rarity}</p>
                        </div>
                        <div class="car-actions">
                            <button class="btn-repair" onclick="garageUI.repairCar('${uid}')">Repair</button>
                            <button class="btn-upgrade" onclick="garageUI.showUpgrades('${uid}')">Upgrades</button>
                            <button class="btn-sell" onclick="garageUI.sellCar('${uid}')">Sell</button>
                        </div>
                    </div>
                </div>
                <button class="modal-close" onclick="this.closest('.car-details-modal').remove()">×</button>
            </div>
        `;

        document.body.appendChild(modal);
    }

    async getHDCarSVG(vid) {
        if (!this.hdSvgCache) {
            this.hdSvgCache = new Map();
        }

        if (!this.hdSvgCache.has(vid)) {
            try {
                const response = await fetch(`/src/assets/cars/HD/${vid}.svg`);
                const svgContent = await response.text();
                this.hdSvgCache.set(vid, svgContent);
            } catch (error) {
                console.error('Failed to load HD car SVG:', error);
                return '<div class="car-placeholder large"></div>';
            }
        }

        return `<div class="car-svg hd" data-car-vid="${vid}">
                    ${this.hdSvgCache.get(vid) || '<div class="car-placeholder large"></div>'}
                </div>`;
    }
}

// Initialize and export
window.garageUI = new GarageUI(); 