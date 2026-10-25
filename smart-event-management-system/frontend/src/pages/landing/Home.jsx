import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
  FiCamera,
  FiPlusSquare,
  FiUsers,
  FiFileText,
  FiUploadCloud,
  FiCheckSquare,
  FiActivity,
  FiBriefcase,
  FiUserCheck,
  FiGrid,
  FiLayers,
  FiExternalLink,
} from "react-icons/fi";
import { BiQr } from "react-icons/bi";
import { useAuth } from "../../context/AuthContext.jsx";
import PublicNavbar from "../../components/landing/PublicNavbar.jsx";
import PublicFooter from "../../components/landing/PublicFooter.jsx";
import EventCard from "../../components/dashboard/EventCard.jsx";
import StatCard from "../../components/dashboard/StatCard.jsx";
import { SkeletonGrid } from "../../components/ui/Loader.jsx";
import { eventService } from "../../api/services.js";

import heroIllustration from "../../assets/hero-illustration.png";

// Verified 4-Domain Architecture of EventSphere
const DOMAIN_FEATURES = [
  {
    id: "student",
    role: "student",
    badge: "Student Experience",
    title: "Student Portal",
    accent: "#8b5cf6",
    gradient: "linear-gradient(135deg, #8b5cf6, #d946ef)",
    icon: FiCompass,
    tagline: "Discover, Register, and Track Campus Participation",
    description: "Designed for effortless campus engagement. Students explore upcoming academic fests, register individually or in multi-member teams, manage active QR passes, and view verified digital certificates.",
    route: "/login?role=student",
    actionLabel: "Student Portal Login",
    authRoute: "/student/dashboard",
    features: [
      {
        icon: FiSearch,
        title: "Smart Event Discovery & Calendar",
        badge: "Live Filters",
        text: "Real-time search across Technical, Cultural, Workshop, and Sports events with live seat counts and an interactive calendar view.",
      },
      {
        icon: FiUsers,
        title: "Individual & Team Registrations",
        badge: "Team Assembly",
        text: "1-click registration for single participants or dynamic multi-member team formation with verified college registration numbers.",
      },
      {
        icon: BiQr,
        title: "Dynamic Digital QR Tickets",
        badge: "Anti-Counterfeit",
        text: "Instant QR check-in slips generated upon registration, stored in your personal ticket modal for seamless event admission.",
      },
      {
        icon: FiCalendar,
        title: "My Registrations Hub",
        badge: "Live Tracking",
        text: "Real-time status tracker across registered, attended, and completed campus events with printable registration slips.",
      },
      {
        icon: FiAward,
        title: "Verifiable E-Certificates",
        badge: "PDF Generation",
        text: "Tamper-evident completion certificates generated directly with institutional credentials, mapped to student IDs.",
      },
      {
        icon: FiBell,
        title: "Real-Time Campus Notifications",
        badge: "Instant Alerts",
        text: "Live updates on seat caps, venue adjustments, registration approvals, and certificate releases.",
      },
    ],
  },
  {
    id: "faculty",
    role: "faculty",
    badge: "Academic Organizers",
    title: "Faculty Coordinator Login",
    accent: "#6366f1",
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    icon: FiPlusSquare,
    tagline: "Publish, Approve, and Oversee Campus Events",
    description: "Equips faculty coordinators and department heads with full event lifecycle management, candidate approval queues, verified participant rosters, and certificate issuance.",
    route: "/login?role=faculty",
    actionLabel: "Faculty Coordinator Login",
    authRoute: "/faculty/dashboard",
    features: [
      {
        icon: FiPlusSquare,
        title: "End-to-End Event Management",
        badge: "Poster Uploads",
        text: "Publish events with venue, schedules, rules, requirements, seat caps, and custom registration modes (Individual / Team).",
      },
      {
        icon: FiShield,
        title: "Student & Volunteer Approvals",
        badge: "Gatekeeping",
        text: "Review pending student registrations and volunteer applications with 1-click approvals and documented rejection reasons.",
      },
      {
        icon: FiUsers,
        title: "Live Participant Rosters",
        badge: "Real-Time Sync",
        text: "Real-time participant rosters with instant search, verified check-in status, and 1-click CSV attendance exports.",
      },
      {
        icon: FiUploadCloud,
        title: "Automated Certificate Issuance",
        badge: "Official Stamp",
        text: "Issue signed PDF certificates automatically generated with college logos and verified student registration numbers.",
      },
      {
        icon: FiAward,
        title: "Competition Results & Standings",
        badge: "Podium Roster",
        text: "Publish official event winners, 1st/2nd/3rd place rankings, and special recognitions directly to the campus community.",
      },
      {
        icon: FiCheckSquare,
        title: "Assigned Institutional Tasks",
        badge: "Workflow Queue",
        text: "View and execute institutional responsibilities, exam duties, and fest tasks assigned directly by College Administration.",
      },
    ],
  },
  {
    id: "volunteer",
    role: "volunteer",
    badge: "Event Ground Operations",
    title: "Volunteer Login",
    accent: "#10b981",
    gradient: "linear-gradient(135deg, #10b981, #06b6d4)",
    icon: FiCamera,
    tagline: "Camera-Powered QR Ticket Scanning & Gate Check-In",
    description: "A fast, hardware-aware gate terminal for approved event volunteers. Scans attendee QR codes, validates tickets in real time, and logs verified gate attendance.",
    route: "/login?role=volunteer",
    actionLabel: "Volunteer Login",
    authRoute: "/volunteer/dashboard",
    features: [
      {
        icon: FiCamera,
        title: "Dynamic Camera QR Scanner",
        badge: "Hardware-Aware",
        text: "In-browser QR reader with auto-detection for webcams and smartphone rear cameras, clean device release, and torch controls.",
      },
      {
        icon: FiCheckCircle,
        title: "Real-Time Attendance Verification",
        badge: "Instant Sync",
        text: "Validates ticket tokens against Firestore backend in sub-seconds to eliminate fraud and double check-ins.",
      },
      {
        icon: BiQr,
        title: "Universal QR Payload Parser",
        badge: "Multi-Format",
        text: "Parses standard JSON tickets, encrypted tokens, and pipe-delimited check-in strings (TICKET|EVENT|STUDENT).",
      },
      {
        icon: FiActivity,
        title: "Live Gate Check-In Feed",
        badge: "Audit Stream",
        text: "Chronological live audit stream displaying verified student scans with timestamps, student roll numbers, and tags.",
      },
      {
        icon: FiFileText,
        title: "Official Scan Roster PDF Generation",
        badge: "1-Click PDF",
        text: "Export printable, verified volunteer gate check-in reports directly from the active scanning terminal.",
      },
      {
        icon: FiShield,
        title: "Role-Authorized Volunteer Clearance",
        badge: "Protected Gate",
        text: "Strict access control ensuring only faculty-approved volunteer credentials can operate the gate terminal.",
      },
    ],
  },
  {
    id: "admin",
    role: "admin",
    badge: "Institutional Governance",
    title: "Admin Login",
    accent: "#0ea5e9",
    gradient: "linear-gradient(135deg, #0ea5e9, #6366f1)",
    icon: FiShield,
    tagline: "Executive Oversight, Faculty Clearance, and Compliance Reports",
    description: "Built for Principal and Dean offices to monitor campus-wide metrics, review and authorize faculty organizers, assign event responsibilities, and generate institutional compliance reports.",
    route: "/login?role=admin",
    actionLabel: "Admin Login",
    authRoute: "/admin/dashboard",
    features: [
      {
        icon: FiTrendingUp,
        title: "Campus-Wide Executive Overview",
        badge: "Executive KPIs",
        text: "High-level institutional telemetry tracking total events, student engagement, faculty participation, and turnout rates.",
      },
      {
        icon: FiUserCheck,
        title: "Faculty Authorization Governance",
        badge: "Clearance Desk",
        text: "Review faculty credentials, departments, and designations with formal approval or documented rejection workflows.",
      },
      {
        icon: FiUsers,
        title: "Campus Faculty Directory",
        badge: "Roster Management",
        text: "Comprehensive searchable institutional directory of professors, departments, contact info, and organizer roles.",
      },
      {
        icon: FiBriefcase,
        title: "Institutional Work Assignments",
        badge: "Task Delegation",
        text: "Delegate event oversight, judging, and coordination tasks across departmental faculty with real-time status tracking.",
      },
      {
        icon: FiFileText,
        title: "Multi-Format Official PDF Reports",
        badge: "Institutional PDF",
        text: "Generate institutionally branded PDF reports for Faculty Directories, Master Catalogs, Verified Attendance, and Results.",
      },
      {
        icon: FiGrid,
        title: "Departmental Event Catalog",
        badge: "Master Oversight",
        text: "Centralized view of every event published across all departments, tracking seat capacity, venues, and schedules.",
      },
    ],
  },
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

const howItWorksSteps = [
  {
    step: "01",
    icon: FiCompass,
    title: "Discover Campus Events",
    desc: "Browse live academic fests, hackathons, seminars, and sports with real-time seat availability.",
  },
  {
    step: "02",
    icon: FiCheckCircle,
    title: "1-Click Secure Register",
    desc: "Join individually or assemble a student team. Instant registration with verified college numbers.",
  },
  {
    step: "03",
    icon: BiQr,
    title: "Fast QR Gate Check-In",
    desc: "Present your dynamic digital QR ticket on your phone for instant verification by event volunteers.",
  },
  {
    step: "04",
    icon: FiAward,
    title: "Verified E-Certificates",
    desc: "Earn institutional, tamper-evident PDF certificates generated and verified directly on EventSphere.",
  },
];

export default function Home() {
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [activeSection, setActiveSection] = useState("home");
  const [activeDomain, setActiveDomain] = useState("student");
  const [events, setEvents] = useState([]);
  const [totalEvents, setTotalEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const currentDomain =
    DOMAIN_FEATURES.find((d) => d.id === activeDomain) || DOMAIN_FEATURES[0];

  // Fetch live backend events
  const fetchEvents = () => {
    setLoading(true);
    setFetchError(false);
    eventService
      .list({ page: 1, page_size: 6, sort_by: "event_date", sort_order: "asc" })
      .then(({ data }) => {
        setEvents(data.items || []);
        if (typeof data.total === "number") {
          setTotalEvents(data.total);
        }
      })
      .catch((err) => {
        console.error("Failed to load events:", err);
        setEvents([]);
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Scroll Spy with IntersectionObserver to track visible section
  useEffect(() => {
    const sectionIds = ["home", "about", "features", "how-it-works", "events"];
    const sectionElements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
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

  // Handle hash scroll on initial mount and hashchange
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash) {
        const targetId = window.location.hash.replace("#", "");
        const el = document.getElementById(targetId);
        if (el) {
          setTimeout(() => {
            el.scrollIntoView({ behavior: "smooth" });
          }, 150);
        }
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
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
            </div>

            {/* Quick Metrics */}
            <div style={{ display: "flex", gap: 32, marginTop: 44, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)" }}>
                  {totalEvents !== null ? `${totalEvents}+` : "120+"}
                </div>
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
      {/* ============================================================ */}
      {/* 3. VERIFIED 4-DOMAIN FEATURES SECTION */}
      {/* ============================================================ */}
      <section
        id="features"
        style={{
          padding: "80px 0 70px",
          scrollMarginTop: "80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle Ambient Domain Glow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 700,
            height: 350,
            borderRadius: "50%",
            background: currentDomain.gradient,
            opacity: 0.08,
            filter: "blur(120px)",
            pointerEvents: "none",
            transition: "all 0.6s ease",
          }}
        />

        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          {/* Section Header */}
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <motion.span
              initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="badge badge-info"
              style={{ marginBottom: 14 }}
            >
              ⚡ 4 Integrated Campus Domains
            </motion.span>
            <motion.h2
              initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{ fontSize: "clamp(28px, 4.4vw, 40px)", marginBottom: 14, letterSpacing: "-0.02em" }}
            >
              Purpose-Built Portals for the <span className="text-gradient">Entire Campus</span>
            </motion.h2>
            <motion.p
              initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              style={{ color: "var(--text-secondary)", maxWidth: 680, margin: "0 auto", fontSize: 16, lineHeight: 1.65 }}
            >
              EventSphere unites Students, Faculty Organizers, Gate Volunteers, and Institutional Leadership into a single, cohesive academic event management cloud.
            </motion.p>
          </div>

          {/* Interactive Domain Pill Switcher */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 36,
            }}
          >
            <div
              className="domain-tabs-wrapper"
              role="tablist"
              aria-label="Campus Domains"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px",
                borderRadius: 999,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-color)",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                maxWidth: "100%",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {DOMAIN_FEATURES.map((dom) => {
                const isSelected = dom.id === activeDomain;
                const IconComponent = dom.icon;
                return (
                  <button
                    key={dom.id}
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveDomain(dom.id)}
                    style={{
                      position: "relative",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 20px",
                      borderRadius: 999,
                      border: "none",
                      background: "transparent",
                      color: isSelected ? "#ffffff" : "var(--text-secondary)",
                      fontSize: 14,
                      fontWeight: isSelected ? 600 : 500,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      zIndex: 2,
                      transition: "color 0.2s ease",
                    }}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="active-domain-pill"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: 999,
                          background: dom.gradient,
                          boxShadow: `0 6px 20px ${dom.accent}55, inset 0 1px 1px rgba(255,255,255,0.35)`,
                          zIndex: -1,
                        }}
                      />
                    )}
                    <IconComponent size={16} style={{ color: isSelected ? "#ffffff" : dom.accent }} />
                    <span>{dom.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Domain Detailed Showcase Panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentDomain.id}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="glass-card"
              style={{
                padding: "36px 32px",
                borderRadius: "24px",
                border: `1.5px solid ${currentDomain.accent}33`,
                boxShadow: `0 20px 50px rgba(0, 0, 0, 0.25), 0 0 35px ${currentDomain.accent}18`,
                marginBottom: 44,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Header inside domain showcase */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 20,
                  flexWrap: "wrap",
                  marginBottom: 32,
                  paddingBottom: 24,
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 16,
                      background: currentDomain.gradient,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      boxShadow: `0 8px 24px ${currentDomain.accent}55`,
                      flexShrink: 0,
                    }}
                  >
                    <currentDomain.icon size={28} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                      <h3 style={{ fontSize: "clamp(20px, 3vw, 24px)", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                        {currentDomain.title}
                      </h3>
                      <span
                        className="badge"
                        style={{
                          background: `${currentDomain.accent}20`,
                          color: currentDomain.accent,
                          border: `1px solid ${currentDomain.accent}40`,
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "3px 10px",
                        }}
                      >
                        {currentDomain.badge}
                      </span>
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: 15, margin: 0 }}>
                      {currentDomain.tagline}
                    </p>
                  </div>
                </div>

                {/* Role-Aware Call to Action Button */}
                <div>
                  {user && user.role === currentDomain.role ? (
                    <Link
                      to={currentDomain.authRoute}
                      className="btn btn-primary"
                      style={{
                        padding: "10px 22px",
                        borderRadius: 999,
                        background: currentDomain.gradient,
                        border: "none",
                        color: "#fff",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        boxShadow: `0 6px 20px ${currentDomain.accent}45`,
                      }}
                    >
                      <span>Open My Dashboard</span>
                      <FiArrowRight size={15} />
                    </Link>
                  ) : (
                    <Link
                      to={currentDomain.route}
                      className="btn btn-primary"
                      style={{
                        padding: "10px 22px",
                        borderRadius: 999,
                        background: currentDomain.gradient,
                        border: "none",
                        color: "#fff",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        boxShadow: `0 6px 20px ${currentDomain.accent}45`,
                        textDecoration: "none",
                      }}
                    >
                      <span>{currentDomain.actionLabel}</span>
                      <FiArrowRight size={15} />
                    </Link>
                  )}
                </div>
              </div>

              {/* Verified Features Grid (6 Real Features) */}
              <div
                className="domain-features-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 20,
                }}
              >
                {currentDomain.features.map((feat, idx) => {
                  const FeatIcon = feat.icon;
                  return (
                    <motion.div
                      key={feat.title}
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.3 }}
                      className="glass-card glass-card-interactive"
                      style={{
                        padding: 20,
                        borderRadius: "18px",
                        background: "var(--bg-glass)",
                        border: "1px solid var(--border-color)",
                        display: "flex",
                        flexDirection: "column",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 11,
                            background: `${currentDomain.accent}18`,
                            color: currentDomain.accent,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <FeatIcon size={19} />
                        </div>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border-color)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {feat.badge}
                        </span>
                      </div>
                      <h4
                        style={{
                          fontSize: 15.5,
                          fontWeight: 700,
                          marginBottom: 8,
                          color: "var(--text-primary)",
                          lineHeight: 1.35,
                        }}
                      >
                        {feat.title}
                      </h4>
                      <p
                        style={{
                          fontSize: 13.5,
                          color: "var(--text-secondary)",
                          lineHeight: 1.55,
                          margin: 0,
                          flex: 1,
                        }}
                      >
                        {feat.text}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Quick Domain Matrix Switcher (4 Interactive Domain Cards) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 18,
            }}
            className="domain-cards-matrix"
          >
            {DOMAIN_FEATURES.map((dom) => {
              const isSelected = dom.id === activeDomain;
              const DomIcon = dom.icon;
              return (
                <div
                  key={dom.id}
                  onClick={() => setActiveDomain(dom.id)}
                  className={`glass-card glass-card-interactive ${isSelected ? "domain-card-active" : ""}`}
                  style={{
                    padding: 20,
                    borderRadius: "18px",
                    cursor: "pointer",
                    border: isSelected ? `1.5px solid ${dom.accent}` : "1px solid var(--border-color)",
                    background: isSelected ? "var(--bg-elevated)" : "var(--bg-glass)",
                    boxShadow: isSelected ? `0 10px 30px ${dom.accent}25` : "none",
                    transition: "all 0.25s ease",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: dom.gradient,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        boxShadow: `0 4px 12px ${dom.accent}40`,
                        flexShrink: 0,
                      }}
                    >
                      <DomIcon size={18} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 14.5,
                          fontWeight: 700,
                          color: isSelected ? dom.accent : "var(--text-primary)",
                        }}
                      >
                        {dom.title}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                        {dom.badge}
                      </div>
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                      margin: 0,
                      flex: 1,
                    }}
                  >
                    {dom.tagline}
                  </p>
                  <Link
                    to={dom.route}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      marginTop: 14,
                      padding: "8px 14px",
                      borderRadius: 999,
                      background: dom.gradient,
                      color: "#fff",
                      border: "none",
                      fontSize: 12.5,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      boxShadow: `0 4px 12px ${dom.accent}35`,
                      textDecoration: "none",
                      cursor: "pointer",
                    }}
                  >
                    <span>{dom.actionLabel}</span>
                    <FiArrowRight size={13} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        <style>{`
          @media (max-width: 1024px) {
            .domain-features-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }
            .domain-cards-matrix {
              grid-template-columns: repeat(2, 1fr) !important;
            }
          }
          @media (max-width: 640px) {
            .domain-features-grid {
              grid-template-columns: 1fr !important;
            }
            .domain-cards-matrix {
              grid-template-columns: 1fr !important;
            }
            .domain-tabs-wrapper {
              width: 100%;
              justifyContent: flex-start;
              padding: 4px;
            }
          }
        `}</style>
      </section>

      {/* ============================================================ */}
      {/* 3.5 HOW IT WORKS SECTION */}
      {/* ============================================================ */}
      <section
        id="how-it-works"
        style={{
          padding: "70px 0 60px",
          scrollMarginTop: "80px",
          background: "linear-gradient(180deg, transparent 0%, rgba(99, 102, 241, 0.04) 100%)",
        }}
      >
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span className="badge badge-info" style={{ marginBottom: 14 }}>
              🚀 Seamless Flow
            </span>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 36px)", marginBottom: 14 }}>
              How <span className="text-gradient">EventSphere</span> Works
            </h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto", fontSize: 16 }}>
              A straightforward four-step journey from discovering campus events to receiving your official verified certificate.
            </p>
          </div>

          <div className="grid-cards-4">
            {howItWorksSteps.map((step, idx) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="glass-card glass-card-interactive"
                style={{
                  padding: 24,
                  borderRadius: "20px",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "var(--gradient-soft)",
                      color: "#8b5cf6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <step.icon size={22} />
                  </div>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      fontFamily: "var(--font-heading)",
                      color: "var(--text-muted)",
                      opacity: 0.6,
                    }}
                  >
                    {step.step}
                  </span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, flex: 1 }}>
                  {step.desc}
                </p>
              </motion.div>
            ))}
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
          ) : fetchError ? (
            <div
              className="glass-card"
              style={{ padding: 48, textAlign: "center", borderRadius: "20px" }}
            >
              <FiCalendar size={40} color="#ec4899" style={{ marginBottom: 12 }} />
              <h3 style={{ fontSize: 18, marginBottom: 8, color: "var(--text-primary)" }}>
                Unable to load live events
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 20 }}>
                There was an issue connecting to the backend. Please check your connection and retry.
              </p>
              <button
                type="button"
                onClick={fetchEvents}
                className="btn btn-primary btn-sm"
                style={{ padding: "8px 24px" }}
              >
                Retry Loading
              </button>
            </div>
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
