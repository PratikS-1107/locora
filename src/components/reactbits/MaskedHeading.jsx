import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';

/**
 * MaskedHeading — React Bits Pro Component
 * Editorial heading where text letterforms are masked with an image or video texture,
 * accompanied by entrance reveal animations and subtle drift/parallax.
 *
 * @param {Object} props
 * @param {string} props.text - Text to display
 * @param {string} props.src - Image or video media source URL
 * @param {'image'|'video'} [props.mediaType='image'] - Media format
 * @param {'rise'|'fade'|'slide'} [props.reveal='rise'] - Entrance reveal style
 * @param {'view'|'mount'|'hover'} [props.trigger='view'] - Trigger mechanism
 * @param {'left'|'center'|'right'} [props.align='left'] - Text alignment
 * @param {number} [props.weight=800] - Font weight
 * @param {boolean} [props.subtleParallax=true] - Pointer parallax drift
 * @param {boolean} [props.subtleDrift=true] - Continuous ambient texture drift
 * @param {string} [props.className='']
 * @param {React.CSSProperties} [props.style={}]
 */
export const MaskedHeading = ({
  text,
  src,
  mediaType = 'image',
  reveal = 'rise',
  trigger = 'view',
  align = 'left',
  weight = 800,
  subtleParallax = true,
  subtleDrift = true,
  className = '',
  style = {}
}) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const timelineRef = useRef(null);
  const [hasRevealed, setHasRevealed] = useState(trigger === 'mount');

  useEffect(() => {
    // Check reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (trigger === 'view' && containerRef.current && !prefersReducedMotion) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setHasRevealed(true);
            observer.disconnect();
          }
        },
        { threshold: 0.15 }
      );
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    } else {
      setHasRevealed(true);
    }
  }, [trigger]);

  // Entrance animation with GSAP
  useEffect(() => {
    if (!hasRevealed || !textRef.current) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      gsap.set(textRef.current, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      if (reveal === 'rise') {
        gsap.fromTo(
          textRef.current,
          {
            y: '100%',
            opacity: 0,
            rotateX: -15
          },
          {
            y: '0%',
            opacity: 1,
            rotateX: 0,
            duration: 0.85,
            ease: 'power3.out'
          }
        );
      } else if (reveal === 'fade') {
        gsap.fromTo(
          textRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.7, ease: 'power2.out' }
        );
      } else if (reveal === 'slide') {
        gsap.fromTo(
          textRef.current,
          { x: '-30px', opacity: 0 },
          { x: '0px', opacity: 1, duration: 0.75, ease: 'power3.out' }
        );
      }

      // Subtle ambient drift animation on background position
      if (subtleDrift && mediaType === 'image') {
        gsap.to(textRef.current, {
          backgroundPosition: '100% 50%',
          duration: 18,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });
      }
    }, containerRef);

    timelineRef.current = ctx;

    return () => {
      ctx.revert();
    };
  }, [hasRevealed, reveal, subtleDrift, mediaType, text, src]);

  // Mouse parallax
  useEffect(() => {
    if (!subtleParallax || !containerRef.current) return;
    const el = containerRef.current;

    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
      if (textRef.current) {
        gsap.to(textRef.current, {
          backgroundPosition: `${50 + nx}% ${50 + ny}%`,
          duration: 0.5,
          ease: 'power1.out',
          overwrite: 'auto'
        });
      }
    };

    el.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => el.removeEventListener('mousemove', handleMouseMove);
  }, [subtleParallax]);

  return (
    <div
      ref={containerRef}
      className={`masked-heading-container ${className}`}
      style={{
        display: 'block',
        overflow: 'hidden',
        textAlign: align,
        position: 'relative',
        ...style
      }}
      aria-label={text}
    >
      <h3
        ref={textRef}
        className="masked-heading-text"
        style={{
          margin: 0,
          fontWeight: weight,
          lineHeight: 1.15,
          letterSpacing: '-0.015em',
          textAlign: align,
          wordBreak: 'break-word',
          backgroundImage: src
            ? `linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.75) 100%), url(${src})`
            : 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.8) 100%)',
          backgroundSize: '150% 150%',
          backgroundPosition: '50% 50%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
          textShadow: '0 2px 14px rgba(0,0,0,0.5)',
          transformOrigin: 'bottom center',
          display: 'inline-block',
          width: '100%'
        }}
      >
        {text}
      </h3>
    </div>
  );
};

export default MaskedHeading;
