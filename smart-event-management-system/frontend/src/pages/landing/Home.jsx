import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FiArrowRight,
  FiCalendar,
  FiAward,
  FiBell,
  FiBarChart2,
  FiShield,
  FiSmartphone,
  FiSearch,
  FiCpu,
  FiTarget,
  FiHeart,
  FiTrendingUp,
  FiCheckCircle,
  FiCompass,
} from "react-icons/fi";
import { BiQr } from "react-icons/bi";
import PublicNavbar from "../../components/landing/PublicNavbar.jsx";
import PublicFooter from "../../components/landing/PublicFooter.jsx";
import EventCard from "../../components/dashboard/EventCard.jsx";
import StatCard from "../../components/dashboard/StatCard.jsx";
import { SkeletonGrid } from "../../components/ui/Loader.jsx";
import { eventService } from "../../api/services.js";

import heroIllustration from "../../assets/hero-illustration.png";

// Features grouping
const studentFeatures = [
  { icon: FiSearch, title: "Smart Discovery", text: "Instant search, category filters, and live seat counts for every campus event." },
  { icon: BiQr, title: "QR Ticketing", text: "1-click registration with automated QR-code check-in slips and instant verification." },
  { icon: FiAward, title: "Auto Certificates", text: "Digital certificates matched directly to your student registration number." },
  { icon: FiBell, title: "Live Alerts", text: "Real-time notifications for event deadlines, registration updates, and uploads." },
];

const facultyFeatures = [
  { icon: FiCalendar, title: "Event Management", text: "Publish events with customized venues, time slots, seat caps, and cover posters." },
  { icon: FiShield, title: "Participant Control", text: "Review registrant rosters, mark verified attendance, and manage capacity." },
  { icon: FiAward, title: "Certificate Issuance", text: "Issue signed PDF certificates directly mapped to student registration numbers." },
  { icon: FiBarChart2, title: "Department Analytics", text: "Track turnout rates, popular categories, and student participation metrics." },
];

const aboutPillars = [
  {
    icon: FiTarget,
    title: "Purpose-Built for Campuses",
    text: "Designed specifically around academic workflows — registration numbers, departmental fests, attendance verification, and certificates.",
  },
  {
    icon: FiHeart,
    title: "Zero Friction Experience",
    text: "Replaces chaotic WhatsApp forward links and lost spreadsheets with a single, elegant dashboard built for students and faculty.",
  },
  {
    icon: FiCpu,
    title: "Cloud-Native & Secure",
    text: "Powered by Google Cloud Firestore, cryptographic JWT tokens, and role-guarded access controls ensuring maximum reliability.",
  },
];

export default function Home() {
  const [activeSection, setActiveSection] = useState("home");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch live backend events
  useEffect(() => {
    eventService
      .list({ page: 1, page_size: 6, sort_by: "event_date", sort_order: "asc" })
      .then(({ data }) => setEvents(data.items || []))
      .catch((err) => {
        console.error("Failed to load events:", err);
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Scroll Spy with IntersectionObserver to track visible section
  useEffect(() => {
    const sectionIds = ["home", "about", "features", "events"];
    const sectionElements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
          // Select entry with highest intersection ratio or uppermost in viewport
          const topEntry = visibleEntries.reduce((prev, curr) =>
            curr.intersectionRatio > prev.intersectionRatio ? curr : prev
          );
          if (topEntry?.target?.id) {
            setActiveSection(topEntry.target.id);
          }
        }
      },
      {
        rootMargin: "-20% 0px -40% 0px",
        threshold: [0.1, 0.3, 0.6],
      }
    );

    sectionElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Handle hash scroll on initial mount if URL has #section
  useEffect(() => {
    if (window.location.hash) {
      const targetId = window.location.hash.replace("#", "");
      const el = document.getElementById(targetId);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth" });
        }, 150);
      }
    }
  }, []);

  const handleNavigateSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(sectionId);
    }
  };

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      !searchQuery ||
      ev.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.venue?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      ev.category?.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <PublicNavbar activeSection={activeSection} onNavigateSection={handleNavigateSection} />

      {/* ============================================================ */}
      {/* 1. HOME / HERO SECTION */}
      {/* ============================================================ */}
      <section
        id="home"
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "80px 0 60px",
          scrollMarginTop: "80px",
        }}
      >
        {/* Ambient Blurred Lighting Orbs */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -140,
            right: -120,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "var(--gradient-primary)",
            opacity: 0.18,
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: -80,
            left: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(99, 102, 241, 0.15)",
            filter: "blur(70px)",
            pointerEvents: "none",
          }}
        />

        <div className="container hero-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 48, alignItems: "center" }}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span
              className="badge badge-info"
              style={{
                marginBottom: 20,
                padding: "6px 16px",
                fontSize: "13px",
                border: "1px solid rgba(139, 92, 246, 0.3)",
              }}
            >
              🎓 Built for Modern Campus Life
            </span>
            <h1 style={{ fontSize: "clamp(34px, 5.2vw, 50px)", marginBottom: 18, lineHeight: 1.15 }}>
              Every college event, <span className="text-gradient">beautifully organized.</span>
            </h1>
            <p style={{ fontSize: 17, color: "var(--text-secondary)", marginBottom: 32, maxWidth: 490, lineHeight: 1.6 }}>
              Discover, register, and track campus hackathons, workshops, and fests with instant QR tickets and automatic digital certificates.
            </p>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              {/* 1. GET STARTED: Primary Glowing Gradient CTA */}
              <div style={{ position: "relative" }}>
                <Link
                  to="/register"
                  className="btn btn-primary"
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "13px 28px",
                    fontSize: "15px",
                    fontWeight: 600,
                    borderRadius: "999px",
                    boxShadow: "0 10px 28px rgba(139, 92, 246, 0.45), 0 0 20px rgba(217, 70, 239, 0.25)",
                    background: "var(--gradient-primary)",
                    color: "#ffffff",
                    textDecoration: "none",
                  }}
                >
                  <span style={{ position: "relative", zIndex: 2 }}>Get Started</span>
                  <span style={{ position: "relative", zIndex: 2, display: "inline-flex" }}>
                    <FiArrowRight size={16} />
                  </span>
                </Link>
              </div>

              {/* 2. LOGIN: Premium Glass Authentication CTA */}
              <div style={{ position: "relative" }}>
                <Link
                  to="/login"
                  className="btn btn-outline"
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "13px 26px",
                    fontSize: "15px",
                    fontWeight: 600,
                    borderRadius: "999px",
                    background: "rgba(18, 22, 42, 0.65)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: "1.5px solid rgba(139, 92, 246, 0.45)",
                    color: "var(--text-primary)",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                    textDecoration: "none",
                    transition: "border-color 0.25s ease, box-shadow 0.25s ease, color 0.25s ease",
                  }}
                >
                  <span style={{ position: "relative", zIndex: 2 }}>Login</span>
                  <span style={{ position: "relative", zIndex: 2, display: "inline-flex", color: "#8b5cf6" }}>
                    <FiArrowRight size={15} />
                  </span>
                </Link>
              </div>

              {/* 3. EXPLORE EVENTS: Event Discovery Navigation CTA */}
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => handleNavigateSection("events")}
                  className="btn btn-outline"
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "13px 26px",
                    fontSize: "15px",
                    fontWeight: 600,
                    borderRadius: "999px",
                    background: "rgba(18, 22, 42, 0.55)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: "1.5px solid rgba(14, 165, 233, 0.4)",
                    color: "var(--text-primary)",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
                    cursor: "pointer",
                    transition: "border-color 0.25s ease, box-shadow 0.25s ease, color 0.25s ease",
                  }}
                >
                  <span style={{ position: "relative", zIndex: 2 }}>Explore Events</span>
                  <span style={{ position: "relative", zIndex: 2, display: "inline-flex", color: "#0ea5e9" }}>
                    <FiCompass size={16} />
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: "flex", gap: 32, marginTop: 44, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)" }}>120+</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Events Hosted</div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)" }}>8,500+</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Students Joined</div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)" }}>3,200+</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Certificates Issued</div>
              </div>
            </div>
          </motion.div>

          {/* Clean, Stable Hero Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ width: "100%", maxWidth: 540, margin: "0 auto" }}
          >
            <div
              style={{
                position: "relative",
                borderRadius: 24,
                overflow: "hidden",
                boxShadow: "0 24px 60px rgba(139, 92, 246, 0.35), 0 0 35px rgba(99, 102, 241, 0.25)",
                border: "1.5px solid rgba(255, 255, 255, 0.18)",
                background: "var(--gradient-soft)",
              }}
            >
              <img
                src={heroIllustration}
                alt="EventSphere Platform Preview"
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: 460,
                  objectFit: "cover",
                  display: "block",
                  borderRadius: 24,
                }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. ABOUT SECTION */}
      {/* ============================================================ */}
      <section
        id="about"
        style={{
          padding: "70px 0 60px",
          scrollMarginTop: "80px",
          background: "linear-gradient(180deg, transparent 0%, rgba(99, 102, 241, 0.03) 100%)",
        }}
      >
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <span className="badge badge-info" style={{ marginBottom: 14 }}>
              🌟 About EventSphere
            </span>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 36px)", marginBottom: 14 }}>
              One Unified Campus <span className="text-gradient">Event Platform</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: 660, margin: "0 auto", fontSize: 16, lineHeight: 1.65 }}>
              EventSphere unifies event discovery, 6-digit OTP verification, seat quotas, QR ticketing, and authenticated certificate delivery into a single cloud ecosystem.
            </p>
          </div>

          <div className="grid-cards" style={{ marginBottom: 36 }}>
            {aboutPillars.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`glass-card glass-card-interactive float-card float-delay-${i + 1}`}
                style={{ padding: 28, borderRadius: "20px" }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "var(--gradient-soft)",
                    color: "#8b5cf6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 18,
                  }}
                >
                  <p.icon size={22} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "var(--text-primary)" }}>
                  {p.title}
                </h3>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>{p.text}</p>
              </motion.div>
            ))}
          </div>

          {/* Stats Bar */}
          <div className="grid-cards-4">
            <StatCard icon={<FiCalendar />} label="Active Events" value={24} accent="#6366f1" />
            <StatCard icon={<FiAward />} label="Certificates Issued" value={3200} accent="#d946ef" />
            <StatCard icon={<FiBell />} label="Real-time Alerts" value={15400} accent="#22c55e" />
            <StatCard icon={<FiBarChart2 />} label="Avg. Turnout" value={92} suffix="%" accent="#f59e0b" />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. FEATURES SECTION */}
      {/* ============================================================ */}
      <section
        id="features"
        style={{
          padding: "70px 0 60px",
          scrollMarginTop: "80px",
        }}
      >
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <span className="badge badge-info" style={{ marginBottom: 14 }}>
              ⚡ Powerful Capabilities
            </span>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 36px)", marginBottom: 14 }}>
              Built for Students & <span className="text-gradient">Educators</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: 620, margin: "0 auto", fontSize: 16 }}>
              Tailored dashboards and tools designed around the real needs of college communities.
            </p>
          </div>

          {/* Student Features */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 8, height: 24, borderRadius: 4, background: "var(--gradient-primary)" }} />
              <h3 style={{ fontSize: 20, fontWeight: 700 }}>For Students</h3>
            </div>
            <div className="grid-cards-4">
              {studentFeatures.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className={`glass-card glass-card-interactive float-card float-delay-${(i % 3) + 1}`}
                  style={{ padding: 22, borderRadius: "18px" }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: "var(--gradient-soft)",
                      color: "#8b5cf6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 14,
                    }}
                  >
                    <f.icon size={20} />
                  </div>
                  <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{f.title}</h4>
                  <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.55 }}>{f.text}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Faculty Features */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 8, height: 24, borderRadius: 4, background: "var(--gradient-primary)" }} />
              <h3 style={{ fontSize: 20, fontWeight: 700 }}>For Faculty & Organizers</h3>
            </div>
            <div className="grid-cards-4">
              {facultyFeatures.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className={`glass-card glass-card-interactive float-card float-delay-${(i % 3) + 1}`}
                  style={{ padding: 22, borderRadius: "18px" }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: "var(--gradient-soft)",
                      color: "#8b5cf6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 14,
                    }}
                  >
                    <f.icon size={20} />
                  </div>
                  <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{f.title}</h4>
                  <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.55 }}>{f.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. EVENTS SECTION (REAL BACKEND FIRESTORE DATA) */}
      {/* ============================================================ */}
      <section
        id="events"
        style={{
          padding: "70px 0 60px",
          scrollMarginTop: "80px",
          background: "linear-gradient(180deg, transparent 0%, rgba(139, 92, 246, 0.03) 100%)",
        }}
      >
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
            <div>
              <span className="badge badge-info" style={{ marginBottom: 12 }}>
                📅 Live Campus Events
              </span>
              <h2 style={{ fontSize: "clamp(26px, 4vw, 36px)" }}>
                Upcoming <span className="text-gradient">Events</span>
              </h2>
            </div>
            <Link to="/events" className="btn btn-outline btn-sm">
              View All Events Directory <FiArrowRight />
            </Link>
          </div>

          {/* Quick Filters */}
          <div
            className="glass-card"
            style={{
              padding: "14px 20px",
              marginBottom: 28,
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              alignItems: "center",
              borderRadius: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "var(--input-bg)",
                border: "1.5px solid var(--border-color)",
                borderRadius: 999,
                padding: "8px 16px",
                flex: "1 1 240px",
              }}
            >
              <FiSearch color="var(--text-muted)" />
              <input
                placeholder="Search events by title or venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  color: "var(--text-primary)",
                  width: "100%",
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["all", "Technical", "Cultural", "Workshop", "Sports"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className="btn btn-sm"
                  style={{
                    padding: "6px 14px",
                    background: selectedCategory === cat ? "var(--gradient-primary)" : "var(--bg-elevated)",
                    color: selectedCategory === cat ? "#fff" : "var(--text-secondary)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  {cat === "all" ? "All Categories" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Events Grid */}
          {loading ? (
            <SkeletonGrid count={3} />
          ) : filteredEvents.length > 0 ? (
            <div className="grid-cards">
              {filteredEvents.map((ev, i) => (
                <EventCard key={ev.id} event={ev} index={i} />
              ))}
            </div>
          ) : (
            <div
              className="glass-card"
              style={{ padding: 48, textAlign: "center", borderRadius: "20px" }}
            >
              <FiCalendar size={40} color="#8b5cf6" style={{ marginBottom: 12 }} />
              <h3 style={{ fontSize: 18, marginBottom: 6 }}>No matching events found</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                Try adjusting your search or category filter.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. FOOTER */}
      {/* ============================================================ */}
      <PublicFooter />

      <style>{`
        html {
          scroll-behavior: smooth;
        }
        @media (max-width: 1000px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 36px !important;
          }
        }
        @media (max-width: 600px) {
          .hero-grid {
            gap: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
