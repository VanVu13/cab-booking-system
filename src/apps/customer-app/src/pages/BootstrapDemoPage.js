import React, { useState } from 'react';
import {
  Container, Row, Col, Card, Button,
  Tabs, Tab, Accordion,
  Modal, Carousel,
  Nav, Navbar, Alert,
  Badge, Form, InputGroup,
  Dropdown, DropdownButton,
  Toast, ToastContainer,
  ProgressBar,
  Pagination,
  Breadcrumb,
  Spinner,
  Offcanvas
} from 'react-bootstrap';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import Popover from 'react-bootstrap/Popover';
import './BootstrapDemoPage.css';

const BootstrapDemoPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [activeTab, setActiveTab] = useState('grid');

  // Carousel data
  const carouselItems = [
    {
      id: 1,
      title: "Weekend Special",
      description: "Get 30% off on all rides this weekend",
      bgColor: "#0d6efd"
    },
    {
      id: 2,
      title: "New User Offer",
      description: "50% off on your first ride with us",
      bgColor: "#198754"
    },
    {
      id: 3,
      title: "Late Night Rides",
      description: "Safe rides available 24/7",
      bgColor: "#6f42c1"
    }
  ];

  // Accordion data
  const faqItems = [
    {
      id: 1,
      question: "How do I book a cab?",
      answer: "Simply enter your pickup and destination locations, select a ride type, and confirm your booking."
    },
    {
      id: 2,
      question: "What payment methods are accepted?",
      answer: "We accept cash, credit/debit cards, UPI, and digital wallets."
    },
    {
      id: 3,
      question: "How can I track my ride?",
      answer: "Once booked, you can track your driver's location in real-time on the map."
    }
  ];

  return (
    <Container fluid className="bootstrap-demo-page">
      {/* Header */}
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
        <Container>
          <Navbar.Brand href="#">
            🚖 Bootstrap Demo - Cab Booking System
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="navbar-demo" />
          <Navbar.Collapse id="navbar-demo">
            <Nav className="me-auto">
              <Nav.Link href="#grid">Grid System</Nav.Link>
              <Nav.Link href="#components">Components</Nav.Link>
              <Nav.Link href="#navigation">Navigation</Nav.Link>
              <Nav.Link href="#dynamic">Dynamic Content</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Tabs Navigation */}
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
        id="demo-tabs"
      >
        <Tab eventKey="grid" title="Grid System">
          <SectionGrid />
        </Tab>
        <Tab eventKey="components" title="UI Components">
          <SectionComponents 
            showModal={showModal}
            setShowModal={setShowModal}
            faqItems={faqItems}
          />
        </Tab>
        <Tab eventKey="navigation" title="Navigation">
          <SectionNavigation />
        </Tab>
        <Tab eventKey="dynamic" title="Dynamic Content">
          <SectionDynamic 
            carouselItems={carouselItems}
            showToast={showToast}
            setShowToast={setShowToast}
            showOffcanvas={showOffcanvas}
            setShowOffcanvas={setShowOffcanvas}
          />
        </Tab>
      </Tabs>

      {/* Modal Component */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>🚗 Confirm Your Ride</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5>Ride Details:</h5>
          <p><strong>From:</strong> Mumbai Airport</p>
          <p><strong>To:</strong> Bandra West</p>
          <p><strong>Distance:</strong> 12 km</p>
          <p><strong>Estimated Fare:</strong> ₹350</p>
          <p><strong>Driver:</strong> Rajesh Kumar ⭐⭐⭐⭐⭐</p>
          
          <Form className="mt-3">
            <Form.Group controlId="paymentMethod">
              <Form.Label>Select Payment Method</Form.Label>
              <Form.Select>
                <option>Cash</option>
                <option>Credit Card</option>
                <option>UPI</option>
                <option>Digital Wallet</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => {
            alert('Ride booked successfully!');
            setShowModal(false);
          }}>
            Confirm Booking
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toast Notification */}
      <ToastContainer position="top-end" className="p-3">
        <Toast 
          show={showToast} 
          onClose={() => setShowToast(false)}
          delay={3000} 
          autohide
          bg="success"
        >
          <Toast.Header>
            <strong className="me-auto">🎉 Success!</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            Your ride has been booked successfully!
          </Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Offcanvas Sidebar */}
      <Offcanvas 
        show={showOffcanvas} 
        onHide={() => setShowOffcanvas(false)}
        placement="end"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Booking Filters</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <h5>Filter Rides</h5>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Ride Type</Form.Label>
              {['Standard', 'Premium', 'SUV', 'Luxury'].map(type => (
                <Form.Check 
                  key={type}
                  type="checkbox"
                  label={type}
                  id={`type-${type}`}
                />
              ))}
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Price Range</Form.Label>
              <Form.Range min="100" max="1000" step="50" />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Driver Rating</Form.Label>
              <div className="d-flex gap-2">
                {[1,2,3,4,5].map(star => (
                  <Button 
                    key={star}
                    variant="outline-warning"
                    size="sm"
                  >
                    {'⭐'.repeat(star)}
                  </Button>
                ))}
              </div>
            </Form.Group>
            
            <Button variant="primary" className="w-100">
              Apply Filters
            </Button>
          </Form>
        </Offcanvas.Body>
      </Offcanvas>
    </Container>
  );
};

// Section 1: Grid System
const SectionGrid = () => (
  <section id="grid" className="mb-5">
    <h2 className="section-title">1. Bootstrap Grid System</h2>
    <p className="text-muted mb-4">Responsive layout for different screen sizes</p>
    
    <Row className="mb-4">
      <Col>
        <Card className="text-center">
          <Card.Body>
            <Card.Title>Basic Grid Example</Card.Title>
            <Row className="g-3 mb-4">
              <Col xs={12} md={4}>
                <div className="grid-demo-box bg-primary text-white p-3 rounded">
                  <small>Mobile: Full</small><br/>
                  <strong>Desktop: 1/3</strong>
                </div>
              </Col>
              <Col xs={12} md={4}>
                <div className="grid-demo-box bg-success text-white p-3 rounded">
                  <small>Mobile: Full</small><br/>
                  <strong>Desktop: 1/3</strong>
                </div>
              </Col>
              <Col xs={12} md={4}>
                <div className="grid-demo-box bg-warning text-white p-3 rounded">
                  <small>Mobile: Full</small><br/>
                  <strong>Desktop: 1/3</strong>
                </div>
              </Col>
            </Row>

            <Row className="g-3">
              <Col xs={6} md={3}>
                <div className="grid-demo-box bg-info text-white p-2 rounded">
                  <small>xs: 1/2</small><br/>
                  <small>md: 1/4</small>
                </div>
              </Col>
              <Col xs={6} md={3}>
                <div className="grid-demo-box bg-danger text-white p-2 rounded">
                  <small>xs: 1/2</small><br/>
                  <small>md: 1/4</small>
                </div>
              </Col>
              <Col xs={6} md={3}>
                <div className="grid-demo-box bg-dark text-white p-2 rounded">
                  <small>xs: 1/2</small><br/>
                  <small>md: 1/4</small>
                </div>
              </Col>
              <Col xs={6} md={3}>
                <div className="grid-demo-box bg-secondary text-white p-2 rounded">
                  <small>xs: 1/2</small><br/>
                  <small>md: 1/4</small>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>
    </Row>

    {/* Real-world example */}
    <Card className="mb-4">
      <Card.Body>
        <Card.Title>Real World Application - Ride Cards</Card.Title>
        <Row className="g-4">
          <Col xs={12} sm={6} lg={3}>
            <Card>
              <Card.Body className="text-center">
                <h3>🚗</h3>
                <Card.Title>Standard</Card.Title>
                <Card.Text>₹250</Card.Text>
                <Button variant="outline-primary" size="sm">
                  Select
                </Button>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Card>
              <Card.Body className="text-center">
                <h3>🚙</h3>
                <Card.Title>Premium</Card.Title>
                <Card.Text>₹350</Card.Text>
                <Button variant="outline-primary" size="sm">
                  Select
                </Button>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Card>
              <Card.Body className="text-center">
                <h3>🚐</h3>
                <Card.Title>SUV</Card.Title>
                <Card.Text>₹500</Card.Text>
                <Button variant="outline-primary" size="sm">
                  Select
                </Button>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Card>
              <Card.Body className="text-center">
                <h3>🏎️</h3>
                <Card.Title>Luxury</Card.Title>
                <Card.Text>₹800</Card.Text>
                <Button variant="outline-primary" size="sm">
                  Select
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  </section>
);

// Section 2: UI Components
const SectionComponents = ({ showModal, setShowModal, faqItems }) => (
  <section id="components" className="mb-5">
    <h2 className="section-title">2. Bootstrap UI Components</h2>
    
    <Row className="g-4">
      {/* Buttons */}
      <Col md={6}>
        <Card>
          <Card.Body>
            <Card.Title>Buttons & Badges</Card.Title>
            <div className="d-flex flex-wrap gap-2 mb-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="success">Success</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="info">Info</Button>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <Badge bg="primary">New</Badge>
              <Badge bg="success">Active</Badge>
              <Badge bg="warning">Pending</Badge>
              <Badge bg="danger">Cancelled</Badge>
              <Badge bg="info">VIP</Badge>
            </div>
          </Card.Body>
        </Card>
      </Col>

      {/* Alerts */}
      <Col md={6}>
        <Card>
          <Card.Body>
            <Card.Title>Alerts</Card.Title>
            <Alert variant="success">
              ✅ Ride booked successfully!
            </Alert>
            <Alert variant="warning">
              ⚠️ Your ride will arrive in 5 minutes
            </Alert>
            <Alert variant="danger">
              ❌ Ride cancelled by driver
            </Alert>
          </Card.Body>
        </Card>
      </Col>

      {/* Accordion */}
      <Col md={6}>
        <Card>
          <Card.Body>
            <Card.Title>Accordion (FAQ)</Card.Title>
            <Accordion defaultActiveKey="0">
              {faqItems.map((item, index) => (
                <Accordion.Item key={item.id} eventKey={index.toString()}>
                  <Accordion.Header>{item.question}</Accordion.Header>
                  <Accordion.Body>{item.answer}</Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          </Card.Body>
        </Card>
      </Col>

      {/* Modal Trigger */}
      <Col md={6}>
        <Card>
          <Card.Body className="text-center">
            <Card.Title>Modal Dialog</Card.Title>
            <Card.Text>
              Click the button to open a booking confirmation modal
            </Card.Text>
            <Button 
              variant="primary" 
              size="lg"
              onClick={() => setShowModal(true)}
            >
              🚗 Book a Ride Now
            </Button>
            <div className="mt-3">
              <small className="text-muted">
                Modals are perfect for confirmations, forms, and important messages
              </small>
            </div>
          </Card.Body>
        </Card>
      </Col>

      {/* Tooltips & Popovers */}
      <Col md={12}>
        <Card>
          <Card.Body>
            <Card.Title>Tooltips & Popovers</Card.Title>
            <div className="d-flex gap-3 flex-wrap">
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip>Click to see ride details</Tooltip>}
              >
                <Button variant="info">ℹ️ Ride Info (Tooltip)</Button>
              </OverlayTrigger>

              <OverlayTrigger
                trigger="click"
                placement="bottom"
                overlay={
                  <Popover>
                    <Popover.Header>Driver Information</Popover.Header>
                    <Popover.Body>
                      <strong>Name:</strong> Rajesh Kumar<br/>
                      <strong>Rating:</strong> 4.8/5 ⭐<br/>
                      <strong>Experience:</strong> 5 years<br/>
                      <strong>Car:</strong> Toyota Innova
                    </Popover.Body>
                  </Popover>
                }
              >
                <Button variant="secondary">👤 Driver Details (Popover)</Button>
              </OverlayTrigger>

              <OverlayTrigger
                placement="right"
                overlay={
                  <Tooltip>
                    <strong>₹250</strong><br/>
                    Standard fare for 5km
                  </Tooltip>
                }
              >
                <Badge bg="dark" className="p-2">💰 Price Info</Badge>
              </OverlayTrigger>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  </section>
);

// Section 3: Navigation Elements
const SectionNavigation = () => {
  const [activeNav, setActiveNav] = useState('home');
  
  return (
    <section id="navigation" className="mb-5">
      <h2 className="section-title">3. Navigation Elements</h2>
      
      <Row className="g-4">
        {/* Tabs */}
        <Col md={6}>
          <Card>
            <Card.Body>
              <Card.Title>Tabs Navigation</Card.Title>
              <Tabs
                activeKey={activeNav}
                onSelect={(k) => setActiveNav(k)}
                className="mb-3"
              >
                <Tab eventKey="home" title="Home">
                  <div className="p-3 border rounded mt-3">
                    <h5>Welcome to Cab Booking</h5>
                    <p>Book your ride quickly and safely</p>
                  </div>
                </Tab>
                <Tab eventKey="profile" title="Profile">
                  <div className="p-3 border rounded mt-3">
                    <h5>User Profile</h5>
                    <p>Manage your account settings</p>
                  </div>
                </Tab>
                <Tab eventKey="history" title="History">
                  <div className="p-3 border rounded mt-3">
                    <h5>Ride History</h5>
                    <p>View your past rides and receipts</p>
                  </div>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>

        {/* Breadcrumb */}
        <Col md={6}>
          <Card>
            <Card.Body>
              <Card.Title>Breadcrumb Navigation</Card.Title>
              <Breadcrumb>
                <Breadcrumb.Item href="#">Home</Breadcrumb.Item>
                <Breadcrumb.Item href="#">Bookings</Breadcrumb.Item>
                <Breadcrumb.Item active>Current Ride</Breadcrumb.Item>
              </Breadcrumb>
              
              <div className="mt-4">
                <h6>Pagination</h6>
                <Pagination>
                  <Pagination.Prev />
                  <Pagination.Item active>{1}</Pagination.Item>
                  <Pagination.Item>{2}</Pagination.Item>
                  <Pagination.Item>{3}</Pagination.Item>
                  <Pagination.Ellipsis />
                  <Pagination.Item>{10}</Pagination.Item>
                  <Pagination.Next />
                </Pagination>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Dropdowns */}
        <Col md={12}>
          <Card>
            <Card.Body>
              <Card.Title>Dropdown Menus</Card.Title>
              <div className="d-flex flex-wrap gap-3">
                <DropdownButton 
                  title="Select Ride Type" 
                  variant="primary"
                  className="mb-2"
                >
                  <Dropdown.Item eventKey="1">🚗 Standard (₹250)</Dropdown.Item>
                  <Dropdown.Item eventKey="2">🚙 Premium (₹350)</Dropdown.Item>
                  <Dropdown.Item eventKey="3">🚐 SUV (₹500)</Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item eventKey="4">🏎️ Luxury (₹800)</Dropdown.Item>
                </DropdownButton>

                <DropdownButton 
                  title="Payment Methods" 
                  variant="success"
                  className="mb-2"
                >
                  <Dropdown.Item eventKey="1">💵 Cash</Dropdown.Item>
                  <Dropdown.Item eventKey="2">💳 Credit Card</Dropdown.Item>
                  <Dropdown.Item eventKey="3">📱 UPI</Dropdown.Item>
                  <Dropdown.Item eventKey="4">💰 Digital Wallet</Dropdown.Item>
                </DropdownButton>

                <DropdownButton 
                  title="Filter by Rating" 
                  variant="warning"
                  className="mb-2"
                >
                  <Dropdown.Item eventKey="1">⭐⭐⭐⭐⭐ (4.5+)</Dropdown.Item>
                  <Dropdown.Item eventKey="2">⭐⭐⭐⭐ (4.0+)</Dropdown.Item>
                  <Dropdown.Item eventKey="3">⭐⭐⭐ (3.5+)</Dropdown.Item>
                </DropdownButton>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </section>
  );
};

// Section 4: Dynamic Content
const SectionDynamic = ({ 
  carouselItems, 
  showToast, 
  setShowToast,
  showOffcanvas,
  setShowOffcanvas 
}) => (
  <section id="dynamic" className="mb-5">
    <h2 className="section-title">4. Dynamic Content & Behavior</h2>
    
    <Row className="g-4">
      {/* Carousel */}
      <Col md={8}>
        <Card>
          <Card.Body>
            <Card.Title>Carousel - Promotional Content</Card.Title>
            <Carousel fade indicators controls className="rounded">
              {carouselItems.map((item) => (
                <Carousel.Item key={item.id}>
                  <div 
                    className="carousel-content d-flex flex-column justify-content-center align-items-center text-white p-5 rounded"
                    style={{ 
                      backgroundColor: item.bgColor,
                      minHeight: '300px'
                    }}
                  >
                    <h2>{item.title}</h2>
                    <p className="lead">{item.description}</p>
                    <Button variant="light" size="lg" className="mt-3">
                      Learn More
                    </Button>
                  </div>
                </Carousel.Item>
              ))}
            </Carousel>
            <div className="mt-3">
              <small className="text-muted">
                Carousels are perfect for showcasing promotions, featured content, or images
              </small>
            </div>
          </Card.Body>
        </Card>
      </Col>

      {/* Progress & Spinners */}
      <Col md={4}>
        <Card>
          <Card.Body>
            <Card.Title>Progress & Loading States</Card.Title>
            
            <div className="mb-4">
              <h6>Ride Progress</h6>
              <ProgressBar 
                now={65} 
                label="65%" 
                variant="success" 
                animated 
                className="mb-3"
              />
              <small className="text-muted">Driver is 65% of the way to you</small>
            </div>

            <div className="mb-4">
              <h6>Loading States</h6>
              <div className="d-flex gap-3">
                <Spinner animation="border" variant="primary" />
                <Spinner animation="grow" variant="success" />
                <Spinner animation="border" variant="warning" />
              </div>
              <small className="text-muted">Use spinners during API calls</small>
            </div>

            <div className="mt-4">
              <Button 
                variant="outline-primary" 
                className="w-100"
                onClick={() => setShowOffcanvas(true)}
              >
                ⚙️ Open Filters (Offcanvas)
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Col>

      {/* Forms with Dynamic Behavior */}
      <Col md={6}>
        <Card>
          <Card.Body>
            <Card.Title>Interactive Forms</Card.Title>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Pickup Location</Form.Label>
                <InputGroup>
                  <InputGroup.Text>📍</InputGroup.Text>
                  <Form.Control 
                    type="text" 
                    placeholder="Enter pickup address" 
                  />
                  <OverlayTrigger
                    placement="right"
                    overlay={
                      <Tooltip>
                        Enter your exact location for accurate pickup
                      </Tooltip>
                    }
                  >
                    <Button variant="outline-secondary">?</Button>
                  </OverlayTrigger>
                </InputGroup>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Select Car Type</Form.Label>
                <div className="d-flex flex-wrap gap-2">
                  {['🚗 Standard', '🚙 Premium', '🚐 SUV', '🏎️ Luxury'].map((car) => (
                    <Form.Check
                      key={car}
                      type="radio"
                      label={car}
                      name="carType"
                      id={`car-${car}`}
                    />
                  ))}
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Special Instructions</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={2}
                  placeholder="Any special requests?" 
                />
              </Form.Group>

              <div className="d-flex gap-2">
                <Button 
                  variant="primary"
                  onClick={() => setShowToast(true)}
                >
                  Book Now
                </Button>
                <Button variant="outline-secondary">
                  Save for Later
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>

      {/* Dynamic Cards */}
      <Col md={6}>
        <Card>
          <Card.Body>
            <Card.Title>Dynamic Cards with JavaScript</Card.Title>
            <Row className="g-3">
              <Col xs={6}>
                <Card className="text-center hover-card">
                  <Card.Body>
                    <h1>🚗</h1>
                    <Card.Title>Standard</Card.Title>
                    <Button 
                      variant="outline-primary"
                      onClick={() => alert('Standard ride selected!')}
                    >
                      Select
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={6}>
                <Card className="text-center hover-card">
                  <Card.Body>
                    <h1>🚙</h1>
                    <Card.Title>Premium</Card.Title>
                    <Button 
                      variant="outline-success"
                      onClick={() => alert('Premium ride selected!')}
                    >
                      Select
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
            
            <div className="mt-4">
              <h6>Real-time Updates</h6>
              <Alert variant="info" className="d-flex align-items-center">
                <Spinner animation="border" size="sm" className="me-2" />
                <span>Finding available drivers near you...</span>
              </Alert>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  </section>
);

export default BootstrapDemoPage;