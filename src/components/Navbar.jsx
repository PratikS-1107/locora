import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import { Settings, LogIn, User, LogOut, ChevronDown, Menu, X } from 'lucide-react';

const Navbar = () => {
  const { user, signOut, openSettings } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);

  // Handle scroll event for subtle backdrop transition
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavWithAuth = (path) => {
    setMobileMenuOpen(false);
    if (!user) {
      navigate('/login', { state: { from: path } });
    } else {
      navigate(path);
    }
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    const meta = user.user_metadata || {};
    return meta.first_name || meta.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Traveler';
  };

  const isHomePage = location.pathname === '/';

  return (
    <header style={{
      position: isHomePage ? 'fixed' : 'sticky',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      width: '100%',
      height: 'var(--header-height)',
      background: scrolled
        ? 'rgba(8, 11, 17, 0.94)'
        : (isHomePage ? 'linear-gradient(to bottom, rgba(8, 11, 17, 0.7) 0%, transparent 100%)' : 'rgba(8, 11, 17, 0.92)'),
      backdropFilter: (scrolled || !isHomePage) ? 'blur(20px)' : 'blur(4px)',
      WebkitBackdropFilter: (scrolled || !isHomePage) ? 'blur(20px)' : 'blur(4px)',
      borderBottom: (scrolled || !isHomePage) ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1360px',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px'
      }}>
        
        {/* Brand Logo */}
        <div
          onClick={() => navigate('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            flexShrink: 0
          }}
          title="Locora Home"
        >
          <Logo variant="header" />
        </div>

        {/* Primary Horizontal Navigation Links (Desktop) */}
        <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <NavLink
            to="/"
            style={({ isActive }) => ({
              fontSize: '0.775rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: isActive ? 'var(--accent-teal)' : 'rgba(248, 250, 252, 0.75)',
              transition: 'color 0.15s ease',
              textDecoration: 'none',
              position: 'relative',
              padding: '6px 0'
            })}
          >
            {({ isActive }) => (
              <>
                <span>Home</span>
                {isActive && (
                  <span style={{
                    position: 'absolute',
                    bottom: -2,
                    left: 0,
                    right: 0,
                    height: '2px',
                    borderRadius: '2px',
                    background: 'var(--accent-teal)'
                  }} />
                )}
              </>
            )}
          </NavLink>

          <button
            onClick={() => handleNavWithAuth('/my-trips')}
            style={{
              fontSize: '0.775rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: location.pathname === '/my-trips' ? 'var(--accent-teal)' : 'rgba(248, 250, 252, 0.75)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 0',
              position: 'relative',
              transition: 'color 0.15s ease'
            }}
          >
            <span>My Trips</span>
            {location.pathname === '/my-trips' && (
              <span style={{
                position: 'absolute',
                bottom: -2,
                left: 0,
                right: 0,
                height: '2px',
                borderRadius: '2px',
                background: 'var(--accent-teal)'
              }} />
            )}
          </button>

          <button
            onClick={() => handleNavWithAuth('/discover')}
            style={{
              fontSize: '0.775rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: location.pathname === '/discover' ? 'var(--accent-teal)' : 'rgba(248, 250, 252, 0.75)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 0',
              position: 'relative',
              transition: 'color 0.15s ease'
            }}
          >
            <span>Discover</span>
            {location.pathname === '/discover' && (
              <span style={{
                position: 'absolute',
                bottom: -2,
                left: 0,
                right: 0,
                height: '2px',
                borderRadius: '2px',
                background: 'var(--accent-teal)'
              }} />
            )}
          </button>

          <button
            onClick={() => handleNavWithAuth('/explore')}
            style={{
              fontSize: '0.775rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: location.pathname === '/explore' ? 'var(--accent-teal)' : 'rgba(248, 250, 252, 0.75)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 0',
              position: 'relative',
              transition: 'color 0.15s ease'
            }}
          >
            <span>Explore</span>
            {location.pathname === '/explore' && (
              <span style={{
                position: 'absolute',
                bottom: -2,
                left: 0,
                right: 0,
                height: '2px',
                borderRadius: '2px',
                background: 'var(--accent-teal)'
              }} />
            )}
          </button>

          <button
            onClick={() => handleNavWithAuth('/community')}
            style={{
              fontSize: '0.775rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: location.pathname === '/community' ? 'var(--accent-teal)' : 'rgba(248, 250, 252, 0.75)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 0',
              position: 'relative',
              transition: 'color 0.15s ease'
            }}
          >
            <span>Community</span>
            {location.pathname === '/community' && (
              <span style={{
                position: 'absolute',
                bottom: -2,
                left: 0,
                right: 0,
                height: '2px',
                borderRadius: '2px',
                background: 'var(--accent-teal)'
              }} />
            )}
          </button>
        </nav>

        {/* Right Side Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          {user ? (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 10px 4px 5px',
                  color: '#fff',
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)'
                }}
                aria-label="User menu"
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'rgba(45, 212, 191, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-teal)'
                }}>
                  {user?.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt={getUserDisplayName()}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <User size={15} />
                  )}
                </div>
                <span style={{ fontSize: '0.825rem', fontWeight: 600 }}>{getUserDisplayName()}</span>
                <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
              </button>

              {/* User Menu Dropdown */}
              {dropdownOpen && (
                <div className="glass-panel" style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '180px',
                  padding: '6px',
                  zIndex: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  boxShadow: 'var(--shadow-lg)'
                }}>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/profile');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      background: 'none',
                      border: 'none'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <User size={15} style={{ color: 'var(--accent-teal)' }} />
                    <span>Profile</span>
                  </button>

                  <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />

                  <button
                    onClick={async () => {
                      setDropdownOpen(false);
                      await signOut();
                      navigate('/');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      color: '#fca5a5',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      background: 'none',
                      border: 'none'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <LogOut size={15} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 'var(--radius-full)',
                padding: '6px 14px',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)'
              }}
            >
              <LogIn size={13} />
              <span>Log In</span>
            </button>
          )}

          {/* Settings Icon */}
          <button
            onClick={openSettings}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(248, 250, 252, 0.85)',
              cursor: 'pointer',
              transition: 'background 0.2s ease, color 0.2s ease'
            }}
            title="App Settings"
            aria-label="Settings"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = 'rgba(248, 250, 252, 0.85)';
            }}
          >
            <Settings size={16} />
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-nav-toggle"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '6px',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              cursor: 'pointer'
            }}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div style={{
          position: 'absolute',
          top: 'var(--header-height)',
          left: 0,
          right: 0,
          background: 'rgba(8, 11, 17, 0.98)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          zIndex: 99
        }}>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/');
            }}
            style={{ textAlign: 'left', padding: '8px 0', fontSize: '0.9rem', fontWeight: 700, color: location.pathname === '/' ? 'var(--accent-teal)' : '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            Home
          </button>
          <button
            onClick={() => handleNavWithAuth('/my-trips')}
            style={{ textAlign: 'left', padding: '8px 0', fontSize: '0.9rem', fontWeight: 700, color: location.pathname === '/my-trips' ? 'var(--accent-teal)' : '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            My Trips
          </button>
          <button
            onClick={() => handleNavWithAuth('/discover')}
            style={{ textAlign: 'left', padding: '8px 0', fontSize: '0.9rem', fontWeight: 700, color: location.pathname === '/discover' ? 'var(--accent-teal)' : '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            Discover
          </button>
          <button
            onClick={() => handleNavWithAuth('/explore')}
            style={{ textAlign: 'left', padding: '8px 0', fontSize: '0.9rem', fontWeight: 700, color: location.pathname === '/explore' ? 'var(--accent-teal)' : '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            Explore
          </button>
          <button
            onClick={() => handleNavWithAuth('/community')}
            style={{ textAlign: 'left', padding: '8px 0', fontSize: '0.9rem', fontWeight: 700, color: location.pathname === '/community' ? 'var(--accent-teal)' : '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            Community
          </button>
        </div>
      )}
    </header>
  );
};

export default Navbar;
