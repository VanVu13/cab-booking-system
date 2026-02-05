import React, { useState } from 'react';
import { Form, Button, Row, Col, Card } from 'react-bootstrap';

const BookRideForm = () => {
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [rideType, setRideType] = useState('standard');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Booking ride:', { pickup, destination, rideType });
    // Add API call here
  };

  return (
    <Card>
      <Card.Body>
        <Card.Title>Book a Ride</Card.Title>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Pickup Location</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter pickup address"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Destination</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter destination address"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Ride Type</Form.Label>
            <Row>
              <Col>
                <Form.Check
                  type="radio"
                  label="🚗 Standard"
                  name="rideType"
                  value="standard"
                  checked={rideType === 'standard'}
                  onChange={(e) => setRideType(e.target.value)}
                />
              </Col>
              <Col>
                <Form.Check
                  type="radio"
                  label="🚙 Premium"
                  name="rideType"
                  value="premium"
                  checked={rideType === 'premium'}
                  onChange={(e) => setRideType(e.target.value)}
                />
              </Col>
              <Col>
                <Form.Check
                  type="radio"
                  label="🚐 SUV"
                  name="rideType"
                  value="suv"
                  checked={rideType === 'suv'}
                  onChange={(e) => setRideType(e.target.value)}
                />
              </Col>
            </Row>
          </Form.Group>

          <Button variant="primary" type="submit" className="w-100">
            Find Available Rides
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default BookRideForm;