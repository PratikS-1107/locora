import React, { useRef, useState, useEffect, useCallback } from 'react';

/**
 * DepthCard — React Bits Pro Component
 * Perspective & depth mouse interaction card with smooth GSAP / lerp damping
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {number} [props.maxTilt=10] - Maximum tilt angle in degrees
 * @param {number} [props.depth=15] - Perspective depth in pixels for 3D translation
 * @param {boolean} [props.glare=true] - Whether to show dynamic specular glare
 * @param {number} [props.glareOpacity=0.15] - Max glare opacity
 * @param {number} [props.scaleOnHover=1.02] - Scale multiplier on hover
 * @param {boolean} [props.isActive=false] - Active card highlight state
 * @param {string} [props.className='']
 * @param {React.CSSProperties} [props.style={}]
 * @param {Function} [props.onClick]
 */
export const DepthCard = ({
  children,
  maxTilt = 8,
  depth = 12,
  glare = true,
  glareOpacity = 0.12,
  scaleOnHover = 1.02,
  isActive = false,
  className = '',
  style = {},
  onClick,
  ...rest
}) => {
  const cardRef = useRef(null);
  const reqRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Mouse coordinate state
  const mouse = useRef({
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0,
    glareX: 50,
    glareY: 50
  });

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
    const handler = (e) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Smooth lerp rendering loop
  const updateTransform = useCallback(() => {
    if (isReducedMotion) return;

    // Smooth damping interpolation (lerp)
    const m = mouse.current;
    m.currentX += (m.targetX - m.currentX) * 0.1;
    m.currentY += (m.targetY - m.currentY) * 0.1;

    const el = cardRef.current;
    if (el) {
      const rotateX = -m.currentY * maxTilt;
      const rotateY = m.currentX * maxTilt;
      const scale = isHovered ? scaleOnHover : 1;
      const translateZ = isHovered ? depth : 0;

      el.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, 1) translateZ(${translateZ}px)`;

      // Update glare overlay if enabled
      const glareEl = el.querySelector('.depth-card-glare');
      if (glareEl && glare) {
        glareEl.style.background = `radial-gradient(circle at ${m.glareX}% ${m.glareY}%, rgba(255, 255, 255, ${isHovered ? glareOpacity : 0}) 0%, transparent 65%)`;
      }
    }

    // Continue loop if moving or hovered
    if (isHovered || Math.abs(m.targetX - m.currentX) > 0.001 || Math.abs(m.targetY - m.currentY) > 0.001) {
      reqRef.current = requestAnimationFrame(updateTransform);
    }
  }, [isHovered, isReducedMotion, maxTilt, depth, glare, glareOpacity, scaleOnHover]);

  useEffect(() => {
    if (isHovered) {
      reqRef.current = requestAnimationFrame(updateTransform);
    }
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [isHovered, updateTransform]);

  const handleMouseMove = (e) => {
    if (isReducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalized coordinates from -1 to 1
    const normX = (x / rect.width) * 2 - 1;
    const normY = (y / rect.height) * 2 - 1;

    mouse.current.targetX = Math.max(-1, Math.min(1, normX));
    mouse.current.targetY = Math.max(-1, Math.min(1, normY));
    mouse.current.glareX = (x / rect.width) * 100;
    mouse.current.glareY = (y / rect.height) * 100;

    if (!reqRef.current) {
      reqRef.current = requestAnimationFrame(updateTransform);
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouse.current.targetX = 0;
    mouse.current.targetY = 0;
    if (!reqRef.current) {
      reqRef.current = requestAnimationFrame(updateTransform);
    }
  };

  return (
    <div
      ref={cardRef}
      className={`depth-card-root ${isActive ? 'depth-card-active' : ''} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        position: 'relative',
        transformStyle: 'preserve-3d',
        transition: isHovered ? 'box-shadow 0.3s ease, border-color 0.3s ease' : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease, border-color 0.3s ease',
        willChange: 'transform',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      {...rest}
    >
      {/* Card Content Container */}
      <div
        className="depth-card-content"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          borderRadius: 'inherit',
          overflow: 'hidden',
          transformStyle: 'preserve-3d'
        }}
      >
        {children}

        {/* Dynamic Specular Glare Sheen */}
        {glare && (
          <div
            className="depth-card-glare"
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              borderRadius: 'inherit',
              zIndex: 10,
              transition: 'opacity 0.3s ease',
              opacity: isHovered ? 1 : 0
            }}
          />
        )}
      </div>
    </div>
  );
};

export default DepthCard;
