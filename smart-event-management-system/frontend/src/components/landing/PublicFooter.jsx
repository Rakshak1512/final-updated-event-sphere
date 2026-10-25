import { Link } from "react-router-dom";
import { FiCalendar, FiMail, FiMapPin, FiPhone } from "react-icons/fi";

export default function PublicFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--border-color)", marginTop: 80, background: "var(--bg-elevated)" }}>
      <div className="container footer-grid" style={{ padding: "56px 24px 28px", display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1.2fr", gap: 40 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 18, marginBottom: 14 }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <FiCalendar />
            </span>
            Event<span className="text-gradient">Sphere</span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, maxWidth: 320, lineHeight: 1.6 }}>
            The all-in-one platform for discovering, registering, and managing college events, certificates and notifications.
          </p>
        </div>

        <div>
          <h4 style={{ fontSize: 14, marginBottom: 14, color: "var(--text-primary)" }}>Navigate</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
            <Link to="/#about" style={{ color: "var(--text-secondary)" }}>About</Link>
            <Link to="/#features" style={{ color: "var(--text-secondary)" }}>Features</Link>
            <Link to="/events" style={{ color: "var(--text-secondary)" }}>Events Directory</Link>
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: 14, marginBottom: 14, color: "var(--text-primary)" }}>Account</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
            <Link to="/login" style={{ color: "var(--text-secondary)" }}>Login</Link>
            <Link to="/register" style={{ color: "var(--text-secondary)" }}>Create Account</Link>
            <Link to="/forgot-password" style={{ color: "var(--text-secondary)" }}>Forgot Password</Link>
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: 14, marginBottom: 14, color: "var(--text-primary)" }}>Campus Info</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14, color: "var(--text-secondary)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><FiMapPin /> College Campus, Main Road</span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><FiMail /> events@college.edu</span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><FiPhone /> +91 98765 43210</span>
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--border-color)", padding: "18px 24px", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
        © {new Date().getFullYear()} EventSphere. Built for college communities.
      </div>

      <style>{`
        @media (max-width: 900px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 540px) {
          .footer-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
        }
      `}</style>
    </footer>
  );
}
