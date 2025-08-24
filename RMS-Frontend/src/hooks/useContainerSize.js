import { useState, useLayoutEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for tracking container size changes
 * @returns {Object} Container size state and ref
 */
export const useContainerSize = () => {
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Update container size
  const updateSize = useCallback(() => {
    if (!containerRef.current) {
      console.log('Container ref is null in updateSize');
      return;
    }
    
    const newSize = {
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight,
    };
    
    console.log('Container size updated:', newSize);
    
    // Only update if size actually changed
    setContainerSize(prevSize => {
      if (newSize.width !== prevSize.width || newSize.height !== prevSize.height) {
        return newSize;
      }
      return prevSize;
    });
  }, []);

  // Track container size for animation
  useLayoutEffect(() => {
    if (!containerRef.current) {
      console.log('Container ref is null');
      return;
    }
    
    // Initial size update
    updateSize();
    
    // Set up resize observer
    const resizeObserver = new window.ResizeObserver(() => {
      // Add a small delay to ensure DOM is stable
      setTimeout(updateSize, 10);
    });
    
    resizeObserver.observe(containerRef.current);
    
    // Also listen for window resize
    window.addEventListener('resize', updateSize);
    
    return () => {
      console.log('Cleaning up container size tracking');
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [updateSize]);

  return {
    containerRef,
    containerSize,
    updateSize
  };
}; 