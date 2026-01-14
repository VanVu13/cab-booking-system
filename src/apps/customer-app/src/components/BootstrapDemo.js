import React, { useState } from 'react';
import {
  Container, Row, Col,
  Tabs, Tab,
  Accordion, Card,
  Modal, Button,
  Carousel,
  Tooltip, OverlayTrigger,
  Popover,
  Nav, Navbar,
  Dropdown,
  Form,
  Alert,
  Badge
} from 'react-bootstrap';

const BootstrapDemo = () => {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  return (
    <Container className="my-5">
      <h1 className="text-center mb-5">Bootstrap Components Demo</h1>

      {/* 1. Grid System */}
      <section className="mb-5">
        <h2>1. Grid System (Responsive)</h2>
        <Row className="g-3">
          <Col xs={12} md={6} lg={4}>
            <div className="p-3 bg-primary text-white rounded">
              Column 1 (mobile: full, tablet: 1/2, desktop: 1/3)
            </div>
          </Col>
          <Col xs={12} md={6} lg={4}>
            <div className="p-3 bg-success text-white rounded">
              Column 2
            </div>
          </Col>
          <Col xs={12} md={12} lg={4}>
            <div className="p-3 bg-warning text-white rounded">
              Column 3 (mobile: full, desktop: 1/3)
            </div>
          </Col>
        </Row>
      </section>

      {/* 2. Tabs */}
      <section className="mb-5">
        <h2>2. Tabs Navigation</h2>
        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
          <Tab eventKey="home" title="Home">
            <p className="mt-3">Welcome to Cab Booking Home</p>
          </Tab>
          <Tab eventKey="book" title="Book Ride">
            <Form className="mt-3">
              <Form.Group className="mb-3">
                <Form.Label>Pickup Location</Form.Label>
                <Form.Control type="text" placeholder="Enter pickup" />
              </Form.Group>
            </Form>
          </Tab>
          <Tab eventKey="history" title="History">
            <p className="mt-3">Your ride history will appear here</p>
          </Tab>
        </Tabs>
      </section>

      {/* 3. Accordion */}
      <section className="mb-5">
        <h2>3. Accordion (FAQ)</h2>
        <Accordion defaultActiveKey="0">
          <Accordion.Item eventKey="0">
            <Accordion.Header>How do I book a ride?</Accordion.Header>
            <Accordion.Body>
              Enter pickup and destination, select ride type, and confirm.
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="1">
            <Accordion.Header>What payment methods?</Accordion.Header>
            <Accordion.Body>
              Cash, credit card, debit card, and digital wallets.
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </section>

      {/* 4. Modal */}
      <section className="mb-5">
        <h2>4. Modal (Popup)</h2>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          Open Booking Modal
        </Button>

        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Booking</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Are you sure you want to book this ride?</p>
            <p><strong>From:</strong> Airport</p>
            <p><strong>To:</strong> Downtown</p>
            <p><strong>Fare:</strong> ₹300</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => {
              alert('Booking confirmed!');
              setShowModal(false);
            }}>
              Confirm Booking
            </Button>
          </Modal.Footer>
        </Modal>
      </section>

      {/* 5. Tooltip & Popover */}
      <section className="mb-5">
        <h2>5. Tooltip & Popover</h2>
        <div className="d-flex gap-3">
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>Click for ride information</Tooltip>}
          >
            <Button variant="info">ℹ️ Info (Tooltip)</Button>
          </OverlayTrigger>

          <OverlayTrigger
            trigger="click"
            placement="right"
            overlay={
              <Popover>
                <Popover.Header>Driver Details</Popover.Header>
                <Popover.Body>
                  <strong>Name:</strong> Rajesh Kumar<br/>
                  <strong>Rating:</strong> 4.8/5<br/>
                  <strong>Experience:</strong> 5 years
                </Popover.Body>
              </Popover>
            }
          >
            <Button variant="secondary">👤 Driver (Popover)</Button>
          </OverlayTrigger>
        </div>
      </section>

      {/* 6. Carousel */}
      <section className="mb-5">
        <h2>6. Carousel (Promotions)</h2>
        <Carousel className="border rounded">
          <Carousel.Item interval={3000}>
            <div className="bg-primary text-white p-5 text-center" style={{height: '300px'}}>
              <h3>First Time User?</h3>
              <p>Get 50% off on your first ride!</p>
              <Button variant="light">Claim Offer</Button>
            </div>
          </Carousel.Item>
          <Carousel.Item interval={3000}>
            <div className="bg-success text-white p-5 text-center" style={{height: '300px'}}>
              <h3>Weekend Special</h3>
              <p>20% off on all rides this weekend</p>
              <Button variant="light">Book Now</Button>
            </div>
          </Carousel.Item>
        </Carousel>
      </section>

      {/* 7. Dynamic JavaScript Components */}
      <section className="mb-5">
        <h2>7. Dynamic Components</h2>
        <div className="d-flex gap-3 flex-wrap">
          <Dropdown>
            <Dropdown.Toggle variant="warning">
              Select Vehicle Type
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item>🚗 Standard (₹250)</Dropdown.Item>
              <Dropdown.Item>🚙 Premium (₹350)</Dropdown.Item>
              <Dropdown.Item>🚐 SUV (₹500)</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>

          <Button 
            variant="danger" 
            onClick={() => alert('Ride cancelled!')}
          >
            Cancel Ride
          </Button>

          <Badge bg="success" className="fs-6 p-2">
            Active Promotions: 3
          </Badge>
        </div>
      </section>
    </Container>
  );
};

export default BootstrapDemo;