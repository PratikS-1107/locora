import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

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
  ariaLabel = 'Select option',
  searchable = false,
  searchPlaceholder = 'Search...',
  disabled = false,
  emptyMessage = 'No options found'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const isEffectiveOpen = isOpen && !disabled;

  // Close when clicking outside and handle ESC
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isEffectiveOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      if (searchable && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEffectiveOpen, searchable]);

  // Normalize options into { value, label, code, icon }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return {
      value: opt.value !== undefined ? opt.value : opt.id !== undefined ? opt.id : opt.name,
      label: opt.label || opt.name || opt.value || opt.id,
      code: opt.code,
      icon: opt.icon
    };
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value) || {
    value,
    label: value || placeholder
  };

  const stripDiacritics = (str) =>
    str ? String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';

  const filteredOptions = normalizedOptions.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = stripDiacritics(searchQuery.trim());
    return (
      (opt.label && stripDiacritics(opt.label).includes(q)) ||
      (opt.code && stripDiacritics(opt.code).includes(q)) ||
      (typeof opt.value === 'string' && stripDiacritics(opt.value).includes(q))
    );
  });

  const handleSelect = (val) => {
    onChange?.(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        display: fullWidth ? 'block' : 'inline-block',
        width: fullWidth ? '100%' : style.width || 'auto',
        userSelect: 'none',
        zIndex: isEffectiveOpen ? 100 : 'auto',
        opacity: disabled ? 0.48 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        transition: 'opacity 0.2s ease',
        ...style
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        aria-haspopup="listbox"
        aria-expanded={isEffectiveOpen}
        aria-label={ariaLabel}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          width: '100%',
          height: pill ? '46px' : '42px',
          padding: pill ? '0 18px 0 16px' : '0 14px',
          backgroundColor: isEffectiveOpen ? 'rgba(24, 34, 52, 0.95)' : 'rgba(20, 26, 38, 0.72)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: isEffectiveOpen ? '1px solid #0ea5e9' : '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: pill ? '9999px' : '12px',
          color: disabled ? 'rgba(255, 255, 255, 0.4)' : '#ffffff',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: isEffectiveOpen
            ? '0 0 0 3px rgba(14, 165, 233, 0.2), 0 8px 24px rgba(0, 0, 0, 0.4)'
            : '0 4px 16px rgba(0, 0, 0, 0.25)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          outline: 'none',
          boxSizing: 'border-box',
          ...buttonStyle
        }}
        onMouseEnter={(e) => {
          if (!isEffectiveOpen && !disabled) {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            e.currentTarget.style.backgroundColor = 'rgba(28, 38, 58, 0.85)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isEffectiveOpen && !disabled) {
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
            color: isEffectiveOpen ? '#38bdf8' : 'rgba(226, 232, 240, 0.65)',
            transform: isEffectiveOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s ease',
            marginLeft: '6px',
            flexShrink: 0
          }}
        />
      </button>

      {/* Floating Glassmorphic Dropdown Popover */}
      {isEffectiveOpen && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [align === 'right' ? 'right' : 'left']: 0,
            minWidth: fullWidth ? '100%' : minWidth,
            width: fullWidth ? '100%' : 'max-content',
            maxWidth: fullWidth ? '100%' : '320px',
            maxHeight: '290px',
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
          {searchable && (
            <div
              style={{
                position: 'sticky',
                top: 0,
                padding: '4px 6px 8px 6px',
                backgroundColor: 'rgba(14, 20, 34, 0.98)',
                zIndex: 2,
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '4px'
              }}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    color: 'rgba(255, 255, 255, 0.45)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={searchPlaceholder}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '0 10px 0 32px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0ea5e9';
                    e.target.style.boxShadow = '0 0 0 2px rgba(14, 165, 233, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div style={{ padding: '14px 12px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.85rem' }}>
              {emptyMessage}
            </div>
          ) : (
            <>
              {filteredOptions.slice(0, 150).map((opt, index) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={`${opt.value}-${opt.code || ''}-${index}`}
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
              {filteredOptions.length > 150 && (
                <div style={{
                  padding: '8px 12px',
                  fontSize: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.45)',
                  textAlign: 'center',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  marginTop: '4px'
                }}>
                  Showing first 150 of {filteredOptions.length} results. Type to narrow search.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
