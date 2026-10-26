import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiMenu, FiX, FiCalendar, FiArrowRight } from "react-icons/fi";
import ThemeToggle from "../common/ThemeToggle.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const navItems = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "features", label: "Features" },
  { id: "events", label: "Events" },
];

export default function PublicNavbar({ activeSection = "home", onNavigateSection }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isLandingPage = location.pathname === "/" || location.pathname === "";

  const getDashboardUrl = (role) => {
    const r = (role || "").trim().toLowerCase();
    if (r === "admin") return "/admin/dashboard";
    if (r === "faculty") return "/faculty/dashboard";
    if (r === "volunteer") return "/volunteer/dashboard";
    return "/student/dashboard";
  };

  const handleNavClick = (sectionId, e) => {
    e.preventDefault();
    setMobileOpen(false);

    if (isLandingPage) {
      if (onNavigateSection) {
        onNavigateSection(sectionId);
      } else {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    } else {
      navigate(`/#${sectionId}`);
    }
  };

  return (
    <header
      className="public-navbar-header"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "var(--bg-glass)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border-color)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
        paddingTop: "max(0px, env(safe-area-inset-top, 0px))",
        paddingLeft: "max(0px, env(safe-area-inset-left, 0px))",
        paddingRight: "max(0px, env(safe-area-inset-right, 0px))",
      }}
    >
      <div
        className="container public-navbar-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 76,
        }}
      >
        {/* Brand Logo */}
        <Link
          to="/"
          onClick={(e) => isLandingPage && handleNavClick("home", e)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontWeight: 800,
            fontSize: 19,
            fontFamily: "var(--font-heading)",
            letterSpacing: "-0.02em",
          }}
        >
          <motion.img
            src="/eventsphere-emblem.png"
            alt="EventSphere Logo"
            whileHover={{ scale: 1.08, rotate: 4 }}
            whileTap={{ scale: 0.94 }}
            style={{
              width: 40,
              height: 40,
              objectFit: "contain",
              filter: "drop-shadow(0 4px 14px rgba(139, 92, 246, 0.45))",
            }}
          />
          <span>
            Event<span className="text-gradient">Sphere</span>
          </span>
        </Link>

        {/* Desktop Nav with Moving Glass Capsule Active Indicator */}
        <nav
          className="desktop-nav-wrap"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--bg-elevated)",
            padding: "5px 6px",
            borderRadius: 999,
            border: "1px solid var(--border-color)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
          }}
        >
          {navItems.map((item) => {
            const isActive = isLandingPage && activeSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => handleNavClick(item.id, e)}
                style={{
                  position: "relative",
                  padding: "8px 18px",
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "#ffffff" : "var(--text-secondary)",
                  borderRadius: 999,
                  transition: "color 0.2s ease",
                  zIndex: 2,
                  display: "inline-block",
                  cursor: "pointer",
                }}
              >
                {/* Continuous Traveling Animated Glass Capsule */}
                {isActive && (
                  <motion.div
                    layoutId="navbar-moving-glass-capsule"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 34,
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 999,
                      background: "var(--gradient-primary)",
                      boxShadow: "0 6px 20px rgba(139, 92, 246, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.35)",
                      zIndex: -1,
                    }}
                  />
                )}
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Actions & Profile */}
        <div className="desktop-actions" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <ThemeToggle />
          {user ? (
            <Link
              to={getDashboardUrl(user.role)}
              className="btn btn-primary btn-sm"
              style={{ padding: "9px 20px" }}
            >
              <span>Dashboard</span>
              <FiArrowRight size={14} />
            </Link>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Link to="/login" className="btn btn-outline btn-sm" style={{ padding: "8px 18px" }}>
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm" style={{ padding: "8px 18px" }}>
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu toggle button */}
        <button
          className="mobile-toggle-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
          style={{
            display: "none",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-color)",
            color: "var(--text-primary)",
            padding: 0,
            cursor: "pointer",
          }}
        >
          {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="mobile-drawer"
            style={{
              overflowY: "auto",
              maxHeight: "calc(100dvh - 76px - env(safe-area-inset-top, 0px))",
              borderTop: "1px solid var(--border-color)",
              background: "var(--bg-elevated)",
              paddingBottom: "max(24px, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div
              className="container"
              style={{
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {navItems.map((item) => {
                const isActive = isLandingPage && activeSection === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => handleNavClick(item.id, e)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      fontSize: 15,
                      fontWeight: 600,
                      color: isActive ? "#ffffff" : "var(--text-primary)",
                      background: isActive ? "var(--gradient-primary)" : "transparent",
                      transition: "all 0.15s ease",
                      cursor: "pointer",
                    }}
                  >
                    {item.label}
                  </a>
                );
              })}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 14,
                  borderTop: "1px solid var(--border-color)",
                  marginTop: 6,
                }}
              >
                <ThemeToggle />
                {user ? (
                  <Link
                    to={getDashboardUrl(user.role)}
                    className="btn btn-primary btn-sm"
                    onClick={() => setMobileOpen(false)}
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <div style={{ display: "flex", gap: 10 }}>
                    <Link
                      to="/login"
                      className="btn btn-outline btn-sm"
                      onClick={() => setMobileOpen(false)}
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="btn btn-primary btn-sm"
                      onClick={() => setMobileOpen(false)}
                    >
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 900px) {
          .public-navbar-header {
            padding-top: max(6px, env(safe-area-inset-top, 0px)) !important;
            padding-left: max(6px, env(safe-area-inset-left, 0px)) !important;
            padding-right: max(6px, env(safe-area-inset-right, 0px)) !important;
          }
          .public-navbar-container {
            height: 66px !important;
          }
          .desktop-nav-wrap,
          .desktop-actions {
            display: none !important;
          }
          .mobile-toggle-btn {
            display: flex !important;
            align-items: center;
            justify-content: center;
            width: 44px !important;
            height: 44px !important;
            min-width: 44px !important;
            min-height: 44px !important;
            border-radius: 12px !important;
            background: var(--bg-elevated) !important;
            border: 1px solid var(--border-color) !important;
            color: var(--text-primary) !important;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
            cursor: pointer;
          }
          .mobile-toggle-btn:active {
            transform: scale(0.94);
          }
        }
      `}</style>
    </header>
  );
}
