import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SidebarProvider, useSidebar } from './context/SidebarContext';

// Layout components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import Logo from './components/Logo';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MyTrips from './pages/MyTrips';
import Discover from './pages/Discover';
import Explore from './pages/Explore';
import Community from './pages/Community';
import Profile from './pages/Profile';
import CreateTrip from './pages/CreateTrip';
import ItineraryBuilder from './pages/ItineraryBuilder';
import ItineraryView from './pages/ItineraryView';

// Protected Route Guard Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-heading)',
        gap: '20px'
      }}>
        <Logo variant="splash" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span>Authenticating Locora...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

// Dynamic Layout Wrapper (Top Navbar for Home, Full-Screen Split for Auth, Collapsible Left Sidebar for Inner Pages)
const AppLayout = () => {
  const location = useLocation();
  const { isCollapsed } = useSidebar();
  const isHomePage = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  const layoutClass = isHomePage
    ? 'home-layout'
    : isAuthPage
    ? 'auth-layout'
    : `has-sidebar ${isCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`;

  return (
    <div className={`app-container ${layoutClass}`}>
      {isHomePage ? <Navbar /> : (isAuthPage ? null : <Sidebar />)}
      
      <main className="main-content">
        <Routes>
          {/* Public Discovery Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/community" element={<Community />} />
          <Route path="/itinerary-view/:id" element={<ItineraryView />} />

          {/* Protected Application Routes */}
          <Route
            path="/my-trips"
            element={
              <ProtectedRoute>
                <MyTrips />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips"
            element={
              <ProtectedRoute>
                <MyTrips />
              </ProtectedRoute>
            }
          />
          <Route
            path="/discover"
            element={
              <ProtectedRoute>
                <Discover />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-trip"
            element={
              <ProtectedRoute>
                <CreateTrip />
              </ProtectedRoute>
            }
          />
          <Route
            path="/itinerary-builder/:id"
            element={
              <ProtectedRoute>
                <ItineraryBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trip/:id"
            element={
              <ProtectedRoute>
                <ItineraryView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trip/:id/edit"
            element={
              <ProtectedRoute>
                <ItineraryBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:tripId"
            element={
              <ProtectedRoute>
                <ItineraryView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:tripId/edit"
            element={
              <ProtectedRoute>
                <ItineraryBuilder />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {/* Global Settings Modal Popup */}
      <SettingsModal />
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <SidebarProvider>
        <Router>
          <AppLayout />
        </Router>
      </SidebarProvider>
    </AuthProvider>
  );
};

export default App;
