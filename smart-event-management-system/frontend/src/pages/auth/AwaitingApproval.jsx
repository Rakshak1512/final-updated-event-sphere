import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiClock,
  FiAlertCircle,
  FiRefreshCw,
  FiLogOut,
  FiShield,
  FiCheckCircle,
  FiUser,
  FiMail,
  FiHash,
  FiBookOpen,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext.jsx";
import { useRealtime } from "../../context/RealtimeContext.jsx";
import api from "../../api/axios.js";
import toast from "react-hot-toast";
import PageTransition from "../../components/common/PageTransition.jsx";

export default function AwaitingApproval() {
  const { user, setUser, logout } = useAuth();
  const { addListener } = useRealtime();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const [approvedTransition, setApprovedTransition] = useState(false);

  const role = (user?.role || "student").toLowerCase();
  const rawStatus = (user?.approval_status || "PENDING").toUpperCase();
  const isApproved = rawStatus === "APPROVED" || rawStatus === "ACTIVE";
  const isRejected = rawStatus === "REJECTED";

  const getDashboardDestination = (userRole) => {
    const r = (userRole || "").toLowerCase();
    if (r === "admin") return "/admin/dashboard";
    if (r === "faculty") return "/faculty/dashboard";
    if (r === "volunteer") return "/volunteer/dashboard";
    return "/student/dashboard";
  };

  // Immediate redirect if already approved on mount
  useEffect(() => {
    if (user && isApproved && !approvedTransition) {
      navigate(getDashboardDestination(user.role), { replace: true });
    }
  }, [user, isApproved, navigate, approvedTransition]);

  // Check latest approval status from backend
  const checkStatus = async (silent = false) => {
    if (!silent) setChecking(true);
    try {
      const { data } = await api.get("/auth/me");
      if (data) {
        setUser(data);
        localStorage.setItem("sems-user", JSON.stringify(data));
        const statusNow = (data.approval_status || "PENDING").toUpperCase();
        if (statusNow === "APPROVED" || statusNow === "ACTIVE") {
          setApprovedTransition(true);
          toast.success("Account Approved! Welcome to EventSphere.", { duration: 4000 });
          setTimeout(() => {
            navigate(getDashboardDestination(data.role), { replace: true });
          }, 1400);
          return;
        } else if (statusNow === "REJECTED") {
          if (!silent) toast.error("Your account application has been reviewed and rejected.");
        } else {
          if (!silent) toast("Your account is still pending verification.", { icon: "⏳" });
        }
      }
    } catch (err) {
      if (!silent) toast.error("Could not refresh account status. Please check your connection.");
    } finally {
      if (!silent) setChecking(false);
    }
  };

  // Auto-poll every 5 seconds so user transitions seamlessly without page refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden && !isApproved && !isRejected && !approvedTransition) {
        checkStatus(true);
      }
    }, 5000);

    const handleFocus = () => {
      if (!isApproved && !isRejected && !approvedTransition) checkStatus(true);
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isApproved, isRejected, approvedTransition]);

  // Real-time listener for notification of approval
  useEffect(() => {
    const remove = addListener((msg) => {
      if (msg.type === "ACCOUNT_APPROVED" || msg.type === "USER_UPDATED") {
        checkStatus(true);
      }
    });
    return () => remove();
  }, [addListener]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const statusLabel = isRejected
    ? "Account Rejected"
    : role === "faculty"
    ? "Waiting for Admin Approval"
    : "Waiting for Faculty Approval";

  return (
    <PageTransition>
      <div
        className="auth-shell"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          position: "relative",
          overflow: "hidden",
          background: "var(--bg-base, #0b0f19)",
        }}
      >
        {/* Ambient blurred glow effects */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -120,
            left: "25%",
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: isRejected
              ? "rgba(239, 68, 68, 0.12)"
              : "rgba(139, 92, 246, 0.14)",
            filter: "blur(90px)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: -100,
            right: "20%",
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: isRejected
              ? "rgba(220, 38, 38, 0.08)"
              : "rgba(6, 182, 212, 0.12)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{
            width: "100%",
            maxWidth: 560,
            background: "var(--bg-card, #131b2e)",
            borderRadius: 24,
            border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
            padding: "40px 32px",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.6)",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Header Brand */}
          <div style={{ marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <img
              src="/eventsphere-emblem.png"
              alt="EventSphere Logo"
              style={{
                width: 36,
                height: 36,
                objectFit: "contain",
                filter: "drop-shadow(0 4px 12px rgba(139, 92, 246, 0.45))",
              }}
            />
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, color: "var(--text-primary, #ffffff)" }}>
              Event<span className="text-gradient">Sphere</span>
            </span>
          </div>

          {/* Animated Verification Visual */}
          <div style={{ position: "relative", width: 90, height: 90, margin: "0 auto 24px" }}>
            <motion.div
              animate={isRejected ? {} : { rotate: 360 }}
              transition={isRejected ? {} : { repeat: Infinity, duration: 8, ease: "linear" }}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "2px dashed",
                borderColor: isRejected ? "rgba(239, 68, 68, 0.4)" : "rgba(139, 92, 246, 0.4)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 6,
                borderRadius: "50%",
                background: approvedTransition
                  ? "linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.15))"
                  : isRejected
                  ? "linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(185, 28, 28, 0.12))"
                  : "linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.15))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: approvedTransition
                  ? "1px solid rgba(16, 185, 129, 0.4)"
                  : isRejected
                  ? "1px solid rgba(239, 68, 68, 0.3)"
                  : "1px solid rgba(139, 92, 246, 0.3)",
              }}
            >
              {approvedTransition ? (
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1.15 }} transition={{ duration: 0.3 }}>
                  <FiCheckCircle size={44} color="#10b981" />
                </motion.div>
              ) : isRejected ? (
                <FiAlertCircle size={40} color="#ef4444" />
              ) : (
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                >
                  <FiClock size={40} color="#a78bfa" />
                </motion.div>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div style={{ marginBottom: 14 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 16px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 700,
                letterSpacing: "0.04em",
                background: approvedTransition
                  ? "rgba(16, 185, 129, 0.15)"
                  : isRejected
                  ? "rgba(239, 68, 68, 0.12)"
                  : "rgba(245, 158, 11, 0.12)",
                color: approvedTransition ? "#34d178" : isRejected ? "#f87171" : "#fbbf24",
                border: approvedTransition
                  ? "1px solid rgba(16, 185, 129, 0.3)"
                  : isRejected
                  ? "1px solid rgba(239, 68, 68, 0.3)"
                  : "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: approvedTransition ? "#10b981" : isRejected ? "#ef4444" : "#f59e0b",
                  boxShadow: approvedTransition
                    ? "0 0 8px #10b981"
                    : isRejected
                    ? "0 0 8px #ef4444"
                    : "0 0 8px #f59e0b",
                }}
              />
              {approvedTransition ? "Account Approved" : statusLabel}
            </span>
          </div>

          {/* Main Title */}
          <h1
            style={{
              fontSize: "clamp(22px, 4vw, 26px)",
              fontWeight: 800,
              color: "var(--text-primary, #ffffff)",
              margin: "0 0 14px",
              letterSpacing: -0.4,
            }}
          >
            {approvedTransition
              ? "Account Approved!"
              : isRejected
              ? "Account Rejected"
              : "Verification Under Process"}
          </h1>

          {/* Official Verification Notice */}
          <div
            style={{
              background: "var(--bg-glass, rgba(15, 23, 42, 0.5))",
              borderRadius: 14,
              padding: "16px 20px",
              marginBottom: 24,
              border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
              textAlign: "left",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--text-secondary, #cbd5e1)",
              }}
            >
              {isRejected ? (
                <>
                  Your account application has been reviewed by the institutional coordinators and could not be approved at this time.
                  {user?.rejection_reason && (
                    <span style={{ display: "block", marginTop: 8, color: "#fca5a5" }}>
                      <strong>Reason:</strong> {user.rejection_reason}
                    </span>
                  )}
                </>
              ) : role === "faculty" ? (
                <>
                  Your email has been verified successfully. Your faculty account is now waiting for administrator approval.
                </>
              ) : role === "volunteer" ? (
                <>
                  Your email has been verified successfully. Your volunteer account is now waiting for faculty approval.
                </>
              ) : (
                <>
                  Your email has been verified successfully. Your student account is now waiting for faculty approval.
                </>
              )}
            </p>
          </div>

          {/* Account Details Roster */}
          {user && (
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                borderRadius: 14,
                padding: "16px 20px",
                marginBottom: 28,
                border: "1px solid rgba(255, 255, 255, 0.06)",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  rowGap: 12,
                  columnGap: 16,
                  fontSize: 13,
                }}
              >
                <div>
                  <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                    <FiUser size={13} /> {role === "faculty" ? "Faculty Name" : "Student Name"}
                  </span>
                  <strong style={{ color: "#f8fafc", fontSize: 14, marginTop: 2, display: "block" }}>
                    {user.name}
                  </strong>
                </div>

                <div>
                  <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                    <FiMail size={13} /> Email Address
                  </span>
                  <strong style={{ color: "#f8fafc", fontSize: 14, marginTop: 2, display: "block", wordBreak: "break-all" }}>
                    {user.email}
                  </strong>
                </div>

                {role === "faculty" && (user.admin_id || user.registration_number) && (
                  <div>
                    <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                      <FiHash size={13} /> Faculty ID
                    </span>
                    <strong style={{ color: "#a78bfa", fontSize: 14, marginTop: 2, display: "block", fontFamily: "monospace" }}>
                      {user.admin_id || user.registration_number}
                    </strong>
                  </div>
                )}

                {role === "student" && user.registration_number && (
                  <div>
                    <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                      <FiHash size={13} /> UUCMS ID / Reg No.
                    </span>
                    <strong style={{ color: "#38bdf8", fontSize: 14, marginTop: 2, display: "block", fontFamily: "monospace" }}>
                      {user.registration_number}
                    </strong>
                  </div>
                )}

                {user.department && (
                  <div>
                    <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                      <FiBookOpen size={13} /> Department
                    </span>
                    <strong style={{ color: "#f8fafc", fontSize: 14, marginTop: 2, display: "block" }}>
                      {user.department}
                    </strong>
                  </div>
                )}

                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: 12 }}>Account Status</span>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 3,
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      background: isRejected ? "rgba(239, 68, 68, 0.18)" : "rgba(245, 158, 11, 0.18)",
                      color: isRejected ? "#f87171" : "#fbbf24",
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {!isRejected && (
              <button
                onClick={() => checkStatus(false)}
                disabled={checking}
                className="btn btn-primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 26px",
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                <FiRefreshCw className={checking ? "spin" : ""} size={16} />
                {checking ? "Checking Status..." : "Refresh Status"}
              </button>
            )}

            <button
              onClick={handleLogout}
              className="btn btn-outline"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 22px",
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 14,
                color: "#94a3b8",
                borderColor: "rgba(255, 255, 255, 0.15)",
              }}
            >
              <FiLogOut size={16} />
              Logout
            </button>
          </div>

          {/* Footer Institutional Assurance */}
          <div
            style={{
              marginTop: 28,
              paddingTop: 18,
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: "#64748b",
              fontSize: 12.5,
            }}
          >
            <FiShield size={14} color="#8b5cf6" />
            <span>Institutional verification ensures authentic academic participation and security.</span>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
