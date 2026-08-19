import React, { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);

  const onTouchStart = (e) => {
    if (window.scrollY <= 0) startY.current = e.touches[0].clientY;
    else startY.current = null;
  };

  const onTouchMove = (e) => {
    if (startY.current == null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setPull(Math.min(dy * 0.5, 100));
  };

  const onTouchEnd = async () => {
    if (startY.current == null) return;
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(0);
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
      }
    } else {
      setPull(0);
    }
    startY.current = null;
  };

  const h = refreshing ? 44 : pull;

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex items-end justify-center overflow-hidden"
        style={{ height: h, transition: pull === 0 && !refreshing ? 'height 0.2s ease' : 'none', opacity: h / THRESHOLD }}
      >
        <RefreshCw className={`h-6 w-6 text-primary mb-2 ${refreshing ? 'animate-spin' : ''}`} />
      </div>
      {children}
    </div>
  );
}