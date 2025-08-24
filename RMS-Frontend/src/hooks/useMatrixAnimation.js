import { useEffect, useRef, useCallback } from 'react';
import { initMatrixAnimation } from '../utils/topologyIndex';

/**
 * Custom hook for matrix animation
 * @returns {Object} Animation refs and handlers
 */
export const useMatrixAnimation = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize matrix animation
  const initializeAnimation = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) {
      return;
    }
    
    const cleanup = initMatrixAnimation(
      canvasRef.current,
      containerRef.current,
      () => console.log('Matrix animation started successfully'),
      () => console.log('Matrix animation stopped')
    );
    
    return cleanup;
  }, []);

  // Start matrix animation
  useEffect(() => {
    console.log('Matrix animation useEffect triggered');
    
    const cleanup = initializeAnimation();
    
    return cleanup;
  }, [initializeAnimation]);

  // Get canvas styling
  const getCanvasStyle = useCallback(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
    pointerEvents: 'none',
    opacity: 0.8,
    imageRendering: 'crisp-edges',
  }), []);

  return {
    // Refs
    canvasRef,
    containerRef,
    
    // Actions
    initializeAnimation,
    
    // Styling
    getCanvasStyle
  };
}; 