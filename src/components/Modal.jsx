import React, { useEffect } from 'react';
import { X } from 'lucide-react';

let activeModalsCount = 0;
let originalBodyOverflow = '';
let originalHtmlOverflow = '';

const lockBackgroundScroll = () => {
  if (activeModalsCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }
  activeModalsCount++;
};

const unlockBackgroundScroll = () => {
  activeModalsCount = Math.max(0, activeModalsCount - 1);
  if (activeModalsCount === 0) {
    document.body.style.overflow = originalBodyOverflow || '';
    document.documentElement.style.overflow = originalHtmlOverflow || '';
  }
};

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '580px',
  hideHeader = false,
  bodyPadding,
  className = ''
}) => {
  useEffect(() => {
    if (!isOpen) return;

    lockBackgroundScroll();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unlockBackgroundScroll();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const showHeader = !hideHeader && title !== null && title !== undefined;
  const paddingValue = bodyPadding !== undefined ? bodyPadding : (showHeader ? '24px' : '0');

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`modal-content glass-panel ${className}`}
        style={{
          maxWidth,
          width: '100%'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {showHeader && (
          <div className="modal-header">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {title}
            </h3>
            <button
              onClick={onClose}
              className="btn-icon"
              aria-label="Close modal"
              type="button"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div
          className="modal-body"
          style={{
            padding: paddingValue
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
