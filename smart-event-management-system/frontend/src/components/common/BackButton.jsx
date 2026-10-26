import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext.jsx";

/**
 * Universal, accessible BackButton for EventSphere.
 * - Safely detects in-app browser history to avoid escaping to external sites or loops.
 * - Supports role-aware default fallbacks (Student -> /student/dashboard, Admin -> /admin/dashboard, etc.).
 * - Prevents accidental form submissions with explicit type="button".
 * - Supports custom onClick handlers for multi-step forms and modal dialogs.
 */
export default function BackButton({
  to,
  fallback,
  label = "Back",
  onClick,
  className = "btn btn-outline btn-sm",
  style = {},
  iconSize = 14,
  showLabel = true,
  ariaLabel,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const getRoleFallback = () => {
    if (fallback) return fallback;
    const role = (user?.role || "").toLowerCase().trim();
    if (role === "admin") return "/admin/dashboard";
    if (role === "faculty") return "/faculty/dashboard";
    if (role === "volunteer") return "/volunteer/dashboard";
    if (role === "student") return "/student/dashboard";
    return "/events";
  };

  const handleBack = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (onClick) {
      onClick(e);
      return;
    }

    if (to) {
      navigate(to);
      return;
    }

    // Determine safe navigation destination
    const targetFallback = getRoleFallback();

    // Check location state if originating page was stored
    if (location.state?.from) {
      navigate(location.state.from);
      return;
    }

    // Check if we have verified in-app React Router history
    const hasInAppHistory =
      window.history.state &&
      typeof window.history.state.idx === "number" &&
      window.history.state.idx > 0;

    if (hasInAppHistory) {
      navigate(-1);
    } else {
      navigate(targetFallback);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={className}
      aria-label={ariaLabel || label}
      title={ariaLabel || label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        transition: "all 0.15s ease",
        ...style,
      }}
    >
      <FiArrowLeft size={iconSize} />
      {showLabel && <span>{label}</span>}
    </button>
  );
}
