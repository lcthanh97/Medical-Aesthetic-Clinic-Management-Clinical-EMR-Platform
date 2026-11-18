import React from 'react';

interface DermaBrandMarkProps {
  size?: number;
  className?: string;
}

/**
 * Custom minimalist clinical dermatology emblem:
 * Medical cross + dermal shield contour (clean clinic aesthetic).
 */
export function DermaBrandMark({ size = 22, className = '' }: DermaBrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2.5C7.2 4.3 4.5 5.1 4.5 11.2C4.5 16.4 8.2 19.9 12 21.5C15.8 19.9 19.5 16.4 19.5 11.2C19.5 5.1 16.8 4.3 12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 8.2V15.4M8.4 11.8H15.6"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
