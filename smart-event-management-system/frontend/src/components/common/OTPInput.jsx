import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiClock, FiRotateCw } from "react-icons/fi";

/**
 * Reusable Premium 6-Box Glassmorphism OTP Input Component
 * Features:
 * - 6 distinct glass input boxes
 * - Single continuous moving glass capsule indicator (Framer Motion spring)
 * - Auto-focus, auto-advance, backspace navigation, arrow navigation
 * - Full 6-digit paste support
 * - Completion glow/expand animation
 * - Error shake + red glass glow animation
 * - Countdown timer (MM:SS) & Resend cooldown
 */
export default function OTPInput({
  value = "",
  onChange,
  length = 6,
  onComplete,
  error = false,
  errorMessage = "",
  disabled = false,
  onResend,
  resending = false,
  expiryMinutes = 5,
  initialCooldown = 60,
}) {
  const [digits, setDigits] = useState(() => {
    const arr = Array(length).fill("");
    const chars = value.split("").slice(0, length);
    chars.forEach((c, i) => (arr[i] = c));
    return arr;
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [shake, setShake] = useState(false);
  const inputsRef = useRef([]);

  // Timer state (expiry countdown in seconds)
  const [timeLeft, setTimeLeft] = useState(expiryMinutes * 60);
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(initialCooldown);

  // Sync external value changes
  useEffect(() => {
    const chars = (value || "").split("").slice(0, length);
    const newDigits = Array(length).fill("");
    chars.forEach((c, i) => {
      if (/^\d$/.test(c)) newDigits[i] = c;
    });
    setDigits(newDigits);
  }, [value, length]);

  // Expiry Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    if (canResend) return;
    if (resendCooldown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [canResend, resendCooldown]);

  // Auto focus first empty box on mount
  useEffect(() => {
    const firstEmpty = digits.findIndex((d) => !d);
    const targetIdx = firstEmpty === -1 ? 0 : firstEmpty;
    setActiveIndex(targetIdx);
    inputsRef.current[targetIdx]?.focus();
  }, []);

  // Trigger error shake on error prop
  useEffect(() => {
    if (error) {
      setShake(true);
      const timeout = setTimeout(() => setShake(false), 650);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  const updateValueAndNotify = (newDigits) => {
    setDigits(newDigits);
    const combined = newDigits.join("");
    if (onChange) onChange(combined);

    if (combined.length === length && newDigits.every((d) => d !== "")) {
      setIsCompleted(true);
      if (onComplete) onComplete(combined);
    } else {
      setIsCompleted(false);
    }
  };

  const handleKeyDown = (index, e) => {
    if (disabled) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      const newDigits = [...digits];
      if (digits[index]) {
        // Clear current
        newDigits[index] = "";
        updateValueAndNotify(newDigits);
      } else if (index > 0) {
        // Clear previous and focus previous
        newDigits[index - 1] = "";
        updateValueAndNotify(newDigits);
        setActiveIndex(index - 1);
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (index > 0) {
        setActiveIndex(index - 1);
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (index < length - 1) {
        setActiveIndex(index + 1);
        inputsRef.current[index + 1]?.focus();
      }
    } else if (e.key === "Delete") {
      e.preventDefault();
      const newDigits = [...digits];
      newDigits[index] = "";
      updateValueAndNotify(newDigits);
    }
  };

  const handleChange = (index, e) => {
    if (disabled) return;
    const val = e.target.value;

    // Filter out non-numeric
    const numericChar = val.replace(/\D/g, "").slice(-1);
    if (!numericChar) return;

    const newDigits = [...digits];
    newDigits[index] = numericChar;
    updateValueAndNotify(newDigits);

    // Auto advance to next box
    if (index < length - 1) {
      setActiveIndex(index + 1);
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    if (disabled) return;
    const pastedData = e.clipboardData.getData("text/plain").trim();
    const numericChars = pastedData.replace(/\D/g, "").slice(0, length);
    if (!numericChars) return;

    const newDigits = Array(length).fill("");
    for (let i = 0; i < numericChars.length; i++) {
      newDigits[i] = numericChars[i];
    }
    updateValueAndNotify(newDigits);

    const nextFocus = Math.min(numericChars.length, length - 1);
    setActiveIndex(nextFocus);
    inputsRef.current[nextFocus]?.focus();
  };

  const handleFocus = (index) => {
    setActiveIndex(index);
  };

  const handleResendClick = () => {
    if (!canResend || resending || disabled) return;
    setCanResend(false);
    setResendCooldown(initialCooldown);
    setTimeLeft(expiryMinutes * 60);
    // Clear inputs on resend
    const empty = Array(length).fill("");
    setDigits(empty);
    if (onChange) onChange("");
    setActiveIndex(0);
    inputsRef.current[0]?.focus();
    if (onResend) onResend();
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  return (
    <div className="otp-container" style={{ width: "100%", margin: "16px 0 24px" }}>
      {/* 6-Box Grid Wrapper with Moving Glass Capsule */}
      <motion.div
        className="otp-boxes-grid"
        animate={
          shake
            ? {
                x: [0, -14, 14, -10, 10, -5, 5, 0],
                transition: { duration: 0.55, ease: "easeInOut" },
              }
            : {}
        }
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "clamp(4px, 2vw, 10px)",
          padding: "8px 2px",
          borderRadius: "16px",
          userSelect: "none",
        }}
      >
        {Array.from({ length }).map((_, idx) => {
          const isFocused = activeIndex === idx;
          const isFilled = Boolean(digits[idx]);

          return (
            <div
              key={idx}
              style={{
                position: "relative",
                flex: 1,
                minWidth: 0,
                width: "100%",
                maxWidth: "60px",
                aspectRatio: "1 / 1.15",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Moving Animated Glass Indicator */}
              {isFocused && (
                <motion.div
                  layoutId="otp-moving-glass-capsule"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 450,
                    damping: 32,
                  }}
                  style={{
                    position: "absolute",
                    inset: -4,
                    borderRadius: "16px",
                    background: error
                      ? "rgba(220, 38, 38, 0.15)"
                      : isCompleted
                      ? "rgba(16, 185, 129, 0.18)"
                      : "linear-gradient(135deg, rgba(99, 102, 241, 0.28), rgba(217, 70, 239, 0.28))",
                    boxShadow: error
                      ? "0 0 20px rgba(220, 38, 38, 0.4), inset 0 0 12px rgba(220, 38, 38, 0.2)"
                      : isCompleted
                      ? "0 0 24px rgba(16, 185, 129, 0.45), inset 0 0 14px rgba(16, 185, 129, 0.25)"
                      : "0 8px 24px rgba(139, 92, 246, 0.35), inset 0 0 14px rgba(255, 255, 255, 0.25)",
                    border: error
                      ? "1.5px solid rgba(220, 38, 38, 0.65)"
                      : isCompleted
                      ? "1.5px solid rgba(16, 185, 129, 0.65)"
                      : "1.5px solid rgba(139, 92, 246, 0.6)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                />
              )}

              {/* Individual Glass Box */}
              <div
                className={`otp-glass-box ${isFilled ? "filled" : ""} ${error ? "error" : ""}`}
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  borderRadius: "12px",
                  background: isFilled
                    ? "var(--bg-elevated)"
                    : "var(--bg-glass)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  border: error
                    ? "1.5px solid rgba(220, 38, 38, 0.5)"
                    : isFilled
                    ? "1.5px solid rgba(139, 92, 246, 0.45)"
                    : "1.5px solid var(--border-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  overflow: "hidden",
                  zIndex: 2,
                }}
              >
                {/* Subtle Inner Glass Glare */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "45%",
                    background:
                      "linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 100%)",
                    pointerEvents: "none",
                  }}
                />

                <input
                  ref={(el) => (inputsRef.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digits[idx] || ""}
                  onChange={(e) => handleChange(idx, e)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onFocus={() => handleFocus(idx)}
                  onPaste={handlePaste}
                  disabled={disabled}
                  aria-label={`OTP Digit ${idx + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    background: "transparent",
                    textAlign: "center",
                    fontSize: "24px",
                    fontWeight: 700,
                    fontFamily: "var(--font-heading)",
                    color: error ? "var(--danger)" : "var(--text-primary)",
                    outline: "none",
                    cursor: disabled ? "not-allowed" : "text",
                    caretColor: "transparent",
                  }}
                />
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Completion Success Glow Pulse */}
      <AnimatePresence>
        {isCompleted && !error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              textAlign: "center",
              marginTop: 10,
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--success)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }} />
            All 6 digits entered
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {error && errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            color: "var(--danger)",
            fontSize: "13px",
            fontWeight: 500,
            textAlign: "center",
            marginTop: 8,
          }}
        >
          {errorMessage}
        </motion.div>
      )}

      {/* Glass Expiry Timer & Resend Controls */}
      <div
        className="glass-card"
        style={{
          marginTop: "20px",
          padding: "12px 16px",
          borderRadius: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          fontSize: "13px",
          background: "var(--bg-glass)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: timeLeft < 60 ? "var(--danger)" : "var(--text-secondary)" }}>
          <FiClock size={15} style={{ color: timeLeft < 60 ? "var(--danger)" : "#8b5cf6" }} />
          <span>
            {timeLeft > 0 ? (
              <>Expires in <strong style={{ fontFamily: "monospace", fontSize: "14px", color: "var(--text-primary)" }}>{formatTime(timeLeft)}</strong></>
            ) : (
              <span style={{ color: "var(--danger)", fontWeight: 600 }}>OTP Expired</span>
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={handleResendClick}
          disabled={!canResend || resending || disabled}
          style={{
            background: "none",
            border: "none",
            color: canResend ? "#8b5cf6" : "var(--text-muted)",
            fontWeight: 600,
            fontSize: "13px",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: canResend && !resending && !disabled ? "pointer" : "not-allowed",
            transition: "all 0.15s ease",
            padding: "6px 10px",
            borderRadius: "8px",
            minHeight: "38px",
          }}
        >
          <FiRotateCw size={13} className={resending ? "spin-icon" : ""} />
          {resending
            ? "Sending..."
            : canResend
            ? "Resend OTP"
            : `Resend in ${resendCooldown}s`}
        </button>
      </div>

      <style>{`
        .otp-container input:focus {
          outline: none;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin-icon {
          animation: spin 1s linear infinite;
        }
        @media (max-width: 480px) {
          .otp-boxes-grid {
            gap: 6px !important;
          }
          .otp-glass-box input {
            font-size: 20px !important;
          }
        }
        @media (max-width: 360px) {
          .otp-boxes-grid {
            gap: 4px !important;
          }
          .otp-glass-box input {
            font-size: 18px !important;
          }
        }
      `}</style>
    </div>
  );
}
