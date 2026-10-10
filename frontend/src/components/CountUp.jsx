import React, { useState, useEffect } from 'react';

/**
 * Animated number component that counts up from 0 to value
 * @param {number|string} value - Target value to count up to
 * @param {number} duration - Animation duration in ms (default: 800)
 * @param {string} prefix - Optional prefix (e.g. '$')
 * @param {string} suffix - Optional suffix (e.g. '%')
 * @param {function} formatter - Optional custom formatter
 */
export default function CountUp({
  value = 0,
  duration = 800,
  prefix = '',
  suffix = '',
  formatter,
  className = '',
  style = {}
}) {
  const numericTarget = typeof value === 'number' 
    ? value 
    : parseFloat(String(value).replace(/[^0-9.-]+/g, '')) || 0;

  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    let frameId;
    const startVal = 0;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutCubic curve for smooth tactical dashboard feel
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (numericTarget - startVal) * easeProgress;

      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(numericTarget);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [numericTarget, duration]);

  const formatted = formatter 
    ? formatter(displayValue) 
    : Math.round(displayValue).toLocaleString();

  return (
    <span className={className} style={style}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
