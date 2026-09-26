import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatAuthError } from '../services/api';
import { Logo } from '../components/Logo';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Preserved redirect destination
  const fromPath = location.state?.from || '/my-trips';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoggingIn(true);

    try {
      const res = await signIn(email, password);
      if (res.error) {
        setErrorMsg(formatAuthError(res.error));
      } else {
        navigate(fromPath, { replace: true });
      }
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setIsGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res?.error) {
        setErrorMsg(formatAuthError(res.error));
      } else if (res?.data?.user) {
        navigate(fromPath, { replace: true });
      }
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your email address to request a password reset.');
      return;
    }
    alert(`A password reset link has been sent to ${email} if an account exists.`);
  };

  return (
    <div className="auth-centered-page page-entrance">
      {/* 1. FULL VIEWPORT CINEMATIC THEME BACKGROUND */}
      <div className="auth-bg-layer" aria-hidden="true">
        <img
          src="/profile-bg.jpg"
          alt="Locora Traveler Vista"
          className="auth-bg-image"
          onError={(e) => {
            e.currentTarget.src = '/community-bg.jpg';
          }}
        />
        <div className="auth-bg-overlay" />
      </div>

      {/* 2. CENTERED FLOATING GLASSMORPHIC LOGIN CARD */}
      <div className="auth-glass-card">
        {/* Locora Brand Logo */}
        <div className="auth-card-logo-wrap">
          <Logo variant="auth" width="260px" />
        </div>

        {/* Header Titles */}
        <h1 className="auth-card-title">Welcome back, Explorer!</h1>
        <p className="auth-card-subtitle">
          Sign in to explore curated itineraries, discover hidden gems, and continue your local travel adventures.
        </p>

        {/* Error Notification Alert */}
        {errorMsg && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.16)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '12px',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '20px',
              lineHeight: 1.45,
              animation: 'authSlideUp 0.3s ease'
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          {/* Email Input Field */}
          <div className="auth-field-group">
            <label className="auth-field-label">Email</label>
            <div className="auth-field-input-wrapper">
              <input
                type="email"
                required
                className="auth-field-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Input Field */}
          <div className="auth-field-group" style={{ marginBottom: 0 }}>
            <label className="auth-field-label">Password</label>
            <div className="auth-field-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="auth-field-input"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                className="auth-field-icon-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox & Forgot Password Link */}
          <div className="auth-row-remember-forgot">
            <label className="auth-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="auth-checkbox"
              />
              <span>Remember me</span>
            </label>

            <a
              href="#forgot"
              onClick={handleForgotPassword}
              className="auth-forgot-link"
            >
              Forgot password?
            </a>
          </div>

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={isLoggingIn || isGoogleLoading}
            className="auth-btn-primary-pill"
          >
            {isLoggingIn ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>Logging In...</span>
              </div>
            ) : (
              <span>Log In</span>
            )}
          </button>
        </form>

        {/* Or Divider */}
        <div className="auth-or-divider">Or</div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoggingIn || isGoogleLoading}
          className="auth-btn-google-pill"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>{isGoogleLoading ? 'Connecting to Google...' : 'Sign In with Google'}</span>
        </button>

        {/* Footer Navigation Link */}
        <div className="auth-bottom-switch">
          <span>Don't have an account?</span>
          <Link to="/signup" state={{ from: fromPath }} className="auth-bottom-switch-link">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
