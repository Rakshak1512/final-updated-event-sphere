import { useState, useEffect, useRef } from "react";
import { FiRefreshCw } from "react-icons/fi";

const PULL_THRESHOLD = 65;
const MAX_PULL = 90;

export default function PullToRefresh() {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const startX = useRef(0);
  const isPulling = useRef(false);
  const canPull = useRef(false);

  useEffect(() => {
    // Only engage touch listeners on touch-enabled devices
    if (typeof window === "undefined" || !("ontouchstart" in window || navigator.maxTouchPoints > 0)) {
      return;
    }

    const isInteractive = (target) => {
      if (!target) return false;
      return Boolean(
        target.closest("input, textarea, select, button, a, [contenteditable], .modal, .modal-backdrop, video, canvas")
      );
    };

    const handleTouchStart = (e) => {
      if (refreshing) return;
      if (e.touches.length !== 1) return;

      const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      if (currentScrollY > 2) {
        canPull.current = false;
        return;
      }

      if (isInteractive(e.target)) {
        canPull.current = false;
        return;
      }

      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      canPull.current = true;
      isPulling.current = false;
    };

    const handleTouchMove = (e) => {
      if (!canPull.current || refreshing) return;
      if (e.touches.length !== 1) return;

      const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      if (currentScrollY > 2) {
        canPull.current = false;
        setPullY(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - startY.current;
      const deltaX = currentX - startX.current;

      // Ignore upward movements
      if (deltaY <= 0) {
        setPullY(0);
        return;
      }

      // If user is swiping horizontally, cancel pull-to-refresh
      if (Math.abs(deltaX) > Math.abs(deltaY) * 0.8) {
        canPull.current = false;
        setPullY(0);
        return;
      }

      isPulling.current = true;
      // Damped rubber-band pull resistance
      const damped = Math.min(MAX_PULL, deltaY * 0.42);
      setPullY(damped);
    };

    const handleTouchEnd = () => {
      if (!canPull.current || !isPulling.current || refreshing) {
        canPull.current = false;
        isPulling.current = false;
        setPullY(0);
        return;
      }

      canPull.current = false;
      isPulling.current = false;

      if (pullY >= PULL_THRESHOLD) {
        setRefreshing(true);
        setPullY(PULL_THRESHOLD);
        // Trigger clean page reload preserving exact route, parameters, and query string
        setTimeout(() => {
          window.location.reload();
        }, 320);
      } else {
        setPullY(0);
      }
    };

    const handleTouchCancel = () => {
      canPull.current = false;
      isPulling.current = false;
      setPullY(0);
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [pullY, refreshing]);

  if (pullY <= 0 && !refreshing) return null;

  const isReady = pullY >= PULL_THRESHOLD;
  const rotation = refreshing ? undefined : Math.min(360, (pullY / PULL_THRESHOLD) * 360);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: "max(12px, calc(env(safe-area-inset-top, 0px) + 8px))",
        left: "50%",
        transform: `translateX(-50%) translateY(${pullY > 0 ? pullY * 0.5 : 0}px)`,
        zIndex: 9999,
        pointerEvents: "none",
        transition: isPulling.current ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease",
        opacity: pullY > 10 || refreshing ? 1 : 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "8px 18px",
          borderRadius: 999,
          background: isReady ? "var(--gradient-primary, #8b5cf6)" : "var(--bg-elevated, rgba(18, 22, 42, 0.95))",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: isReady ? "1px solid rgba(255, 255, 255, 0.4)" : "1px solid var(--border-color, rgba(255, 255, 255, 0.15))",
          boxShadow: isReady
            ? "0 8px 24px rgba(139, 92, 246, 0.4), 0 2px 6px rgba(0,0,0,0.2)"
            : "0 8px 20px rgba(0, 0, 0, 0.25)",
          color: "#ffffff",
          fontSize: 12.5,
          fontWeight: 600,
          letterSpacing: "-0.01em",
        }}
      >
        <FiRefreshCw
          size={14}
          style={{
            transform: rotation !== undefined ? `rotate(${rotation}deg)` : undefined,
            animation: refreshing ? "ptr-spin 0.7s linear infinite" : undefined,
            flexShrink: 0,
          }}
        />
        <span>{refreshing ? "Refreshing..." : isReady ? "Release to refresh" : "Pull down to refresh"}</span>
      </div>

      <style>{`
        @keyframes ptr-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
