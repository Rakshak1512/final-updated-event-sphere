import { useCallback, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiRefreshCw,
  FiUsers,
  FiDownload,
  FiCheckCircle,
  FiClock,
  FiCalendar,
  FiMapPin,
  FiArrowLeft,
  FiSearch,
  FiX,
  FiAlertCircle,
  FiEye,
  FiFileText,
} from "react-icons/fi";
import { motion } from "framer-motion";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { SkeletonGrid, SkeletonRow } from "../../components/ui/Loader.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import { eventService, registrationService } from "../../api/services.js";
import { useRealtime } from "../../context/RealtimeContext.jsx";
import { formatDate } from "../../utils/format.js";
import {
  generateRegistrationReportPDF,
  generateAttendanceReportPDF,
} from "../../utils/pdfReportGenerator.js";

export default function ManageRegistrations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(null);

  // Selected event ID (from URL query param or state)
  const [selectedEventId, setSelectedEventId] = useState(
    searchParams.get("eventId") || (location.state?.eventId ? String(location.state.eventId) : "")
  );

  const [eventSearch, setEventSearch] = useState("");

  // Event report state
  const [regs, setRegs] = useState([]);
  const [capacity, setCapacity] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("registered"); // "registered" | "attended"
  const [studentSearch, setStudentSearch] = useState("");

  const { subscribeToEvent, addListener } = useRealtime();

  // Load All Events Catalog with graceful error handling
  const loadEventsCatalog = useCallback(async (showToast = false) => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const { data } = await eventService.list({
        page: 1,
        page_size: 100,
        sort_by: "created_at",
        sort_order: "desc",
      });
      const items = data.items || [];
      setEvents(items);
      if (showToast) toast.success(`Loaded ${items.length} events`);
    } catch (err) {
      console.error("Events catalog load error:", err);
      const detail = err.response?.data?.detail || "Unable to load events. Please retry.";
      setEventsError(detail);
      if (showToast) toast.error(detail);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEventsCatalog(false);
  }, [loadEventsCatalog]);

  // Periodic Auto-Sync for Events Catalog (every 4 seconds when on Level 1)
  useEffect(() => {
    if (selectedEventId) return;
    const interval = setInterval(() => {
      if (!document.hidden) {
        eventService
          .list({ page: 1, page_size: 100, sort_by: "created_at", sort_order: "desc" })
          .then(({ data }) => setEvents(data.items || []))
          .catch(() => {});
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedEventId]);

  // Keep selectedEventId in sync when user navigates with browser Back/Forward buttons
  useEffect(() => {
    const qId = searchParams.get("eventId") || "";
    if (qId !== selectedEventId) {
      setSelectedEventId(qId);
    }
  }, [searchParams]);

  // Sync selectedEventId into URL search params without breaking back stack
  useEffect(() => {
    const currentQ = searchParams.get("eventId") || "";
    if (selectedEventId && currentQ !== selectedEventId) {
      setSearchParams({ eventId: selectedEventId });
    } else if (!selectedEventId && currentQ) {
      setSearchParams({});
    }
  }, [selectedEventId, setSearchParams, searchParams]);

  // Load Registrations for Selected Event
  const loadEventRegistrations = useCallback(
    async (showLoading = true) => {
      if (!selectedEventId) return;
      if (showLoading) setReportLoading(true);
      try {
        const [regsRes, capRes, evRes] = await Promise.allSettled([
          registrationService.forEvent(selectedEventId),
          registrationService.getCapacity(selectedEventId),
          eventService.get(selectedEventId),
        ]);

        if (regsRes.status === "fulfilled") {
          setRegs(regsRes.value.data || []);
        }
        if (capRes.status === "fulfilled") {
          setCapacity(capRes.value.data);
        }
        if (evRes.status === "fulfilled" && evRes.value.data) {
          const freshEv = evRes.value.data;
          setEvents((prev) =>
            prev.map((e) => (String(e.id) === String(selectedEventId) ? { ...e, ...freshEv } : e))
          );
        }
      } catch (err) {
        console.error("Registration report load error:", err);
        if (showLoading) {
          toast.error(err.response?.data?.detail || "Could not load registrations for this event");
        }
      } finally {
        if (showLoading) setReportLoading(false);
      }
    },
    [selectedEventId]
  );

  useEffect(() => {
    if (selectedEventId) {
      loadEventRegistrations(true);
      subscribeToEvent(selectedEventId);
    }
  }, [selectedEventId, loadEventRegistrations, subscribeToEvent]);

  // Real-time WebSocket synchronization for attendance check-ins and registrations
  useEffect(() => {
    if (!selectedEventId) return;

    const removeListener = addListener((msg) => {
      if (!msg.event_id || String(msg.event_id) === String(selectedEventId)) {
        if (
          msg.type === "REGISTRATION_CREATED" ||
          msg.type === "REGISTRATION_STATUS_CHANGED" ||
          msg.type === "ATTENDANCE_CHECKED_IN" ||
          msg.type === "REGISTRATION_CANCELLED" ||
          msg.type === "SEAT_ASSIGNED" ||
          msg.type === "SEAT_REASSIGNED"
        ) {
          loadEventRegistrations(false);
        }
      }
    });

    return () => removeListener();
  }, [selectedEventId, addListener, loadEventRegistrations]);

  const selectedEvent = events.find((e) => String(e.id) === String(selectedEventId));

  // Registered students roster in Registration Reports — ONLY APPROVED REGISTRATIONS!
  // Cancelled and pending registrations are strictly excluded from Registration Reports.
  const allApproved = regs.filter(
    (r) =>
      r.status === "approved" ||
      r.status === "attended" ||
      r.status === "completed" ||
      Boolean(r.checked_in_at)
  );

  const registeredStudents = allApproved.filter((r) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.trim().toLowerCase();
    const name = (r.student?.name || r.student_name || "").toLowerCase();
    const regNo = (r.student?.registration_number || r.registration_number || "").toLowerCase();
    const email = (r.student?.email || r.email || "").toLowerCase();
    const dept = (r.student?.department || r.department || "").toLowerCase();
    const sem = String(r.student?.semester || r.semester || "").toLowerCase();
    const cls = (r.student?.class_name || r.class_name || "").toLowerCase();
    const ticket = (r.ticket_code || "").toLowerCase();

    return (
      name.includes(q) ||
      regNo.includes(q) ||
      email.includes(q) ||
      dept.includes(q) ||
      sem.includes(q) ||
      cls.includes(q) ||
      ticket.includes(q)
    );
  });

  // Attended students roster — ONLY APPROVED students with confirmed QR check-in
  const allAttended = regs.filter(
    (r) =>
      (r.status === "attended" || r.status === "completed" || Boolean(r.checked_in_at)) &&
      r.status !== "cancelled"
  );

  const attendedStudents = allAttended.filter((r) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.trim().toLowerCase();
    const name = (r.student?.name || r.student_name || "").toLowerCase();
    const regNo = (r.student?.registration_number || r.registration_number || "").toLowerCase();
    const email = (r.student?.email || r.email || "").toLowerCase();
    const dept = (r.student?.department || r.department || "").toLowerCase();
    const sem = String(r.student?.semester || r.semester || "").toLowerCase();
    const cls = (r.student?.class_name || r.class_name || "").toLowerCase();
    const ticket = (r.ticket_code || "").toLowerCase();

    return (
      name.includes(q) ||
      regNo.includes(q) ||
      email.includes(q) ||
      dept.includes(q) ||
      sem.includes(q) ||
      cls.includes(q) ||
      ticket.includes(q)
    );
  });

  const totalCapacity = capacity?.totalCapacity ?? selectedEvent?.total_seats ?? 0;
  const approvedCount = allApproved.length;
  const attendedCount = allAttended.length;
  const remainingSeats = Math.max(0, totalCapacity - approvedCount);

  // PDF Export handlers
  const handleDownloadRegisteredPDF = () => {
    if (!selectedEvent) return;
    try {
      generateRegistrationReportPDF({ event: selectedEvent, registrations: regs });
      toast.success("Registration Report PDF downloaded!");
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error("Could not generate Registration Report PDF.");
    }
  };

  const handleDownloadAttendedPDF = () => {
    if (!selectedEvent) return;
    try {
      generateAttendanceReportPDF({ event: selectedEvent, registrations: regs });
      toast.success("Attendance Report PDF downloaded!");
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error("Could not generate Attendance Report PDF.");
    }
  };

  // Filtered Events Catalog for Selection View
  const filteredEvents = events.filter((ev) => {
    if (!eventSearch.trim()) return true;
    const q = eventSearch.toLowerCase();
    return (
      ev.title?.toLowerCase().includes(q) ||
      ev.category?.toLowerCase().includes(q) ||
      ev.venue?.toLowerCase().includes(q) ||
      ev.description?.toLowerCase().includes(q)
    );
  });

  return (
    <PageTransition>
      {/* ========================================================================= */}
      {/* LEVEL 1: EVENT SELECTION CARDS VIEW (When no event selected)              */}
      {/* ========================================================================= */}
      {!selectedEventId ? (
        <div>
          <div className="section-head" style={{ marginBottom: 24 }}>
            <div>
              <h1 className="page-title">Registration Reports</h1>
              <p className="page-subtitle" style={{ marginBottom: 0 }}>
                View official approved registrations, real-time volunteer attendance scans, and download executive PDF reports.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                className="icon-btn"
                onClick={() => loadEventsCatalog(true)}
                disabled={eventsLoading}
                title="Refresh events list"
              >
                <FiRefreshCw className={eventsLoading ? "spin" : ""} size={16} />
              </button>
            </div>
          </div>

          {/* Search bar with clear button */}
          <div style={{ position: "relative", maxWidth: 420, marginBottom: 24 }}>
            <input
              className="form-input"
              style={{ padding: "10px 36px 10px 38px", fontSize: 13.5 }}
              placeholder="Search events by title, category, venue..."
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
            />
            <FiSearch
              size={15}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            {eventSearch && (
              <button
                type="button"
                onClick={() => setEventSearch("")}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: 2,
                }}
                title="Clear search"
              >
                <FiX size={15} />
              </button>
            )}
          </div>

          {/* Error State */}
          {eventsError && (
            <div
              className="glass-card"
              style={{
                padding: "24px",
                borderRadius: "18px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1.5px solid rgba(239, 68, 68, 0.3)",
                color: "#ef4444",
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <FiAlertCircle size={24} />
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 2px" }}>Unable to Load Events</h3>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>{eventsError}</p>
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => loadEventsCatalog(true)}>
                <FiRefreshCw size={13} /> Retry Loading
              </button>
            </div>
          )}

          {/* Events Grid */}
          {eventsLoading ? (
            <SkeletonGrid count={6} />
          ) : events.length === 0 ? (
            <EmptyState
              icon={<FiCalendar />}
              title="No events available"
              message="No campus events have been created yet. Once events are added, they will appear here for report tracking."
            />
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              icon={<FiSearch />}
              title="No matching events"
              message={`No events matched "${eventSearch}". Try clearing your search query.`}
              action={
                <button className="btn btn-outline btn-sm" onClick={() => setEventSearch("")}>
                  Clear Search
                </button>
              }
            />
          ) : (
            <div className="grid-cards">
              {filteredEvents.map((ev, i) => {
                const isPast = new Date(ev.event_date) < new Date();

                return (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass-card glass-card-interactive float-card"
                    style={{
                      padding: "24px",
                      borderRadius: "22px",
                      display: "flex",
                      flexDirection: "column",
                      cursor: "pointer",
                      border: "1.5px solid rgba(139, 92, 246, 0.25)",
                    }}
                    onClick={() => setSelectedEventId(String(ev.id))}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <span className="badge badge-info">{ev.category || "Campus Event"}</span>
                      <span className={isPast ? "badge" : "badge badge-success"} style={{ fontSize: 11.5 }}>
                        {isPast ? "Past Event" : "Active Event"}
                      </span>
                    </div>

                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px", color: "var(--text-primary)" }}>
                      {ev.title}
                    </h2>

                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                        marginBottom: 16,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        flex: 1,
                      }}
                    >
                      {ev.description || "Official approved registrations and attendance reports."}
                    </p>

                    <div style={{ fontSize: 12.5, color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <FiCalendar size={13} color="#8b5cf6" />
                        <span>{formatDate(ev.event_date)} {ev.event_time ? `at ${ev.event_time}` : ""}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <FiMapPin size={13} color="#0ea5e9" />
                        <span>{ev.venue || "Campus Venue"}</span>
                      </div>
                    </div>

                    {/* Capacity & Total Seats Pill */}
                    <div
                      style={{
                        background: "var(--bg-glass)",
                        padding: "10px 14px",
                        borderRadius: 12,
                        fontSize: 12.5,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        border: "1px solid var(--border-color)",
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block" }}>Total Capacity</span>
                        <strong style={{ color: "var(--text-primary)", fontSize: 15 }}>{ev.total_seats} Seats</strong>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block" }}>Available</span>
                        <strong style={{ color: "#8b5cf6", fontSize: 15 }}>{ev.available_seats} Left</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ width: "100%", justifyContent: "center", gap: 8 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEventId(String(ev.id));
                      }}
                    >
                      <FiEye size={14} /> View Registration Report
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* LEVEL 2: SPECIFIC EVENT REGISTRATION REPORT & LIVE ATTENDANCE ROSTER     */
        /* ========================================================================= */
        <div>
          {/* Top Back Navigation & Event Switcher */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setSelectedEventId("")}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <FiArrowLeft size={14} /> Back to All Events
            </button>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ fontSize: 13, color: "var(--text-muted)" }}>Switch Event:</label>
              <select
                className="form-select"
                style={{ minWidth: 240, maxWidth: 360, fontSize: 13 }}
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                {events.map((ev) => (
                  <option key={ev.id} value={String(ev.id)}>
                    {ev.title} ({ev.category || "Event"})
                  </option>
                ))}
              </select>
              <button
                className="icon-btn"
                onClick={() => loadEventRegistrations(true)}
                disabled={reportLoading}
                title="Refresh registrations"
              >
                <FiRefreshCw className={reportLoading ? "spin" : ""} size={16} />
              </button>
            </div>
          </div>

          {/* Selected Event Details Showcase Card */}
          {selectedEvent && (
            <div
              className="glass-card float-card"
              style={{
                padding: "24px 28px",
                marginBottom: 24,
                borderRadius: "22px",
                background: "var(--bg-elevated)",
                border: "1.5px solid rgba(139, 92, 246, 0.3)",
                boxShadow: "0 12px 36px rgba(0,0,0,0.18)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 18,
                }}
              >
                <div style={{ maxWidth: 640 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span className="badge badge-info">{selectedEvent.category || "Campus Event"}</span>
                    <span className="badge badge-primary">{selectedEvent.registration_type || "Standard"}</span>
                  </div>
                  <h1 style={{ fontSize: "clamp(20px, 3vw, 25px)", fontWeight: 700, margin: "4px 0 8px" }}>
                    {selectedEvent.title}
                  </h1>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13.5, margin: "0 0 10px", lineHeight: 1.5 }}>
                    {selectedEvent.description || "Official approved registrations and attendance roster."}
                  </p>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "var(--text-muted)" }}>
                    <span>📍 {selectedEvent.venue || "Campus Venue"}</span>
                    <span>📅 {formatDate(selectedEvent.event_date)} {selectedEvent.event_time ? `at ${selectedEvent.event_time}` : ""}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div
                    style={{
                      background: "var(--bg-glass)",
                      padding: "12px 20px",
                      borderRadius: 14,
                      border: "1px solid var(--border-color)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                      Approved Registered
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#8b5cf6" }}>{approvedCount}</div>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-glass)",
                      padding: "12px 20px",
                      borderRadius: 14,
                      border: "1px solid var(--border-color)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                      Attended
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--success)" }}>
                      {attendedCount}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-glass)",
                      padding: "12px 20px",
                      borderRadius: 14,
                      border: "1px solid var(--border-color)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                      Remaining Spots
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--warning)" }}>{remainingSeats}</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={handleDownloadRegisteredPDF}
                      title="Download Registration Report PDF"
                    >
                      <FiFileText size={13} /> Registration Report PDF
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleDownloadAttendedPDF}
                      title="Download Attendance Report PDF"
                    >
                      <FiDownload size={13} /> Attendance Report PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Switcher: Registered Students (Approved) vs Attended Students */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                background: "var(--bg-elevated)",
                padding: 4,
                borderRadius: 14,
                border: "1.5px solid rgba(139, 92, 246, 0.2)",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab("registered")}
                style={{
                  padding: "9px 22px",
                  borderRadius: 10,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  background: activeTab === "registered" ? "var(--gradient-primary)" : "transparent",
                  color: activeTab === "registered" ? "#fff" : "var(--text-secondary)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <FiUsers size={16} /> Registered Students ({allApproved.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("attended")}
                style={{
                  padding: "9px 22px",
                  borderRadius: 10,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  background: activeTab === "attended" ? "var(--gradient-primary)" : "transparent",
                  color: activeTab === "attended" ? "#fff" : "var(--text-secondary)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <FiCheckCircle size={16} /> Attended Students ({allAttended.length})
              </button>
            </div>

            {/* Search inside Report with clear button */}
            <div style={{ position: "relative", minWidth: 0, width: "100%", maxWidth: 360 }}>
              <input
                className="form-input"
                style={{ padding: "8px 34px 8px 34px", fontSize: 13 }}
                placeholder="Search approved students, reg no, branch..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
              <FiSearch
                size={14}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                }}
              />
              {studentSearch && (
                <button
                  type="button"
                  onClick={() => setStudentSearch("")}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 2,
                  }}
                  title="Clear search"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: REGISTERED STUDENTS TABLE (APPROVED ONLY)          */}
          {/* ========================================================= */}
          {activeTab === "registered" && (
            <div className="glass-card table-wrap" style={{ borderRadius: "20px" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Register Number</th>
                    <th>Email</th>
                    <th>Branch / Department</th>
                    <th>Class / Semester</th>
                    <th>Registration Date</th>
                    <th>Ticket Code</th>
                  </tr>
                </thead>
                <tbody>
                  {reportLoading ? (
                    <SkeletonRow />
                  ) : registeredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 0 }}>
                        <EmptyState
                          icon={<FiUsers />}
                          title="No approved registrations found"
                          message={
                            studentSearch
                              ? "No approved students match your current search."
                              : "No approved students for this event yet. Review student applications in the Registrations dashboard."
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    registeredStudents.map((r) => {
                      return (
                        <tr key={r.id}>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                {r.student?.name || `Student #${r.student_id}`}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#a5b4fc" }}>
                              {r.student?.registration_number || "—"}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                              {r.student?.email || "—"}
                            </span>
                          </td>
                          <td>{r.student?.department || "General"}</td>
                          <td>
                            <span style={{ fontSize: 12.5 }}>
                              {r.student?.semester ? `Semester ${r.student.semester}` : "—"}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12.5 }}>{formatDate(r.registered_at)}</span>
                          </td>
                          <td>
                            <code
                              style={{
                                background: "var(--bg-glass)",
                                padding: "3px 7px",
                                borderRadius: 6,
                                fontSize: 12,
                                color: "#a5b4fc",
                                border: "1px solid var(--border-color)",
                              }}
                            >
                              {r.ticket_code || "—"}
                            </code>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: ATTENDED STUDENTS TABLE (CONFIRMED PRESENT ONLY)   */}
          {/* ========================================================= */}
          {activeTab === "attended" && (
            <div className="glass-card table-wrap" style={{ borderRadius: "20px" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Register Number</th>
                    <th>Email</th>
                    <th>Branch / Department</th>
                    <th>Class / Semester</th>
                    <th>Registration Date</th>
                    <th>Attendance Date</th>
                    <th>Attendance Time</th>
                    <th>Ticket Code</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportLoading ? (
                    <SkeletonRow />
                  ) : attendedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: 0 }}>
                        <EmptyState
                          icon={<FiCheckCircle />}
                          title="No attended students yet"
                          message="When volunteers scan student QR codes at the venue, attendees will appear here automatically in real time."
                        />
                      </td>
                    </tr>
                  ) : (
                    attendedStudents.map((r) => {
                      let attDate = "Confirmed";
                      let attTime = "Verified";
                      if (r.checked_in_at) {
                        const d = new Date(r.checked_in_at);
                        if (!isNaN(d)) {
                          attDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                          attTime = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                        } else {
                          attDate = formatDate(r.checked_in_at);
                        }
                      }

                      return (
                        <tr key={r.id} style={{ background: "rgba(34, 197, 94, 0.03)" }}>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                {r.student?.name || `Student #${r.student_id}`}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#a5b4fc" }}>
                              {r.student?.registration_number || "—"}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                              {r.student?.email || "—"}
                            </span>
                          </td>
                          <td>{r.student?.department || "General"}</td>
                          <td>
                            <span style={{ fontSize: 12.5 }}>
                              {r.student?.semester ? `Semester ${r.student.semester}` : "—"}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12.5 }}>{formatDate(r.registered_at)}</span>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: 12.5,
                                color: "var(--success)",
                                fontWeight: 600,
                              }}
                            >
                              {attDate}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: 12.5,
                                color: "var(--success)",
                                fontWeight: 600,
                              }}
                            >
                              {attTime}
                            </span>
                          </td>
                          <td>
                            <code
                              style={{
                                background: "var(--bg-glass)",
                                padding: "3px 7px",
                                borderRadius: 6,
                                fontSize: 12,
                                color: "#a5b4fc",
                              }}
                            >
                              {r.ticket_code || "—"}
                            </code>
                          </td>
                          <td>
                            <span className="badge badge-success">
                              <FiCheckCircle size={11} /> Attended
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </PageTransition>
  );
}
