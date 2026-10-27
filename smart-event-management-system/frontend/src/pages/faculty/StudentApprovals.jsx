import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  FiUsers,
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiRefreshCw,
  FiEye,
  FiAlertCircle,
  FiMail,
  FiHash,
  FiBook,
  FiCalendar,
  FiPhone,
  FiFilter,
  FiDownload,
  FiFileText,
  FiTrash2,
} from "react-icons/fi";
import { motion } from "framer-motion";
import Modal from "../../components/ui/Modal.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { SkeletonGrid } from "../../components/ui/Loader.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import { facultyApprovalService } from "../../api/services.js";
import { formatDate } from "../../utils/format.js";

export default function StudentApprovals() {
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(null);
  const [data, setData] = useState({
    students: [],
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    total_count: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING"); // PENDING, APPROVED, REJECTED, ALL
  const [deptFilter, setDeptFilter] = useState("all");

  // Action Modals State
  const [detailModalStudent, setDetailModalStudent] = useState(null);
  const [approveConfirmStudent, setApproveConfirmStudent] = useState(null);
  const [rejectConfirmStudent, setRejectConfirmStudent] = useState(null);
  const [removeConfirmStudent, setRemoveConfirmStudent] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const loadStudentApprovals = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await facultyApprovalService.studentApprovals();
      setData(
        res.data || {
          students: [],
          pending_count: 0,
          approved_count: 0,
          rejected_count: 0,
          total_count: 0,
        }
      );
    } catch (err) {
      console.error("Failed to load student approvals roster:", err);
      if (showLoader) toast.error("Could not fetch student approval records.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudentApprovals(true);
    // Poll less often while visible; pause network work in background tabs.
    const interval = setInterval(() => {
      if (!document.hidden) loadStudentApprovals(false);
    }, 20000);
    const handleFocus = () => loadStudentApprovals(false);
    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadStudentApprovals]);

  // Handle Approve
  const handleApprove = async () => {
    if (!approveConfirmStudent) return;
    const student = approveConfirmStudent;
    setProcessingId(student.id);
    try {
      await facultyApprovalService.approveStudent(student.id);
      toast.success(`Account approved for ${student.name}! Notification email sent.`);
      setApproveConfirmStudent(null);
      await loadStudentApprovals(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to approve student account.");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Reject
  const handleReject = async () => {
    if (!rejectConfirmStudent) return;
    const student = rejectConfirmStudent;
    setProcessingId(student.id);
    try {
      await facultyApprovalService.rejectStudent(student.id, rejectionReason);
      toast.success(`Registration rejected for ${student.name}. Notification email sent.`);
      setRejectConfirmStudent(null);
      setRejectionReason("");
      await loadStudentApprovals(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reject student account.");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Remove Student
  const handleRemove = async () => {
    if (!removeConfirmStudent) return;
    const student = removeConfirmStudent;
    setProcessingId(student.id);
    try {
      await facultyApprovalService.removeStudent(student.id);
      toast.success(`Student account for ${student.name} removed successfully.`);
      setRemoveConfirmStudent(null);
      await loadStudentApprovals(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to remove student account.");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle PDF Reports Download
  const handleDownloadPdf = async (type) => {
    const titleCase = type.charAt(0).toUpperCase() + type.slice(1);
    try {
      setDownloadingPdf(type);
      toast.loading(`Generating ${titleCase} Students PDF report...`, { id: "pdf-toast" });
      await facultyApprovalService.downloadStudentPdf(type);
      toast.success(`${titleCase} Students PDF downloaded successfully!`, { id: "pdf-toast" });
    } catch (err) {
      console.error("PDF report download failed:", err);
      toast.error(`Failed to download ${titleCase} Students PDF report.`, { id: "pdf-toast" });
    } finally {
      setDownloadingPdf(null);
    }
  };

  // Filter students
  const filteredStudents = (data.students || []).filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (s.name || "").toLowerCase().includes(q);
    const emailMatch = (s.email || "").toLowerCase().includes(q);
    const regMatch = (s.registration_number || "").toLowerCase().includes(q);
    const courseMatch = (s.course || "").toLowerCase().includes(q);
    const deptMatchText = (s.department || "").toLowerCase().includes(q);
    const matchesSearch = !q || nameMatch || emailMatch || regMatch || courseMatch || deptMatchText;

    const matchesStatus =
      statusFilter === "ALL" || (s.approval_status || "PENDING").toUpperCase() === statusFilter;

    const matchesDept =
      deptFilter === "all" || (s.department || "").toLowerCase() === deptFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesDept;
  });

  // Extract unique departments for filter dropdown
  const departments = Array.from(
    new Set((data.students || []).map((s) => s.department).filter(Boolean))
  );

  return (
    <PageTransition>
      <div style={{ maxWidth: 1280, margin: "0 auto", paddingBottom: 40 }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))",
                  color: "#60a5fa",
                  border: "1px solid rgba(59,130,246,0.3)",
                }}
              >
                <FiUsers size={19} />
              </span>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
                Student Approval Management
              </h1>
            </div>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Review and authorize student account registrations. Approved students gain immediate access to EventSphere.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => loadStudentApprovals(true)}
              disabled={loading}
              className="btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 12,
                cursor: "pointer",
                fontSize: "0.88rem",
              }}
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} size={15} />
              Refresh Roster
            </button>
          </div>
        </div>

        {/* Counter Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {/* Pending Students */}
          <motion.div
            whileHover={{ y: -2 }}
            onClick={() => setStatusFilter("PENDING")}
            className="glass-card"
            style={{
              padding: "18px 20px",
              borderRadius: 16,
              cursor: "pointer",
              border:
                statusFilter === "PENDING"
                  ? "2px solid #f59e0b"
                  : "1px solid rgba(245, 158, 11, 0.25)",
              background:
                statusFilter === "PENDING"
                  ? "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.06))"
                  : "var(--bg-elevated)",
              boxShadow:
                data.pending_count > 0 ? "0 4px 20px rgba(245, 158, 11, 0.15)" : "none",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                Pending Students
              </span>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(245, 158, 11, 0.15)",
                  color: "#fbbf24",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FiClock size={16} />
              </span>
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#fbbf24", marginTop: 8 }}>
              {data.pending_count}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
              Awaiting faculty verification
            </div>
          </motion.div>

          {/* Approved Students */}
          <motion.div
            whileHover={{ y: -2 }}
            onClick={() => setStatusFilter("APPROVED")}
            className="glass-card"
            style={{
              padding: "18px 20px",
              borderRadius: 16,
              cursor: "pointer",
              border:
                statusFilter === "APPROVED"
                  ? "2px solid #10b981"
                  : "1px solid rgba(16, 185, 129, 0.25)",
              background:
                statusFilter === "APPROVED"
                  ? "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.06))"
                  : "var(--bg-elevated)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                Approved Students
              </span>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34d178",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FiCheckCircle size={16} />
              </span>
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#34d178", marginTop: 8 }}>
              {data.approved_count}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
              Active authorized accounts
            </div>
          </motion.div>

          {/* Rejected Students */}
          <motion.div
            whileHover={{ y: -2 }}
            onClick={() => setStatusFilter("REJECTED")}
            className="glass-card"
            style={{
              padding: "18px 20px",
              borderRadius: 16,
              cursor: "pointer",
              border:
                statusFilter === "REJECTED"
                  ? "2px solid #ef4444"
                  : "1px solid rgba(239, 68, 68, 0.25)",
              background:
                statusFilter === "REJECTED"
                  ? "linear-gradient(135deg, rgba(239,68,68,0.18), rgba(239,68,68,0.06))"
                  : "var(--bg-elevated)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                Rejected Students
              </span>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#f87171",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FiXCircle size={16} />
              </span>
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#f87171", marginTop: 8 }}>
              {data.rejected_count}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
              Blocked / denied registration
            </div>
          </motion.div>

          {/* Total Students */}
          <motion.div
            whileHover={{ y: -2 }}
            onClick={() => setStatusFilter("ALL")}
            className="glass-card"
            style={{
              padding: "18px 20px",
              borderRadius: 16,
              cursor: "pointer",
              border:
                statusFilter === "ALL"
                  ? "2px solid #8b5cf6"
                  : "1px solid rgba(139, 92, 246, 0.25)",
              background:
                statusFilter === "ALL"
                  ? "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(139,92,246,0.06))"
                  : "var(--bg-elevated)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                Total Students
              </span>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(139, 92, 246, 0.15)",
                  color: "#a78bfa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FiUsers size={16} />
              </span>
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 8 }}>
              {data.total_count}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
              All registered student records
            </div>
          </motion.div>
        </div>

        {/* PDF Reports Section */}
        <div
          className="glass-card"
          style={{
            padding: "16px 20px",
            borderRadius: 16,
            marginBottom: 24,
            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.05))",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(99, 102, 241, 0.2)",
                color: "#818cf8",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FiFileText size={20} />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                Official Student PDF Reports
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Generate printable, institutionally branded EventSphere PDF rosters generated directly by the backend.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              onClick={() => handleDownloadPdf("pending")}
              disabled={!!downloadingPdf}
              className="btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#fbbf24",
                borderColor: "rgba(245, 158, 11, 0.35)",
                background: "rgba(245, 158, 11, 0.08)",
                cursor: downloadingPdf ? "not-allowed" : "pointer",
              }}
            >
              <FiDownload size={14} className={downloadingPdf === "pending" ? "animate-spin" : ""} />
              Download Pending Students PDF
            </button>

            <button
              onClick={() => handleDownloadPdf("approved")}
              disabled={!!downloadingPdf}
              className="btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#34d178",
                borderColor: "rgba(16, 185, 129, 0.35)",
                background: "rgba(16, 185, 129, 0.08)",
                cursor: downloadingPdf ? "not-allowed" : "pointer",
              }}
            >
              <FiDownload size={14} className={downloadingPdf === "approved" ? "animate-spin" : ""} />
              Download Approved Students PDF
            </button>

            <button
              onClick={() => handleDownloadPdf("rejected")}
              disabled={!!downloadingPdf}
              className="btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#f87171",
                borderColor: "rgba(239, 68, 68, 0.35)",
                background: "rgba(239, 68, 68, 0.08)",
                cursor: downloadingPdf ? "not-allowed" : "pointer",
              }}
            >
              <FiDownload size={14} className={downloadingPdf === "rejected" ? "animate-spin" : ""} />
              Download Rejected Students PDF
            </button>

            <button
              onClick={() => handleDownloadPdf("all")}
              disabled={!!downloadingPdf}
              className="btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: "0.82rem",
                fontWeight: 600,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                cursor: downloadingPdf ? "not-allowed" : "pointer",
              }}
            >
              <FiDownload size={14} className={downloadingPdf === "all" ? "animate-spin" : ""} />
              Download All Students PDF
            </button>
          </div>
        </div>

        {/* Search, Status Tabs & Department Filter */}
        <div
          className="glass-card"
          style={{
            padding: "16px 20px",
            borderRadius: 16,
            marginBottom: 24,
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Search box */}
          <div
            style={{
              position: "relative",
              flex: "1 1 280px",
              minWidth: 240,
            }}
          >
            <FiSearch
              size={16}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search by name, UUCMS ID, email, course, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px 10px 40px",
                borderRadius: 12,
                border: "1px solid var(--border-color)",
                background: "var(--bg-base)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                outline: "none",
              }}
            />
          </div>

          {/* Department Filter */}
          {departments.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FiFilter size={15} style={{ color: "var(--text-muted)" }} />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                style={{
                  padding: "9px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-base)",
                  color: "var(--text-primary)",
                  fontSize: "0.88rem",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filter Tabs: Pending, Approved, Rejected, All Students */}
          <div
            style={{
              display: "inline-flex",
              background: "var(--bg-base)",
              padding: 4,
              borderRadius: 12,
              border: "1px solid var(--border-color)",
              gap: 4,
            }}
          >
            {[
              { id: "PENDING", label: `Pending (${data.pending_count})` },
              { id: "APPROVED", label: `Approved (${data.approved_count})` },
              { id: "REJECTED", label: `Rejected (${data.rejected_count})` },
              { id: "ALL", label: `All Students (${data.total_count})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background:
                    statusFilter === tab.id ? "var(--color-primary)" : "transparent",
                  color:
                    statusFilter === tab.id ? "#ffffff" : "var(--text-secondary)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Students Table */}
        {loading && data.students.length === 0 ? (
          <SkeletonGrid count={6} />
        ) : filteredStudents.length === 0 ? (
          <EmptyState
            icon={FiUsers}
            title={
              statusFilter === "PENDING"
                ? "No Pending Student Approvals"
                : "No Students Found"
            }
            description={
              statusFilter === "PENDING"
                ? "All registered student accounts have been reviewed and approved!"
                : "Try adjusting your search query or department filter."
            }
          />
        ) : (
          <div
            className="glass-card"
            style={{
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid var(--border-color)",
            }}
          >
            <div className="table-wrap">
              <table
                className="data-table"
                style={{
                  width: "100%",
                  minWidth: 640,
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: "0.9rem",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      borderBottom: "1px solid var(--border-color)",
                      color: "var(--text-secondary)",
                      fontSize: "0.78rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <th style={{ padding: "14px 18px" }}>Student Name</th>
                    <th style={{ padding: "14px 18px" }}>UUCMS ID</th>
                    <th style={{ padding: "14px 18px" }}>Email</th>
                    <th style={{ padding: "14px 18px" }}>Course</th>
                    <th style={{ padding: "14px 18px" }}>Department</th>
                    <th style={{ padding: "14px 18px" }}>Year / Semester</th>
                    <th style={{ padding: "14px 18px" }}>Registration Date</th>
                    <th style={{ padding: "14px 18px" }}>Approval Status</th>
                    <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => {
                    const status = (s.approval_status || "PENDING").toUpperCase();
                    const isPending = status === "PENDING";
                    const isApproved = status === "APPROVED";
                    const isRejected = status === "REJECTED";

                    const courseDisplay = s.course || (s.department ? `${s.department} UG` : "Undergraduate");
                    const semesterDisplay = s.semester
                      ? (s.semester <= 8 ? `Semester ${s.semester}` : `Sem ${s.semester}`)
                      : "Year 1";

                    return (
                      <tr
                        key={s.id}
                        style={{
                          borderBottom: "1px solid var(--border-color)",
                          transition: "background 0.2s ease",
                        }}
                      >
                        {/* Student Name */}
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                background: isApproved
                                  ? "linear-gradient(135deg, #10b981, #059669)"
                                  : isRejected
                                  ? "linear-gradient(135deg, #ef4444, #dc2626)"
                                  : "linear-gradient(135deg, #f59e0b, #d97706)",
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: "0.92rem",
                                flexShrink: 0,
                              }}
                            >
                              {(s.name || "S").charAt(0).toUpperCase()}
                            </div>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                              {s.name}
                            </div>
                          </div>
                        </td>

                        {/* UUCMS ID */}
                        <td style={{ padding: "14px 18px", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 600,
                              color: s.registration_number ? "#60a5fa" : "var(--text-muted)",
                              background: "rgba(59, 130, 246, 0.08)",
                              border: "1px solid rgba(59, 130, 246, 0.2)",
                              padding: "4px 8px",
                              borderRadius: 6,
                              fontSize: "0.85rem",
                            }}
                          >
                            {s.registration_number || "—"}
                          </span>
                        </td>

                        {/* Email */}
                        <td style={{ padding: "14px 18px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <FiMail size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                            <span>{s.email}</span>
                          </div>
                        </td>

                        {/* Course */}
                        <td style={{ padding: "14px 18px", color: "var(--text-primary)", fontWeight: 500, fontSize: "0.88rem" }}>
                          {courseDisplay}
                        </td>

                        {/* Department */}
                        <td style={{ padding: "14px 18px", color: "var(--text-secondary)", fontSize: "0.88rem" }}>
                          {s.department || "General"}
                        </td>

                        {/* Year/Semester */}
                        <td style={{ padding: "14px 18px", color: "var(--text-secondary)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                          {semesterDisplay}
                        </td>

                        {/* Registration Date */}
                        <td style={{ padding: "14px 18px", color: "var(--text-secondary)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                          {formatDate(s.created_at)}
                        </td>

                        {/* Current Approval Status */}
                        <td style={{ padding: "14px 18px", whiteSpace: "nowrap" }}>
                          {isPending && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 10px",
                                borderRadius: 12,
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                background: "rgba(245, 158, 11, 0.15)",
                                color: "#fbbf24",
                                border: "1px solid rgba(245, 158, 11, 0.3)",
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: "#f59e0b",
                                }}
                              />
                              PENDING
                            </span>
                          )}
                          {isApproved && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 10px",
                                borderRadius: 12,
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                background: "rgba(16, 185, 129, 0.15)",
                                color: "#34d178",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                              }}
                            >
                              <FiCheckCircle size={12} />
                              APPROVED
                            </span>
                          )}
                          {isRejected && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 10px",
                                borderRadius: 12,
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                background: "rgba(239, 68, 68, 0.15)",
                                color: "#f87171",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                              }}
                            >
                              <FiXCircle size={12} />
                              REJECTED
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "14px 18px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              justifyContent: "flex-end",
                            }}
                          >
                            {/* View details */}
                            <button
                              onClick={() => setDetailModalStudent(s)}
                              title="View Details"
                              style={{
                                padding: "6px 10px",
                                borderRadius: 8,
                                border: "1px solid var(--border-color)",
                                background: "rgba(255, 255, 255, 0.05)",
                                color: "var(--text-secondary)",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <FiEye size={13} />
                              Details
                            </button>

                            {/* Pending Actions */}
                            {isPending && (
                              <>
                                <button
                                  onClick={() => setApproveConfirmStudent(s)}
                                  disabled={processingId === s.id}
                                  title="Approve Student Account"
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: 8,
                                    border: "1px solid rgba(16, 185, 129, 0.4)",
                                    background: "rgba(16, 185, 129, 0.15)",
                                    color: "#34d178",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    fontSize: "0.82rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                  }}
                                >
                                  <FiCheckCircle size={14} />
                                  Approve
                                </button>

                                <button
                                  onClick={() => {
                                    setRejectConfirmStudent(s);
                                    setRejectionReason("");
                                  }}
                                  disabled={processingId === s.id}
                                  title="Reject Student Registration"
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: 8,
                                    border: "1px solid rgba(239, 68, 68, 0.4)",
                                    background: "rgba(239, 68, 68, 0.12)",
                                    color: "#f87171",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    fontSize: "0.82rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                  }}
                                >
                                  <FiXCircle size={14} />
                                  Reject
                                </button>
                              </>
                            )}

                            {/* Rejected -> Option to re-approve */}
                            {isRejected && (
                              <button
                                onClick={() => setApproveConfirmStudent(s)}
                                disabled={processingId === s.id}
                                title="Re-evaluate and approve"
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: 8,
                                  border: "1px solid rgba(16, 185, 129, 0.3)",
                                  background: "rgba(16, 185, 129, 0.1)",
                                  color: "#34d178",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                  fontSize: "0.8rem",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                }}
                              >
                                Re-approve
                              </button>
                            )}
                            {/* Remove button */}
                            <button
                              onClick={() => setRemoveConfirmStudent(s)}
                              disabled={processingId === s.id}
                              title="Remove Student Account"
                              style={{
                                padding: "6px 10px",
                                borderRadius: 8,
                                border: "1px solid rgba(239, 68, 68, 0.35)",
                                background: "rgba(239, 68, 68, 0.08)",
                                color: "#f87171",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <FiTrash2 size={13} />
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- MODAL: STUDENT DETAILS ----------------- */}
        <Modal
          open={!!detailModalStudent}
          onClose={() => setDetailModalStudent(null)}
          title="Student Registration Details"
          width={540}
        >
          {detailModalStudent && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px",
                  borderRadius: 14,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border-color)",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.3rem",
                    fontWeight: 700,
                  }}
                >
                  {(detailModalStudent.name || "S").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {detailModalStudent.name}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {detailModalStudent.email}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 10, border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>UUCMS ID</div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", fontFamily: "monospace" }}>
                    {detailModalStudent.registration_number || "Not specified"}
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 10, border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>Course</div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {detailModalStudent.course || `${detailModalStudent.department || "General"} UG`}
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 10, border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>Department</div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {detailModalStudent.department || "General"}
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 10, border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>Year / Semester</div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {detailModalStudent.semester ? `Semester ${detailModalStudent.semester}` : "Year 1"}
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 10, border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>Registration Date</div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {formatDate(detailModalStudent.created_at)}
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 10, border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>Current Approval Status</div>
                  <div
                    style={{
                      fontWeight: 700,
                      color:
                        detailModalStudent.approval_status === "APPROVED"
                          ? "#34d178"
                          : detailModalStudent.approval_status === "REJECTED"
                          ? "#f87171"
                          : "#fbbf24",
                    }}
                  >
                    {detailModalStudent.approval_status || "PENDING"}
                  </div>
                </div>
              </div>

              {detailModalStudent.rejection_reason && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#f87171",
                    fontSize: "0.88rem",
                    marginBottom: 20,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Rejection Reason:</div>
                  <div>{detailModalStudent.rejection_reason}</div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                {detailModalStudent.approval_status === "PENDING" && (
                  <>
                    <button
                      onClick={() => {
                        const s = detailModalStudent;
                        setDetailModalStudent(null);
                        setRejectConfirmStudent(s);
                      }}
                      className="btn-secondary"
                      style={{ color: "#f87171", borderColor: "rgba(239, 68, 68, 0.4)" }}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        const s = detailModalStudent;
                        setDetailModalStudent(null);
                        setApproveConfirmStudent(s);
                      }}
                      className="btn-primary"
                      style={{ background: "#10b981" }}
                    >
                      Approve Account
                    </button>
                  </>
                )}
                <button onClick={() => setDetailModalStudent(null)} className="btn-secondary">
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* ----------------- MODAL: APPROVE CONFIRMATION ----------------- */}
        <Modal
          open={!!approveConfirmStudent}
          onClose={() => setApproveConfirmStudent(null)}
          title="Confirm Student Approval"
          width={460}
        >
          {approveConfirmStudent && (
            <div>
              <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#34d178",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <FiCheckCircle size={32} />
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem", fontWeight: 700 }}>
                  Approve Student Account?
                </h3>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  Are you sure you want to approve the student account for:
                </p>
                <div
                  style={{
                    margin: "14px auto 0",
                    padding: "10px 16px",
                    borderRadius: 10,
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid var(--border-color)",
                    maxWidth: 340,
                  }}
                >
                  <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                    {approveConfirmStudent.name}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    {approveConfirmStudent.email}
                  </div>
                  {approveConfirmStudent.registration_number && (
                    <div style={{ fontSize: "0.82rem", color: "#60a5fa", marginTop: 4 }}>
                      UUCMS: {approveConfirmStudent.registration_number}
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "rgba(59, 130, 246, 0.08)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  color: "var(--text-secondary)",
                  fontSize: "0.82rem",
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <FiMail size={16} style={{ color: "#60a5fa", flexShrink: 0, marginTop: 2 }} />
                <span>
                  The student will immediately gain access to their dashboard and will receive an email notification:{" "}
                  <strong style={{ color: "var(--text-primary)" }}>Your EventSphere Student Account Has Been Approved</strong>.
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={() => setApproveConfirmStudent(null)}
                  disabled={!!processingId}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={!!processingId}
                  className="btn-primary"
                  style={{ background: "#10b981", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {processingId ? <FiRefreshCw className="animate-spin" size={14} /> : <FiCheckCircle size={15} />}
                  Confirm Approval
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* ----------------- MODAL: REJECT CONFIRMATION ----------------- */}
        <Modal
          open={!!rejectConfirmStudent}
          onClose={() => {
            setRejectConfirmStudent(null);
            setRejectionReason("");
          }}
          title="Reject Student Registration"
          width={480}
        >
          {rejectConfirmStudent && (
            <div>
              <div style={{ textAlign: "center", padding: "10px 0 16px" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "rgba(239, 68, 68, 0.15)",
                    color: "#f87171",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <FiAlertCircle size={32} />
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem", fontWeight: 700 }}>
                  Reject Student Registration?
                </h3>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  This will deny access for <strong style={{ color: "var(--text-primary)" }}>{rejectConfirmStudent.name}</strong>.
                </p>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    marginBottom: 6,
                    color: "var(--text-secondary)",
                  }}
                >
                  Reason for Rejection (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g., UUCMS ID does not match university department records, invalid enrollment credentials..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-base)",
                    color: "var(--text-primary)",
                    fontSize: "0.88rem",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  color: "#f87171",
                  fontSize: "0.82rem",
                  marginBottom: 20,
                }}
              >
                The student account will remain blocked and will receive an email notification: <strong>Update Regarding Your EventSphere Student Account</strong>.
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={() => {
                    setRejectConfirmStudent(null);
                    setRejectionReason("");
                  }}
                  disabled={!!processingId}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!!processingId}
                  className="btn-primary"
                  style={{ background: "#ef4444", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {processingId ? <FiRefreshCw className="animate-spin" size={14} /> : <FiXCircle size={15} />}
                  Reject Registration
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* ----------------- MODAL: REMOVE CONFIRMATION ----------------- */}
        <Modal
          open={!!removeConfirmStudent}
          onClose={() => setRemoveConfirmStudent(null)}
          title="Remove Student Account?"
          width={480}
        >
          {removeConfirmStudent && (
            <div>
              <div style={{ textAlign: "center", padding: "10px 0 16px" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "rgba(239, 68, 68, 0.15)",
                    color: "#f87171",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <FiTrash2 size={28} />
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem", fontWeight: 700 }}>
                  Remove Student Account?
                </h3>
                <p style={{ margin: "0 0 16px", color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                  This will permanently remove this student account and its associated approval record. This action cannot be undone.
                </p>
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border-color)",
                    textAlign: "left",
                    marginBottom: 20,
                  }}
                >
                  <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                    {removeConfirmStudent.name}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    {removeConfirmStudent.email}
                  </div>
                  {removeConfirmStudent.registration_number && (
                    <div style={{ fontSize: "0.82rem", color: "#60a5fa", marginTop: 4 }}>
                      UUCMS: {removeConfirmStudent.registration_number}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={() => setRemoveConfirmStudent(null)}
                  disabled={!!processingId}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemove}
                  disabled={!!processingId}
                  className="btn-primary"
                  style={{ background: "#ef4444", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {processingId ? <FiRefreshCw className="animate-spin" size={14} /> : <FiTrash2 size={15} />}
                  Remove
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </PageTransition>
  );
}
