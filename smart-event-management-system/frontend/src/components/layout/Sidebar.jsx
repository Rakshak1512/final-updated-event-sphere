import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiCalendar, FiX, FiCheckCircle } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Sidebar({ items, role, open, onClose }) {
  const location = useLocation();
  const { user } = useAuth();
  const [hoveredItem, setHoveredItem] = useState(null);

  const isFaculty = role === "faculty" || user?.role === "faculty";

  return (
    <>
      {/* Mobile Backdrop */}
      {open && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 7, 18, 0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            zIndex: 190,
          }}
        />
      )}

      {/* Glass Sidebar Island */}
      <aside
        className={`app-sidebar ${open ? "open" : ""}`}
        style={{
          width: 260,
          minWidth: 260,
          position: "sticky",
          top: 16,
          height: "calc(100vh - 32px)",
          margin: "16px 0 16px 16px",
          background: "var(--bg-glass)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderRadius: "24px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25), 0 0 25px rgba(139, 92, 246, 0.12)",
          display: "flex",
          flexDirection: "column",
          zIndex: 100,
          overflow: "hidden",
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease",
        }}
      >
        {/* Ambient Top Glow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -60,
            left: "50%",
            transform: "translateX(-50%)",
            width: 180,
            height: 120,
            borderRadius: "50%",
            background: "var(--gradient-primary)",
            opacity: 0.15,
            filter: "blur(30px)",
            pointerEvents: "none",
          }}
        />

        {/* Sidebar Header / Brand Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 20px 16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            position: "relative",
            zIndex: 2,
          }}
        >
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontWeight: 800,
              fontFamily: "var(--font-heading)",
              fontSize: 17,
              letterSpacing: "-0.02em",
            }}
          >
            <motion.img
              src="/eventsphere-emblem.png"
              alt="EventSphere Logo"
              whileHover={{ scale: 1.08, rotate: 6 }}
              whileTap={{ scale: 0.94 }}
              style={{
                width: 36,
                height: 36,
                objectFit: "contain",
                filter: "drop-shadow(0 4px 12px rgba(139, 92, 246, 0.45))",
              }}
            />
            <span>
              Event<span className="text-gradient">Sphere</span>
            </span>
          </Link>

          {/* Close button on mobile */}
          <button
            className="sidebar-close"
            onClick={onClose}
            aria-label="Close sidebar"
            style={{
              display: "none",
              background: "none",
              border: "none",
              fontSize: 20,
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <FiX />
          </button>
        </div>

        {/* Navigation Menu with Traveling Moving Glass Capsule */}
        <nav
          style={{
            padding: "14px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 5,
            flex: 1,
            overflowY: "auto",
            position: "relative",
            zIndex: 2,
          }}
        >
          {items.map((item) => {
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

            const isHovered = hoveredItem === item.to && !isActive;

            return (
              <motion.div
                key={item.to}
                onMouseEnter={() => setHoveredItem(item.to)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{ position: "relative" }}
                whileHover={!isActive ? { x: 3 } : undefined}
                transition={{ duration: 0.15 }}
              >
                <Link
                  to={item.to}
                  onClick={onClose}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    borderRadius: "14px",
                    fontSize: "13.5px",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#ffffff" : isHovered ? "var(--text-primary)" : "var(--text-secondary)",
                    transition: "color 0.2s ease",
                    zIndex: 2,
                    textDecoration: "none",
                  }}
                >
                  {/* ONE Continuous Moving Glass Capsule for Active Item */}
                  {isActive && (
                    <motion.div
                      layoutId="dashboard-sidebar-moving-capsule"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                      }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "14px",
                        background: "linear-gradient(135deg, rgba(99, 102, 241, 0.85) 0%, rgba(139, 92, 246, 0.85) 100%)",
                        border: "1.5px solid rgba(255, 255, 255, 0.25)",
                        boxShadow: "0 8px 24px rgba(139, 92, 246, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.4)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        zIndex: -1,
                      }}
                    />
                  )}

                  {/* Inactive Hover Glass Highlight */}
                  {isHovered && (
                    <motion.div
                      layoutId="sidebar-hover-highlight"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "14px",
                        background: "rgba(139, 92, 246, 0.08)",
                        border: "1px solid rgba(139, 92, 246, 0.15)",
                        zIndex: -1,
                      }}
                    />
                  )}

                  {/* Animated Icon */}
                  <motion.span
                    animate={{ scale: isActive ? 1.1 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isActive ? "#ffffff" : isHovered ? "#8b5cf6" : "var(--text-secondary)",
                      transition: "color 0.2s ease",
                      flexShrink: 0,
                    }}
                  >
                    <item.icon size={18} />
                  </motion.span>

                  <span
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      letterSpacing: "-0.01em",
                      textShadow: isActive ? "0 1px 4px rgba(0, 0, 0, 0.3)" : "none",
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Sidebar Footer Role Badge */}
        <div
          style={{
            padding: "14px 16px",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            background: "rgba(255, 255, 255, 0.02)",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              borderRadius: "12px",
              background: "var(--gradient-soft)",
              border: "1px solid rgba(139, 92, 246, 0.2)",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "var(--gradient-primary)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FiCheckCircle size={13} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#8b5cf6",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {role === "admin" || user?.role === "admin"
                  ? "Admin Portal"
                  : isFaculty
                  ? "Faculty Portal"
                  : user?.role === "volunteer"
                  ? "Volunteer Desk"
                  : "Student Portal"}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {role === "admin" || user?.role === "admin"
                  ? "Principal & Administration"
                  : user?.department || (user?.role === "volunteer" ? "Attendance & Check-in" : "Department Portal")}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .app-sidebar {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              bottom: 0 !important;
              height: 100vh !important;
              height: 100dvh !important;
              width: 280px !important;
              max-width: 86vw !important;
              margin: 0 !important;
              border-radius: 0 24px 24px 0 !important;
              z-index: 200 !important;
              transform: translateX(-105%) !important;
              transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
              box-shadow: 0 0 50px rgba(0, 0, 0, 0.5) !important;
              padding-top: max(12px, env(safe-area-inset-top, 0px)) !important;
              padding-bottom: max(16px, env(safe-area-inset-bottom, 0px)) !important;
            }
            .app-sidebar.open {
              transform: translateX(0) !important;
            }
            .sidebar-close {
              display: flex !important;
              align-items: center;
              justify-content: center;
              min-width: 44px;
              min-height: 44px;
              width: 44px;
              height: 44px;
              border-radius: 12px;
              background: rgba(255, 255, 255, 0.08);
              color: var(--text-primary) !important;
            }
          }
        `}</style>
      </aside>
    </>
  );
}
