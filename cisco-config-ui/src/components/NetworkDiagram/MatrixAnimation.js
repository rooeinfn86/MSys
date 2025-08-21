



/**
 * MatrixAnimation Component
 * Handles the Matrix-style falling code animation canvas layer
 * 
 * @param {Object} props - Component props
 * @param {React.RefObject} props.canvasRef - Reference to the canvas element
 * @param {Function} props.getCanvasStyle - Function to get canvas styling
 */
import React from 'react';

const MatrixAnimation = React.memo(({
  canvasRef,
  getCanvasStyle
}) => {
  return (
    <canvas
      ref={canvasRef}
      style={getCanvasStyle()}
    />
  );
});

export default MatrixAnimation; 