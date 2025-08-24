import { useState, useRef } from "react";

// Custom tooltip hook
export const useTooltip = () => {
  const [tooltip, setTooltip] = useState({ show: false, text: '', x: 0, y: 0, type: '' });
  const tooltipRef = useRef(null);

  const showTooltip = (text, x, y, type) => {
    setTooltip({ show: true, text, x, y, type });
  };

  const hideTooltip = () => {
    setTooltip({ show: false, text: '', x: 0, y: 0, type: '' });
  };

  return { tooltip, showTooltip, hideTooltip, tooltipRef };
}; 