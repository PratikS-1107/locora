import React, { useRef, useEffect, useState, useMemo } from 'react';
import { gsap } from 'gsap';

/**
 * FoldText — React Bits Pro Component
 * Unfolds text sequentially in 3D space along a geometric hinge axis,
 * featuring realistic crease shading and perspective projection.
 *
 * @param {Object} props
 * @param {string} [props.text] - Text string to fold
 * @param {React.ReactNode} [props.children] - Alternative text children
 * @param {'word'|'char'|'line'} [props.splitBy='word'] - Token splitting strategy
 * @param {'top'|'bottom'|'left'|'right'} [props.hinge='top'] - Hinge rotation axis
 * @param {'view'|'mount'|'hover'} [props.trigger='view'] - Trigger mechanism
 * @param {number} [props.duration=0.6] - Animation duration per token
 * @param {number} [props.stagger=0.035] - Delay between successive tokens
 * @param {number} [props.perspective=600] - 3D Perspective distance in pixels
 * @param {number} [props.creaseShading=0.3] - Darkness intensity of fold shadow (0 to 1)
 * @param {string} [props.className='']
 * @param {React.CSSProperties} [props.style={}]
 */
export const FoldText = ({
  text = '',
  children,
  splitBy = 'word',
  hinge = 'top',
  trigger = 'view',
  duration = 0.6,
  stagger = 0.035,
  perspective = 600,
  creaseShading = 0.3,
  className = '',
  style = {}
}) => {
  const containerRef = useRef(null);
  const wordsRef = useRef([]);
  const shadingRef = useRef([]);
  const [hasTriggered, setHasTriggered] = useState(trigger === 'mount');

  const content = text || (typeof children === 'string' ? children : '');

  // Split content based on splitBy
  const tokens = useMemo(() => {
    if (!content) return [];
    if (splitBy === 'word') {
      return content.split(/\s+/).filter(Boolean);
    } else if (splitBy === 'char') {
      return content.split('');
    } else {
      return content.split('\n');
    }
  }, [content, splitBy]);

  // View intersection observer
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (trigger === 'view' && containerRef.current && !prefersReducedMotion) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setHasTriggered(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    } else {
      setHasTriggered(true);
    }
  }, [trigger]);

  // GSAP 3D Unfold Animation
  useEffect(() => {
    if (!hasTriggered || tokens.length === 0 || !containerRef.current) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      wordsRef.current.forEach((el) => {
        if (el) gsap.set(el, { opacity: 1, rotationX: 0, rotationY: 0 });
      });
      shadingRef.current.forEach((el) => {
        if (el) gsap.set(el, { opacity: 0 });
      });
      return;
    }

    const ctx = gsap.context(() => {
      // Rotation config based on hinge
      let fromRotation = {};
      let toRotation = {};
      let transformOrigin = 'top center';

      if (hinge === 'top') {
        fromRotation = { rotationX: -90 };
        toRotation = { rotationX: 0 };
        transformOrigin = '50% 0%';
      } else if (hinge === 'bottom') {
        fromRotation = { rotationX: 90 };
        toRotation = { rotationX: 0 };
        transformOrigin = '50% 100%';
      } else if (hinge === 'left') {
        fromRotation = { rotationY: 90 };
        toRotation = { rotationY: 0 };
        transformOrigin = '0% 50%';
      } else if (hinge === 'right') {
        fromRotation = { rotationY: -90 };
        toRotation = { rotationY: 0 };
        transformOrigin = '100% 50%';
      }

      const validWordEls = wordsRef.current.filter(Boolean);
      const validShadeEls = shadingRef.current.filter(Boolean);

      gsap.set(validWordEls, {
        transformOrigin,
        opacity: 0,
        ...fromRotation
      });

      gsap.set(validShadeEls, {
        opacity: creaseShading
      });

      const tl = gsap.timeline();

      tl.to(validWordEls, {
        ...toRotation,
        opacity: 1,
        duration,
        stagger,
        ease: 'power2.out'
      });

      tl.to(
        validShadeEls,
        {
          opacity: 0,
          duration: duration * 0.9,
          stagger,
          ease: 'power2.inOut'
        },
        0
      );
    }, containerRef);

    return () => {
      ctx.revert();
    };
  }, [hasTriggered, tokens, hinge, duration, stagger, creaseShading]);

  return (
    <div
      ref={containerRef}
      className={`fold-text-root ${className}`}
      style={{
        display: 'inline-block',
        perspective: `${perspective}px`,
        ...style
      }}
      aria-label={content}
    >
      {tokens.map((token, i) => (
        <span
          key={i}
          className="fold-token-wrapper"
          style={{
            display: 'inline-block',
            marginRight: splitBy === 'word' ? '0.28em' : '0em',
            perspective: `${perspective}px`,
            verticalAlign: 'top'
          }}
          aria-hidden="true"
        >
          <span
            ref={(el) => (wordsRef.current[i] = el)}
            className="fold-token-content"
            style={{
              display: 'inline-block',
              position: 'relative',
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden',
              willChange: 'transform, opacity'
            }}
          >
            {token}

            {/* Realistic Crease Shading Shadow Layer */}
            <span
              ref={(el) => (shadingRef.current[i] = el)}
              className="fold-crease-shadow"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: '#000000',
                pointerEvents: 'none',
                opacity: 0,
                borderRadius: '2px',
                mixBlendMode: 'multiply'
              }}
            />
          </span>
        </span>
      ))}
    </div>
  );
};

export default FoldText;
