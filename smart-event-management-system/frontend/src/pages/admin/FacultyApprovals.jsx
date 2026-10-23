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
  FiBriefcase,
  FiCalendar,
  FiFilter,
  FiShield,
  FiDownload,
  FiFileText,
  FiTrash2,
} from "react-icons/fi";
import { motion } from "framer-motion";
import Modal from "../../components/ui/Modal.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { SkeletonGrid } from "../../components/ui/Loader.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import { adminService } from "../../api/services.js";
import { formatDate } from "../../utils/format.js";

export default function FacultyApprovals() {
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(null);
  const [data, setData] = useState({
    faculty: [],
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    total_count: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING"); // PENDING, APPROVED, REJECTED, ALL
  const [deptFilter, setDeptFilter] = useState("all");

  // Action Modals State
  const [detailModalFaculty, setDetailModalFaculty] = useState(null);
  const [approveConfirmFaculty, setApproveConfirmFaculty] = useState(null);
  const [rejectConfirmFaculty, setRejectConfirmFaculty] = useState(null);
  const [removeConfirmFaculty, setRemoveConfirmFaculty] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const loadFacultyApprovals = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await adminService.facultyApprovals();
      setData(
        res.data || {
          faculty: [],
          pending_count: 0,
          approved_count: 0,
          rejected_count: 0,
          total_count: 0,
        }
      );
    } catch (err) {
      console.error("Failed to load faculty approvals roster:", err);
      if (showLoader) toast.error("Could not fetch faculty approval records.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFacultyApprovals(true);
    // Background polling every 10 seconds for real-time incoming faculty registrations
    const interval = setInterval(() => {
      loadFacultyApprovals(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadFacultyApprovals]);

  // Handle Approve
  const handleApprove = async () => {
    if (!approveConfirmFaculty) return;
    const fac = approveConfirmFaculty;
    setProcessingId(fac.id);
    try {
      await adminService.approveFaculty(fac.id);
      toast.success(`Faculty credentials approved for ${fac.name}! Notification email sent.`);
      setApproveConfirmFaculty(null);
      await loadFacultyApprovals(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to approve faculty account.");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Reject
  const handleReject = async () => {
    if (!rejectConfirmFaculty) return;
    const fac = rejectConfirmFaculty;
    setProcessingId(fac.id);
    try {
      await adminService.rejectFaculty(fac.id, rejectionReason);
      toast.success(`Faculty registration rejected for ${fac.name}. Notification email sent.`);
      setRejectConfirmFaculty(null);
      setRejectionReason("");
      await loadFacultyApprovals(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reject faculty account.");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Remove Faculty
  const handleRemove = async () => {
    if (!removeConfirmFaculty) return;
    const fac = removeConfirmFaculty;
    setProcessingId(fac.id);
    try {
      await adminService.removeFaculty(fac.id);
      toast.success(`Faculty account for ${fac.name} removed successfully.`);
      setRemoveConfirmFaculty(null);
      await loadFacultyApprovals(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to remove faculty account.");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle PDF Reports Download
  const handleDownloadPdf = async (type) => {
    const titleCase = type.charAt(0).toUpperCase() + type.slice(1);
    try {
      setDownloadingPdf(type);
      toast.loading(`Generating ${titleCase} Faculty PDF report...`, { id: "pdf-toast" });
      await adminService.downloadFacultyPdf(type);
      toast.success(`${titleCase} Faculty PDF downloaded successfully!`, { id: "pdf-toast" });
    } catch (err) {
      console.error("PDF report download failed:", err);
      toast.error(`Failed to download ${titleCase} Faculty PDF report.`, { id: "pdf-toast" });
    } finally {
      setDownloadingPdf(null);
    }
  };

  // Filter faculty
  const filteredFaculty = (data.faculty || []).filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (f.name || "").toLowerCase().includes(q);
    const emailMatch = (f.email || "").toLowerCase().includes(q);
    const idMatch = (f.admin_id || f.registration_number || "").toLowerCase().includes(q);
    const deptMatch = (f.department || "").toLowerCase().includes(q);
    const designationMatch = (f.designation || "").toLowerCase().includes(q);
    const matchesSearch = !q || nameMatch || emailMatch || idMatch || deptMatch || designationMatch;

    const matchesStatus =
      statusFilter === "ALL" || (f.approval_status || "PENDING").toUpperCase() === statusFilter;

    const matchesDept =
      deptFilter === "all" || (f.department || "").toLowerCase() === deptFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesDept;
  });

  // Unique departments for filter dropdown
  const departments = Array.from(
    new Set((data.faculty || []).map((f) => f.department).filter(Boolean))
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
                  background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2))",
                  color: "#c084fc",
                  border: "1px solid rgba(139,92,246,0.3)",
                }}
              >
                <FiShield size={19} />
              </span>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
                Faculty Approval Management
              </h1>
            </div>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Administrator review of faculty credentials. Approved faculty gain full access to Faculty Dashboard, event creation, and student approvals.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => loadFacultyApprovals(true)}
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
          {/* Pending Faculty */}
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
                Pending Faculty
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
              Awaiting institutional authorization
            </div>
          </motion.div>

          {/* Approved Faculty */}
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
                Approved Faculty
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
              Active faculty coordinators
            </div>
          </motion.div>

          {/* Rejected Faculty */}
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
                Rejected Faculty
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
              Blocked / unapproved faculty
            </div>
          </motion.div>

          {/* Total Faculty */}
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
                Total Faculty
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
              All registered faculty records
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
            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(236, 72, 153, 0.05))",
            border: "1px solid rgba(168, 85, 247, 0.25)",
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
                background: "rgba(168, 85, 247, 0.2)",
                color: "#c084fc",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FiFileText size={20} />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                Official Faculty PDF Reports
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
              Download Pending Faculty PDF
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
              Download Approved Faculty PDF
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
              Download Rejected Faculty PDF
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
                background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                cursor: downloadingPdf ? "not-allowed" : "pointer",
              }}
            >
              <FiDownload size={14} className={downloadingPdf === "all" ? "animate-spin" : ""} />
              Download All Faculty PDF
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
              placeholder="Search faculty by name, Faculty ID, email, department, designation..."
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

          {/* Filter Tabs: Pending, Approved, Rejected, All Faculty */}
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
              { id: "ALL", label: `All Faculty (${data.total_count})` },
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

        {/* Faculty Table */}
        {loading && data.faculty.length === 0 ? (
          <SkeletonGrid count={6} />
        ) : filteredFaculty.length === 0 ? (
          <EmptyState
            icon={FiUsers}
            title={
              statusFilter === "PENDING"
                ? "No Pending Faculty Registrations"
                : "No Faculty Members Found"
            }
            description={
              statusFilter === "PENDING"
                ? "All faculty registration applications have been processed!"
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
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
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
                    <th style={{ padding: "14px 18px" }}>Faculty Name</th>
                    <th style={{ padding: "14px 18px" }}>Faculty ID</th>
                    <th style={{ padding: "14px 18px" }}>Email</th>
                    <th style={{ padding: "14px 18px" }}>Department</th>
                    <th style={{ padding: "14px 18px" }}>Designation</th>
                    <th style={{ padding: "14px 18px" }}>Registration Date</th>
                    <th style={{ padding: "14px 18px" }}>Approval Status</th>
                    <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFaculty.map((f) => {
                    const status = (f.approval_status || "PENDING").toUpperCase();
                    const isPending = status === "PENDING";
                    const isApproved = status === "APPROVED";
                    const isRejected = status === "REJECTED";
                    const facultyIdStr = f.admin_id || f.registration_number || (f.id ? `FAC-${String(f.id).slice(0, 8)}` : "—");
                    const designationStr = f.designation || "Faculty Coordinator";

                    return (
                      <tr
                        key={f.id}
                        style={{
                          borderBottom: "1px solid var(--border-color)",
                          transition: "background 0.2s ease",
                        }}
                      >
                        {/* Faculty Name */}
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
                              {(f.name || "F").charAt(0).toUpperCase()}
                            </div>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                              {f.name}
                            </div>
                          </div>
                        </td>

                        {/* Faculty ID */}
                        <td style={{ padding: "14px 18px", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 600,
                              color: "#c084fc",
                              background: "rgba(168, 85, 247, 0.08)",
                              border: "1px solid rgba(168, 85, 247, 0.2)",
                              padding: "4px 8px",
                              borderRadius: 6,
                              fontSize: "0.85rem",
                            }}
                          >
                            {facultyIdStr}
                          </span>
                        </td>

                        {/* Email */}
                        <td style={{ padding: "14px 18px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <FiMail size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                            <span>{f.email}</span>
                          </div>
                        </td>

                        {/* Department */}
                        <td style={{ padding: "14px 18px", color: "var(--text-primary)", fontWeight: 500, fontSize: "0.88rem" }}>
                          {f.department || "General"}
                        </td>

                        {/* Designation */}
                        <td style={{ padding: "14px 18px", color: "var(--text-secondary)", fontSize: "0.88rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <FiBriefcase size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                            <span>{designationStr}</span>
                          </div>
                        </td>

                        {/* Registration Date */}
                        <td style={{ padding: "14px 18px", color: "var(--text-secondary)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                          {formatDate(f.created_at)}
                        </td>

                        {/* Approval Status */}
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
                              onClick={() => setDetailModalFaculty(f)}
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
                                  onClick={() => setApproveConfirmFaculty(f)}
                                  disabled={processingId === f.id}
                                  title="Approve Faculty Credentials"
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
                                    setRejectConfirmFaculty(f);
                                    setRejectionReason("");
                                  }}
                                  disabled={processingId === f.id}
                                  title="Reject Faculty Registration"
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
                                onClick={() => setApproveConfirmFaculty(f)}
                                disabled={processingId === f.id}
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
                              onClick={() => setRemoveConfirmFaculty(f)}
                              disabled={processingId === f.id}
                              title="Remove Faculty Account"
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

        {/* ----------------- MODAL: FACULTY DETAILS ----------------- */}
        <Modal
          open={!!detailModalFaculty}
          onClose={() => setDetailModalFaculty(null)}
          title="Faculty Registration Details"
          width={540}
        >
          {detailModalFaculty && (
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
                    background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.3rem",
                    fontWeight: 700,
                  }}
                >
                  {(detailModalFaculty.name || "F").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {detailModalFaculty.name}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {detailModalFaculty.email}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 10, border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>Faculty ID</div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", fontFamily: "monospace" }}>
                    {detailModalFaculty.admin_id || detailModalFaculty.registration_number || (detailModalFaculty.id ? `FAC-${String(detailModalFaculty.id).slice(0, 8)}` : "Not specified")}
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 10, border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>Department</div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {detailModalFaculty.department || "General"}
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 10, border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>Designation</div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {detailModalFaculty.designation || "Faculty Coordinator"}
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 10, border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>Registration Date</div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {formatDate(detailModalFaculty.created_at)}
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 10, border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>Current Approval Status</div>
                  <div
                    style={{
                      fontWeight: 700,
                      color:
                        detailModalFaculty.approval_status === "APPROVED"
                          ? "#34d178"
                          : detailModalFaculty.approval_status === "REJECTED"
                          ? "#f87171"
                          : "#fbbf24",
                    }}
                  >
                    {detailModalFaculty.approval_status || "PENDING"}
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 10, border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>Phone Contact</div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {detailModalFaculty.phone || "Not specified"}
                  </div>
                </div>
              </div>

              {detailModalFaculty.rejection_reason && (
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
                  <div>{detailModalFaculty.rejection_reason}</div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                {detailModalFaculty.approval_status === "PENDING" && (
                  <>
                    <button
                      onClick={() => {
                        const f = detailModalFaculty;
                        setDetailModalFaculty(null);
                        setRejectConfirmFaculty(f);
                      }}
                      className="btn-secondary"
                      style={{ color: "#f87171", borderColor: "rgba(239, 68, 68, 0.4)" }}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        const f = detailModalFaculty;
                        setDetailModalFaculty(null);
                        setApproveConfirmFaculty(f);
                      }}
                      className="btn-primary"
                      style={{ background: "#10b981" }}
                    >
                      Approve Credentials
                    </button>
                  </>
                )}
                <button onClick={() => setDetailModalFaculty(null)} className="btn-secondary">
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* ----------------- MODAL: APPROVE CONFIRMATION ----------------- */}
        <Modal
          open={!!approveConfirmFaculty}
          onClose={() => setApproveConfirmFaculty(null)}
          title="Confirm Faculty Authorization"
          width={460}
        >
          {approveConfirmFaculty && (
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
                  Approve Faculty Account?
                </h3>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  Are you sure you want to approve the institutional faculty account for:
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
                    {approveConfirmFaculty.name}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    {approveConfirmFaculty.email}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#c084fc", marginTop: 4 }}>
                    {approveConfirmFaculty.department || "Faculty Coordinator"} &bull; {approveConfirmFaculty.designation || "Faculty"}
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "rgba(139, 92, 246, 0.08)",
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                  color: "var(--text-secondary)",
                  fontSize: "0.82rem",
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <FiMail size={16} style={{ color: "#a78bfa", flexShrink: 0, marginTop: 2 }} />
                <span>
                  The faculty coordinator will immediately gain access to the Faculty Dashboard and receive an email notification:{" "}
                  <strong style={{ color: "var(--text-primary)" }}>Your EventSphere Faculty Account Has Been Approved</strong>.
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={() => setApproveConfirmFaculty(null)}
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
          open={!!rejectConfirmFaculty}
          onClose={() => {
            setRejectConfirmFaculty(null);
            setRejectionReason("");
          }}
          title="Reject Faculty Registration"
          width={480}
        >
          {rejectConfirmFaculty && (
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
                  Reject Faculty Registration?
                </h3>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  This will deny access for <strong style={{ color: "var(--text-primary)" }}>{rejectConfirmFaculty.name}</strong>.
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
                  placeholder="e.g., Faculty ID could not be matched with institution staff directory, invalid department designation..."
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
                The faculty account will remain blocked and will receive an email notification: <strong>Update Regarding Your EventSphere Faculty Account</strong>.
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={() => {
                    setRejectConfirmFaculty(null);
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
          open={!!removeConfirmFaculty}
          onClose={() => setRemoveConfirmFaculty(null)}
          title="Remove Faculty Account?"
          width={480}
        >
          {removeConfirmFaculty && (
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
                  Remove Faculty Account?
                </h3>
                <p style={{ margin: "0 0 16px", color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                  This will remove the faculty account and its approval record. This action cannot be undone.
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
                    {removeConfirmFaculty.name}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    {removeConfirmFaculty.email}
                  </div>
                  {removeConfirmFaculty.admin_id && (
                    <div style={{ fontSize: "0.82rem", color: "#a78bfa", marginTop: 4 }}>
                      Faculty ID: {removeConfirmFaculty.admin_id}
                    </div>
                  )}
                  {removeConfirmFaculty.department && (
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 2 }}>
                      Department: {removeConfirmFaculty.department}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={() => setRemoveConfirmFaculty(null)}
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
