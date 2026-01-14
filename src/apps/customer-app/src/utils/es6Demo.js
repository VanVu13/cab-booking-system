// ============ ES6 FEATURES DEMONSTRATION ============

// 1. Arrow Functions
const greet = (name) => `Hello, ${name}!`;
console.log(greet('Customer'));

// 2. Template Literals
const user = { name: 'John', rides: 15 };
console.log(`User ${user.name} has booked ${user.rides} rides.`);

// 3. Destructuring
const { name, rides } = user;
console.log(`Destructured: ${name}, ${rides} rides`);

// Array destructuring
const rideTypes = ['Standard', 'Premium', 'SUV'];
const [firstRide, ...others] = rideTypes;
console.log(`First: ${firstRide}, Others: ${others}`);

// 4. Default Parameters
const calculateFare = (distance = 5, rate = 10) => distance * rate;
console.log(`Default fare: ${calculateFare()}`);

// 5. Spread Operator
const availableDrivers = ['Raj', 'Sam', 'Mike'];
const newDrivers = ['Alex', ...availableDrivers, 'Tom'];
console.log('All drivers:', newDrivers);

// 6. Rest Parameters
const sumRidesFares = (...fares) => fares.reduce((total, fare) => total + fare, 0);
console.log('Total fares:', sumRidesFares(250, 300, 180, 400));

// 7. Enhanced Object Literals
const createRide = (type, price, driver) => ({
  type,  // Shorthand property
  price,
  driver,
  getDescription() {  // Method shorthand
    return `${this.type} ride with ${this.driver} for ${this.price}`;
  }
});

const myRide = createRide('Premium', '₹350', 'Rajesh');
console.log(myRide.getDescription());

// 8. Classes
class Ride {
  constructor(pickup, destination, type = 'Standard') {
    this.pickup = pickup;
    this.destination = destination;
    this.type = type;
    this.id = Date.now();
    this.status = 'pending';
  }

  // Getter
  get details() {
    return `${this.type} ride from ${this.pickup} to ${this.destination}`;
  }

  // Method
  confirm() {
    this.status = 'confirmed';
    return `Ride ${this.id} confirmed!`;
  }

  // Static method
  static getAvailableTypes() {
    return ['Standard', 'Premium', 'SUV', 'Luxury'];
  }
}

const ride1 = new Ride('Airport', 'Hotel', 'Premium');
console.log(ride1.details);
console.log(ride1.confirm());
console.log('Available types:', Ride.getAvailableTypes());

// 9. Promises & Async/Await
const simulateApiCall = (data, delay = 1000) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, data });
    }, delay);
  });
};

// Using async/await
const bookRideAsync = async (rideDetails) => {
  try {
    console.log('Booking ride...');
    const response = await simulateApiCall(rideDetails);
    console.log('Booking successful:', response);
    return response;
  } catch (error) {
    console.error('Booking failed:', error);
  }
};

// 10. Modules (Export/Import)
export const constants = {
  RIDE_TYPES: ['Standard', 'Premium', 'SUV'],
  STATUSES: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  }
};

export { greet, Ride, bookRideAsync };
export default calculateFare;