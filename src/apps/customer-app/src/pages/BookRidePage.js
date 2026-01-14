import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import BookRideForm from '../components/BookRideForm';
import AvailableRides from '../components/AvailableRides';

const BookRidePage = () => {
  return (
    <Container>
      <Row>
        <Col md={8} className="mx-auto">
          <h2 className="text-center mb-4">Book Your Ride</h2>
          <BookRideForm />
          <div className="mt-4">
            <AvailableRides />
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default BookRidePage;