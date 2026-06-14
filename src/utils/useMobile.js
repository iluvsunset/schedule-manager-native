import { useState, useEffect } from 'react';

/**
 * Custom hook that detects mobile viewport (≤768px).
 * Listens to window resize events with debounce.
 * Returns true when viewport is mobile-sized.
 */
export default function useMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= breakpoint;
  });

  useEffect(() => {
    let timeoutId;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth <= breakpoint);
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    // Also check on orientation change for mobile devices
    window.addEventListener('orientationchange', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [breakpoint]);

  return isMobile;
}
