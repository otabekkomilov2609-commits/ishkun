import React, { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 60;
const MAX = 100;

export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  const onTouchStart = (e) => {
    if (window.scrollY <= 0 && !refreshingRef.current) startY.current = e.touches[0].clientY;
    else startY.current = null;
  };

  const onTouchMove = (e) => {
    if (startY.current == null || refreshingRef.current) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      // Stop the browser from stealing the gesture (native pull-to-refresh / overscroll)
      if (e.cancelable) e.preventDefault();
      const next = Math.min(dy * 0.5, MAX);
      pullRef.current = next;
      setPull(next);
    }
  };

  const onTouchEnd = async () => {
    if (startY.current == null) return;
    startY.current = null;
    if (pullRef.current >= THRESHOLD && !refreshingRef.current) {
      refreshingRef.current = true;
      setRefreshing(true);
      setPull(0);
      pullRef.current = 0;
      try {
        await onRefresh?.();
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
      }
    } else {
      setPull(0);
      pullRef.current = 0;
    }
  };

  const h = refreshing ? 44 : pull;

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ touchAction: 'pan-x' }}>
      <div
        className="flex items-end justify-center overflow-hidden"
        style={{ height: h, transition: pull === 0 && !refreshing ? 'height 0.2s ease' : 'none', opacity: Math.min(h / THRESHOLD, 1) }}
      >
        <RefreshCw className={`h-6 w-6 text-primary mb-2 ${refreshing ? 'animate-spin' : ''}`} />
      </div>
      {children}
    </div>
  );
}