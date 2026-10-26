import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiFileText,
  FiDownload,
  FiEye,
  FiX,
  FiFilter,
  FiCalendar,
  FiCheck,
  FiColumns,
  FiArrowUp,
  FiArrowDown,
  FiRefreshCw,
  FiBarChart2,
  FiLayers,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Modal from "../ui/Modal.jsx";
import { generateCustomReportPDF } from "../../utils/pdfReportGenerator.js";

/**
 * Reusable Report Configuration and Live Preview Modal
 * Allows authorized users to configure title, date range, status, event,
 * column selection, sorting, orientation, summary stats, preview, and download.
 */
export default function ReportConfigModal({
  open,
  onClose,
  reportKey = "report",
  defaultTitle = "Campus Report",
  defaultSubtitle = "Official EventSphere Report",
  availableEvents = [],
  availableColumns = [],
  availableStatuses = [],
  defaultOrientation = "landscape",
  fetchDataFn, // (config) => Promise<{ headers, rows, summaryCards, metadata }>
}) {
  const [activeTab, setActiveTab] = useState("config"); // "config" | "preview"
  const [title, setTitle] = useState(defaultTitle);
  const [subtitle, setSubtitle] = useState(defaultSubtitle);
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedColumns, setSelectedColumns] = useState(() =>
    availableColumns.map((c) => c.key)
  );
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" | "desc"
  const [includeSummary, setIncludeSummary] = useState(true);
  const [orientation, setOrientation] = useState(defaultOrientation);

  // Preview & Download state
  const [loadingData, setLoadingData] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // Sync defaults whenever opened or reportKey changes
  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setSubtitle(defaultSubtitle);
      setSelectedColumns(availableColumns.map((c) => c.key));
      setOrientation(defaultOrientation);
      setSortBy(availableColumns[0]?.key || "");
      setSortOrder("asc");
      setStatusFilter("all");
      setSelectedEventId("all");
      setStartDate("");
      setEndDate("");
      setPreviewData(null);
      setActiveTab("config");
    }
  }, [open, reportKey, defaultTitle, defaultSubtitle, defaultOrientation]);

  // Toggle single column
  const handleToggleColumn = (key) => {
    setSelectedColumns((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) {
          toast.error("At least one column must be included in the report.");
          return prev;
        }
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(availableColumns.map((c) => c.key));
  };

  const handleDeselectAllColumns = () => {
    if (availableColumns.length > 0) {
      setSelectedColumns([availableColumns[0].key]);
    }
  };

  // Compile active configuration
  const currentConfig = useMemo(
    () => ({
      title,
      subtitle,
      selectedEventId,
      startDate,
      endDate,
      statusFilter,
      selectedColumns,
      sortBy,
      sortOrder,
      includeSummary,
      orientation,
    }),
    [
      title,
      subtitle,
      selectedEventId,
      startDate,
      endDate,
      statusFilter,
      selectedColumns,
      sortBy,
      sortOrder,
      includeSummary,
      orientation,
    ]
  );

  // Fetch report data
  const loadReportData = async () => {
    if (!fetchDataFn) return null;
    setLoadingData(true);
    try {
      const data = await fetchDataFn(currentConfig);
      setPreviewData(data);
      return data;
    } catch (err) {
      console.error("Error loading report data:", err);
      toast.error(err.message || "Failed to load report data.");
      return null;
    } finally {
      setLoadingData(false);
    }
  };

  // Switch to Preview
  const handleOpenPreview = async () => {
    const data = await loadReportData();
    if (data) {
      setActiveTab("preview");
    }
  };

  // Trigger PDF Generation
  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      let data = previewData;
      if (!data) {
        data = await loadReportData();
      }
      if (!data) return;

      const safeFilename = `EventSphere_${title.replace(/[^a-zA-Z0-9_-]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;

      generateCustomReportPDF({
        title,
        subtitle,
        headers: data.headers || [],
        rows: data.rows || [],
        orientation,
        includeSummary,
        summaryCards: data.summaryCards || [],
        metadata: data.metadata || [],
        filename: safeFilename,
      });

      toast.success("PDF report generated successfully!");
      onClose();
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      toast.error("Failed to generate PDF report.");
    } finally {
      setDownloading(false);
    }
  };


  return (
    <Modal open={open} onClose={onClose} title="Configure & Generate Report" width={780}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            borderBottom: "1px solid var(--border-color)",
            paddingBottom: 10,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("config")}
            className="btn btn-sm"
            style={{
              background: activeTab === "config" ? "var(--gradient-primary)" : "transparent",
              color: activeTab === "config" ? "#ffffff" : "var(--text-secondary)",
              border: activeTab === "config" ? "none" : "1px solid var(--border-color)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              borderRadius: 10,
              padding: "7px 16px",
            }}
          >
            <FiFilter size={14} /> Report Configuration
          </button>

          <button
            type="button"
            onClick={handleOpenPreview}
            disabled={loadingData}
            className="btn btn-sm"
            style={{
              background: activeTab === "preview" ? "var(--gradient-primary)" : "transparent",
              color: activeTab === "preview" ? "#ffffff" : "var(--text-secondary)",
              border: activeTab === "preview" ? "none" : "1px solid var(--border-color)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              borderRadius: 10,
              padding: "7px 16px",
            }}
          >
            <FiEye size={14} /> Live Preview {loadingData ? "..." : ""}
          </button>
        </div>

        {/* TAB 1: CONFIGURATION */}
        {activeTab === "config" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Title & Subtitle */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
                  Report Title
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Master Registrations Report"
                  style={{ fontSize: 13, padding: "8px 12px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
                  Department / Subtitle
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Official Campus Records"
                  style={{ fontSize: 13, padding: "8px 12px" }}
                />
              </div>
            </div>

            {/* Event & Status Filters */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {availableEvents.length > 0 && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
                    Filter by Event
                  </label>
                  <select
                    className="form-input"
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    style={{ fontSize: 13, padding: "8px 12px" }}
                  >
                    <option value="all">All Campus Events</option>
                    {availableEvents.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.category || "General"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {availableStatuses.length > 0 && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
                    Filter by Status
                  </label>
                  <select
                    className="form-input"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ fontSize: 13, padding: "8px 12px" }}
                  >
                    <option value="all">All Statuses</option>
                    {availableStatuses.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Range */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
                  From Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ fontSize: 13, padding: "7px 10px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
                  To Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ fontSize: 13, padding: "7px 10px" }}
                />
              </div>
            </div>

            {/* Column Selection Checkboxes */}
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 14,
                background: "var(--bg-glass)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                  <FiColumns size={14} color="#8b5cf6" /> Columns to Include ({selectedColumns.length}/{availableColumns.length})
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleSelectAllColumns}
                    style={{ background: "none", border: "none", color: "#8b5cf6", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                  >
                    Select All
                  </button>
                  <span style={{ color: "var(--text-muted)" }}>•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllColumns}
                    style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
                {availableColumns.map((col) => {
                  const isChecked = selectedColumns.includes(col.key);
                  return (
                    <label
                      key={col.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12.5,
                        color: isChecked ? "var(--text-primary)" : "var(--text-muted)",
                        cursor: "pointer",
                        padding: "6px 8px",
                        borderRadius: 8,
                        background: isChecked ? "rgba(139, 92, 246, 0.08)" : "transparent",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleColumn(col.key)}
                        style={{ accentColor: "#8b5cf6", cursor: "pointer" }}
                      />
                      <span>{col.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Sorting & Presentation Options */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, alignItems: "center" }}>
              {/* Sort Column */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
                  Sort By Column
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <select
                    className="form-input"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ flex: 1, fontSize: 13, padding: "8px 10px" }}
                  >
                    {availableColumns.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
                    className="btn btn-outline"
                    title={sortOrder === "asc" ? "Ascending order" : "Descending order"}
                    style={{ padding: "0 10px", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {sortOrder === "asc" ? <FiArrowUp size={14} /> : <FiArrowDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Page Orientation */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
                  Page Orientation
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  <label
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "8px",
                      borderRadius: 10,
                      border: orientation === "landscape" ? "1.5px solid #8b5cf6" : "1px solid var(--border-color)",
                      background: orientation === "landscape" ? "rgba(139, 92, 246, 0.1)" : "transparent",
                      color: orientation === "landscape" ? "#a5b4fc" : "var(--text-secondary)",
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: 600,
                    }}
                  >
                    <input
                      type="radio"
                      name="orientation"
                      value="landscape"
                      checked={orientation === "landscape"}
                      onChange={() => setOrientation("landscape")}
                      style={{ display: "none" }}
                    />
                    Landscape
                  </label>
                  <label
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "8px",
                      borderRadius: 10,
                      border: orientation === "portrait" ? "1.5px solid #8b5cf6" : "1px solid var(--border-color)",
                      background: orientation === "portrait" ? "rgba(139, 92, 246, 0.1)" : "transparent",
                      color: orientation === "portrait" ? "#a5b4fc" : "var(--text-secondary)",
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: 600,
                    }}
                  >
                    <input
                      type="radio"
                      name="orientation"
                      value="portrait"
                      checked={orientation === "portrait"}
                      onChange={() => setOrientation("portrait")}
                      style={{ display: "none" }}
                    />
                    Portrait
                  </label>
                </div>
              </div>

              {/* Summary Stats Toggle */}
              <div style={{ display: "flex", alignItems: "center", marginTop: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--text-primary)" }}>
                  <input
                    type="checkbox"
                    checked={includeSummary}
                    onChange={(e) => setIncludeSummary(e.target.checked)}
                    style={{ accentColor: "#8b5cf6", cursor: "pointer", width: 16, height: 16 }}
                  />
                  <span>Include Summary Metrics Bar</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE PREVIEW */}
        {activeTab === "preview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {loadingData ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-secondary)" }}>
                <FiRefreshCw className="spin-icon" size={24} style={{ marginBottom: 10 }} />
                <p style={{ margin: 0 }}>Compiling report preview...</p>
              </div>
            ) : previewData ? (
              <>
                {/* Preview Banner Header */}
                <div
                  style={{
                    padding: "14px 18px",
                    borderRadius: 12,
                    background: "rgba(79, 70, 229, 0.15)",
                    border: "1px solid rgba(139, 92, 246, 0.3)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 2px 0", color: "#ffffff" }}>{title}</h4>
                    <p style={{ fontSize: 12, color: "#a5b4fc", margin: 0 }}>
                      {subtitle} • {orientation.toUpperCase()} • {previewData.rows?.length || 0} Records
                    </p>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Page 1 Preview
                  </div>
                </div>

                {/* Summary Cards Preview */}
                {includeSummary && previewData.summaryCards && previewData.summaryCards.length > 0 && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {previewData.summaryCards.map((sc, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          minWidth: 120,
                          padding: "8px 12px",
                          borderRadius: 10,
                          background: "var(--bg-glass)",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sc.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#8b5cf6" }}>{sc.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Data Table Preview */}
                <div
                  className="table-wrap"
                  style={{
                    maxHeight: 280,
                    overflowY: "auto",
                    overflowX: "auto",
                    border: "1px solid var(--border-color)",
                    borderRadius: 12,
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "rgba(79, 70, 229, 0.2)", color: "#ffffff", borderBottom: "1px solid var(--border-color)" }}>
                        {previewData.headers.map((h, i) => (
                          <th key={i} style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows && previewData.rows.length > 0 ? (
                        previewData.rows.slice(0, 15).map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            style={{
                              borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                              background: rIdx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.02)",
                            }}
                          >
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} style={{ padding: "7px 12px", whiteSpace: "nowrap" }}>
                                {String(cell ?? "—")}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={previewData.headers?.length || 1} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
                            No matching records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {previewData.rows && previewData.rows.length > 15 && (
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", textAlign: "center" }}>
                    Showing first 15 of {previewData.rows.length} rows in preview. Full dataset will be included in the downloaded PDF.
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-secondary)" }}>
                Click "Live Preview" to compile and inspect data before generating the PDF.
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 14,
            borderTop: "1px solid var(--border-color)",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Format: Official High-Resolution PDF Document
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {activeTab === "config" ? (
              <button
                type="button"
                onClick={handleOpenPreview}
                disabled={loadingData}
                className="btn btn-outline"
                style={{ padding: "9px 18px", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <FiEye size={14} /> Preview Report
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab("config")}
                className="btn btn-outline"
                style={{ padding: "9px 18px", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <FiFilter size={14} /> Edit Filters
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloading || loadingData}
              className="btn btn-primary"
              style={{
                padding: "9px 22px",
                fontSize: 13,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
              title="Download official PDF report document"
            >
              <FiFileText size={14} /> {downloading ? "Generating PDF..." : "Download PDF Report"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
