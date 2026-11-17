import React from 'react';

interface LogoProps {
  variant?: 'light' | 'dark';
  showEmblemAbove?: boolean;
  className?: string;
}

/**
 * 0xDEV Brand Logo
 * Recreates the uploaded "Ox" navy emblem with the vivid red swooshing X
 * alongside the bold geometric "OxDEV" wordmark.
 */
export const Logo: React.FC<LogoProps> = ({
  variant = 'light',
  showEmblemAbove = false,
  className = '',
}) => {
  const primaryColor = variant === 'dark' ? '#FFFFFF' : '#1A1464';
  const redColor = '#EE1119';

  if (showEmblemAbove) {
    return (
      <span className={`inline-flex flex-col items-center gap-1.5 select-none ${className}`}>
        <svg
          width="88"
          height="46"
          viewBox="0 0 120 62"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Navy geometric 'O' */}
          <circle cx="29" cy="31" r="19" stroke={primaryColor} strokeWidth="12" />
          {/* Navy base legs of 'X' */}
          <path
            d="M57 12H73L86 29L103 49H84L74 37L61 49H49L67 30L57 12Z"
            fill={primaryColor}
          />
          {/* Vivid red swooshing upper blade of 'X' */}
          <path
            d="M49 50C59 38 69 24 85 12H109C97 23 89 28 77 31C67 34 59 41 49 50Z"
            fill={redColor}
          />
        </svg>
        <span className="font-display text-xl font-extrabold tracking-tight leading-none whitespace-nowrap">
          <span style={{ color: primaryColor }}>Ox</span>
          <span style={{ color: redColor }}>DEV</span>
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 select-none whitespace-nowrap shrink-0 ${className}`}>
      <svg
        width="44"
        height="24"
        viewBox="0 0 120 62"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Geometric 'O' */}
        <circle cx="29" cy="31" r="19" stroke={primaryColor} strokeWidth="12" />
        {/* Base 'X' body */}
        <path
          d="M57 12H73L86 29L103 49H84L74 37L61 49H49L67 30L57 12Z"
          fill={primaryColor}
        />
        {/* Vivid red swooshing X blade */}
        <path
          d="M49 50C59 38 69 24 85 12H109C97 23 89 28 77 31C67 34 59 41 49 50Z"
          fill={redColor}
        />
      </svg>
      <span className="font-display text-[21px] font-extrabold tracking-tight leading-none">
        <span style={{ color: primaryColor }}>Ox</span>
        <span style={{ color: redColor }}>DEV</span>
      </span>
    </span>
  );
};
