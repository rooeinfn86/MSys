// Matrix animation utilities for network topology background

import { MATRIX_ANIMATION, CANVAS_SETTINGS } from './constants';

/**
 * Initialize matrix animation on a canvas element
 * @param {HTMLCanvasElement} canvas - Canvas element to animate
 * @param {HTMLElement} container - Container element for size reference
 * @param {Function} onAnimationStart - Callback when animation starts
 * @param {Function} onAnimationStop - Callback when animation stops
 * @returns {Function} Cleanup function to stop animation
 */
export const initMatrixAnimation = (canvas, container, onAnimationStart, onAnimationStop) => {
  if (!canvas || !container) {
    console.error('Canvas or container not provided for matrix animation');
    return () => {};
  }

  const width = container.offsetWidth;
  const height = container.offsetHeight;
  
  if (width === 0 || height === 0) {
    console.error('Container size is zero, cannot initialize matrix animation');
    return () => {};
  }

  console.log('Starting Matrix animation with dimensions:', { width, height });
  
  const ctx = canvas.getContext('2d');
  
  // Set canvas size to match container size for crisp rendering
  canvas.width = width;
  canvas.height = height;
  
  // Ensure crisp pixel rendering
  ctx.imageSmoothingEnabled = CANVAS_SETTINGS.IMAGE_SMOOTHING;
  
  let animationFrameId;
  const fontSize = MATRIX_ANIMATION.FONT_SIZE;
  const columns = Math.floor(width / fontSize);
  const drops = Array(columns).fill(1);
  const binary = MATRIX_ANIMATION.BINARY_CHARS;

  function draw() {
    // Clear the canvas with a semi-transparent black overlay for Matrix effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; // Very transparent black for trailing effect
    ctx.fillRect(0, 0, width, height);
    
    // Set font and color for the binary characters
    ctx.font = `${fontSize}px "Courier New", monospace`;
    ctx.textBaseline = 'top';
    
    // Draw the falling binary characters
    for (let i = 0; i < columns; i++) {
      const text = binary[Math.floor(Math.random() * binary.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;
      
      // Add some variation to the characters
      if (Math.random() > MATRIX_ANIMATION.WHITE_CHAR_PROBABILITY) {
        ctx.fillStyle = '#ffffff'; // Occasional white characters
      } else {
        ctx.fillStyle = '#00ff00'; // Mostly green
      }
      
      ctx.fillText(text, x, y);
      
      // Reset drop when it goes off screen
      if (drops[i] * fontSize > height && Math.random() > MATRIX_ANIMATION.RESET_PROBABILITY) {
        drops[i] = 0;
      }
      // Slow down the falling speed
      drops[i] += MATRIX_ANIMATION.FALL_SPEED;
    }
    
    // Debug: Log every 60 frames (about once per second)
    if (Math.random() < MATRIX_ANIMATION.DEBUG_LOG_PROBABILITY) {
      console.log('Matrix animation running - Canvas size:', { width, height }, 'Columns:', columns);
    }
    
    animationFrameId = requestAnimationFrame(draw);
  }

  draw();
  console.log('Matrix animation started successfully');
  
  if (onAnimationStart) {
    onAnimationStart();
  }

  // Return cleanup function
  return () => {
    console.log('Cleaning up Matrix animation');
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    if (onAnimationStop) {
      onAnimationStop();
    }
  };
};

/**
 * Retry matrix animation initialization with delay
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {HTMLElement} container - Container element
 * @param {Function} onAnimationStart - Callback when animation starts
 * @param {Function} onAnimationStop - Callback when animation stops
 * @param {number} retryCount - Current retry count
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Function} Cleanup function
 */
export const retryMatrixAnimation = (canvas, container, onAnimationStart, onAnimationStop, retryCount = 0, maxRetries = 5) => {
  if (retryCount >= maxRetries) {
    console.error('Max retries reached for matrix animation initialization');
    return () => {};
  }

  if (!canvas || !container) {
    console.log('Refs not ready, retrying in 50ms');
    setTimeout(() => {
      retryMatrixAnimation(canvas, container, onAnimationStart, onAnimationStop, retryCount + 1, maxRetries);
    }, MATRIX_ANIMATION.RETRY_DELAY);
    return () => {};
  }
  
  const width = container.offsetWidth;
  const height = container.offsetHeight;
  
  if (width === 0 || height === 0) {
    console.log('Container size is zero, retrying in 50ms');
    setTimeout(() => {
      retryMatrixAnimation(canvas, container, onAnimationStart, onAnimationStop, retryCount + 1, maxRetries);
    }, MATRIX_ANIMATION.RETRY_DELAY);
    return () => {};
  }
  
  return initMatrixAnimation(canvas, container, onAnimationStart, onAnimationStop);
};

/**
 * Check if matrix animation is supported
 * @returns {boolean} True if matrix animation is supported
 */
export const isMatrixAnimationSupported = () => {
  return typeof window !== 'undefined' && 
         typeof window.requestAnimationFrame === 'function' &&
         typeof HTMLCanvasElement !== 'undefined';
};

/**
 * Get matrix animation performance metrics
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {Object} Performance metrics
 */
export const getMatrixAnimationMetrics = (canvas) => {
  if (!canvas) return {};
  
  return {
    width: canvas.width,
    height: canvas.height,
    columns: Math.floor(canvas.width / MATRIX_ANIMATION.FONT_SIZE),
    fontSize: MATRIX_ANIMATION.FONT_SIZE,
    supported: isMatrixAnimationSupported()
  };
}; 