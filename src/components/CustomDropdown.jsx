import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomDropdown = ({
  value,
  onChange,
  options = [],
  icon = null,
  placeholder = 'Select option',
  pill = true,
  align = 'right',
  minWidth = '170px',
  fullWidth = false,
  style = {},
  buttonStyle = {},
  menuStyle = {},
  ariaLabel = 'Select option'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Normalize options into { value, label, icon }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return {
      value: opt.value !== undefined ? opt.value : opt.id,
      label: opt.label || opt.name || opt.value || opt.id,
      icon: opt.icon
    };
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value) || {
    value,
    label: value || placeholder
  };

  const handleSelect = (val) => {
    onChange?.(val);
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        display: fullWidth ? 'block' : 'inline-block',
        width: fullWidth ? '100%' : style.width || 'auto',
        userSelect: 'none',
        zIndex: isOpen ? 100 : 'auto',
        ...style
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          width: '100%',
          height: pill ? '46px' : '42px',
          padding: pill ? '0 18px 0 16px' : '0 14px',
          backgroundColor: isOpen ? 'rgba(24, 34, 52, 0.95)' : 'rgba(20, 26, 38, 0.72)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: isOpen ? '1px solid #0ea5e9' : '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: pill ? '9999px' : '12px',
          color: '#ffffff',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: isOpen
            ? '0 0 0 3px rgba(14, 165, 233, 0.2), 0 8px 24px rgba(0, 0, 0, 0.4)'
            : '0 4px 16px rgba(0, 0, 0, 0.25)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          outline: 'none',
          boxSizing: 'border-box',
          ...buttonStyle
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            e.currentTarget.style.backgroundColor = 'rgba(28, 38, 58, 0.85)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.backgroundColor = 'rgba(20, 26, 38, 0.72)';
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
          {icon && <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>}
          <span style={{
            color: '#ffffff',
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {selectedOption.label}
          </span>
        </div>

        <ChevronDown
          size={15}
          style={{
            color: isOpen ? '#38bdf8' : 'rgba(226, 232, 240, 0.65)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s ease',
            marginLeft: '6px',
            flexShrink: 0
          }}
        />
      </button>

      {/* Floating Glassmorphic Dropdown Popover */}
      {isOpen && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [align === 'right' ? 'right' : 'left']: 0,
            minWidth: fullWidth ? '100%' : minWidth,
            width: fullWidth ? '100%' : 'max-content',
            maxWidth: '320px',
            maxHeight: '280px',
            overflowY: 'auto',
            backgroundColor: 'rgba(14, 20, 34, 0.98)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.06)',
            padding: '6px',
            zIndex: 9999,
            animation: 'dropdownFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            boxSizing: 'border-box',
            ...menuStyle
          }}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.18)' : 'transparent',
                  border: isSelected ? '1px solid rgba(14, 165, 233, 0.35)' : '1px solid transparent',
                  color: isSelected ? '#38bdf8' : 'rgba(248, 250, 252, 0.9)',
                  fontSize: '0.85rem',
                  fontWeight: isSelected ? 700 : 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'rgba(248, 250, 252, 0.9)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                  {opt.icon && <span style={{ flexShrink: 0 }}>{opt.icon}</span>}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.label}</span>
                </div>

                {isSelected && (
                  <Check size={14} style={{ color: '#38bdf8', flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
