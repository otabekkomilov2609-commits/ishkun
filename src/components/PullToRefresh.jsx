import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 60;
const MAX = 100;

export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef(null);
  const startY = useRef(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (window.scrollY <= 0 && !refreshingRef.current) startY.current = e.touches[0].clientY;
      else startY.current = null;
    };

    const onTouchMove = (e) => {
      if (startY.current == null || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && window.scrollY <= 0) {
        // Non-passive listener: this actually blocks native overscroll / pull-to-refresh.
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
          await onRefreshRef.current?.();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
        }
      } else {
        setPull(0);
        pullRef.current = 0;
      }
    };

    // passive: false is required so preventDefault() works on Android Chrome.
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const h = refreshing ? 44 : pull;

  return (
    <div ref={containerRef} style={{ touchAction: 'pan-y' }}>
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