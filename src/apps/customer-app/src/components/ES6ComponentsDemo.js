import React, { useState, useEffect } from 'react';
import { Card, ListGroup, Button } from 'react-bootstrap';

// Destructuring props
const RideCard = ({ ride, onSelect }) => {
  const { type, price, driver, eta } = ride;
  
  return (
    <Card className="mb-3">
      <Card.Body>
        <Card.Title>{type} Cab</Card.Title>
        <Card.Text>
          Driver: <strong>{driver}</strong>
        </Card.Text>
        <ListGroup variant="flush">
          <ListGroup.Item>Price: {price}</ListGroup.Item>
          <ListGroup.Item>ETA: {eta}</ListGroup.Item>
        </ListGroup>
        <Button variant="primary" onClick={() => onSelect(ride)}>
          Select
        </Button>
      </Card.Body>
    </Card>
  );
};

// Using arrow function with destructuring
const UserProfile = ({ user = {} }) => {
  const { name = 'Guest', email = '', rides = 0 } = user;
  
  return (
    <div>
      <h3>Welcome, {name}!</h3>
      <p>Email: {email}</p>
      <p>Total Rides: {rides}</p>
    </div>
  );
};

// ES6 Class Component
class RideCounter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      count: 0,
      totalFare: 0
    };
  }

  // Arrow function to avoid binding issues
  handleAddRide = () => {
    this.setState(prevState => ({
      count: prevState.count + 1,
      totalFare: prevState.totalFare + 250
    }));
  };

  render() {
    const { count, totalFare } = this.state;
    
    return (
      <Card>
        <Card.Body>
          <Card.Title>Ride Counter</Card.Title>
          <Card.Text>
            Total Rides: <strong>{count}</strong>
          </Card.Text>
          <Card.Text>
            Total Fare: <strong>₹{totalFare}</strong>
          </Card.Text>
          <Button variant="success" onClick={this.handleAddRide}>
            Add Ride
          </Button>
        </Card.Body>
      </Card>
    );
  }
}

// Main Component using all ES6 features
const ES6ComponentsDemo = () => {
  // Using useState hook (ES6 array destructuring)
  const [rides, setRides] = useState([
    { id: 1, type: 'Standard', price: '₹250', driver: 'Rajesh', eta: '5 min' },
    { id: 2, type: 'Premium', price: '₹350', driver: 'Suresh', eta: '3 min' },
    { id: 3, type: 'SUV', price: '₹500', driver: 'Vikram', eta: '7 min' },
  ]);

  const [user, setUser] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    rides: 5
  });

  // Using useEffect hook
  useEffect(() => {
    console.log('Component mounted or rides updated');
    
    // Cleanup function
    return () => {
      console.log('Component will unmount');
    };
  }, [rides]);

  // Arrow function handler
  const handleSelectRide = (selectedRide) => {
    alert(`Selected: ${selectedRide.type} with ${selectedRide.driver}`);
  };

  // Using map with destructuring
  const rideList = rides.map(({ id, type, price, driver, eta }) => (
    <li key={id} className="list-group-item">
      {type} - {price} - {driver} ({eta})
    </li>
  ));

  // Template literal in JSX
  const welcomeMessage = `Welcome back, ${user.name}! You have ${user.rides} rides.`;

  return (
    <div className="container mt-4">
      <h2>ES6 & JSX Features Demo</h2>
      
      <div className="row mt-4">
        <div className="col-md-6">
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>User Profile (Destructuring)</Card.Title>
              <UserProfile user={user} />
            </Card.Body>
          </Card>

          <RideCounter />
        </div>

        <div className="col-md-6">
          <Card>
            <Card.Body>
              <Card.Title>Available Rides (Template Literal)</Card.Title>
              <p className="text-primary">{welcomeMessage}</p>
              
              <h5>Ride List (Map function):</h5>
              <ul className="list-group mb-3">
                {rideList}
              </ul>

              <h5>Interactive Ride Cards:</h5>
              {rides.map(ride => (
                <RideCard 
                  key={ride.id} 
                  ride={ride} 
                  onSelect={handleSelectRide}
                />
              ))}
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ES6ComponentsDemo;