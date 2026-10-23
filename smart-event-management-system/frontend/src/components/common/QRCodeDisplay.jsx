import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { API_BASE_URL } from "../../api/axios.js";
import { fileUrl } from "../../utils/format.js";

/**
 * Bulletproof, high-contrast, zero-failure QR Code component.
 * Renders instantly on the client via `qrcode` (no network required).
 * Also falls back gracefully to dynamic API image endpoints if necessary.
 */
export default function QRCodeDisplay({
  registration,
  ticketCode,
  size = 200,
  alt = "Event QR Ticket Pass",
  className = "",
  style = {},
}) {
  const [dataUrl, setDataUrl] = useState("");
  const [genError, setGenError] = useState(false);

  // Determine standard payload formatted identically to backend scanner expectations
  const code = (ticketCode || registration?.ticket_code || "").replace(/^#/, "").trim();
  const eventId = registration?.event_id || registration?.event?.id || "";
  const studentId = registration?.student_id || registration?.student?.id || "";

  let payload = "";
  if (code) {
    if (eventId && studentId) {
      payload = `TICKET:${code}|EVENT:${eventId}|STUDENT:${studentId}`;
    } else {
      payload = `TICKET:${code}`;
    }
  } else if (registration?.id) {
    payload = `TICKET:REG-${registration.id}`;
  }

  useEffect(() => {
    let isMounted = true;

    if (!payload) {
      setGenError(true);
      return;
    }

    QRCode.toDataURL(payload, {
      width: Math.max(size * 2, 400), // High density for crystal-clear camera scanning
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setGenError(false);
        }
      })
      .catch((err) => {
        console.warn("Client QRCode generation failed:", err);
        if (isMounted) setGenError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [payload, size]);

  // Dynamic server fallback URL if client-side generator has not yet resolved or errored
  const fallbackUrl = (() => {
    if (code) {
      return `${API_BASE_URL}/registrations/ticket/${code}/qr`;
    }
    if (registration?.qr_code_path) {
      return fileUrl(registration.qr_code_path);
    }
    if (registration?.id) {
      return `${API_BASE_URL}/registrations/${registration.id}/qr`;
    }
    return "";
  })();

  const srcToUse = dataUrl || fallbackUrl;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        borderRadius: 14,
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
      className={className}
    >
      {srcToUse ? (
        <img
          src={srcToUse}
          alt={alt}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            imageRendering: "crisp-edges",
          }}
          onError={(e) => {
            // If fallback failed, retry with ticket endpoint
            if (code && !e.target.src.includes(`/ticket/${code}/qr`)) {
              e.target.src = `${API_BASE_URL}/registrations/ticket/${code}/qr`;
            }
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            color: "#6b7280",
            fontSize: 12,
            fontFamily: "monospace",
          }}
        >
          {genError ? "QR Code Unavailable" : "Generating QR..."}
        </div>
      )}
    </div>
  );
}
