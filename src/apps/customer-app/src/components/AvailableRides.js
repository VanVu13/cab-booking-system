import React from 'react';
import { Card, ListGroup, Button, Badge } from 'react-bootstrap';

const AvailableRides = () => {
  const rides = [
    { id: 1, type: 'Standard', price: '₹250', eta: '5 min', driver: 'Rajesh' },
    { id: 2, type: 'Premium', price: '₹350', eta: '3 min', driver: 'Suresh' },
    { id: 3, type: 'SUV', price: '₹500', eta: '7 min', driver: 'Vikram' },
  ];

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">Available Rides</h5>
      </Card.Header>
      <ListGroup variant="flush">
        {rides.map((ride) => (
          <ListGroup.Item key={ride.id}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="mb-1">{ride.type} Cab</h6>
                <small className="text-muted">Driver: {ride.driver} • ETA: {ride.eta}</small>
              </div>
              <div className="text-end">
                <h5 className="mb-1">{ride.price}</h5>
                <Button size="sm" variant="outline-primary">
                  Select
                </Button>
              </div>
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </Card>
  );
};

export default AvailableRides;