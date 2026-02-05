import React, { useState, Fragment } from 'react';
import './JsxDemo.css';

// 1. Basic JSX Rendering
const BasicJsx = () => (
  <div className="basic-jsx">
    <h2>Basic JSX Rendering</h2>
    <p>This is a paragraph in JSX</p>
    <button className="btn btn-primary">Click Me</button>
  </div>
);

// 2. JSX with JavaScript Expressions
const JsxWithExpressions = () => {
  const userName = 'Alice';
  const isLoggedIn = true;
  const rideCount = 3;
  const fare = 250;
  
  return (
    <div className="expressions">
      <h2>JSX with JavaScript Expressions</h2>
      
      {/* Variable interpolation */}
      <p>Welcome, {userName}!</p>
      
      {/* Conditional rendering */}
      <p>
        Status: {isLoggedIn ? 
          <span className="text-success">Logged In</span> : 
          <span className="text-danger">Logged Out</span>
        }
      </p>
      
      {/* Calculations */}
      <p>
        Total Fare: ₹{rideCount * fare}
      </p>
      
      {/* Function calls */}
      <p>
        Uppercase: {userName.toUpperCase()}
      </p>
      
      {/* Array rendering */}
      <div>
        Ride Types: {['Standard', 'Premium', 'SUV'].map((type, index) => (
          <span key={index} className="badge bg-secondary mx-1">{type}</span>
        ))}
      </div>
    </div>
  );
};

// 3. JSX Fragments
const JsxFragments = () => {
  const rides = [
    { id: 1, from: 'Airport', to: 'Hotel' },
    { id: 2, from: 'Office', to: 'Home' },
    { id: 3, from: 'Mall', to: 'Restaurant' },
  ];
  
  return (
    <Fragment>
      <h2>JSX Fragments</h2>
      <p>Using Fragment to group multiple elements without extra div</p>
      
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>From</th>
            <th>To</th>
          </tr>
        </thead>
        <tbody>
          {rides.map(ride => (
            <Fragment key={ride.id}>
              <tr>
                <td>{ride.id}</td>
                <td>{ride.from}</td>
                <td>{ride.to}</td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
      
      {/* Shorthand Fragment syntax */}
      <>
        <p>This is inside shorthand Fragment</p>
        <p>No extra DOM node added</p>
      </>
    </Fragment>
  );
};

// 4. JSX Attributes and Styling
const JsxAttributes = () => {
  const [isActive, setIsActive] = useState(false);
  
  // Inline styles
  const cardStyle = {
    backgroundColor: isActive ? '#e3f2fd' : '#f8f9fa',
    border: '2px solid',
    borderColor: isActive ? '#0d6efd' : '#dee2e6',
    padding: '20px',
    borderRadius: '10px',
    transition: 'all 0.3s ease'
  };
  
  return (
    <div style={cardStyle}>
      <h2>JSX Attributes and Styling</h2>
      
      {/* ClassName instead of class */}
      <div className={`alert ${isActive ? 'alert-primary' : 'alert-secondary'}`}>
        This div has dynamic className
      </div>
      
      {/* Inline event handlers */}
      <button 
        className="btn btn-primary me-2"
        onClick={() => setIsActive(true)}
      >
        Activate
      </button>
      
      <button 
        className="btn btn-secondary"
        onClick={() => setIsActive(false)}
      >
        Deactivate
      </button>
      
      {/* Boolean attributes */}
      <div className="form-check mt-3">
        <input 
          className="form-check-input" 
          type="checkbox" 
          checked={isActive}
          readOnly
        />
        <label className="form-check-label">
          Is Active: {isActive.toString()}
        </label>
      </div>
    </div>
  );
};

// 5. JSX Children and Composition
const Card = ({ title, children, footer }) => {
  return (
    <div className="card mb-3">
      <div className="card-body">
        <h5 className="card-title">{title}</h5>
        <div className="card-text">
          {children}
        </div>
      </div>
      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

const JsxChildren = () => {
  return (
    <div>
      <h2>JSX Children and Composition</h2>
      
      <Card 
        title="Ride Details"
        footer={<small className="text-muted">Last updated: Today</small>}
      >
        <p>From: Airport</p>
        <p>To: Downtown</p>
        <p>Fare: ₹300</p>
      </Card>
      
      <Card title="Driver Info">
        <p>Name: Rajesh Kumar</p>
        <p>Rating: ⭐⭐⭐⭐⭐</p>
        <p>Vehicle: Toyota Innova</p>
      </Card>
    </div>
  );
};

// 6. Conditional Rendering Patterns
const ConditionalRendering = () => {
  const [userType, setUserType] = useState('customer');
  const [loading, setLoading] = useState(false);
  const [rides, setRides] = useState([]);
  
  // Simulate data fetching
  const fetchRides = () => {
    setLoading(true);
    setTimeout(() => {
      setRides([
        { id: 1, type: 'Standard' },
        { id: 2, type: 'Premium' }
      ]);
      setLoading(false);
    }, 1000);
  };
  
  return (
    <div className="conditional-rendering">
      <h2>Conditional Rendering Patterns</h2>
      
      {/* 1. If/else with ternary */}
      <div className="mb-3">
        <p>
          User Type: 
          {userType === 'customer' ? 
            <span className="badge bg-success ms-2">Customer</span> : 
            <span className="badge bg-warning ms-2">Driver</span>
          }
        </p>
        
        <button 
          className="btn btn-sm btn-outline-primary me-2"
          onClick={() => setUserType('customer')}
        >
          Set as Customer
        </button>
        
        <button 
          className="btn btn-sm btn-outline-warning"
          onClick={() => setUserType('driver')}
        >
          Set as Driver
        </button>
      </div>
      
      {/* 2. Short-circuit evaluation */}
      <div className="mb-3">
        {loading && (
          <div className="alert alert-info">
            <div className="spinner-border spinner-border-sm me-2"></div>
            Loading rides...
          </div>
        )}
        
        {!loading && rides.length === 0 && (
          <button 
            className="btn btn-primary"
            onClick={fetchRides}
          >
            Load Rides
          </button>
        )}
      </div>
      
      {/* 3. Conditional rendering with variables */}
      <div className="mb-3">
        {(() => {
          if (rides.length > 0) {
            return (
              <div className="alert alert-success">
                Found {rides.length} rides
              </div>
            );
          } else if (!loading) {
            return (
              <div className="alert alert-warning">
                No rides found
              </div>
            );
          }
          return null;
        })()}
      </div>
      
      {/* 4. Map with conditional inside */}
      <div>
        <h5>Ride List:</h5>
        <ul className="list-group">
          {rides.map(ride => (
            <li key={ride.id} className="list-group-item">
              {ride.type} Ride #{ride.id}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// Main Demo Component
const JsxDemo = () => {
  return (
    <div className="container mt-4 jsx-demo-container">
      <h1 className="mb-4">JSX Features Demonstration</h1>
      
      <div className="row">
        <div className="col-md-6 mb-4">
          <div className="p-3 border rounded">
            <BasicJsx />
          </div>
        </div>
        
        <div className="col-md-6 mb-4">
          <div className="p-3 border rounded">
            <JsxWithExpressions />
          </div>
        </div>
      </div>
      
      <div className="row">
        <div className="col-12 mb-4">
          <div className="p-3 border rounded">
            <JsxFragments />
          </div>
        </div>
      </div>
      
      <div className="row">
        <div className="col-md-6 mb-4">
          <div className="p-3 border rounded">
            <JsxAttributes />
          </div>
        </div>
        
        <div className="col-md-6 mb-4">
          <div className="p-3 border rounded">
            <ConditionalRendering />
          </div>
        </div>
      </div>
      
      <div className="row">
        <div className="col-12 mb-4">
          <div className="p-3 border rounded">
            <JsxChildren />
          </div>
        </div>
      </div>
    </div>
  );
};

export default JsxDemo;