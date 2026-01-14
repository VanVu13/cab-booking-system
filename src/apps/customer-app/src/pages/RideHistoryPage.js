import React from 'react';
import { Table, Badge, Container } from 'react-bootstrap';

const RideHistoryPage = () => {
  const rides = [
    { id: 1, date: '2024-01-15', from: 'Airport', to: 'Downtown', price: '₹300', status: 'completed' },
    { id: 2, date: '2024-01-14', from: 'Mall', to: 'Home', price: '₹180', status: 'completed' },
    { id: 3, date: '2024-01-13', from: 'Office', to: 'Restaurant', price: '₹150', status: 'cancelled' },
  ];

  return (
    <Container>
      <h2 className="mb-4">Ride History</h2>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>From</th>
            <th>To</th>
            <th>Price</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rides.map((ride) => (
            <tr key={ride.id}>
              <td>{ride.id}</td>
              <td>{ride.date}</td>
              <td>{ride.from}</td>
              <td>{ride.to}</td>
              <td>{ride.price}</td>
              <td>
                <Badge bg={ride.status === 'completed' ? 'success' : 'danger'}>
                  {ride.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default RideHistoryPage;