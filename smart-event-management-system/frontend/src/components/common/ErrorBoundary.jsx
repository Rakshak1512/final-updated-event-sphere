import React from "react";
import { FiAlertTriangle, FiRefreshCw, FiHome } from "react-icons/fi";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary caught an unhandled error]:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            padding: "24px",
            width: "100%",
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: 540,
              width: "100%",
              padding: "36px 32px",
              borderRadius: "24px",
              textAlign: "center",
              background: "var(--bg-elevated)",
              border: "1.5px solid rgba(239, 68, 68, 0.35)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3), 0 0 25px rgba(239, 68, 68, 0.15)",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "20px",
                background: "rgba(239, 68, 68, 0.15)",
                color: "#ef4444",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                marginBottom: 18,
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              <FiAlertTriangle />
            </div>

            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                margin: "0 0 8px",
                color: "var(--text-primary)",
              }}
            >
              {this.props.title || "Unable to load page content"}
            </h2>

            <p
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                margin: "0 0 20px",
                lineHeight: 1.6,
              }}
            >
              {this.props.message ||
                "A temporary interface error occurred. Your account and stored data remain completely safe."}
            </p>

            {this.state.error?.message && (
              <div
                style={{
                  background: "rgba(0, 0, 0, 0.25)",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  color: "#fca5a5",
                  marginBottom: 24,
                  wordBreak: "break-word",
                  textAlign: "left",
                  maxHeight: 120,
                  overflowY: "auto",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                }}
              >
                {this.state.error.message}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  this.handleReset();
                  window.location.reload();
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <FiRefreshCw size={15} /> Reload Page
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  this.handleReset();
                  window.location.href = "/";
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <FiHome size={15} /> Return to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
