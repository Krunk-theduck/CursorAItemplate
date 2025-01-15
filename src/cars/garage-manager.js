class GarageManager {
    constructor() {
        this.database = firebase.database();
        this.auth = firebase.auth();
        this.cars = new Map();
    }

    async loadUserGarage() {
        if (!this.auth.currentUser) throw new Error('User not authenticated');

        const garageRef = this.database.ref(`users/${this.auth.currentUser.uid}/garage`);
        
        try {
            const snapshot = await garageRef.once('value');
            const garageData = snapshot.val() || {};
            
            // Clear existing cars
            this.cars.clear();
            
            // Load each car
            for (const [uid, carData] of Object.entries(garageData)) {
                const car = new Car(carData);
                this.cars.set(uid, car);
            }

            return Array.from(this.cars.values());
        } catch (error) {
            console.error('Failed to load garage:', error);
            throw error;
        }
    }

    async addCarToGarage(vid) {
        if (!this.auth.currentUser) throw new Error('User not authenticated');

        try {
            const newCar = await window.carRegistry.createNewCar(
                vid, 
                this.auth.currentUser.uid
            );

            const carRef = this.database.ref(
                `users/${this.auth.currentUser.uid}/garage/${newCar.uid}`
            );

            await carRef.set(newCar);
            
            // Add to local cache
            const car = new Car(newCar);
            this.cars.set(car.uid, car);

            return car;
        } catch (error) {
            console.error('Failed to add car to garage:', error);
            throw error;
        }
    }

    async transferCar(carUID, newOwnerUID) {
        if (!this.auth.currentUser) throw new Error('User not authenticated');
        
        const car = this.cars.get(carUID);
        if (!car) throw new Error('Car not found in garage');
        if (car.ownerUID !== this.auth.currentUser.uid) {
            throw new Error('Not authorized to transfer this car');
        }

        try {
            // Update car history
            car.history.push({
                type: 'transfer',
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                fromUID: this.auth.currentUser.uid,
                toUID: newOwnerUID
            });

            // Update owner
            car.ownerUID = newOwnerUID;

            // Remove from current owner
            await this.database.ref(
                `users/${this.auth.currentUser.uid}/garage/${carUID}`
            ).remove();

            // Add to new owner
            await this.database.ref(
                `users/${newOwnerUID}/garage/${carUID}`
            ).set(car.toJSON());

            // Remove from local cache
            this.cars.delete(carUID);

            return true;
        } catch (error) {
            console.error('Failed to transfer car:', error);
            throw error;
        }
    }
}

window.garageManager = new GarageManager(); 