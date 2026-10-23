import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiEye, FiEyeOff, FiLogIn, FiCheck, FiArrowRight } from "react-icons/fi";

const DEMO_ACCOUNTS = [
  {
    role: "student",
    title: "Student",
    label: "Student",
    subtitle: "Student Demo Account",
    email: "student@test.com",
    password: "Student@12345",
    icon: "🎓",
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.15))",
  },
  {
    role: "faculty",
    title: "Faculty",
    label: "Faculty",
    subtitle: "Faculty Demo Account",
    email: "faculty@test.com",
    password: "Faculty@12345",
    icon: "👨‍🏫",
    color: "#06b6d4",
    gradient: "linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(59, 130, 246, 0.15))",
  },
  {
    role: "volunteer",
    title: "Volunteer",
    label: "Volunteer",
    subtitle: "Volunteer Demo Account",
    email: "volunteer@test.com",
    password: "Volunteer@12345",
    icon: "🧑‍💼",
    color: "#10b981",
    gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(20, 184, 166, 0.15))",
  },
  {
    role: "admin",
    title: "Admin",
    label: "Admin",
    subtitle: "Admin Demo Account",
    email: "admin@test.com",
    password: "Admin@12345",
    icon: "🛡️",
    color: "#ec4899",
    gradient: "linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(168, 85, 247, 0.15))",
  },
];

export default function TestUsersModal({ isOpen, onClose, onUseAccount, onLoginNow, isLoggingIn }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [revealedPasswords, setRevealedPasswords] = useState({});

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const togglePasswordReveal = (role) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [role]: !prev[role],
    }));
  };

  const filteredAccounts =
    activeFilter === "all"
      ? DEMO_ACCOUNTS
      : DEMO_ACCOUNTS.filter((acc) => acc.role === activeFilter);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(5, 7, 18, 0.78)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 620,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              borderRadius: "24px",
              background: "var(--bg-elevated)",
              border: "1.5px solid rgba(139, 92, 246, 0.38)",
              boxShadow: "0 28px 70px rgba(0, 0, 0, 0.55), 0 0 40px rgba(139, 92, 246, 0.22)",
              overflow: "hidden",
              zIndex: 10,
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "22px 26px 16px",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                position: "relative",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "rgba(139, 92, 246, 0.16)",
                      border: "1px solid rgba(139, 92, 246, 0.3)",
                      fontSize: 15,
                    }}
                  >
                    🧪
                  </span>
                  <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
                    Test Users
                  </h2>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                  Quickly access demo accounts for testing EventSphere.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: "var(--bg-glass)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-secondary)",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
                  e.currentTarget.style.color = "#ef4444";
                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--bg-glass)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.borderColor = "var(--border-color)";
                }}
              >
                <FiX size={17} />
              </button>
            </div>

            {/* Quick Role Filter */}
            <div
              style={{
                padding: "12px 26px 8px",
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                background: "rgba(0, 0, 0, 0.12)",
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              {[
                { id: "all", label: "All" },
                { id: "student", label: "Student" },
                { id: "faculty", label: "Faculty" },
                { id: "volunteer", label: "Volunteer" },
                { id: "admin", label: "Admin" },
              ].map((filter) => {
                const isActive = activeFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    style={{
                      background: isActive ? "var(--gradient-primary)" : "var(--bg-base)",
                      color: isActive ? "#ffffff" : "var(--text-secondary)",
                      border: isActive
                        ? "1px solid rgba(255, 255, 255, 0.25)"
                        : "1px solid var(--border-color)",
                      borderRadius: 999,
                      padding: "5px 14px",
                      fontSize: 12.5,
                      fontWeight: isActive ? 600 : 500,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: isActive ? "0 4px 12px rgba(139, 92, 246, 0.35)" : "none",
                    }}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {/* Account Cards List (Scrollable) */}
            <div
              style={{
                padding: "18px 24px 24px",
                overflowY: "auto",
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 14,
              }}
            >
              {filteredAccounts.map((account) => {
                const isRevealed = revealedPasswords[account.role];
                return (
                  <div
                    key={account.role}
                    style={{
                      borderRadius: "16px",
                      background: "var(--bg-base)",
                      border: "1px solid var(--border-color)",
                      padding: "16px 18px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      position: "relative",
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.4)";
                      e.currentTarget.style.boxShadow =
                        "0 8px 24px rgba(0, 0, 0, 0.25), 0 0 16px rgba(139, 92, 246, 0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-color)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Top Row: Icon, Role, and Subtitle */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            fontSize: 22,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: account.gradient,
                            border: `1px solid ${account.color}33`,
                          }}
                        >
                          {account.icon}
                        </span>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                              {account.title}
                            </span>
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 600,
                                textTransform: "uppercase",
                                padding: "2px 7px",
                                borderRadius: 6,
                                background: `${account.color}20`,
                                color: account.color,
                                border: `1px solid ${account.color}40`,
                                letterSpacing: "0.04em",
                              }}
                            >
                              {account.role}
                            </span>
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: 6,
                                background: "rgba(16, 185, 129, 0.15)",
                                color: "#10b981",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                              }}
                            >
                              ⚡ No Auth Required
                            </span>
                          </div>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {account.subtitle}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Credentials Display */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: 10,
                        padding: "10px 14px",
                        background: "var(--bg-glass)",
                        borderRadius: "10px",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      {/* Email */}
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>
                          Email Address
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            fontFamily: "monospace",
                            wordBreak: "break-all",
                          }}
                        >
                          {account.email}
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>
                          Password
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: "monospace",
                          }}
                        >
                          <span>{isRevealed ? account.password : "••••••••••••"}</span>
                          <button
                            type="button"
                            onClick={() => togglePasswordReveal(account.role)}
                            title={isRevealed ? "Hide Password" : "Show Password"}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--text-muted)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              padding: 2,
                            }}
                          >
                            {isRevealed ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onUseAccount(account)}
                        disabled={isLoggingIn}
                        style={{
                          background: "var(--bg-glass)",
                          border: "1px solid var(--border-color)",
                          color: "var(--text-primary)",
                          borderRadius: "10px",
                          padding: "8px 16px",
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--border-glass)";
                          e.currentTarget.style.background = "var(--bg-elevated)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--border-color)";
                          e.currentTarget.style.background = "var(--bg-glass)";
                        }}
                      >
                        <FiCheck size={14} color="#8b5cf6" />
                        Use Account
                      </button>

                      <button
                        type="button"
                        onClick={() => onLoginNow(account)}
                        disabled={isLoggingIn}
                        style={{
                          background: "var(--gradient-primary)",
                          border: "none",
                          color: "#ffffff",
                          borderRadius: "10px",
                          padding: "8px 18px",
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          boxShadow: "0 4px 14px rgba(139, 92, 246, 0.35)",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = "0 6px 18px rgba(139, 92, 246, 0.5)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "0 4px 14px rgba(139, 92, 246, 0.35)";
                        }}
                      >
                        <FiLogIn size={14} />
                        Login Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
