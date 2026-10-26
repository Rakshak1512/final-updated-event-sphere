import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  FiDownload,
  FiFileText,
  FiUsers,
  FiCalendar,
  FiCheckSquare,
  FiAward,
  FiCheckCircle,
  FiSliders,
  FiEye,
} from "react-icons/fi";
import { motion } from "framer-motion";
import PageTransition from "../../components/common/PageTransition.jsx";
import ReportConfigModal from "../../components/reports/ReportConfigModal.jsx";
import EventReportModal from "../../components/events/EventReportModal.jsx";
import {
  adminService,
  eventService,
  registrationService,
  resultService,
} from "../../api/services.js";
import { formatDate } from "../../utils/format.js";
import { generateCustomReportPDF } from "../../utils/pdfReportGenerator.js";

export default function AdminReports() {
  const [downloading, setDownloading] = useState({});
  const [activeConfigReport, setActiveConfigReport] = useState(null);
  const [eventsList, setEventsList] = useState([]);
  const [selectedEventReport, setSelectedEventReport] = useState(null);

  // Load events for event selector
  useEffect(() => {
    eventService
      .list({ page: 1, page_size: 500 })
      .then(({ data }) => setEventsList(data.items || []))
      .catch((err) => console.log("Failed to load events for reports filter:", err));
  }, []);

  // -------------------------------------------------------------
  // REPORT 1: FACULTY DIRECTORY
  // -------------------------------------------------------------
  const facultyColumns = [
    { key: "id", label: "Faculty ID" },
    { key: "name", label: "Full Name" },
    { key: "email", label: "Email Address" },
    { key: "phone", label: "Phone" },
    { key: "department", label: "Department" },
    { key: "active_tasks", label: "Active Tasks" },
    { key: "completed_tasks", label: "Completed Tasks" },
    { key: "events_count", label: "Events Organized" },
    { key: "joined_date", label: "Joined Date" },
  ];

  const fetchFacultyReportData = async (config) => {
    const { data } = await adminService.facultyList();
    let faculty = data || [];

    // Date filtering if configured
    if (config.startDate) {
      faculty = faculty.filter((f) => new Date(f.created_at) >= new Date(config.startDate));
    }
    if (config.endDate) {
      faculty = faculty.filter((f) => new Date(f.created_at) <= new Date(config.endDate + "T23:59:59"));
    }

    // Sorting
    faculty.sort((a, b) => {
      let valA = a[config.sortBy] || a.name || "";
      let valB = b[config.sortBy] || b.name || "";
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      return config.sortOrder === "desc"
        ? valA < valB ? 1 : -1
        : valA > valB ? 1 : -1;
    });

    const activeColDefs = facultyColumns.filter((c) => config.selectedColumns.includes(c.key));
    const headers = activeColDefs.map((c) => c.label);

    const rows = faculty.map((f) => {
      const rowMap = {
        id: f.registration_number || `FAC-${f.id}`,
        name: f.name,
        email: f.email,
        phone: f.phone || "N/A",
        department: f.department || "General",
        active_tasks: f.active_tasks_count || 0,
        completed_tasks: f.completed_tasks_count || 0,
        events_count: f.events_organized_count || 0,
        joined_date: formatDate(f.created_at),
      };
      return activeColDefs.map((c) => rowMap[c.key]);
    });

    const totalActiveTasks = faculty.reduce((acc, f) => acc + (f.active_tasks_count || 0), 0);
    const totalEvents = faculty.reduce((acc, f) => acc + (f.events_organized_count || 0), 0);

    return {
      headers,
      rows,
      summaryCards: [
        { label: "Total Faculty", value: faculty.length, color: [79, 70, 229] },
        { label: "Active Duties", value: totalActiveTasks, color: [245, 158, 11] },
        { label: "Events Organized", value: totalEvents, color: [16, 185, 129] },
      ],
      metadata: [
        { label: "Department Filter", value: "All Departments" },
        { label: "Active Roster", value: `${faculty.length} Members` },
      ],
    };
  };

  // -------------------------------------------------------------
  // REPORT 2: FACULTY ASSIGNMENTS
  // -------------------------------------------------------------
  const assignmentColumns = [
    { key: "id", label: "Task ID" },
    { key: "title", label: "Task Title" },
    { key: "faculty_name", label: "Assigned Faculty" },
    { key: "department", label: "Department" },
    { key: "priority", label: "Priority" },
    { key: "status", label: "Status" },
    { key: "deadline", label: "Deadline" },
    { key: "event_title", label: "Associated Event" },
    { key: "created_at", label: "Created Date" },
  ];

  const assignmentStatuses = [
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
  ];

  const fetchAssignmentsReportData = async (config) => {
    const { data } = await adminService.assignments();
    let tasks = data || [];

    // Filter status
    if (config.statusFilter && config.statusFilter !== "all") {
      tasks = tasks.filter((t) => (t.status || "").toLowerCase() === config.statusFilter.toLowerCase());
    }

    // Filter event
    if (config.selectedEventId && config.selectedEventId !== "all") {
      tasks = tasks.filter((t) => String(t.event_id) === String(config.selectedEventId));
    }

    // Date range
    if (config.startDate) {
      tasks = tasks.filter((t) => new Date(t.created_at) >= new Date(config.startDate));
    }
    if (config.endDate) {
      tasks = tasks.filter((t) => new Date(t.created_at) <= new Date(config.endDate + "T23:59:59"));
    }

    const activeColDefs = assignmentColumns.filter((c) => config.selectedColumns.includes(c.key));
    const headers = activeColDefs.map((c) => c.label);

    const rows = tasks.map((t) => {
      const rowMap = {
        id: `TASK-${t.id}`,
        title: t.title,
        faculty_name: t.faculty_name || "Faculty",
        department: t.faculty_department || "General",
        priority: t.priority?.toUpperCase() || "MEDIUM",
        status: t.status?.toUpperCase() || "PENDING",
        deadline: t.deadline || "None",
        event_title: t.event_title || "N/A",
        created_at: formatDate(t.created_at),
      };
      return activeColDefs.map((c) => rowMap[c.key]);
    });

    const completedCount = tasks.filter((t) => (t.status || "").toLowerCase() === "completed").length;
    const pendingCount = tasks.length - completedCount;

    return {
      headers,
      rows,
      summaryCards: [
        { label: "Total Tasks", value: tasks.length, color: [79, 70, 229] },
        { label: "Completed", value: completedCount, color: [16, 185, 129] },
        { label: "Pending", value: pendingCount, color: [245, 158, 11] },
      ],
      metadata: [
        { label: "Status Filter", value: config.statusFilter.toUpperCase() },
        { label: "Target Records", value: `${tasks.length} Duties` },
      ],
    };
  };

  // -------------------------------------------------------------
  // REPORT 3: MASTER EVENTS CATALOG
  // -------------------------------------------------------------
  const eventColumns = [
    { key: "id", label: "Event ID" },
    { key: "title", label: "Event Title" },
    { key: "category", label: "Category" },
    { key: "organizer", label: "Organizer" },
    { key: "event_date", label: "Date & Time" },
    { key: "venue", label: "Venue" },
    { key: "total_seats", label: "Capacity" },
    { key: "available_seats", label: "Available Seats" },
    { key: "fill_rate", label: "Fill Rate" },
  ];

  const fetchEventsReportData = async (config) => {
    const { data } = await eventService.list({ page: 1, page_size: 500 });
    let events = data.items || [];

    // Filter event
    if (config.selectedEventId && config.selectedEventId !== "all") {
      events = events.filter((e) => String(e.id) === String(config.selectedEventId));
    }

    // Date range
    if (config.startDate) {
      events = events.filter((e) => new Date(e.event_date) >= new Date(config.startDate));
    }
    if (config.endDate) {
      events = events.filter((e) => new Date(e.event_date) <= new Date(config.endDate));
    }

    const activeColDefs = eventColumns.filter((c) => config.selectedColumns.includes(c.key));
    const headers = activeColDefs.map((c) => c.label);

    const rows = events.map((e) => {
      const booked = Math.max(0, (e.total_seats || 0) - (e.available_seats || 0));
      const fillPct = e.total_seats > 0 ? Math.round((booked / e.total_seats) * 100) : 0;
      const rowMap = {
        id: `EVT-${e.id}`,
        title: e.title,
        category: e.category || "General",
        organizer: e.organizer_name || "Faculty Coordinator",
        event_date: `${e.event_date} ${e.event_time ? `(${e.event_time})` : ""}`,
        venue: e.venue || "Campus Venue",
        total_seats: e.total_seats || 0,
        available_seats: e.available_seats || 0,
        fill_rate: `${fillPct}% (${booked} Booked)`,
      };
      return activeColDefs.map((c) => rowMap[c.key]);
    });

    const totalCap = events.reduce((acc, e) => acc + (e.total_seats || 0), 0);
    const totalAvail = events.reduce((acc, e) => acc + (e.available_seats || 0), 0);

    return {
      headers,
      rows,
      summaryCards: [
        { label: "Total Events", value: events.length, color: [79, 70, 229] },
        { label: "Campus Capacity", value: totalCap, color: [14, 165, 233] },
        { label: "Total Booked", value: totalCap - totalAvail, color: [16, 185, 129] },
      ],
      metadata: [
        { label: "Scope", value: "Campus Event Portfolio" },
        { label: "Event Count", value: `${events.length} Events` },
      ],
    };
  };

  // -------------------------------------------------------------
  // REPORT 4: ALL REGISTRATIONS MASTER REPORT
  // -------------------------------------------------------------
  const registrationColumns = [
    { key: "student_name", label: "Student Name" },
    { key: "reg_no", label: "Registration No" },
    { key: "email", label: "Email" },
    { key: "department", label: "Department" },
    { key: "event_title", label: "Event Title" },
    { key: "ticket_code", label: "Ticket Code" },
    { key: "status", label: "Status" },
    { key: "attendance", label: "Attendance" },
    { key: "registered_at", label: "Registration Date" },
  ];

  const registrationStatuses = [
    { value: "approved", label: "Approved" },
    { value: "pending", label: "Pending" },
    { value: "attended", label: "Attended / Present" },
    { value: "rejected", label: "Rejected" },
  ];

  const fetchRegistrationsReportData = async (config) => {
    let events = eventsList;
    if (!events.length) {
      const { data: evData } = await eventService.list({ page: 1, page_size: 500 });
      events = evData.items || [];
    }

    if (config.selectedEventId && config.selectedEventId !== "all") {
      events = events.filter((e) => String(e.id) === String(config.selectedEventId));
    }

    let allRegs = [];
    for (const ev of events) {
      try {
        const { data: regs } = await registrationService.forEvent(ev.id);
        (regs || []).forEach((r) => {
          allRegs.push({ ...r, eventTitle: ev.title, eventCategory: ev.category });
        });
      } catch (e) {}
    }

    // Status filter
    if (config.statusFilter && config.statusFilter !== "all") {
      if (config.statusFilter === "attended") {
        allRegs = allRegs.filter((r) => r.status === "attended" || Boolean(r.checked_in_at));
      } else {
        allRegs = allRegs.filter((r) => (r.status || "").toLowerCase() === config.statusFilter.toLowerCase());
      }
    }

    // Date range
    if (config.startDate) {
      allRegs = allRegs.filter((r) => new Date(r.registered_at) >= new Date(config.startDate));
    }
    if (config.endDate) {
      allRegs = allRegs.filter((r) => new Date(r.registered_at) <= new Date(config.endDate + "T23:59:59"));
    }

    const activeColDefs = registrationColumns.filter((c) => config.selectedColumns.includes(c.key));
    const headers = activeColDefs.map((c) => c.label);

    const rows = allRegs.map((r) => {
      const isAttended = r.status === "attended" || r.status === "completed" || Boolean(r.checked_in_at);
      const rowMap = {
        student_name: r.student?.name || `Student #${r.student_id}`,
        reg_no: r.student?.registration_number || "N/A",
        email: r.student?.email || "N/A",
        department: r.student?.department || "N/A",
        event_title: r.eventTitle || "Campus Event",
        ticket_code: r.ticket_code || "N/A",
        status: (r.status || "approved").toUpperCase(),
        attendance: isAttended ? "PRESENT" : "PENDING",
        registered_at: formatDate(r.registered_at),
      };
      return activeColDefs.map((c) => rowMap[c.key]);
    });

    const attendedCount = allRegs.filter((r) => r.status === "attended" || Boolean(r.checked_in_at)).length;

    return {
      headers,
      rows,
      summaryCards: [
        { label: "Total Registrations", value: allRegs.length, color: [79, 70, 229] },
        { label: "Confirmed Present", value: attendedCount, color: [16, 185, 129] },
        { label: "Pending Attendance", value: Math.max(0, allRegs.length - attendedCount), color: [245, 158, 11] },
      ],
      metadata: [
        { label: "Target Scope", value: config.selectedEventId === "all" ? "All Events" : "Filtered Event" },
        { label: "Records", value: `${allRegs.length} Registrations` },
      ],
    };
  };

  // -------------------------------------------------------------
  // REPORT 5: ALL ATTENDANCE LOGS REPORT
  // -------------------------------------------------------------
  const attendanceColumns = [
    { key: "student_name", label: "Student Name" },
    { key: "reg_no", label: "Registration No" },
    { key: "department", label: "Department" },
    { key: "event_title", label: "Event Title" },
    { key: "ticket_code", label: "Ticket Code" },
    { key: "checked_in_at", label: "Check-in Timestamp" },
    { key: "verified_by", label: "Verified By" },
    { key: "status", label: "Attendance Status" },
  ];

  const fetchAttendanceReportData = async (config) => {
    let events = eventsList;
    if (!events.length) {
      const { data: evData } = await eventService.list({ page: 1, page_size: 500 });
      events = evData.items || [];
    }

    if (config.selectedEventId && config.selectedEventId !== "all") {
      events = events.filter((e) => String(e.id) === String(config.selectedEventId));
    }

    let allAttended = [];
    for (const ev of events) {
      try {
        const { data: regs } = await registrationService.forEvent(ev.id);
        const attended = (regs || []).filter(
          (r) => r.status === "attended" || r.status === "completed" || Boolean(r.checked_in_at)
        );
        attended.forEach((r) => {
          allAttended.push({ ...r, eventTitle: ev.title });
        });
      } catch (e) {}
    }

    // Date range
    if (config.startDate) {
      allAttended = allAttended.filter(
        (r) => r.checked_in_at && new Date(r.checked_in_at) >= new Date(config.startDate)
      );
    }
    if (config.endDate) {
      allAttended = allAttended.filter(
        (r) => r.checked_in_at && new Date(r.checked_in_at) <= new Date(config.endDate + "T23:59:59")
      );
    }

    const activeColDefs = attendanceColumns.filter((c) => config.selectedColumns.includes(c.key));
    const headers = activeColDefs.map((c) => c.label);

    const rows = allAttended.map((r) => {
      const rowMap = {
        student_name: r.student?.name || `Student #${r.student_id}`,
        reg_no: r.student?.registration_number || "N/A",
        department: r.student?.department || "General",
        event_title: r.eventTitle || "Campus Event",
        ticket_code: r.ticket_code || "N/A",
        checked_in_at: r.checked_in_at ? formatDate(r.checked_in_at) : "Confirmed",
        verified_by: r.checked_in_by || "Volunteer Desk",
        status: "PRESENT",
      };
      return activeColDefs.map((c) => rowMap[c.key]);
    });

    return {
      headers,
      rows,
      summaryCards: [
        { label: "Verified Attendees", value: allAttended.length, color: [16, 185, 129] },
        { label: "Attendance Status", value: "Confirmed Present", color: [79, 70, 229] },
      ],
      metadata: [
        { label: "Verification Source", value: "QR Check-in & Volunteer Desk" },
        { label: "Total Checked In", value: `${allAttended.length} Students` },
      ],
    };
  };

  // -------------------------------------------------------------
  // REPORT 6: ALL EVENT RESULTS & WINNERS
  // -------------------------------------------------------------
  const resultsColumns = [
    { key: "event_title", label: "Event Title" },
    { key: "position", label: "Award Position" },
    { key: "student_name", label: "Student Name" },
    { key: "reg_no", label: "Registration No" },
    { key: "department", label: "Department" },
    { key: "score", label: "Remarks / Score" },
    { key: "certificate", label: "Certificate Issued" },
    { key: "declared_by", label: "Declared By" },
    { key: "declared_at", label: "Declared Date" },
  ];

  const fetchResultsReportData = async (config) => {
    let events = eventsList;
    if (!events.length) {
      const { data: evData } = await eventService.list({ page: 1, page_size: 500 });
      events = evData.items || [];
    }

    if (config.selectedEventId && config.selectedEventId !== "all") {
      events = events.filter((e) => String(e.id) === String(config.selectedEventId));
    }

    let allResults = [];
    for (const ev of events) {
      try {
        const { data: resList } = await resultService.forEvent(ev.id);
        (resList || []).forEach((res) => {
          allResults.push({ ...res, eventTitle: ev.title });
        });
      } catch (e) {}
    }

    const activeColDefs = resultsColumns.filter((c) => config.selectedColumns.includes(c.key));
    const headers = activeColDefs.map((c) => c.label);

    const rows = allResults.map((res) => {
      const rowMap = {
        event_title: res.eventTitle || "Campus Event",
        position: res.position || "Winner",
        student_name: res.student_name || "Student",
        reg_no: res.registration_number || "N/A",
        department: res.student_department || "General",
        score: res.score_or_remarks || "—",
        certificate: res.certificate_id ? `Issued (ESP-${res.certificate_id})` : "Pending",
        declared_by: res.declared_by_name || "Faculty Coordinator",
        declared_at: formatDate(res.created_at),
      };
      return activeColDefs.map((c) => rowMap[c.key]);
    });

    const certIssuedCount = allResults.filter((r) => Boolean(r.certificate_id)).length;

    return {
      headers,
      rows,
      summaryCards: [
        { label: "Declared Winners", value: allResults.length, color: [245, 158, 11] },
        { label: "Certificates Generated", value: certIssuedCount, color: [16, 185, 129] },
      ],
      metadata: [
        { label: "Standings Roster", value: "Official Results Ledger" },
        { label: "Total Awardees", value: `${allResults.length} Positions` },
      ],
    };
  };

  // Quick Direct PDF Download Helper
  const handleQuickDownload = async (reportKey, fetchFn, defaultTitle, defaultSubtitle) => {
    setDownloading((prev) => ({ ...prev, [reportKey]: true }));
    try {
      const data = await fetchFn({
        selectedColumns: (reportCards.find((r) => r.key === reportKey)?.availableColumns || []).map((c) => c.key),
        selectedEventId: "all",
        statusFilter: "all",
        sortBy: "",
        sortOrder: "asc",
        includeSummary: true,
        orientation: "landscape",
      });

      generateCustomReportPDF({
        title: defaultTitle,
        subtitle: defaultSubtitle,
        headers: data.headers || [],
        rows: data.rows || [],
        orientation: "landscape",
        includeSummary: true,
        summaryCards: data.summaryCards || [],
        metadata: data.metadata || [],
      });

      toast.success(`${defaultTitle} downloaded as PDF!`);
    } catch (err) {
      console.error("Quick export error:", err);
      toast.error("Failed to generate report PDF.");
    } finally {
      setDownloading((prev) => ({ ...prev, [reportKey]: false }));
    }
  };


  const reportCards = [
    {
      key: "faculty",
      title: "Faculty Directory & Allocation Report",
      desc: "Complete faculty roster, departments, assigned administrative duties, and contact directory.",
      icon: FiUsers,
      color: "#8b5cf6",
      defaultTitle: "EventSphere Faculty Directory Report",
      defaultSubtitle: "Official Faculty Duties & Roster Ledger",
      availableColumns: facultyColumns,
      fetchDataFn: fetchFacultyReportData,
    },
    {
      key: "assignments",
      title: "Faculty Work Assignments Report",
      desc: "All administrative task allocations, priority ratings, status updates, and deadline milestones.",
      icon: FiCheckSquare,
      color: "#f59e0b",
      defaultTitle: "EventSphere Faculty Work Assignments Report",
      defaultSubtitle: "Administrative Duty Allocations & Milestones",
      availableColumns: assignmentColumns,
      availableStatuses: assignmentStatuses,
      fetchDataFn: fetchAssignmentsReportData,
    },
    {
      key: "events",
      title: "Master Events Catalog",
      desc: "All events, capacities, date & venues, organizers, and registration fill rates.",
      icon: FiCalendar,
      color: "#0ea5e9",
      defaultTitle: "EventSphere Master Events Catalog",
      defaultSubtitle: "Campus Events Schedule, Venues & Capacities",
      availableColumns: eventColumns,
      fetchDataFn: fetchEventsReportData,
    },
    {
      key: "registrations",
      title: "Student Registrations Master Report",
      desc: "Comprehensive database of student event registrations, team formations, and ticket codes.",
      icon: FiFileText,
      color: "#d946ef",
      defaultTitle: "EventSphere Student Registrations Report",
      defaultSubtitle: "Complete Student Registrations & Ticket Codes",
      availableColumns: registrationColumns,
      availableStatuses: registrationStatuses,
      fetchDataFn: fetchRegistrationsReportData,
    },
    {
      key: "attendance",
      title: "Campus Attendance Logs Report",
      desc: "Verified attendee check-in logs, check-in timestamps, and volunteer verifier records.",
      icon: FiCheckCircle,
      color: "#22c55e",
      defaultTitle: "EventSphere Verified Attendance Report",
      defaultSubtitle: "Official Attendee Check-In Log & Timestamps",
      availableColumns: attendanceColumns,
      fetchDataFn: fetchAttendanceReportData,
    },
    {
      key: "results",
      title: "Event Results & Winners Summary",
      desc: "Institutional standings, awarded winner positions, certificate links, and faculty remarks.",
      icon: FiAward,
      color: "#ec4899",
      defaultTitle: "EventSphere Event Standings & Winners Report",
      defaultSubtitle: "Official Campus Award Standings & Certificates",
      availableColumns: resultsColumns,
      fetchDataFn: fetchResultsReportData,
    },
  ];

  return (
    <PageTransition>
      <div className="section-head" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Institutional Reports & PDF Center</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Generate, customize, and download official PDF reports with selectable text for accreditation and audit trails.
          </p>
        </div>
      </div>

      {/* EVENT-SPECIFIC EXECUTIVE REPORT SELECTOR (REQUIREMENT 4) */}
      <div
        className="glass-card"
        style={{
          padding: "20px 24px",
          marginBottom: 28,
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)",
          border: "1px solid rgba(139, 92, 246, 0.3)",
          boxShadow: "0 10px 30px rgba(139, 92, 246, 0.1)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, #6366f1, #a855f7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 6px 16px rgba(99, 102, 241, 0.3)",
              }}
            >
              <FiFileText size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                Individual Event Executive Report & PDF
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
                Generate official ReportLab PDF reports containing event summaries, KPI analytics, and complete attendee rosters.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", width: "100%", maxWidth: 520 }}>
            <select
              className="form-input"
              style={{ flex: 1, minWidth: 240, borderRadius: 10, padding: "9px 14px", background: "rgba(15, 23, 42, 0.8)" }}
              value={selectedEventReport?.id || ""}
              onChange={(e) => {
                const ev = eventsList.find((item) => String(item.id) === e.target.value);
                setSelectedEventReport(ev || null);
              }}
            >
              <option value="">-- Select an Event to Inspect or Download PDF --</option>
              {eventsList.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({ev.category} · {formatDate(ev.event_date)})
                </option>
              ))}
            </select>

            <button
              className="btn btn-primary btn-sm"
              disabled={!selectedEventReport}
              onClick={() => {
                // Keep selectedEventReport active to open modal
              }}
              style={{ padding: "9px 18px", borderRadius: 10, display: "flex", alignItems: "center", gap: 6 }}
            >
              <FiEye size={15} /> View & Download PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid-cards">
        {reportCards.map((rc, i) => (
          <motion.div
            key={rc.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card float-card"
            style={{
              padding: "24px",
              borderRadius: "22px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: `rgba(${rc.color === "#8b5cf6" ? "139, 92, 246" : rc.color === "#f59e0b" ? "245, 158, 11" : rc.color === "#0ea5e9" ? "14, 165, 233" : rc.color === "#22c55e" ? "34, 197, 94" : rc.color === "#ec4899" ? "236, 72, 153" : "217, 70, 239"}, 0.15)`,
                  color: rc.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <rc.icon size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 2px" }}>{rc.title}</h3>
                <span className="badge badge-info" style={{ fontSize: 11 }}>
                  Official PDF Report
                </span>
              </div>
            </div>

            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 20, flex: 1 }}>
              {rc.desc}
            </p>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {/* Primary Action: Configure & Preview */}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{
                  flex: "1 1 auto",
                  justifyContent: "center",
                  gap: 6,
                  fontWeight: 700,
                  borderRadius: 10,
                }}
                onClick={() => setActiveConfigReport(rc)}
              >
                <FiSliders size={14} /> Configure & Preview
              </button>

              {/* Quick Direct PDF Download */}
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{
                  padding: "0 12px",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontWeight: 600,
                  fontSize: 12,
                }}
                title="Quick Download Standard Official PDF Document"
                disabled={downloading[rc.key]}
                onClick={() => handleQuickDownload(rc.key, rc.fetchDataFn, rc.defaultTitle, rc.defaultSubtitle)}
              >
                <FiFileText size={13} /> {downloading[rc.key] ? "Generating..." : "Quick PDF"}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Interactive Report Config & Preview Modal */}
      {activeConfigReport && (
        <ReportConfigModal
          open={Boolean(activeConfigReport)}
          onClose={() => setActiveConfigReport(null)}
          reportKey={activeConfigReport.key}
          defaultTitle={activeConfigReport.defaultTitle}
          defaultSubtitle={activeConfigReport.defaultSubtitle}
          availableEvents={eventsList}
          availableColumns={activeConfigReport.availableColumns || []}
          availableStatuses={activeConfigReport.availableStatuses || []}
          defaultOrientation="landscape"
          fetchDataFn={activeConfigReport.fetchDataFn}
        />
      )}

      {/* Official Event Executive Report & PDF Modal */}
      <EventReportModal
        isOpen={Boolean(selectedEventReport)}
        eventId={selectedEventReport?.id}
        eventTitle={selectedEventReport?.title}
        onClose={() => setSelectedEventReport(null)}
      />
    </PageTransition>
  );
}
