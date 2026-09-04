import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import Logo from './Logo';
import {
  Home,
  Briefcase,
  Compass,
  Search,
  Users,
  User,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

const Sidebar = () => {
  const { user, openSettings } = useAuth();
  const { isCollapsed, toggleSidebar, isMobileOpen, closeMobileSidebar } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNewTripClick = () => {
    if (isMobileOpen) closeMobileSidebar();
    if (!user) {
      navigate('/login', { state: { from: '/create-trip' } });
    } else {
      navigate('/create-trip');
    }
  };

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'My Trips', path: '/my-trips', icon: Briefcase },
    { label: 'Discover', path: '/discover', icon: Compass },
    { label: 'Explore', path: '/explore', icon: Search },
    { label: 'Community', path: '/community', icon: Users }
  ];

  const userDisplayName = user?.user_metadata?.full_name || 
    `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim() ||
    user?.email?.split('@')[0] || 
    'Traveler';

  const userAvatar = user?.user_metadata?.avatar_url || null;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={closeMobileSidebar}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 89,
            display: 'block'
          }}
        />
      )}

      <aside
        className={`app-sidebar ${isCollapsed ? 'collapsed' : 'expanded'} ${isMobileOpen ? 'mobile-open' : ''}`}
      >
        {/* Top Section: Logo & Toggle + New Trip + Primary Nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isCollapsed ? '16px' : '20px' }}>
          
          {/* Brand Logo & Collapse Toggle Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
              width: '100%',
              minHeight: '44px',
              padding: isCollapsed ? '0' : '0 2px'
            }}
          >
            {/* Logo */}
            <div
              onClick={() => {
                if (isMobileOpen) closeMobileSidebar();
                navigate('/');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              title="Locora Home"
            >
              <Logo variant={isCollapsed ? 'collapsed' : 'sidebar'} />
            </div>

            {/* Collapse/Expand Toggle Button */}
            <button
              onClick={toggleSidebar}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                borderRadius: '8px',
                width: isCollapsed ? '32px' : '32px',
                height: isCollapsed ? '32px' : '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.borderColor = 'var(--border-medium)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* + New Trip Action Button */}
          {isCollapsed ? (
            <button
              onClick={handleNewTripClick}
              className="btn btn-primary"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '4px auto',
                boxShadow: '0 4px 14px rgba(0, 196, 140, 0.3)',
                flexShrink: 0
              }}
              title="Create New Trip"
              aria-label="Create New Trip"
            >
              <Plus size={20} />
            </button>
          ) : (
            <button
              onClick={handleNewTripClick}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: '10px',
                fontSize: '0.875rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(0, 196, 140, 0.25)'
              }}
            >
              <Plus size={16} />
              <span>New Trip</span>
            </button>
          )}

          {/* Primary Navigation List */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              if (isCollapsed) {
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => isMobileOpen && closeMobileSidebar()}
                    style={{
                      width: '44px',
                      height: '42px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '2px auto',
                      color: isActive ? 'var(--accent-teal)' : 'var(--text-secondary)',
                      backgroundColor: isActive ? 'rgba(45, 212, 191, 0.14)' : 'transparent',
                      border: isActive ? '1px solid rgba(45, 212, 191, 0.32)' : '1px solid transparent',
                      transition: 'all 0.18s ease',
                      textDecoration: 'none',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }
                    }}
                    title={item.label}
                    aria-label={item.label}
                  >
                    <Icon size={18} />
                  </NavLink>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => isMobileOpen && closeMobileSidebar()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'rgba(45, 212, 191, 0.12)' : 'transparent',
                    border: isActive ? '1px solid rgba(45, 212, 191, 0.28)' : '1px solid transparent',
                    boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.2)' : 'none',
                    transition: 'all 0.18s ease',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <Icon size={17} style={{ color: isActive ? 'var(--accent-teal)' : 'inherit' }} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Profile Summary + Settings */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isCollapsed ? '10px' : '8px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)'
          }}
        >
          {/* User Profile Area */}
          {isCollapsed ? (
            <NavLink
              to="/profile"
              onClick={() => isMobileOpen && closeMobileSidebar()}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                border: location.pathname === '/profile' ? '2px solid var(--accent-teal)' : '1.5px solid rgba(255, 255, 255, 0.15)',
                overflow: 'hidden',
                background: 'rgba(45, 212, 191, 0.15)',
                textDecoration: 'none',
                transition: 'all 0.18s ease'
              }}
              title={`Profile: ${userDisplayName}`}
              aria-label="Profile"
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userDisplayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <User size={18} color="var(--accent-teal)" />
              )}
            </NavLink>
          ) : (
            <NavLink
              to="/profile"
              onClick={() => isMobileOpen && closeMobileSidebar()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 10px',
                borderRadius: '10px',
                backgroundColor: location.pathname === '/profile' ? 'rgba(45, 212, 191, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                border: location.pathname === '/profile' ? '1px solid rgba(45, 212, 191, 0.28)' : '1px solid var(--border-subtle)',
                textDecoration: 'none',
                transition: 'all 0.18s ease'
              }}
              onMouseEnter={(e) => {
                if (location.pathname !== '/profile') {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = 'var(--border-medium)';
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== '/profile') {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }
              }}
            >
              {/* User Avatar */}
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'rgba(45, 212, 191, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-teal)',
                  border: '1px solid var(--accent-teal)',
                  flexShrink: 0
                }}
              >
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={userDisplayName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <User size={16} />
                )}
              </div>

              {/* User Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {userDisplayName}
                </div>
                <div
                  style={{
                    fontSize: '0.725rem',
                    color: 'var(--accent-teal)',
                    fontWeight: 600,
                    letterSpacing: '0.02em'
                  }}
                >
                  Explorer
                </div>
              </div>
            </NavLink>
          )}

          {/* Settings Button */}
          {isCollapsed ? (
            <button
              onClick={() => {
                if (isMobileOpen) closeMobileSidebar();
                openSettings();
              }}
              style={{
                width: '42px',
                height: '40px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                background: 'transparent',
                border: '1px solid transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.18s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              title="Settings"
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>
          ) : (
            <button
              onClick={() => {
                if (isMobileOpen) closeMobileSidebar();
                openSettings();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 14px',
                borderRadius: '10px',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                width: '100%',
                textAlign: 'left',
                transition: 'all 0.18s ease',
                border: '1px solid transparent',
                background: 'transparent',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <Settings size={17} />
              <span>Settings</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

