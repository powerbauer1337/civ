import { useState, useEffect } from 'react';

/**
 * Custom hook for detecting media queries
 * Returns true when the media query matches
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // Check if window is available (client-side only)
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia(query);
    
    // Set initial value
    setMatches(media.matches);

    // Define event listener
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener
    media.addEventListener('change', listener);

    // Cleanup
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
};

/**
 * Preset hooks for common breakpoints
 */
export const useIsMobile = () => useMediaQuery('(max-width: 768px)');
export const useIsTablet = () => useMediaQuery('(max-width: 1024px) and (min-width: 769px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1025px)');
export const useIsSmallScreen = () => useMediaQuery('(max-width: 480px)');

/**
 * Hook to detect if the device supports touch
 */
export const useTouchDevice = (): boolean => {
  const [isTouch, setIsTouch] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hasTouch = 'ontouchstart' in window || 
                     navigator.maxTouchPoints > 0 || 
                     (navigator as any).msMaxTouchPoints > 0;
    
    setIsTouch(hasTouch);
  }, []);

  return isTouch;
};

/**
 * Combined hook for mobile experience detection
 */
export const useMobileExperience = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isTouch = useTouchDevice();
  const isSmall = useIsSmallScreen();

  return {
    isMobile,
    isTablet,
    isTouch,
    isSmall,
    isMobileOrTablet: isMobile || isTablet,
    shouldUseMobileUI: isMobile || (isTablet && isTouch),
    shouldUseCompactUI: isSmall || isMobile
  };
};