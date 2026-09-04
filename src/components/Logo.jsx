import React from 'react';
import locoraLogo from '../assets/locora-logo.png';
import justLogo from '../assets/just-logo.png';

const VARIANTS = {
  sidebar: {
    width: '152px',
    height: 'auto',
    maxHeight: '54px',
    maxWidth: '100%'
  },
  collapsed: {
    width: '38px',
    height: '38px',
    maxHeight: '38px',
    maxWidth: '38px'
  },
  icon: {
    width: '38px',
    height: '38px',
    maxHeight: '38px',
    maxWidth: '38px'
  },
  header: {
    width: '150px',
    height: 'auto',
    maxHeight: '52px',
    maxWidth: '100%'
  },
  navbar: {
    width: '150px',
    height: 'auto',
    maxHeight: '52px',
    maxWidth: '100%'
  },
  large: {
    width: '210px',
    height: 'auto',
    maxHeight: '75px',
    maxWidth: '100%'
  },
  auth: {
    width: '210px',
    height: 'auto',
    maxHeight: '75px',
    maxWidth: '100%'
  },
  splash: {
    width: '260px',
    height: 'auto',
    maxHeight: '85px',
    maxWidth: '100%'
  },
  loading: {
    width: '260px',
    height: 'auto',
    maxHeight: '85px',
    maxWidth: '100%'
  },
  footer: {
    width: '140px',
    height: 'auto',
    maxHeight: '50px',
    maxWidth: '100%'
  },
  mobile: {
    width: '120px',
    height: 'auto',
    maxHeight: '42px',
    maxWidth: '100%'
  },
  modal: {
    width: '145px',
    height: 'auto',
    maxHeight: '48px',
    maxWidth: '100%'
  }
};

// Legacy size mappings for backward compatibility
const SIZES = {
  xs: { width: '105px', height: 'auto', maxHeight: '34px' },
  sm: { width: '125px', height: 'auto', maxHeight: '42px' },
  md: { width: '150px', height: 'auto', maxHeight: '52px' },
  lg: { width: '210px', height: 'auto', maxHeight: '75px' },
  xl: { width: '260px', height: 'auto', maxHeight: '85px' },
  splash: { width: '260px', height: 'auto', maxHeight: '85px' }
};

export const Logo = ({
  variant,
  size,
  width,
  height,
  className = '',
  containerClassName = '',
  style = {},
  containerStyle = {},
  onClick,
  alt = 'Locora'
}) => {
  // Determine dimensions based on variant, size, or default to header
  let baseDimensions = VARIANTS.header;
  if (variant && VARIANTS[variant]) {
    baseDimensions = VARIANTS[variant];
  } else if (size && SIZES[size]) {
    baseDimensions = SIZES[size];
  }

  const finalWidth = width || baseDimensions.width;
  const finalHeight = height || baseDimensions.height;
  const finalMaxHeight = baseDimensions.maxHeight || 'none';
  const finalMaxWidth = baseDimensions.maxWidth || '100%';

  const logoSrc = (variant === 'collapsed' || variant === 'icon') ? justLogo : locoraLogo;

  return (
    <div
      className={`locora-logo-container ${containerClassName}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        flexShrink: 0,
        ...containerStyle
      }}
    >
      <img
        src={logoSrc}
        alt={alt}
        className={`locora-brand-logo ${variant ? `logo-${variant}` : ''} ${className}`}
        onClick={onClick}
        style={{
          width: finalWidth,
          height: finalHeight,
          maxWidth: finalMaxWidth,
          maxHeight: finalMaxHeight,
          objectFit: 'contain',
          objectPosition: 'center',
          display: 'block',
          verticalAlign: 'middle',
          flexShrink: 0,
          cursor: onClick ? 'pointer' : 'default',
          userSelect: 'none',
          ...style
        }}
      />
    </div>
  );
};

export const LocoraLogo = Logo;
export default Logo;
