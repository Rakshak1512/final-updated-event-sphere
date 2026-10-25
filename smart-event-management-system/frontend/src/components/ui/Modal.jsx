import { useEffect } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

export default function Modal({ open, onClose, title, children, width = 480 }) {
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const modalContent = (
    <div
      onClick={onClose}
      className="modal-backdrop-overlay"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        minHeight: "100dvh",
        background: "rgba(10, 12, 20, 0.78)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflowY: "auto",
        zIndex: 99999,
        padding: "calc(env(safe-area-inset-top, 16px) + 12px) calc(env(safe-area-inset-right, 16px) + 10px) calc(env(safe-area-inset-bottom, 16px) + 12px) calc(env(safe-area-inset-left, 16px) + 10px)",
        boxSizing: "border-box",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card modal-card-content"
        style={{
          width: "100%",
          maxWidth: width,
          maxHeight: "calc(100dvh - 40px)",
          overflowY: "auto",
          padding: "clamp(16px, 4vw, 26px)",
          background: "var(--bg-elevated)",
          borderRadius: "20px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.4), 0 0 20px rgba(139,92,246,0.15)",
          position: "relative",
          margin: "auto",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            paddingBottom: 8,
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <h3 style={{ fontSize: "clamp(16px, 3.8vw, 18px)", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>{title}</h3>
          <button
            onClick={onClose}
            className="icon-btn"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "50%",
              width: 44,
              height: 44,
              minWidth: 44,
              minHeight: 44,
              color: "var(--text-secondary)",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
