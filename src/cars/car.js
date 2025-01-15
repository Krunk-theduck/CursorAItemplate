class Car {
    constructor(carData) {
        this.vid = carData.vid;          // Virtual ID (model identifier)
        this.uid = carData.uid;          // Unique ID (specific car instance)
        this.ownerUID = carData.ownerUID;
        this.make = carData.make;
        this.model = carData.model;
        this.year = carData.year;
        this.stats = carData.stats || {};
        this.modifications = carData.modifications || [];
        this.history = carData.history || [];
        this.rarity = carData.rarity || 'common';
        this.class = carData.class || 'entry';
        
        // Performance stats
        this.performance = this.calculatePerformance();
    }

    calculatePerformance() {
        const baseStats = this.stats;
        const modBonus = this.calculateModificationsBonuses();
        
        return {
            acceleration: (baseStats.acceleration || 0) + (modBonus.acceleration || 0),
            topSpeed: (baseStats.topSpeed || 0) + (modBonus.topSpeed || 0),
            handling: (baseStats.handling || 0) + (modBonus.handling || 0),
            braking: (baseStats.braking || 0) + (modBonus.braking || 0),
            nitro: (baseStats.nitro || 0) + (modBonus.nitro || 0)
        };
    }

    calculateModificationsBonuses() {
        if (!Array.isArray(this.modifications)) {
            this.modifications = [];
        }
        
        return this.modifications.reduce((bonus, mod) => {
            if (mod && mod.effects) {
                Object.keys(mod.effects).forEach(stat => {
                    bonus[stat] = (bonus[stat] || 0) + mod.effects[stat];
                });
            }
            return bonus;
        }, {});
    }

    toJSON() {
        return {
            vid: this.vid,
            uid: this.uid,
            ownerUID: this.ownerUID,
            make: this.make,
            model: this.model,
            year: this.year,
            stats: this.stats,
            modifications: this.modifications,
            history: this.history,
            performance: this.performance
        };
    }
} 