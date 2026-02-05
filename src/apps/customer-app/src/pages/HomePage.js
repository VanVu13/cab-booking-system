/*import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <Container>
      <Row className="mb-5">
        <Col md={8} className="mx-auto text-center">
          <h1 className="display-4 mb-3">Welcome to Cab Booking</h1>
          <p className="lead">
            Book a ride quickly and safely. Available 24/7 across the city.
          </p>
          <Button as={Link} to="/book" variant="primary" size="lg">
            Book a Ride Now
          </Button>
        </Col>
      </Row>

      <Row className="g-4">
        <Col md={4}>
          <Card className="h-100 text-center">
            <Card.Body>
              <Card.Title>🚖 Quick Booking</Card.Title>
              <Card.Text>
                Book a cab in less than 2 minutes. Real-time tracking available.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 text-center">
            <Card.Body>
              <Card.Title>💰 Best Prices</Card.Title>
              <Card.Text>
                Competitive pricing with no hidden charges. Multiple payment options.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 text-center">
            <Card.Body>
              <Card.Title>⭐ Rated Drivers</Card.Title>
              <Card.Text>
                All our drivers are verified and rated by customers for safety.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default HomePage;*/

import React from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <Container>
      {/* Bootstrap Info Alert */}
      <Alert variant="info" className="mt-3">
        <Alert.Heading>🎨 Bootstrap Framework</Alert.Heading>
        <p>
          This application uses <strong>React Bootstrap</strong> for responsive design 
          and interactive components. Check out the <Link to="/bootstrap-demo">Bootstrap Demo</Link> 
          to see all features in action.
        </p>
        <hr />
        <div className="d-flex justify-content-between">
          <small>Features: Grid System, Components, Navigation, Modals, Carousel</small>
          <Button as={Link} to="/bootstrap-demo" variant="outline-info" size="sm">
            View Demo →
          </Button>
        </div>
      </Alert>

      <Row className="mb-5">
        <Col md={8} className="mx-auto text-center">
          <h1 className="display-4 mb-3">Welcome to Cab Booking</h1>
          <p className="lead">
            Book a ride quickly and safely. Available 24/7 across the city.
          </p>
          <Button as={Link} to="/book" variant="primary" size="lg">
            Book a Ride Now
          </Button>
        </Col>
      </Row>

      <Row className="g-4">
        <Col md={4}>
          <Card className="h-100 text-center">
            <Card.Body>
              <Card.Title>🚖 Quick Booking</Card.Title>
              <Card.Text>
                Book a cab in less than 2 minutes. Real-time tracking available.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 text-center">
            <Card.Body>
              <Card.Title>💰 Best Prices</Card.Title>
              <Card.Text>
                Competitive pricing with no hidden charges. Multiple payment options.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 text-center">
            <Card.Body>
              <Card.Title>⭐ Rated Drivers</Card.Title>
              <Card.Text>
                All our drivers are verified and rated by customers for safety.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Bootstrap Features Preview */}
      <Row className="mt-5">
        <Col>
          <Card className="border-primary">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">🎯 Bootstrap Features Used in This App</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3}>
                  <div className="text-center mb-3">
                    <div className="fs-1">📱</div>
                    <h6>Responsive Grid</h6>
                    <small>Works on all devices</small>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center mb-3">
                    <div className="fs-1">🎨</div>
                    <h6>UI Components</h6>
                    <small>Buttons, Cards, Forms</small>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center mb-3">
                    <div className="fs-1">🔧</div>
                    <h6>Navigation</h6>
                    <small>Tabs, Dropdowns</small>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center mb-3">
                    <div className="fs-1">✨</div>
                    <h6>Dynamic Elements</h6>
                    <small>Modals, Carousels</small>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default HomePage;