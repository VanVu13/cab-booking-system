/*import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Container, Nav } from 'react-bootstrap';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import BookRidePage from './pages/BookRidePage';
import RideHistoryPage from './pages/RideHistoryPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ES6ComponentsDemo from './components/ES6ComponentsDemo';
import JsxDemo from './components/JsxDemo';
import './styles/App.css';

function App() {
  return (
    <Router>
      <Navigation />
      <Container className="mt-4">
      
        <Nav variant="tabs" className="mb-4">
          <Nav.Item>
            <Nav.Link href="/es6-demo">ES6 Demo</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link href="/jsx-demo">JSX Demo</Nav.Link>
          </Nav.Item>
        </Nav>
        
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/book" element={<BookRidePage />} />
          <Route path="/history" element={<RideHistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/es6-demo" element={<ES6ComponentsDemo />} />
          <Route path="/jsx-demo" element={<JsxDemo />} />
        </Routes>
      </Container>
    </Router>
  );
}

export default App;*/

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import BookRidePage from './pages/BookRidePage';
import RideHistoryPage from './pages/RideHistoryPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ES6ComponentsDemo from './components/ES6ComponentsDemo';
import JsxDemo from './components/JsxDemo';
import BootstrapDemoPage from './pages/BootstrapDemoPage';
import './styles/App.css';

function App() {
  return (
    <Router>
      <Navigation />
      <Container className="mt-4">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/book" element={<BookRidePage />} />
          <Route path="/history" element={<RideHistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/es6-demo" element={<ES6ComponentsDemo />} />
          <Route path="/jsx-demo" element={<JsxDemo />} />
          <Route path="/bootstrap-demo" element={<BootstrapDemoPage />} />
        </Routes>
      </Container>
    </Router>
  );
}

export default App;