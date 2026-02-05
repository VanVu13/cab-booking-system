import React from 'react';
import { Card, Form, Button, Row, Col, Container } from 'react-bootstrap';

const ProfilePage = () => {
  const user = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+91 9876543210',
    joined: 'January 2024',
  };

  return (
    <Container>
      <Row className="justify-content-center">
        <Col md={8}>
          <h2 className="mb-4">My Profile</h2>
          <Card className="mb-4">
            <Card.Body>
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Full Name</Form.Label>
                      <Form.Control type="text" defaultValue={user.name} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control type="email" defaultValue={user.email} readOnly />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phone Number</Form.Label>
                      <Form.Control type="tel" defaultValue={user.phone} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Member Since</Form.Label>
                      <Form.Control type="text" defaultValue={user.joined} readOnly />
                    </Form.Group>
                  </Col>
                </Row>
                <Button variant="primary">Update Profile</Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ProfilePage;