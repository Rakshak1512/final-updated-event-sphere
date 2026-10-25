import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import {
  FiAward,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiDownload,
  FiSearch,
  FiUploadCloud,
  FiEye,
  FiX,
  FiUser,
  FiCheckCircle,
  FiRefreshCw,
  FiFileText,
  FiArrowLeft,
  FiCalendar,
  FiMapPin,
  FiClock,
  FiCheck,
  FiAlertCircle,
  FiAlertTriangle,
  FiSliders,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "../../components/ui/Modal.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { SkeletonGrid, SkeletonRow } from "../../components/ui/Loader.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import {
  eventService,
  registrationService,
  resultService,
  certificateService,
} from "../../api/services.js";
import { formatDate } from "../../utils/format.js";
import {
  generateResultsReportPDF,
  generateWinnersReportPDF,
} from "../../utils/pdfReportGenerator.js";
import { exportToCSV, slugifyFilename } from "../../utils/exportUtils.js";
import AwardStandingSelector from "../../components/certificate/AwardStandingSelector.jsx";
import StudentDetailsCard from "../../components/certificate/StudentDetailsCard.jsx";
import { AWARD_STANDINGS, AWARD_STANDINGS as PRESET_POSITIONS } from "../../components/certificate/certificateConstants.js";

export default function FacultyResults() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(null);
  const [eventSearch, setEventSearch] = useState("");

  // Selected event ID
  const [selectedEventId, setSelectedEventId] = useState(searchParams.get("eventId") || "");

  // Event workspace data
  const [regs, setRegs] = useState([]);
  const [results, setResults] = useState([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState("");

  // Modal State for Awarding Winner & Certificate
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);
  const [editingResult, setEditingResult] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [form, setForm] = useState({
    registration_number: "",
    student_name: "",
    department: "",
    semester: "",
    position: "1st Place",
    achievement_text: "First Place",
    score_or_remarks: "",
  });

  const [certMode, setCertMode] = useState("auto"); // "auto" | "upload"
  const [manualFile, setManualFile] = useState(null);
  const [saving, setSaving] = useState(false);

  // In-Modal Dynamic Preview State
  const [modalPreviewBlobUrl, setModalPreviewBlobUrl] = useState(null);
  const [modalPreviewLoading, setModalPreviewLoading] = useState(false);

  // Delete Target State
  const [deleteCertTarget, setDeleteCertTarget] = useState(null);
  const [deleteResultTarget, setDeleteResultTarget] = useState(null);

  // Full-Screen Certificate Preview State
  const [previewCert, setPreviewCert] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [isPdf, setIsPdf] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  // Load All Events Catalog
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
      console.error("Results events load error:", err);
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

  // Sync selectedEventId with URL search params
  useEffect(() => {
    if (selectedEventId) {
      setSearchParams({ eventId: selectedEventId }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [selectedEventId, setSearchParams]);

  // Load Event Specific Workspace (Attended Students & Results)
  const loadWorkspaceData = useCallback(
    async (showLoader = true) => {
      if (!selectedEventId) return;
      if (showLoader) setWorkspaceLoading(true);
      try {
        const [resData, regsData] = await Promise.all([
          resultService.forEvent(selectedEventId).then(({ data }) => data || []).catch(() => []),
          registrationService.forEvent(selectedEventId).then(({ data }) => data || []).catch(() => []),
        ]);
        setResults(resData);
        setRegs(regsData);
      } catch (err) {
        console.error("Workspace load error:", err);
      } finally {
        if (showLoader) setWorkspaceLoading(false);
      }
    },
    [selectedEventId]
  );

  useEffect(() => {
    if (selectedEventId) {
      loadWorkspaceData(true);
    }
  }, [selectedEventId, loadWorkspaceData]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
      if (modalPreviewBlobUrl) URL.revokeObjectURL(modalPreviewBlobUrl);
    };
  }, [previewBlobUrl, modalPreviewBlobUrl]);

  const selectedEvent = events.find((e) => String(e.id) === String(selectedEventId));

  // ONLY students who actually attended the event (confirmed by volunteer scan) and are NOT cancelled
  const attendedStudents = regs.filter(
    (r) =>
      (r.status === "attended" || r.status === "completed" || Boolean(r.checked_in_at)) &&
      r.status !== "cancelled"
  );

  // Filtered Attended Students List
  const filteredAttended = attendedStudents.filter((r) => {
    if (!attendeeSearch.trim()) return true;
    const q = attendeeSearch.trim().toLowerCase();
    const name = (r.student?.name || r.student_name || "").toLowerCase();
    const regNo = (r.student?.registration_number || r.registration_number || "").toLowerCase();
    const email = (r.student?.email || r.email || "").toLowerCase();
    const dept = (r.student?.department || r.department || "").toLowerCase();
    const sem = String(r.student?.semester || r.semester || "").toLowerCase();
    const cls = (r.student?.class_name || r.class_name || "").toLowerCase();
    const ticket = (r.ticket_code || "").toLowerCase();

    const assignedResult = results.find(
      (res) =>
        res.registration_number?.toLowerCase() === regNo
    );
    const pos = (assignedResult?.position || "").toLowerCase();
    const certTitle = (assignedResult?.certificate_title || "").toLowerCase();

    return (
      name.includes(q) ||
      regNo.includes(q) ||
      email.includes(q) ||
      dept.includes(q) ||
      sem.includes(q) ||
      cls.includes(q) ||
      ticket.includes(q) ||
      pos.includes(q) ||
      certTitle.includes(q)
    );
  });

  // Open Award Winner Modal for a specific attended student row
  const openAwardModalForStudent = (reg) => {
    const existingRes = results.find(
      (res) =>
        res.registration_number?.toLowerCase() ===
        (reg.student?.registration_number || "").toLowerCase()
    );

    const initialPos = existingRes?.position || "1st Place";
    const matchedPreset = PRESET_POSITIONS.find((p) => p.value === initialPos);

    setSelectedStudent(reg);
    setEditingResult(existingRes || null);
    setForm({
      registration_number: reg.student?.registration_number || "",
      student_name: reg.student?.name || "",
      department: reg.student?.department || "General",
      semester: reg.student?.semester ? String(reg.student.semester) : "",
      position: initialPos,
      achievement_text: matchedPreset ? matchedPreset.certText : initialPos,
      score_or_remarks: existingRes?.score_or_remarks || "",
    });
    setCertMode("auto");
    setManualFile(null);
    if (modalPreviewBlobUrl) {
      URL.revokeObjectURL(modalPreviewBlobUrl);
      setModalPreviewBlobUrl(null);
    }
    setWinnerModalOpen(true);
  };

  // Open Edit Modal from Results Card
  const openEditModalFromResult = (res) => {
    const matchingReg = regs.find(
      (r) =>
        r.student?.registration_number?.toLowerCase() ===
        (res.registration_number || "").toLowerCase()
    );

    const matchedPreset = PRESET_POSITIONS.find((p) => p.value === res.position);

    setSelectedStudent(matchingReg || null);
    setEditingResult(res);
    setForm({
      registration_number: res.registration_number || "",
      student_name: res.student_name || "",
      department: res.student_department || "General",
      semester: "",
      position: res.position || "1st Place",
      achievement_text: matchedPreset ? matchedPreset.certText : res.position || "First Place",
      score_or_remarks: res.score_or_remarks || "",
    });
    setCertMode("auto");
    setManualFile(null);
    if (modalPreviewBlobUrl) {
      URL.revokeObjectURL(modalPreviewBlobUrl);
      setModalPreviewBlobUrl(null);
    }
    setWinnerModalOpen(true);
  };

  // Position change helper
  const handlePositionChange = (newPos) => {
    const matchedPreset = PRESET_POSITIONS.find((p) => p.value === newPos);
    setForm((f) => ({
      ...f,
      position: newPos,
      achievement_text: matchedPreset ? matchedPreset.certText : newPos,
    }));
  };

  // Generate In-Modal Certificate Preview (Before Final Confirmation)
  const handleGenerateModalPreview = async () => {
    if (!form.registration_number) return toast.error("Student registration number required");
    setModalPreviewLoading(true);
    try {
      if (modalPreviewBlobUrl) {
        URL.revokeObjectURL(modalPreviewBlobUrl);
        setModalPreviewBlobUrl(null);
      }
      const blob = await certificateService.generatePreview({
        registration_number: form.registration_number.trim(),
        student_name: form.student_name.trim(),
        event_id: parseInt(selectedEventId),
        position: `${form.position} — ${form.achievement_text}`,
        department: form.department,
        semester: form.semester,
      });
      const url = URL.createObjectURL(blob);
      setModalPreviewBlobUrl(url);
    } catch (err) {
      console.error("Preview generation error:", err);
      toast.error("Could not generate certificate preview.");
    } finally {
      setModalPreviewLoading(false);
    }
  };

  // Save / Award Result & Certificate
  const handleSaveWinnerAndCertificate = async (e) => {
    e.preventDefault();
    if (!form.registration_number.trim()) {
      return toast.error("Registration number is required");
    }

    // Validation: Check duplicate position assignment
    const samePositionStudent = results.find(
      (res) =>
        res.position === form.position &&
        res.registration_number?.toLowerCase() !== form.registration_number.trim().toLowerCase()
    );
    if (samePositionStudent && !editingResult) {
      const confirmTie = window.confirm(
        `Note: ${samePositionStudent.student_name} (${samePositionStudent.registration_number}) is already assigned "${form.position}". Do you want to award a tied position?`
      );
      if (!confirmTie) return;
    }

    setSaving(true);
    try {
      let createdCertId = editingResult?.certificate_id || null;

      // 1. If manual file upload selected
      if (certMode === "upload" && manualFile) {
        const fd = new FormData();
        fd.append("registration_number", form.registration_number.trim());
        fd.append("title", `${selectedEvent?.title || "Event"} — ${form.position}`);
        fd.append("event_id", String(selectedEventId));
        fd.append("file", manualFile);

        const certRes = await certificateService.upload(fd);
        createdCertId = certRes.data.id;
      }

      // 2. Save or update event result record
      let savedResult = null;
      if (editingResult) {
        const { data } = await resultService.update(editingResult.id, {
          position: form.position,
          score_or_remarks: form.score_or_remarks,
          certificate_id: createdCertId,
        });
        savedResult = data;
        toast.success("Result standing updated");
      } else {
        const { data } = await resultService.create({
          event_id: parseInt(selectedEventId),
          registration_number: form.registration_number.trim(),
          position: form.position,
          score_or_remarks: form.score_or_remarks,
          certificate_id: createdCertId,
        });
        savedResult = data;
        toast.success(`Winner declared: ${form.student_name || form.registration_number} (${form.position})`);
      }

      // 3. If auto-generate mode chosen
      if (certMode === "auto") {
        try {
          await certificateService.autoGenerate({
            registration_number: form.registration_number.trim(),
            event_id: parseInt(selectedEventId),
            position: `${form.position} (${form.achievement_text})`,
            title: `${selectedEvent?.title || "Event"} — ${form.position}`,
            result_id: savedResult.id,
            department: form.department,
            semester: form.semester,
          });
          toast.success("Digital Certificate customized & student notified via email!");
        } catch (autoErr) {
          console.error("Auto cert error:", autoErr);
        }
      }

      setWinnerModalOpen(false);
      loadWorkspaceData(false);
    } catch (err) {
      console.error("Save result error:", err);
      toast.error(err.response?.data?.detail || "Could not save event result");
    } finally {
      setSaving(false);
    }
  };

  // Full-Screen Certificate Preview
  const handleOpenPreview = async (certId, certTitle, regNo) => {
    setPreviewCert({ id: certId, title: certTitle, registration_number: regNo });
    setPreviewLoading(true);
    setPreviewError(null);

    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }

    try {
      const blob = await certificateService.downloadBlob(certId);
      const isImage = blob.type && blob.type.startsWith("image/");
      setIsPdf(!isImage);
      const typedBlob = isImage ? blob : new Blob([blob], { type: "application/pdf" });
      const url = URL.createObjectURL(typedBlob);
      setPreviewBlobUrl(url);
    } catch (err) {
      setPreviewError("Unable to preview certificate. Please try direct download.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
    setPreviewCert(null);
  };

  const handleDownloadCert = async (certId, title) => {
    setDownloadingId(certId);
    try {
      await certificateService.downloadFile(certId, title || "result_certificate");
      toast.success("Certificate downloaded!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to download certificate");
    } finally {
      setDownloadingId(null);
    }
  };

  // Delete Certificate only (preserves result & registration)
  const handleDeleteCertificate = async () => {
    if (!deleteCertTarget) return;
    try {
      await certificateService.remove(deleteCertTarget.certificate_id);
      toast.success("Certificate removed. Status reset to 'Not Uploaded'.");
      setDeleteCertTarget(null);
      loadWorkspaceData(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not delete certificate");
    }
  };

  // Delete Result Record
  const handleDeleteResult = async () => {
    if (!deleteResultTarget) return;
    try {
      await resultService.remove(deleteResultTarget.id);
      toast.success("Result standing removed.");
      setDeleteResultTarget(null);
      loadWorkspaceData(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not delete result");
    }
  };

  // PDF Export Handlers
  const handleExportResultsPDF = () => {
    if (!selectedEvent) return;
    try {
      generateResultsReportPDF({ event: selectedEvent, results });
      toast.success("Results PDF downloaded!");
    } catch (err) {
      console.error("Results PDF export error:", err);
      toast.error("Could not export Results PDF.");
    }
  };

  const handleExportWinnersPDF = () => {
    if (!selectedEvent) return;
    try {
      generateWinnersReportPDF({ event: selectedEvent, results });
      toast.success("Winners PDF downloaded!");
    } catch (err) {
      console.error("Winners PDF export error:", err);
      toast.error("Could not export Winners PDF.");
    }
  };

  const handleExportResultsCSV = () => {
    if (!selectedEvent) return;
    try {
      const headers = [
        "S.No",
        "Award / Standing",
        "Student Name",
        "Register No",
        "Branch / Dept",
        "Class / Sem",
        "Score / Remarks",
        "Certificate Status",
        "Declared By",
      ];
      const rows = (results || []).map((r, idx) => [
        idx + 1,
        r.position || "Participant",
        r.student_name || "Student",
        r.registration_number || "N/A",
        r.student_department || "General",
        r.student_semester ? `Sem ${r.student_semester}` : "N/A",
        r.score_or_remarks || "—",
        r.certificate_id ? `Issued (ESP-${r.certificate_id})` : "Pending",
        r.declared_by_name || "Faculty Coordinator",
      ]);
      const filename = `EventSphere_${slugifyFilename(selectedEvent.title, "results")}`;
      exportToCSV(filename, headers, rows);
      toast.success("Results exported as CSV / Excel!");
    } catch (err) {
      console.error("Results CSV export error:", err);
      toast.error("Could not export Results CSV.");
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
      {/* LEVEL 1: EVENT SELECTION CARDS VIEW                                       */}
      {/* ========================================================================= */}
      {!selectedEventId ? (
        <div>
          <div className="section-head" style={{ marginBottom: 24 }}>
            <div>
              <h1 className="page-title">Event Results & Winner Management</h1>
              <p className="page-subtitle" style={{ marginBottom: 0 }}>
                Select a campus event to declare winners from verified attendees, auto-generate digital certificates, and download PDF reports.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                className="icon-btn"
                onClick={() => loadEventsCatalog(true)}
                disabled={eventsLoading}
                title="Refresh events"
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
              icon={<FiAward />}
              title="No events available"
              message="No campus events have been registered yet. Once events are created, you can declare results and generate certificates here."
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
              {filteredEvents.map((ev, i) => (
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
                    <span className="badge badge-primary" style={{ fontSize: 11.5 }}>
                      {ev.total_seats - ev.available_seats} Registered
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
                    {ev.description || "Campus event results & certificate administration."}
                  </p>

                  <div style={{ fontSize: 12.5, color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <FiCalendar size={13} color="#8b5cf6" />
                      <span>{formatDate(ev.event_date)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <FiMapPin size={13} color="#0ea5e9" />
                      <span>{ev.venue || "Campus Venue"}</span>
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
                    <FiAward size={14} /> Open Results & Standings
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* LEVEL 2: SPECIFIC EVENT RESULTS & ATTENDED STUDENTS WORKSPACE            */
        /* ========================================================================= */
        <div>
          {/* Top Navigation & Event Switcher */}
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
                onClick={() => loadWorkspaceData(true)}
                disabled={workspaceLoading}
                title="Refresh results"
              >
                <FiRefreshCw className={workspaceLoading ? "spin" : ""} size={16} />
              </button>
            </div>
          </div>

          {/* Selected Event Details Header Card */}
          {selectedEvent && (
            <div
              className="glass-card float-card"
              style={{
                padding: "24px 28px",
                marginBottom: 26,
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
                    <span className="badge badge-success">
                      {attendedStudents.length} Confirmed Attendees
                    </span>
                  </div>
                  <h1 style={{ fontSize: "clamp(20px, 3vw, 25px)", fontWeight: 700, margin: "4px 0 8px" }}>
                    {selectedEvent.title}
                  </h1>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13.5, margin: "0 0 10px", lineHeight: 1.5 }}>
                    {selectedEvent.description || "Select attended students below to award winner positions and generate official digital certificates."}
                  </p>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "var(--text-muted)" }}>
                    <span>📍 {selectedEvent.venue || "Campus Venue"}</span>
                    <span>📅 {formatDate(selectedEvent.event_date)}</span>
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
                      Attended Students
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--success)" }}>
                      {attendedStudents.length}
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
                      Declared Winners
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>{results.length}</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={handleExportResultsPDF}
                        disabled={results.length === 0}
                        title="Download Results as PDF Document"
                      >
                        <FiFileText size={13} /> Results PDF
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={handleExportResultsCSV}
                        disabled={results.length === 0}
                        title="Download Results as CSV / Excel Spreadsheet"
                      >
                        <FiDownload size={13} /> Results CSV
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleExportWinnersPDF}
                      disabled={results.length === 0}
                      title="Download Official Event Winners PDF"
                    >
                      <FiAward size={14} /> Download Winners PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Standings Podium / Summary Showcase */}
          {results.length > 0 && (
            <div style={{ marginBottom: 30 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <FiAward color="#f59e0b" size={20} /> Declared Event Standings ({results.length})
              </h2>

              <div className="grid-cards">
                {results.map((res, i) => {
                  const pos = (res.position || "").toLowerCase();
                  const isFirst = pos.includes("1st") || pos.includes("first");
                  const isSecond = pos.includes("2nd") || pos.includes("second");
                  const isThird = pos.includes("3rd") || pos.includes("third");

                  const badgeColor = isFirst ? "#f59e0b" : isSecond ? "#94a3b8" : isThird ? "#d97706" : "#8b5cf6";
                  const badgeIcon = isFirst ? "🥇" : isSecond ? "🥈" : isThird ? "🥉" : "🎖️";

                  return (
                    <motion.div
                      key={res.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="glass-card float-card"
                      style={{
                        padding: "20px",
                        borderRadius: "20px",
                        background: isFirst
                          ? "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 70, 239, 0.08) 100%)"
                          : "var(--bg-elevated)",
                        border: `1.5px solid ${isFirst ? "rgba(245, 158, 11, 0.4)" : "rgba(139, 92, 246, 0.25)"}`,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            background: isFirst ? "rgba(245, 158, 11, 0.2)" : "rgba(139, 92, 246, 0.15)",
                            color: badgeColor,
                            border: `1px solid ${badgeColor}`,
                            textTransform: "uppercase",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {badgeIcon} {res.position}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>
                          {res.registration_number}
                        </span>
                      </div>

                      <h3 style={{ fontSize: 17, fontWeight: 700, margin: "4px 0 2px", color: "var(--text-primary)" }}>
                        {res.student_name}
                      </h3>
                      <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: "0 0 10px" }}>
                        {res.student_department || "Department Student"} {res.student_email ? `· ${res.student_email}` : ""}
                      </p>

                      {res.score_or_remarks && (
                        <div
                          style={{
                            background: "var(--bg-glass)",
                            padding: "8px 12px",
                            borderRadius: 10,
                            fontSize: 12.5,
                            color: "var(--text-primary)",
                            marginBottom: 14,
                            border: "1px solid var(--border-color)",
                          }}
                        >
                          <strong>Remarks:</strong> {res.score_or_remarks}
                        </div>
                      )}

                      <div style={{ marginTop: "auto", display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 10, borderTop: "1px solid var(--border-color)" }}>
                        {res.certificate_id ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ flex: 1 }}
                              onClick={() => handleOpenPreview(res.certificate_id, res.certificate_title || res.position, res.registration_number)}
                            >
                              <FiEye size={13} /> Preview
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              disabled={downloadingId === res.certificate_id}
                              onClick={() => handleDownloadCert(res.certificate_id, res.certificate_title)}
                            >
                              <FiDownload size={13} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ flex: 1, color: "#8b5cf6" }}
                            onClick={() => openEditModalFromResult(res)}
                          >
                            <FiUploadCloud size={13} /> Add Certificate
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => openEditModalFromResult(res)}
                          title="Edit Standing"
                        >
                          <FiEdit2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{ background: "rgba(220, 38, 38, 0.12)", color: "var(--danger)" }}
                          onClick={() => setDeleteResultTarget(res)}
                          title="Delete Result"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attended Students & In-Row Winner / Certificate Management Table */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 2px" }}>
                  Attended Students & Award Roster ({attendedStudents.length} Confirmed)
                </h2>
                <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: 0 }}>
                  Only confirmed event attendees are eligible for winner declarations and certificate issuance.
                </p>
              </div>

              <div style={{ position: "relative", minWidth: 0, width: "100%", maxWidth: 360 }}>
                <input
                  className="form-input"
                  style={{ padding: "8px 34px 8px 34px", fontSize: 13 }}
                  placeholder="Search attended students..."
                  value={attendeeSearch}
                  onChange={(e) => setAttendeeSearch(e.target.value)}
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
                {attendeeSearch && (
                  <button
                    type="button"
                    onClick={() => setAttendeeSearch("")}
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

            <div className="glass-card table-wrap" style={{ borderRadius: "20px" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Register Number</th>
                    <th>Branch</th>
                    <th>Class</th>
                    <th>Attendance Time</th>
                    <th>Result / Standing</th>
                    <th>Certificate Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaceLoading ? (
                    <SkeletonRow />
                  ) : attendedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: 0 }}>
                        <EmptyState
                          icon={<FiCheckCircle />}
                          title="No attended students yet"
                          message="Students whose attendance has been verified by volunteer QR scans will appear here automatically."
                        />
                      </td>
                    </tr>
                  ) : filteredAttended.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--text-secondary)" }}>
                        No attended students matching "{attendeeSearch}".
                      </td>
                    </tr>
                  ) : (
                    filteredAttended.map((r) => {
                      const assignedResult = results.find(
                        (res) =>
                          res.registration_number?.toLowerCase() ===
                          (r.student?.registration_number || "").toLowerCase()
                      );

                      const hasCertificate = Boolean(assignedResult?.certificate_id);

                      return (
                        <tr key={r.id}>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                {r.student?.name || `Student #${r.student_id}`}
                              </span>
                              {r.student?.email && (
                                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.student.email}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#a5b4fc" }}>
                              {r.student?.registration_number || "—"}
                            </span>
                          </td>
                          <td>{r.student?.department || "General"}</td>
                          <td>{r.student?.semester ? `Sem ${r.student.semester}` : "—"}</td>
                          <td>
                            <span style={{ fontSize: 12.5, color: "var(--success)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <FiClock size={12} /> {r.checked_in_at ? formatDate(r.checked_in_at) : "Confirmed"}
                            </span>
                          </td>
                          <td>
                            {assignedResult ? (
                              <span
                                className="badge badge-primary"
                                style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}
                              >
                                <FiAward size={12} /> {assignedResult.position}
                              </span>
                            ) : (
                              <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Participant</span>
                            )}
                          </td>
                          <td>
                            {hasCertificate ? (
                              <span
                                className="badge badge-success"
                                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                              >
                                <FiCheckCircle size={11} /> Uploaded (ESP-{assignedResult.certificate_id})
                              </span>
                            ) : (
                              <span
                                className="badge"
                                style={{
                                  background: "rgba(148, 163, 184, 0.15)",
                                  color: "var(--text-muted)",
                                }}
                              >
                                Not Uploaded
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              {!assignedResult ? (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  style={{ padding: "5px 12px", fontSize: 12 }}
                                  onClick={() => openAwardModalForStudent(r)}
                                >
                                  <FiAward size={12} /> Add Winner / Result
                                </button>
                              ) : (
                                <>
                                  {hasCertificate ? (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-outline btn-sm"
                                        style={{ padding: "4px 10px", fontSize: 12 }}
                                        onClick={() => handleOpenPreview(assignedResult.certificate_id, assignedResult.certificate_title || assignedResult.position, assignedResult.registration_number)}
                                        title="Preview Certificate"
                                      >
                                        <FiEye size={12} /> Preview
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-outline btn-sm"
                                        style={{ padding: "4px 10px", fontSize: 12 }}
                                        onClick={() => openAwardModalForStudent(r)}
                                        title="Edit / Replace Certificate"
                                      >
                                        <FiEdit2 size={12} /> Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm"
                                        style={{ background: "rgba(220, 38, 38, 0.12)", color: "var(--danger)", padding: "4px 8px" }}
                                        onClick={() => setDeleteCertTarget(assignedResult)}
                                        title="Delete Certificate"
                                      >
                                        <FiTrash2 size={12} />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        style={{ padding: "4px 10px", fontSize: 12 }}
                                        onClick={() => openAwardModalForStudent(r)}
                                      >
                                        <FiUploadCloud size={12} /> Generate / Upload Cert
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-outline btn-sm"
                                        style={{ padding: "4px 8px", fontSize: 12 }}
                                        onClick={() => openAwardModalForStudent(r)}
                                        title="Edit Result"
                                      >
                                        <FiEdit2 size={12} />
                                      </button>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AWARD WINNER & CUSTOMIZE / PREVIEW CERTIFICATE                      */}
      {/* ========================================================================= */}
      <Modal
        open={winnerModalOpen}
        onClose={() => !saving && setWinnerModalOpen(false)}
        title={editingResult ? `Update Winner Standing & Certificate` : `Award Winner & Issue Certificate`}
        width={600}
      >
        <form onSubmit={handleSaveWinnerAndCertificate}>
          {/* Pre-filled Student Metadata Display */}
          <StudentDetailsCard
            student={{
              name: form.student_name || "Student",
              registration_number: form.registration_number,
              department: form.department,
              semester: form.semester,
              email: selectedStudent?.student?.email || "",
            }}
          />

          <AwardStandingSelector
            value={form.position}
            onChange={handlePositionChange}
            onCustomChange={(val) => setForm((f) => ({ ...f, position: val }))}
          />

          <div className="form-group">
            <label className="form-label">Certificate Achievement Wording</label>
            <input
              className="form-input"
              value={form.achievement_text}
              onChange={(e) => setForm((f) => ({ ...f, achievement_text: e.target.value }))}
              placeholder="e.g. First Place, Second Place, Special Mention"
              required
            />
            <span style={{ fontSize: 11.5, color: "var(--text-muted)", display: "block", marginTop: 4 }}>
              Appears prominently on the official certificate: "for securing [Achievement Wording] in [Event Title]".
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Score / Remarks (Optional)</label>
            <input
              className="form-input"
              value={form.score_or_remarks}
              onChange={(e) => setForm((f) => ({ ...f, score_or_remarks: e.target.value }))}
              placeholder="e.g. 98/100 points, Best UI & Architecture"
            />
          </div>

          {/* Certificate Mode Selector */}
          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label">Certificate Issuance Mode</label>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  flex: 1,
                  background: certMode === "auto" ? "var(--gradient-primary)" : "var(--bg-elevated)",
                  color: certMode === "auto" ? "#fff" : "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                }}
                onClick={() => setCertMode("auto")}
              >
                ✨ Auto-Generate Template
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  flex: 1,
                  background: certMode === "upload" ? "var(--gradient-primary)" : "var(--bg-elevated)",
                  color: certMode === "upload" ? "#fff" : "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                }}
                onClick={() => setCertMode("upload")}
              >
                📁 Manual File Upload
              </button>
            </div>
          </div>

          {certMode === "auto" ? (
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                  Preview certificate layout before issuing to student:
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleGenerateModalPreview}
                  disabled={modalPreviewLoading}
                >
                  <FiEye size={13} /> {modalPreviewLoading ? "Generating..." : "Preview Certificate"}
                </button>
              </div>

              {modalPreviewBlobUrl && (
                <div style={{ border: "1px solid var(--border-color)", borderRadius: 12, overflow: "hidden", marginTop: 8 }}>
                  <iframe
                    src={modalPreviewBlobUrl}
                    title="Certificate Preview"
                    style={{ width: "100%", height: "240px", border: "none", background: "#fff" }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Attach Certificate File (PDF / JPG / PNG)</label>
              <input
                type="file"
                accept="application/pdf,image/*"
                className="form-input"
                onChange={(e) => setManualFile(e.target.files?.[0] || null)}
              />
            </div>
          )}

          <div
            style={{
              background: "rgba(139, 92, 246, 0.08)",
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 12,
              color: "#a5b4fc",
              marginBottom: 16,
              border: "1px solid rgba(139, 92, 246, 0.2)",
            }}
          >
            📧 Saving will store the result, issue the digital certificate, and dispatch an email alert to <strong>{selectedStudent?.student?.email || "the student"}</strong>.
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ flex: 1 }}
              onClick={() => setWinnerModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? "Issuing & Notifying..." : editingResult ? "Update Result & Certificate" : "Confirm & Issue Certificate"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: DELETE CERTIFICATE CONFIRMATION                                    */}
      {/* ========================================================================= */}
      <Modal open={!!deleteCertTarget} onClose={() => setDeleteCertTarget(null)} title="Delete Certificate" width={400}>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 18 }}>
          Are you sure you want to delete the certificate for <strong>{deleteCertTarget?.student_name}</strong>?
          <br /><br />
          <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
            ℹ️ This removes the certificate file and resets status to "Not Uploaded". The student registration, attendance, and winner standing will remain intact.
          </span>
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDeleteCertTarget(null)}>
            Cancel
          </button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDeleteCertificate}>
            Delete Certificate
          </button>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: DELETE RESULT CONFIRMATION                                         */}
      {/* ========================================================================= */}
      <Modal open={!!deleteResultTarget} onClose={() => setDeleteResultTarget(null)} title="Delete Standing" width={400}>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 18 }}>
          Remove standing "{deleteResultTarget?.position}" for <strong>{deleteResultTarget?.student_name}</strong>?
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDeleteResultTarget(null)}>
            Cancel
          </button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDeleteResult}>
            Delete Standing
          </button>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* FULL-SCREEN CERTIFICATE PREVIEW MODAL                                     */}
      {/* ========================================================================= */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {previewCert && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 99999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "24px 16px",
                  background: "rgba(3, 7, 18, 0.78)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                }}
                onClick={handleClosePreview}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 12 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="glass-card"
                  style={{
                    width: "100%",
                    maxWidth: 840,
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: "24px",
                    background: "var(--bg-elevated)",
                    border: "1.5px solid rgba(139, 92, 246, 0.35)",
                    boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45)",
                    overflow: "hidden",
                    margin: "auto",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "18px 24px",
                      borderBottom: "1px solid var(--border-color)",
                      background: "var(--bg-glass)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: "var(--gradient-soft)",
                          color: "#8b5cf6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <FiFileText size={18} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                          {previewCert.title}
                        </h3>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                          Registration No: {previewCert.registration_number}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleClosePreview}
                      className="icon-btn"
                      style={{ width: 34, height: 34, borderRadius: "50%" }}
                    >
                      <FiX size={16} />
                    </button>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minHeight: 380,
                      maxHeight: "68vh",
                      overflowY: "auto",
                      background: "var(--bg-base)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {previewLoading ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "var(--text-secondary)" }}>
                        <div className="spinner" style={{ width: 32, height: 32 }} />
                        <span style={{ fontSize: 13 }}>Loading Certificate Preview...</span>
                      </div>
                    ) : previewError ? (
                      <div style={{ textAlign: "center", padding: 24, color: "var(--danger)" }}>
                        <p style={{ fontSize: 14, marginBottom: 12 }}>{previewError}</p>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => handleDownloadCert(previewCert.id, previewCert.title)}
                        >
                          <FiDownload size={13} /> Try Direct Download
                        </button>
                      </div>
                    ) : isPdf ? (
                      <iframe
                        src={previewBlobUrl}
                        title={`Certificate - ${previewCert.title}`}
                        style={{ width: "100%", height: "68vh", border: "none", background: "#fff" }}
                      />
                    ) : (
                      <img
                        src={previewBlobUrl}
                        alt={`Certificate - ${previewCert.title}`}
                        style={{ maxWidth: "100%", maxHeight: "68vh", objectFit: "contain", padding: 12 }}
                      />
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 10,
                      padding: "14px 24px",
                      borderTop: "1px solid var(--border-color)",
                      background: "var(--bg-glass)",
                    }}
                  >
                    <button type="button" className="btn btn-outline btn-sm" onClick={handleClosePreview}>
                      Close
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={downloadingId === previewCert.id}
                      onClick={() => handleDownloadCert(previewCert.id, previewCert.title)}
                    >
                      <FiDownload size={14} /> Download Certificate
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </PageTransition>
  );
}
