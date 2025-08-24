import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  initMatrixAnimation,
  isMatrixAnimationSupported
} from '../utils/topologyIndex';

/**
 * useAnimationState Hook
 * Consolidated state management for all animation-related operations
 * 
 * @returns {Object} Animation state and operations
 */
const useAnimationState = () => {
  // Canvas references
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [animationQuality, setAnimationQuality] = useState('high');
  const [animationEnabled, setAnimationEnabled] = useState(true);
  
  // Matrix animation specific state
  const [matrixState, setMatrixState] = useState({
    particles: [],
    lastFrameTime: 0,
    frameCount: 0,
    fps: 60
  });
  
  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    cpuUsage: 0
  });

  // Initialize matrix animation
  const initializeAnimation = useCallback(() => {
    if (!canvasRef.current || !animationEnabled) return;
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.warn('Canvas 2D context not available');
        return;
      }
      
      // Check if matrix animation is supported
      if (!isMatrixAnimationSupported()) {
        console.warn('Matrix animation not supported in this environment');
        return;
      }
      
      // Initialize the animation
      const success = initMatrixAnimation(canvas, ctx);
      
      if (success) {
        setIsAnimating(true);
        setMatrixState(prev => ({
          ...prev,
          lastFrameTime: performance.now(),
          frameCount: 0
        }));
        
        console.log('Matrix animation initialized successfully');
      } else {
        console.warn('Failed to initialize matrix animation');
      }
      
    } catch (error) {
      console.error('Error initializing matrix animation:', error);
      setIsAnimating(false);
    }
  }, [animationEnabled]);

  // Start animation
  const startAnimation = useCallback(() => {
    if (!animationEnabled) return;
    
    setIsAnimating(true);
    initializeAnimation();
  }, [animationEnabled, initializeAnimation]);

  // Stop animation
  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
    
    // Clear canvas if available
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, []);

  // Pause animation
  const pauseAnimation = useCallback(() => {
    setIsAnimating(false);
  }, []);

  // Resume animation
  const resumeAnimation = useCallback(() => {
    if (animationEnabled) {
      setIsAnimating(true);
    }
  }, [animationEnabled]);

  // Change animation speed
  const changeAnimationSpeed = useCallback((speed) => {
    const clampedSpeed = Math.max(0.1, Math.min(3, speed));
    setAnimationSpeed(clampedSpeed);
    
    // Update matrix animation speed if available
    // Note: updateAnimationSpeed function not currently available in utils
  }, []);

  // Change animation quality
  const changeAnimationQuality = useCallback((quality) => {
    setAnimationQuality(quality);
    
    // Update matrix animation quality if available
    // Note: updateAnimationQuality function not currently available in utils
  }, []);

  // Toggle animation
  const toggleAnimation = useCallback(() => {
    if (isAnimating) {
      stopAnimation();
    } else {
      startAnimation();
    }
  }, [isAnimating, startAnimation, stopAnimation]);

  // Get canvas style
  const getCanvasStyle = useCallback(() => {
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 0,
      pointerEvents: 'none',
      opacity: animationEnabled ? 0.3 : 0
    };
  }, [animationEnabled]);

  // Get container style
  const getContainerStyle = useCallback(() => {
    return {
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden'
    };
  }, []);

  // Update performance metrics
  const updatePerformanceMetrics = useCallback(() => {
    if (!isAnimating) return;
    
    const now = performance.now();
    const frameTime = now - matrixState.lastFrameTime;
    const fps = 1000 / frameTime;
    
    setPerformanceMetrics(prev => ({
      fps: Math.round(fps),
      frameTime: Math.round(frameTime * 100) / 100,
      memoryUsage: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0,
      cpuUsage: Math.round((1 - fps / 60) * 100)
    }));
    
    setMatrixState(prev => ({
      ...prev,
      lastFrameTime: now,
      frameCount: prev.frameCount + 1,
      fps: Math.round(fps)
    }));
  }, [isAnimating, matrixState.lastFrameTime]);

  // Retry animation if it fails
  const retryAnimation = useCallback(() => {
    console.log('Retrying matrix animation...');
    stopAnimation();
    
    // Wait a bit before retrying
    setTimeout(() => {
      initializeAnimation();
    }, 100);
  }, [stopAnimation, initializeAnimation]);

  // Reset animation state
  const resetAnimationState = useCallback(() => {
    setIsAnimating(false);
    setAnimationSpeed(1);
    setAnimationQuality('high');
    setAnimationEnabled(true);
    setMatrixState({
      particles: [],
      lastFrameTime: 0,
      frameCount: 0,
      fps: 60
    });
    setPerformanceMetrics({
      fps: 60,
      frameTime: 16.67,
      memoryUsage: 0,
      cpuUsage: 0
    });
    
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, []);

  // Check if animation is supported
  const isAnimationSupported = useCallback(() => {
    return isMatrixAnimationSupported();
  }, []);

  // Update canvas size
  const updateCanvasSize = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const container = containerRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas size to match container
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Update matrix animation size if available
    // Note: updateCanvasSize function not currently available in utils
  }, []);

  // Effect to handle canvas size updates
  useEffect(() => {
    if (containerRef.current) {
      updateCanvasSize();
      
      // Add resize listener
      const handleResize = () => updateCanvasSize();
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [updateCanvasSize]);

  // Effect to update performance metrics
  useEffect(() => {
    if (!isAnimating) return;
    
    const interval = setInterval(updatePerformanceMetrics, 1000);
    return () => clearInterval(interval);
  }, [isAnimating, updatePerformanceMetrics]);

  // Effect to handle animation state changes
  useEffect(() => {
    if (animationEnabled && !isAnimating) {
      // Auto-start animation when enabled
      startAnimation();
    } else if (!animationEnabled && isAnimating) {
      // Auto-stop animation when disabled
      stopAnimation();
    }
  }, [animationEnabled, isAnimating, startAnimation, stopAnimation]);

  return {
    // Refs
    canvasRef,
    containerRef,
    
    // State
    isAnimating,
    animationSpeed,
    animationQuality,
    animationEnabled,
    matrixState,
    performanceMetrics,
    
    // Actions
    initializeAnimation,
    startAnimation,
    stopAnimation,
    pauseAnimation,
    resumeAnimation,
    changeAnimationSpeed,
    changeAnimationQuality,
    toggleAnimation,
    retryAnimation,
    resetAnimationState,
    
    // Utilities
    getCanvasStyle,
    getContainerStyle,
    isAnimationSupported,
    updateCanvasSize,
    
    // Setters for internal state management
    setIsAnimating,
    setAnimationSpeed,
    setAnimationQuality,
    setAnimationEnabled,
    setMatrixState,
    setPerformanceMetrics
  };
};

export default useAnimationState; 