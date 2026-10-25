import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { FiArrowLeft, FiMail, FiCalendar, FiCheckCircle, FiAlertCircle, FiShield, FiLock } from "react-icons/fi";
import ThemeToggle from "../../components/common/ThemeToggle.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import OTPInput from "../../components/common/OTPInput.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import api from "../../api/axios.js";

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmailOtp, resendVerificationOtp, setUser } = useAuth();

  const [email] = useState(location.state?.email || "");
  const [role] = useState((location.state?.role || "student").toLowerCase());
  const [name] = useState(location.state?.name || "");

  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // If no email was provided in navigation state, allow user to input or go back
  const [manualEmail, setManualEmail] = useState(email);
  const targetEmail = (email || manualEmail || "").trim().toLowerCase();

  const handleVerify = async (codeToVerify) => {
    const code = (codeToVerify || otp).trim();
    if (code.length !== 6) {
      setErrorMessage("Please enter all 6 digits of the OTP code.");
      return;
    }
    if (!targetEmail) {
      setErrorMessage("Please provide a valid email address.");
      return;
    }

    setVerifying(true);
    setErrorMessage("");
    try {
      let result;
      if (verifyEmailOtp) {
        result = await verifyEmailOtp({ email: targetEmail, otp_code: code });
      } else {
        const { data } = await api.post("/auth/verify-email", { email: targetEmail, otp_code: code });
        result = data;
      }

      setIsSuccess(true);
      toast.success("Email verified successfully!");

      if (result) {
        setUser(result);
        localStorage.setItem("sems-user", JSON.stringify(result));
      }

      const userRole = (result?.role || role).toLowerCase();
      const status = (result?.approval_status || "PENDING").toUpperCase();

      setTimeout(() => {
        // Enforce strict approval hierarchy:
        // Student, Faculty, Volunteer status is PENDING and must wait for institutional approval.
        // Never grant immediate dashboard access to unapproved users.
        if (userRole !== "admin" || status !== "APPROVED") {
          navigate("/awaiting-approval", { replace: true });
        } else {
          navigate("/admin/dashboard", { replace: true });
        }
      }, 1200);
    } catch (err) {
      const detail = err.response?.data?.detail;
      let msg = "Invalid OTP. Please try again.";
      if (typeof detail === "string") {
        msg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        msg = detail[0].message || detail[0];
      }
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!targetEmail) {
      toast.error("Please enter your email address to resend OTP.");
      return;
    }
    setResending(true);
    setErrorMessage("");
    try {
      let res;
      if (resendVerificationOtp) {
        res = await resendVerificationOtp({ email: targetEmail });
      } else {
        const { data } = await api.post("/auth/resend-verification-otp", { email: targetEmail });
        res = data;
      }
      toast.success("A new 6-digit OTP has been sent to your email!");
      setOtp("");
    } catch (err) {
      const detail = err.response?.data?.detail;
      let msg = "Could not resend OTP. Please try again.";
      if (typeof detail === "string") {
        msg = detail;
      }
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <PageTransition>
      <div
        className="auth-shell"
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          background: "var(--bg-base, #0b0f19)",
          overflow: "hidden",
        }}
      >
        {/* Ambient Blurred Background Lights */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -120,
            left: "20%",
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "rgba(139, 92, 246, 0.15)",
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
            width: 450,
            height: 450,
            borderRadius: "50%",
            background: "rgba(59, 130, 246, 0.12)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "absolute", top: 24, right: 24, zIndex: 10 }}>
          <ThemeToggle />
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="glass-card auth-card"
          style={{
            width: "100%",
            maxWidth: 520,
            padding: "36px 32px",
            borderRadius: 24,
            textAlign: "center",
            background: "var(--bg-card, #131b2e)",
            border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.6)",
            position: "relative",
            zIndex: 1,
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Back button aligned inside card */}
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/register"))}
            aria-label="Go back"
            title="Go back"
            style={{
              position: "absolute",
              top: 18,
              left: 18,
              width: 40,
              height: 40,
              minWidth: 42,
              minHeight: 42,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-glass, rgba(255, 255, 255, 0.05))",
              border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
              color: "var(--text-secondary, #94a3b8)",
              cursor: "pointer",
              zIndex: 3,
            }}
          >
            <FiArrowLeft size={18} />
          </button>
          {/* Logo Branding */}
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontWeight: 800,
              fontSize: 19,
              marginBottom: 20,
              textDecoration: "none",
              color: "var(--text-primary, #ffffff)",
            }}
          >
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "0 4px 12px rgba(139, 92, 246, 0.35)",
              }}
            >
              <FiCalendar size={18} />
            </span>
            Event<span style={{ color: "#8b5cf6" }}>Sphere</span>
          </Link>

          {/* Verification Icon */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: isSuccess
                ? "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))"
                : "linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.1))",
              color: isSuccess ? "#10b981" : "#8b5cf6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              border: isSuccess ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(139, 92, 246, 0.3)",
            }}
          >
            {isSuccess ? <FiCheckCircle size={32} /> : <FiLock size={28} />}
          </div>

          <h1
            style={{
              fontSize: "clamp(22px, 3.5vw, 26px)",
              fontWeight: 800,
              color: "var(--text-primary, #ffffff)",
              marginBottom: 8,
              letterSpacing: -0.4,
            }}
          >
            {isSuccess ? "Email Verified!" : "Email Verification"}
          </h1>

          <p
            style={{
              fontSize: 14,
              color: "var(--text-secondary, #94a3b8)",
              lineHeight: 1.55,
              marginBottom: 18,
            }}
          >
            {isSuccess
              ? "Your email has been confirmed. Preparing account authorization..."
              : "Enter the 6-digit OTP sent to your email."}
          </p>

          {/* Recipient Email Display */}
          {targetEmail ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                marginBottom: 24,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary, #f1f5f9)",
              }}
            >
              <FiMail size={14} color="#8b5cf6" />
              <span>{targetEmail}</span>
            </div>
          ) : (
            <div style={{ marginBottom: 20, textAlign: "left" }}>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                Email Address
              </label>
              <input
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="Enter your registered email"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "var(--bg-glass)",
                  border: "1px solid var(--border-color)",
                  color: "#fff",
                  fontSize: 14,
                }}
              />
            </div>
          )}

          {/* 6-Box OTP Input Component */}
          <div style={{ marginBottom: 20 }}>
            <OTPInput
              value={otp}
              onChange={(val) => {
                setOtp(val);
                if (errorMessage) setErrorMessage("");
              }}
              length={6}
              onComplete={(code) => handleVerify(code)}
              error={Boolean(errorMessage)}
              errorMessage={errorMessage}
              disabled={verifying || isSuccess}
              onResend={handleResend}
              resending={resending}
              expiryMinutes={5}
              initialCooldown={60}
            />
          </div>

          {/* Verify Action Button */}
          <button
            type="button"
            className="btn btn-primary"
            style={{
              width: "100%",
              padding: "13px 24px",
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 15,
              marginTop: 6,
              marginBottom: 16,
              background: isSuccess ? "#10b981" : undefined,
              borderColor: isSuccess ? "#10b981" : undefined,
            }}
            onClick={() => handleVerify(otp)}
            disabled={verifying || isSuccess || otp.length !== 6}
          >
            {verifying ? "Verifying OTP..." : isSuccess ? "Verified ✓" : "Verify OTP"}
          </button>

          {/* Footer Back Link */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, fontSize: 13.5 }}>
            <Link
              to="/login"
              style={{
                color: "var(--text-muted, #94a3b8)",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Back to Login
            </Link>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>•</span>
            <Link
              to="/register"
              style={{
                color: "#8b5cf6",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Re-register
            </Link>
          </div>

          {/* Security Assurance Footer */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              color: "var(--text-muted, #64748b)",
              fontSize: 12,
            }}
          >
            <FiShield size={13} color="#8b5cf6" />
            <span>Secure 6-Digit Email Verification • Institutional Event Administration</span>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
