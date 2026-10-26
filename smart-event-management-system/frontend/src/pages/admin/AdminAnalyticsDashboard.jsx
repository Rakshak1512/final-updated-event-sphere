import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import BackButton from "../../components/common/BackButton.jsx";
import {
  FiUsers,
  FiCalendar,
  FiCheckSquare,
  FiAward,
  FiTrendingUp,
  FiRefreshCw,
  FiShield,
  FiActivity,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiFileText,
  FiFilter,
  FiDownload,
  FiPieChart,
  FiBarChart2,
  FiPercent,
  FiTarget,
  FiChevronRight,
  FiLayers,
} from "react-icons/fi";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import PageTransition from "../../components/common/PageTransition.jsx";
import { analyticsService, eventService } from "../../api/services.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useRealtime } from "../../context/RealtimeContext.jsx";
import { formatDate } from "../../utils/format.js";
import EventReportModal from "../../components/events/EventReportModal.jsx";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

export default function AdminAnalyticsDashboard({ embedded = false }) {
  const { user, loading: authLoading } = useAuth();
  const { addListener } = useRealtime();

  // Route protection & session persistence
  if (!embedded && authLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div style={{ color: "#8b5cf6", fontSize: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <FiRefreshCw className="spin" size={20} />
          <span>Verifying admin session...</span>
        </div>
      </div>
    );
  }

  const userRole = (user?.role || "").toLowerCase().trim();
  if (!embedded && (!user || userRole !== "admin")) {
    const target =
      userRole === "faculty"
        ? "/faculty/dashboard"
        : userRole === "volunteer"
        ? "/volunteer/dashboard"
        : userRole === "student"
        ? "/student/dashboard"
        : "/login";
    return <Navigate to={target} replace />;
  }

  // Dashboard state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [eventsList, setEventsList] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedEventReport, setSelectedEventReport] = useState(null);

  // Multi-dimensional filters
  const [timeRange, setTimeRange] = useState("all"); // "7d" | "30d" | "90d" | "all"
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Load available events for dropdown filter
  useEffect(() => {
    eventService
      .list({ page: 1, page_size: 100, sort_by: "created_at", sort_order: "desc" })
      .then(({ data }) => setEventsList(data.items || []))
      .catch((err) => console.error("Could not load events list for analytics filter:", err));
  }, []);

  // Fetch live aggregated analytics
  const fetchAnalytics = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      try {
        const params = {};
        if (timeRange && timeRange !== "all") params.time_range = timeRange;
        if (selectedEventId) params.event_id = selectedEventId;
        if (selectedCategory && selectedCategory !== "all") params.category = selectedCategory;
        if (selectedStatus && selectedStatus !== "all") params.registration_status = selectedStatus;

        const { data } = await analyticsService.admin(params);
        setAnalytics(data);
        setLastUpdated(new Date());
        if (isManual) toast.success("Analytics refreshed successfully");
      } catch (err) {
        console.error("Failed to load admin analytics:", err);
        toast.error("Failed to refresh analytics");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [timeRange, selectedEventId, selectedCategory, selectedStatus]
  );

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Reactive WebSocket updates: refresh when registrations or events change
  useEffect(() => {
    const remove = addListener((msg) => {
      if (
        msg.type === "REGISTRATION_CREATED" ||
        msg.type === "REGISTRATION_STATUS_CHANGED" ||
        msg.type === "ATTENDANCE_CHECKED_IN" ||
        msg.type === "REGISTRATION_CANCELLED" ||
        msg.type === "EVENT_UPDATED" ||
        msg.type === "EVENT_CREATED"
      ) {
        fetchAnalytics(false);
      }
    });
    return () => remove();
  }, [addListener, fetchAnalytics]);

  const overview = analytics?.overview || {};
  const charts = analytics?.charts || {};
  const popularEvents = analytics?.popular_events || [];
  const allEventsComparison = analytics?.all_events_comparison || [];
  const categories = analytics?.category_analytics || [];

  // Glassmorphic styling tokens
  const glassPanelStyle = {
    background: "rgba(15, 23, 42, 0.72)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "20px",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
    padding: "22px 24px",
    position: "relative",
    overflow: "hidden",
  };

  const chartTextColor = "#94a3b8";
  const chartGridColor = "rgba(148, 163, 184, 0.08)";

  // Common chart options
  const defaultChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: chartTextColor, font: { family: "Inter", size: 12 }, boxWidth: 12, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        titleColor: "#ffffff",
        bodyColor: "#cbd5e1",
        borderColor: "rgba(255, 255, 255, 0.12)",
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        cornerRadius: 10,
      },
    },
  };

  // 1. Line Chart: Registration trends over time
  const regTrendsData = useMemo(() => {
    const raw = charts.registration_trends || {};
    return {
      labels: raw.labels || [],
      datasets: [
        {
          label: "Daily Registrations",
          data: raw.data || [],
          borderColor: "#8b5cf6",
          backgroundColor: "rgba(139, 92, 246, 0.15)",
          fill: true,
          tension: 0.35,
          pointBackgroundColor: "#8b5cf6",
          pointBorderColor: "#ffffff",
          pointRadius: 3,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [charts.registration_trends]);

  // 2. Bar Chart: Registrations and Attendance by Event
  const eventBarData = useMemo(() => {
    const raw = charts.event_registrations_attendance || {};
    return {
      labels: raw.labels || [],
      datasets: [
        {
          label: "Registrations",
          data: raw.registrations || [],
          backgroundColor: "#38bdf8",
          borderRadius: 6,
        },
        {
          label: "Attended",
          data: raw.attended || [],
          backgroundColor: "#10b981",
          borderRadius: 6,
        },
      ],
    };
  }, [charts.event_registrations_attendance]);

  // 3. Donut Chart: Registration status distribution
  const statusDonutData = useMemo(() => {
    const raw = charts.registration_status_distribution || {};
    return {
      labels: raw.labels || ["Approved", "Attended", "Pending", "Cancelled"],
      datasets: [
        {
          data: raw.data || [0, 0, 0, 0],
          backgroundColor: raw.colors || ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"],
          borderColor: "rgba(15, 23, 42, 0.8)",
          borderWidth: 2,
        },
      ],
    };
  }, [charts.registration_status_distribution]);

  // 4. Pie/Donut Chart: Event category distribution
  const categoryDonutData = useMemo(() => {
    const raw = charts.category_distribution || {};
    return {
      labels: raw.labels || ["General"],
      datasets: [
        {
          data: raw.data || [1],
          backgroundColor: raw.colors || ["#8b5cf6", "#06b6d4", "#f59e0b", "#ec4899", "#10b981"],
          borderColor: "rgba(15, 23, 42, 0.8)",
          borderWidth: 2,
        },
      ],
    };
  }, [charts.category_distribution]);

  // 5. Area Chart: Cumulative registration growth
  const cumulativeGrowthData = useMemo(() => {
    const raw = charts.cumulative_registration_growth || {};
    return {
      labels: raw.labels || [],
      datasets: [
        {
          label: "Cumulative Registrations",
          data: raw.data || [],
          borderColor: "#06b6d4",
          backgroundColor: "rgba(6, 182, 212, 0.18)",
          fill: true,
          tension: 0.35,
          pointBackgroundColor: "#06b6d4",
          pointRadius: 2,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [charts.cumulative_registration_growth]);

  // 6. Horizontal Bar Chart: Top events by registrations or attendance
  // 6. Horizontal Bar Chart: Top events by attendance rate
  const horizontalBarData = useMemo(() => {
    const raw = charts.top_events_ranking || {};
    return {
      labels: raw.labels || [],
      datasets: [
        {
          label: "Attendance Rate (%)",
          data: raw.attendance_rates || raw.attended?.map((a, i) => Math.round((a / Math.max(1, raw.registrations?.[i] || 1)) * 100)) || [],
          backgroundColor: "rgba(168, 85, 247, 0.85)",
          borderRadius: 6,
        },
        {
          label: "Registrations",
          data: raw.registrations || [],
          backgroundColor: "rgba(56, 189, 248, 0.65)",
          borderRadius: 6,
        },
        {
          label: "Attendees",
          data: raw.attended || [],
          backgroundColor: "rgba(34, 197, 94, 0.85)",
          borderRadius: 6,
        },
      ],
    };
  }, [charts.top_events_ranking]);

  // 7. Attendance Chart: Registered versus Attended participants
  const attendanceRatioData = useMemo(() => {
    const raw = charts.attendance_ratio || {};
    return {
      labels: raw.labels || ["Attended", "Absent / Not Checked In"],
      datasets: [
        {
          data: raw.data || [0, 0],
          backgroundColor: raw.colors || ["#10b981", "rgba(148, 163, 184, 0.25)"],
          borderColor: "rgba(15, 23, 42, 0.8)",
          borderWidth: 2,
        },
      ],
    };
  }, [charts.attendance_ratio]);

  // 8. Time-based Chart: Event participation trends
  const participationTimelineData = useMemo(() => {
    const raw = charts.participation_timeline || {};
    return {
      labels: raw.labels || [],
      datasets: [
        {
          type: "bar",
          label: "Registrations",
          data: raw.registrations || [],
          backgroundColor: "rgba(56, 189, 248, 0.75)",
          borderRadius: 6,
        },
        {
          type: "line",
          label: "Actual Attendees",
          data: raw.attendees || [],
          borderColor: "#10b981",
          backgroundColor: "transparent",
          pointBackgroundColor: "#10b981",
          tension: 0.3,
          borderWidth: 2,
        },
      ],
    };
  }, [charts.participation_timeline]);

  // Download official PDF Analytics Report
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header Banner
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 42, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("EVENTSPHERE ENTERPRISE ANALYTICS", 14, 18);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text("Executive Command Center & Performance Intelligence Report", 14, 25);

      const reportDate = new Date().toLocaleString();
      doc.setFontSize(8.5);
      doc.setTextColor(203, 213, 225);
      doc.text(`Generated: ${reportDate} | Generated by: ${user?.name || "Admin"}`, 14, 34);

      let currentY = 50;

      // Filter Scope Information
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Active Filter Scope:", 14, currentY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const filterText = `Time Range: ${timeRange.toUpperCase()} | Event: ${
        selectedEventId ? eventsList.find((e) => String(e.id) === String(selectedEventId))?.title || selectedEventId : "All Events"
      } | Category: ${selectedCategory.toUpperCase()} | Status: ${selectedStatus.toUpperCase()}`;
      doc.text(filterText, 14, currentY + 6);

      currentY += 16;

      // KPI Metric Cards Table
      autoTable(doc, {
        startY: currentY,
        head: [["Metric Category", "Metric Name", "Live Value", "Calculated Context"]],
        body: [
          ["Events Oversight", "Total Events", String(overview.total_events ?? 0), "All Institutional Events"],
          ["Events Oversight", "Upcoming Events", String(overview.upcoming_events ?? 0), "Scheduled Upcoming Events"],
          ["Events Oversight", "Completed Events", String(overview.completed_events ?? 0), "Concluded Events"],
          ["Student Engagement", "Total Registrations", String(overview.total_registrations ?? 0), `${overview.total_registered_students ?? 0} Distinct Students`],
          ["Registrations", "Approved Registrations", String(overview.approved_registrations ?? overview.confirmed_registrations ?? 0), "Confirmed & Approved Seats"],
          ["Registrations", "Pending Registrations", String(overview.pending_registrations ?? Math.max(0, (overview.total_registrations ?? 0) - (overview.confirmed_registrations ?? 0) - (overview.cancelled_registrations ?? 0))), "Awaiting Authorization"],
          ["Participation", "Total Attendees", String(overview.total_attendance ?? 0), "Verified Check-ins"],
          ["Participation", "Attendance Rate", `${overview.attendance_rate ?? 0}%`, "Attendance Turnout Efficiency"],
        ],
        theme: "striped",
        headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 8.5, cellPadding: 3.5 },
      });

      currentY = doc.lastAutoTable.finalY + 12;

      // Event Performance Comparison Table
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Event Performance & Attendance Roster Summary", 14, currentY);

      const tableRows = (allEventsComparison.length > 0 ? allEventsComparison : popularEvents).map((ev, i) => [
        i + 1,
        ev.title || "Event",
        ev.category || "General",
        ev.date || "N/A",
        ev.capacity || 0,
        ev.registrations || 0,
        ev.attended || 0,
        `${ev.attendance_rate ?? 0}%`,
        `${ev.occupancy_rate ?? 0}%`,
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        head: [["#", "Event Title", "Category", "Event Date", "Capacity", "Regs", "Attended", "Att. %", "Occ. %"]],
        body: tableRows.length > 0 ? tableRows : [["-", "No events match current filter", "-", "-", "-", "-", "-", "-", "-"]],
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 2.5 },
      });

      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `EventSphere Command Center • Page ${p} of ${totalPages} • Real-time Data Verification`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" }
        );
      }

      doc.save(`EventSphere_Analytics_Report_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Analytics PDF Report downloaded successfully!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Could not export Analytics PDF");
    }
  };

  const Container = embedded ? "div" : PageTransition;

  return (
    <Container>
      {!embedded && (
        <div style={{ marginBottom: 16 }}>
          <BackButton fallback="/admin/dashboard" label="Back to Dashboard" />
        </div>
      )}
      {/* Dashboard Top Header */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: "12px",
                background: "rgba(139, 92, 246, 0.18)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                color: "#c084fc",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              <FiShield size={12} /> Executive Command Center
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                color: "#34d399",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 8px #10b981",
                }}
              />
              Live Database Connected
            </span>
          </div>

          <h2 style={{ fontSize: embedded ? "1.5rem" : "2rem", fontWeight: 800, color: "var(--text-primary)", margin: "8px 0 4px", letterSpacing: "-0.5px" }}>
            {embedded ? "Executive Analytics & Performance Intelligence" : "Admin Analytics & Intelligence"}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>
            Live enterprise metrics, attendance tracking, and multi-dimensional institutional intelligence.
          </p>
        </div>

        {/* Global Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDownloadPDF}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
              border: "none",
              boxShadow: "0 4px 14px rgba(139, 92, 246, 0.35)",
            }}
          >
            <FiDownload size={15} /> Download PDF Report
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            title="Refresh database metrics"
          >
            <FiRefreshCw className={refreshing ? "spin" : ""} size={14} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar (Liquid-Glass Command Panel) */}
      <div
        style={{
          ...glassPanelStyle,
          padding: "16px 20px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: "13px", fontWeight: 600 }}>
            <FiFilter size={14} color="#8b5cf6" />
            <span>Filters:</span>
          </div>

          {/* Time Range Filter */}
          <div style={{ display: "flex", background: "rgba(0, 0, 0, 0.3)", borderRadius: "10px", padding: 3 }}>
            {[
              { id: "all", label: "All Time" },
              { id: "90d", label: "Last 90d" },
              { id: "30d", label: "Last 30d" },
              { id: "7d", label: "Last 7d" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeRange(t.id)}
                style={{
                  background: timeRange === t.id ? "linear-gradient(135deg, #8b5cf6, #3b82f6)" : "transparent",
                  color: timeRange === t.id ? "#ffffff" : "#94a3b8",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Event Filter */}
          <select
            className="form-input"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            style={{ minWidth: 180, fontSize: "12.5px", padding: "6px 10px", background: "rgba(15, 23, 42, 0.8)" }}
          >
            <option value="">All Events</option>
            {eventsList.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title.length > 28 ? ev.title.slice(0, 28) + "…" : ev.title}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            className="form-input"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ minWidth: 140, fontSize: "12.5px", padding: "6px 10px", background: "rgba(15, 23, 42, 0.8)" }}
          >
            <option value="all">All Categories</option>
            <option value="Technical">Technical</option>
            <option value="Cultural">Cultural</option>
            <option value="Sports">Sports</option>
            <option value="Workshop">Workshop</option>
            <option value="Seminar">Seminar</option>
          </select>

          {/* Registration Status Filter */}
          <select
            className="form-input"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ minWidth: 140, fontSize: "12.5px", padding: "6px 10px", background: "rgba(15, 23, 42, 0.8)" }}
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="attended">Attended</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {(timeRange !== "all" || selectedEventId || selectedCategory !== "all" || selectedStatus !== "all") && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setTimeRange("all");
                setSelectedEventId("");
                setSelectedCategory("all");
                setSelectedStatus("all");
              }}
              style={{ fontSize: 11.5, padding: "5px 10px" }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Freshness Timestamp */}
        <div style={{ fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
          <FiClock size={13} color="#8b5cf6" />
          <span>Last sync: {lastUpdated ? lastUpdated.toLocaleTimeString() : "Live"}</span>
        </div>
      </div>

      {/* KPI Cards Grid (8 Live Database-Backed Metrics) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* KPI 1: Total Events */}
        <motion.div whileHover={{ y: -3 }} style={{ ...glassPanelStyle, borderLeft: "4px solid #8b5cf6", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Total Events</span>
              <h2 style={{ fontSize: "1.9rem", fontWeight: 800, color: "#ffffff", margin: "6px 0 2px" }}>
                {overview.total_events ?? 0}
              </h2>
              <span style={{ fontSize: 11.5, color: "#c084fc" }}>
                All campus activities
              </span>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(139, 92, 246, 0.15)", color: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              <FiCalendar />
            </div>
          </div>
        </motion.div>

        {/* KPI 2: Upcoming Events */}
        <motion.div whileHover={{ y: -3 }} style={{ ...glassPanelStyle, borderLeft: "4px solid #06b6d4", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Upcoming Events</span>
              <h2 style={{ fontSize: "1.9rem", fontWeight: 800, color: "#ffffff", margin: "6px 0 2px" }}>
                {overview.upcoming_events ?? 0}
              </h2>
              <span style={{ fontSize: 11.5, color: "#38bdf8" }}>
                Scheduled future dates
              </span>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(6, 182, 212, 0.15)", color: "#06b6d4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              <FiClock />
            </div>
          </div>
        </motion.div>

        {/* KPI 3: Completed Events */}
        <motion.div whileHover={{ y: -3 }} style={{ ...glassPanelStyle, borderLeft: "4px solid #10b981", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Completed Events</span>
              <h2 style={{ fontSize: "1.9rem", fontWeight: 800, color: "#ffffff", margin: "6px 0 2px" }}>
                {overview.completed_events ?? 0}
              </h2>
              <span style={{ fontSize: 11.5, color: "#34d399" }}>
                Successfully concluded
              </span>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              <FiCheckCircle />
            </div>
          </div>
        </motion.div>

        {/* KPI 4: Total Registrations */}
        <motion.div whileHover={{ y: -3 }} style={{ ...glassPanelStyle, borderLeft: "4px solid #3b82f6", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Total Registrations</span>
              <h2 style={{ fontSize: "1.9rem", fontWeight: 800, color: "#ffffff", margin: "6px 0 2px" }}>
                {overview.total_registrations ?? 0}
              </h2>
              <span style={{ fontSize: 11.5, color: "#60a5fa" }}>
                {overview.total_registered_students ?? 0} distinct students
              </span>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              <FiUsers />
            </div>
          </div>
        </motion.div>

        {/* KPI 5: Approved Registrations */}
        <motion.div whileHover={{ y: -3 }} style={{ ...glassPanelStyle, borderLeft: "4px solid #8b5cf6", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Approved Registrations</span>
              <h2 style={{ fontSize: "1.9rem", fontWeight: 800, color: "#ffffff", margin: "6px 0 2px" }}>
                {overview.approved_registrations ?? overview.confirmed_registrations ?? 0}
              </h2>
              <span style={{ fontSize: 11.5, color: "#c084fc" }}>
                Confirmed & authorized seats
              </span>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              <FiCheckSquare />
            </div>
          </div>
        </motion.div>

        {/* KPI 6: Pending Registrations */}
        <motion.div whileHover={{ y: -3 }} style={{ ...glassPanelStyle, borderLeft: "4px solid #f59e0b", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Pending Registrations</span>
              <h2 style={{ fontSize: "1.9rem", fontWeight: 800, color: "#ffffff", margin: "6px 0 2px" }}>
                {overview.pending_registrations ?? Math.max(0, (overview.total_registrations ?? 0) - (overview.confirmed_registrations ?? 0) - (overview.cancelled_registrations ?? 0))}
              </h2>
              <span style={{ fontSize: 11.5, color: "#fbbf24" }}>
                Awaiting faculty approval
              </span>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              <FiClock />
            </div>
          </div>
        </motion.div>

        {/* KPI 7: Total Attendees */}
        <motion.div whileHover={{ y: -3 }} style={{ ...glassPanelStyle, borderLeft: "4px solid #10b981", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Total Attendees</span>
              <h2 style={{ fontSize: "1.9rem", fontWeight: 800, color: "#ffffff", margin: "6px 0 2px" }}>
                {overview.total_attendance ?? 0}
              </h2>
              <span style={{ fontSize: 11.5, color: "#34d399" }}>
                Verified check-in turnout
              </span>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              <FiAward />
            </div>
          </div>
        </motion.div>

        {/* KPI 8: Attendance Rate */}
        <motion.div whileHover={{ y: -3 }} style={{ ...glassPanelStyle, borderLeft: "4px solid #ec4899", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Attendance Rate</span>
              <h2 style={{ fontSize: "1.9rem", fontWeight: 800, color: "#ffffff", margin: "6px 0 2px" }}>
                {overview.attendance_rate ?? 0}%
              </h2>
              <span style={{ fontSize: 11.5, color: "#f472b6" }}>
                Ratio of attended to registered
              </span>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(236, 72, 153, 0.15)", color: "#ec4899", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              <FiPercent />
            </div>
          </div>
        </motion.div>
      </div>

      {/* ========================================================================= */}
      {/* 8 ADVANCED CHARTS SUITE                                                   */}
      {/* ========================================================================= */}

      {/* Row 1: Line Chart (Registration Trends) & Donut Chart (Status Distribution) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24, marginBottom: 24 }}>
        {/* Chart 1: Line chart: registration trends over time */}
        <div style={{ ...glassPanelStyle, minHeight: 360, gridColumn: "span 2" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                1. Registration Inflow Trends Over Time
              </h3>
              <p style={{ fontSize: 12.5, color: "#94a3b8", margin: "2px 0 0" }}>
                Daily registration volume recorded across campus events
              </p>
            </div>
            <span style={{ fontSize: 12, color: "#c084fc", background: "rgba(139, 92, 246, 0.15)", padding: "3px 10px", borderRadius: 12 }}>
              Time-series Line Chart
            </span>
          </div>
          <div style={{ height: 280 }}>
            {regTrendsData.labels.length > 0 ? (
              <Line
                data={regTrendsData}
                options={{
                  ...defaultChartOptions,
                  scales: {
                    x: { ticks: { color: chartTextColor }, grid: { color: chartGridColor } },
                    y: { ticks: { color: chartTextColor, precision: 0 }, grid: { color: chartGridColor }, beginAtZero: true },
                  },
                }}
              />
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                No registration inflow recorded for this period
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Donut chart: registration status distribution */}
        <div style={{ ...glassPanelStyle, minHeight: 360 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                3. Registration Status Distribution
              </h3>
              <p style={{ fontSize: 12.5, color: "#94a3b8", margin: "2px 0 0" }}>
                Approved, Attended, Pending & Cancelled Breakdown
              </p>
            </div>
          </div>
          <div style={{ height: 260, position: "relative" }}>
            <Doughnut
              data={statusDonutData}
              options={{
                ...defaultChartOptions,
                cutout: "68%",
                plugins: {
                  ...defaultChartOptions.plugins,
                  legend: { position: "bottom", labels: { color: chartTextColor, usePointStyle: true } },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Row 2: Bar Chart (Event Comparison) & Pie/Donut Chart (Categories) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24, marginBottom: 24 }}>
        {/* Chart 2: Bar chart: registrations and attendance by event */}
        <div style={{ ...glassPanelStyle, minHeight: 360, gridColumn: "span 2" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                2. Registrations vs. Attendance by Event
              </h3>
              <p style={{ fontSize: 12.5, color: "#94a3b8", margin: "2px 0 0" }}>
                Direct comparison between students registered and actual check-in attendees
              </p>
            </div>
            <span style={{ fontSize: 12, color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", padding: "3px 10px", borderRadius: 12 }}>
              Grouped Bar Chart
            </span>
          </div>
          <div style={{ height: 280 }}>
            {eventBarData.labels.length > 0 ? (
              <Bar
                data={eventBarData}
                options={{
                  ...defaultChartOptions,
                  scales: {
                    x: { ticks: { color: chartTextColor }, grid: { color: chartGridColor } },
                    y: { ticks: { color: chartTextColor, precision: 0 }, grid: { color: chartGridColor }, beginAtZero: true },
                  },
                }}
              />
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                No events registered yet
              </div>
            )}
          </div>
        </div>

        {/* Chart 4: Pie or donut chart: event category distribution */}
        <div style={{ ...glassPanelStyle, minHeight: 360 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                4. Event Category Distribution
              </h3>
              <p style={{ fontSize: 12.5, color: "#94a3b8", margin: "2px 0 0" }}>
                Campus events categorized across domains
              </p>
            </div>
          </div>
          <div style={{ height: 260, position: "relative" }}>
            <Doughnut
              data={categoryDonutData}
              options={{
                ...defaultChartOptions,
                cutout: "62%",
                plugins: {
                  ...defaultChartOptions.plugins,
                  legend: { position: "bottom", labels: { color: chartTextColor, usePointStyle: true } },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Row 3: Area Chart (Cumulative Growth) & Horizontal Bar Chart (Top Events Ranking) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24, marginBottom: 24 }}>
        {/* Chart 5: Area chart: cumulative registration growth */}
        <div style={{ ...glassPanelStyle, minHeight: 360 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                5. Cumulative Registration Growth
              </h3>
              <p style={{ fontSize: 12.5, color: "#94a3b8", margin: "2px 0 0" }}>
                Total platform seat reservations aggregated over time
              </p>
            </div>
            <span style={{ fontSize: 12, color: "#2dd4bf", background: "rgba(20, 184, 166, 0.15)", padding: "3px 10px", borderRadius: 12 }}>
              Area Chart
            </span>
          </div>
          <div style={{ height: 270 }}>
            <Line
              data={cumulativeGrowthData}
              options={{
                ...defaultChartOptions,
                scales: {
                  x: { ticks: { color: chartTextColor }, grid: { color: chartGridColor } },
                  y: { ticks: { color: chartTextColor, precision: 0 }, grid: { color: chartGridColor }, beginAtZero: true },
                },
              }}
            />
          </div>
        </div>

        {/* Chart 6: Horizontal bar chart: top events ranking */}
        <div style={{ ...glassPanelStyle, minHeight: 360 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                6. Top Events by Registrations & Attendance
              </h3>
              <p style={{ fontSize: 12.5, color: "#94a3b8", margin: "2px 0 0" }}>
                Highest-demand campus activities ranked
              </p>
            </div>
            <span style={{ fontSize: 12, color: "#f472b6", background: "rgba(236, 72, 153, 0.15)", padding: "3px 10px", borderRadius: 12 }}>
              Horizontal Bar
            </span>
          </div>
          <div style={{ height: 270 }}>
            {horizontalBarData.labels.length > 0 ? (
              <Bar
                data={horizontalBarData}
                options={{
                  ...defaultChartOptions,
                  indexAxis: "y",
                  scales: {
                    x: { ticks: { color: chartTextColor, precision: 0 }, grid: { color: chartGridColor }, beginAtZero: true },
                    y: { ticks: { color: chartTextColor }, grid: { color: chartGridColor } },
                  },
                }}
              />
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                No events available for ranking
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Attendance Ratio Chart & Time-based Participation Timeline */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24, marginBottom: 24 }}>
        {/* Chart 7: Attendance chart: registered versus attended participants */}
        <div style={{ ...glassPanelStyle, minHeight: 360 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                7. Attendance Turnout Ratio
              </h3>
              <p style={{ fontSize: 12.5, color: "#94a3b8", margin: "2px 0 0" }}>
                Present verified attendees vs. absent / unchecked
              </p>
            </div>
            <span style={{ fontSize: 12, color: "#34d399", background: "rgba(16, 185, 129, 0.15)", padding: "3px 10px", borderRadius: 12 }}>
              Ratio Donut
            </span>
          </div>
          <div style={{ height: 260, position: "relative" }}>
            <Doughnut
              data={attendanceRatioData}
              options={{
                ...defaultChartOptions,
                cutout: "70%",
                plugins: {
                  ...defaultChartOptions.plugins,
                  legend: { position: "bottom", labels: { color: chartTextColor, usePointStyle: true } },
                },
              }}
            />
          </div>
        </div>

        {/* Chart 8: Time-based chart: event participation trends */}
        <div style={{ ...glassPanelStyle, minHeight: 360, gridColumn: "span 2" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                8. Event Participation Trends
              </h3>
              <p style={{ fontSize: 12.5, color: "#94a3b8", margin: "2px 0 0" }}>
                Historical monthly registration volume vs. verified check-ins
              </p>
            </div>
            <span style={{ fontSize: 12, color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", padding: "3px 10px", borderRadius: 12 }}>
              Historical Mixed Chart
            </span>
          </div>
          <div style={{ height: 270 }}>
            <Bar
              data={participationTimelineData}
              options={{
                ...defaultChartOptions,
                scales: {
                  x: { ticks: { color: chartTextColor }, grid: { color: chartGridColor } },
                  y: { ticks: { color: chartTextColor, precision: 0 }, grid: { color: chartGridColor }, beginAtZero: true },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Row 5: Event Drill-Down & Comprehensive Comparison Table */}
      <div style={{ ...glassPanelStyle, marginBottom: 30 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#ffffff", margin: 0 }}>
              Campus Events Performance & Drill-Down Intelligence
            </h3>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "3px 0 0" }}>
              Live registration statistics, attendance percentages, and capacity utilization per event
            </p>
          </div>
          <span style={{ fontSize: 12, color: "#a5b4fc" }}>
            {allEventsComparison.length} {allEventsComparison.length === 1 ? "Event" : "Events"} Tracked
          </span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event Title</th>
                <th>Category</th>
                <th>Event Date</th>
                <th>Capacity</th>
                <th>Registrations</th>
                <th>Attendance</th>
                <th>Turnout Rate</th>
                <th>Occupancy</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allEventsComparison.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                    No events match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                allEventsComparison.map((ev) => (
                  <tr key={ev.event_id}>
                    <td>
                      <span style={{ fontWeight: 600, color: "#ffffff" }}>{ev.title}</span>
                    </td>
                    <td>
                      <span className="badge badge-info">{ev.category || "General"}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12.5, color: "#94a3b8" }}>{ev.date}</span>
                    </td>
                    <td>
                      <span style={{ color: "#cbd5e1" }}>{ev.capacity}</span>
                    </td>
                    <td>
                      <strong style={{ color: "#38bdf8" }}>{ev.registrations}</strong>
                    </td>
                    <td>
                      <strong style={{ color: "#10b981" }}>{ev.attended}</strong>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            width: 60,
                            height: 6,
                            borderRadius: 3,
                            background: "rgba(255, 255, 255, 0.1)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, ev.attendance_rate || 0)}%`,
                              height: "100%",
                              background: ev.attendance_rate > 70 ? "#10b981" : ev.attendance_rate > 40 ? "#3b82f6" : "#f59e0b",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>
                          {ev.attendance_rate ?? 0}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>{ev.occupancy_rate ?? 0}%</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: "4px 8px", fontSize: 11.5 }}
                          onClick={() => setSelectedEventReport(ev)}
                          title="View Official Report"
                        >
                          <FiFileText size={12} /> Report
                        </button>
                        <Link
                          to={`/admin/registrations?eventId=${ev.event_id}`}
                          className="btn btn-outline btn-sm"
                          style={{ padding: "4px 8px", fontSize: 11.5, color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.4)" }}
                          title="Manage Event Registrations"
                        >
                          <FiUsers size={12} /> Roster
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dedicated Event Review Report Modal */}
      {selectedEventReport && (
        <EventReportModal
          isOpen={!!selectedEventReport}
          eventId={selectedEventReport.event_id}
          eventTitle={selectedEventReport.title}
          onClose={() => setSelectedEventReport(null)}
        />
      )}
    </Container>
  );
}
