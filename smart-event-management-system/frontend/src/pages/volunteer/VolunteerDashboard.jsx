import { useState, useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  FiCamera,
  FiCheckCircle,
  FiAlertCircle,
  FiX,
  FiUser,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiHash,
  FiUsers,
  FiSearch,
  FiRefreshCw,
  FiShield,
  FiCheck,
  FiUpload,
  FiImage,
  FiRepeat,
  FiDownload,
  FiFileText,
  FiPlay,
  FiPause,
  FiZap,
  FiArrowLeft,
} from "react-icons/fi";
import PageTransition from "../../components/common/PageTransition.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { volunteerService } from "../../api/services.js";
import { generateVolunteerScansPDF } from "../../utils/pdfReportGenerator.js";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

/**
 * Universal safe parser for EventSphere QR payloads:
 * - JSON format: {"ticket_code": "...", "event_id": ...}
 * - Standard EventSphere format: TICKET:{ticket_code}|EVENT:{event_id}|STUDENT:{student_id}
 * - Team format: TICKET:{ticket_code}|EVENT:{event_id}|STUDENT:{student_id}|TEAM:{team_id}
 * - Direct Ticket URLs: https://.../ticket/{ticket_code} or query params ?ticket=...
 * - Direct QR URLs: https://.../registrations/{id}/qr or /ticket/{ticket_code}/qr
 * - Plain codes / hashes: #BA6436533EF14244 or BA6436533EF14244
 * - Registration ID: REG-12 or 12
 */
export function parseTicketPayload(rawInput, fallbackEventId = null) {
  let raw = String(rawInput || "").trim();
  if (!raw) return { ticketCode: "", eventId: fallbackEventId };

  let extractedCode = raw;
  let extractedEventId = fallbackEventId;

  // 1. JSON parsing support
  if ((raw.startsWith("{") && raw.endsWith("}")) || (raw.startsWith("[") && raw.endsWith("]"))) {
    try {
      const parsed = JSON.parse(raw);
      const obj = Array.isArray(parsed) ? parsed[0] : parsed;
      if (obj) {
        if (obj.ticket_code) extractedCode = String(obj.ticket_code).trim();
        else if (obj.ticket) extractedCode = String(obj.ticket).trim();
        else if (obj.code) extractedCode = String(obj.code).trim();
        else if (obj.registration_id) extractedCode = `REG-${obj.registration_id}`;
        else if (obj.id) extractedCode = `REG-${obj.id}`;

        if (obj.event_id && !extractedEventId) {
          const ev = parseInt(obj.event_id, 10);
          if (!isNaN(ev)) extractedEventId = ev;
        }
        return {
          ticketCode: extractedCode.replace(/^#+/, "").trim().toUpperCase(),
          eventId: extractedEventId,
        };
      }
    } catch (e) {}
  }

  // 2. URL parsing support (handles query parameters ?ticket=... or /ticket/... paths)
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.includes("://") || raw.startsWith("/")) {
    try {
      const parsedUrl = new URL(raw, "https://eventsphere.local");
      const ticketParam =
        parsedUrl.searchParams.get("ticket") ||
        parsedUrl.searchParams.get("ticket_code") ||
        parsedUrl.searchParams.get("code") ||
        parsedUrl.searchParams.get("t");
      const eventParam =
        parsedUrl.searchParams.get("event") ||
        parsedUrl.searchParams.get("event_id") ||
        parsedUrl.searchParams.get("e");

      if (ticketParam) extractedCode = ticketParam;
      if (eventParam && !extractedEventId) {
        const ev = parseInt(eventParam, 10);
        if (!isNaN(ev)) extractedEventId = ev;
      }

      if (parsedUrl.pathname.includes("/ticket/")) {
        const match = parsedUrl.pathname.match(/\/ticket\/([^/?#]+)/);
        if (match && match[1]) extractedCode = match[1];
      } else if (parsedUrl.pathname.includes("/registrations/") && parsedUrl.pathname.includes("/qr")) {
        const match = parsedUrl.pathname.match(/\/registrations\/(\d+)\/qr/);
        if (match && match[1]) extractedCode = `REG-${match[1]}`;
      }
    } catch (e) {}
  }

  // 3. Pipe-delimited EventSphere payload (TICKET:...|EVENT:...|STUDENT:...)
  if (extractedCode.includes("TICKET:") || extractedCode.includes("|")) {
    const parts = extractedCode.split("|");
    for (const part of parts) {
      const p = part.trim();
      if (p.startsWith("TICKET:")) {
        extractedCode = p.replace("TICKET:", "").trim();
      } else if (p.startsWith("EVENT:") && !extractedEventId) {
        const ev = parseInt(p.replace("EVENT:", "").trim(), 10);
        if (!isNaN(ev)) extractedEventId = ev;
      }
    }
  }

  // 4. Normalize
  extractedCode = extractedCode.replace(/^#+/, "").trim().toUpperCase();

  return {
    ticketCode: extractedCode,
    eventId: extractedEventId,
  };
}

/**
 * Client-side canvas image preprocessing for fallback image decoding.
 * Normalizes contrast and applies adaptive grayscale binarization.
 * Dramatically boosts detection for glare, low-contrast, or dark-mode screenshots.
 */
function preprocessImageForQR(file) {
  return new Promise((resolve) => {
    if (!file || typeof window === "undefined") {
      resolve(null);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const maxDim = 1200;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const val = gray < 120 ? Math.max(0, gray * 0.6) : Math.min(255, gray * 1.3);
          d[i] = val;
          d[i + 1] = val;
          d[i + 2] = val;
        }
        ctx.putImageData(imgData, 0, 0);
        canvas.toBlob((blob) => {
          resolve(blob ? new File([blob], "preprocessed_qr.png", { type: "image/png" }) : null);
        }, "image/png");
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export default function VolunteerDashboard() {
  const { user } = useAuth();

  const userRole = (user?.role || "").toLowerCase().trim();
  if (userRole && userRole !== "volunteer") {
    const target =
      userRole === "admin"
        ? "/admin/dashboard"
        : userRole === "faculty"
        ? "/faculty/dashboard"
        : "/student/dashboard";
    return <Navigate to={target} replace />;
  }

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    volunteer_name: user?.name || "Volunteer",
    volunteer_id: user?.id || 0,
    assigned_events: [],
    today_events: [],
    total_scanned: 0,
    today_scanned: 0,
    recent_scans: [],
  });

  const [eventSearch, setEventSearch] = useState("");
  const [scanSearch, setScanSearch] = useState("");

  // Scanner modal state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [manualCode, setManualCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifiedAttendee, setVerifiedAttendee] = useState(null);
  const [verifyError, setVerifyError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState(null);
  const [scannerPaused, setScannerPaused] = useState(false);

  // Camera & Mode state: Strictly two logical cameras: "back" (default) and "front"
  const [scannerMode, setScannerMode] = useState("camera"); // "camera" | "upload"
  const [cameraChoice, setCameraChoice] = useState("back"); // "back" | "front"
  const [hasFrontCamera, setHasFrontCamera] = useState(true);
  const [hasBackCamera, setHasBackCamera] = useState(true);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [switchingCamera, setSwitchingCamera] = useState(false);

  // Advanced Hardware Capabilities (Torch / Flashlight, Zoom, Focus)
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasZoom, setHasZoom] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const cameraTrackRef = useRef(null);

  // References to resolved back & front device IDs (filtered to remove auxiliary ultra-wide/tele/macro cameras)
  const backCameraIdRef = useRef(null);
  const frontCameraIdRef = useRef(null);

  // Upload QR code state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedPreview, setUploadedPreview] = useState(null);
  const [decodingFile, setDecodingFile] = useState(false);

  const fileInputRef = useRef(null);
  const qrScannerRef = useRef(null);
  const html5QrCodeInstance = useRef(null);
  const isScanningRef = useRef(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data } = await volunteerService.getDashboard();
      setStats(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not load volunteer dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    return () => {
      stopActiveStream();
    };
  }, []);

  // Completely stop any running camera stream to guarantee only one stream is active at a time
  // and release all camera hardware tracks cleanly
  const stopActiveStream = async () => {
    setTorchOn(false);
    if (cameraTrackRef.current) {
      try {
        cameraTrackRef.current.stop();
      } catch (e) {}
      cameraTrackRef.current = null;
    }
    if (html5QrCodeInstance.current) {
      const instance = html5QrCodeInstance.current;
      try {
        if (instance.isScanning) {
          await instance.stop();
        }
      } catch (e) {
        // Ignore expected teardown errors
      }
      try {
        instance.clear();
      } catch (e) {}
      html5QrCodeInstance.current = null;
    }
    // Also explicitly find any active video elements or media streams and stop all tracks
    try {
      const videoEls = document.querySelectorAll("#qr-reader-box video");
      videoEls.forEach((v) => {
        if (v.srcObject && typeof v.srcObject.getTracks === "function") {
          v.srcObject.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch (err) {}
          });
          v.srcObject = null;
        }
      });
    } catch (e) {}
  };

  // Prevent background scrolling when scanner modal is active
  useEffect(() => {
    if (scannerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [scannerOpen]);

  // Enumerate cameras and filter for the primary standard Front and Back cameras
  // Handles desktop webcams, laptop integrated cameras, and smartphone cameras
  const resolveLogicalCameras = async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        return { backId: null, frontId: null, frontOk: true, backOk: true, count: 0 };
      }

      let devices = [];
      try {
        devices = await Html5Qrcode.getCameras();
      } catch (e) {
        // Trigger explicit browser permission prompt via navigator.mediaDevices.getUserMedia
        try {
          const testStream = await navigator.mediaDevices.getUserMedia({ video: true });
          testStream.getTracks().forEach((track) => track.stop());
          devices = await Html5Qrcode.getCameras();
        } catch (permErr) {
          console.warn("Direct getUserMedia permission prompt error:", permErr);
        }
      }

      if (!devices || devices.length === 0) {
        return { backId: null, frontId: null, frontOk: true, backOk: true, count: 0 };
      }

      // If only 1 camera is detected (e.g. laptop webcam, desktop webcam, USB camera)
      if (devices.length === 1) {
        return {
          backId: devices[0].id,
          frontId: devices[0].id,
          frontOk: true,
          backOk: true,
          count: 1,
        };
      }

      // Filter auxiliary lenses (ultra-wide 0.5x, telephoto, macro, virtual)
      const isAuxiliaryLens = (label) => {
        const l = (label || "").toLowerCase();
        return (
          l.includes("ultra") ||
          l.includes("tele") ||
          l.includes("zoom") ||
          l.includes("macro") ||
          l.includes("depth") ||
          l.includes("virtual") ||
          l.includes("fisheye")
        );
      };

      // 1. Resolve standard Back camera (excluding auxiliary lenses)
      const standardBack = devices.filter((d) => {
        const l = (d.label || "").toLowerCase();
        return (l.includes("back") || l.includes("rear") || l.includes("environment")) && !isAuxiliaryLens(l);
      });
      const anyBack =
        standardBack.length > 0
          ? standardBack[0]
          : devices.find((d) => {
              const l = (d.label || "").toLowerCase();
              return l.includes("back") || l.includes("rear") || l.includes("environment");
            });

      // 2. Resolve standard Front camera
      const standardFront = devices.filter((d) => {
        const l = (d.label || "").toLowerCase();
        return (
          (l.includes("front") || l.includes("user") || l.includes("selfie") || l.includes("facetime") || l.includes("webcam") || l.includes("integrated")) &&
          !isAuxiliaryLens(l)
        );
      });
      const anyFront =
        standardFront.length > 0
          ? standardFront[0]
          : devices.find((d) => {
              const l = (d.label || "").toLowerCase();
              return l.includes("front") || l.includes("user") || l.includes("selfie") || l.includes("facetime") || l.includes("webcam") || l.includes("integrated");
            });

      const resolvedBack = anyBack ? anyBack.id : devices[0]?.id;
      const resolvedFront = anyFront ? anyFront.id : devices[devices.length - 1]?.id || devices[0]?.id;

      return {
        backId: resolvedBack,
        frontId: resolvedFront,
        frontOk: true,
        backOk: true,
        count: devices.length,
      };
    } catch (e) {
      console.warn("Could not inspect camera devices:", e);
      return { backId: null, frontId: null, frontOk: true, backOk: true, count: 0 };
    }
  };

  // Helper to start the live camera stream with bulletproof multi-ladder fallback for all platforms:
  // Mobile phones (rear camera with continuous focus), iPhones/iPads, Android Chrome, and laptop webcams
  const startCameraStream = async (scanner, targetChoice) => {
    let choice = targetChoice || cameraChoice || "front";
    setCameraLoading(true);
    setCameraError(null);
    setHasTorch(false);
    setTorchOn(false);
    setHasZoom(false);
    setZoomLevel(1);

    // Browser support check
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        "Camera access is not supported by this browser. Please use 'Upload QR' or manual code entry."
      );
      setCameraLoading(false);
      return;
    }

    // Secure context check (camera requires HTTPS or localhost)
    if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      setCameraError(
        "Camera access requires a secure connection (HTTPS or localhost). Please switch to 'Upload QR' or enter code manually."
      );
      setCameraLoading(false);
      return;
    }

    const onScanSuccess = (decodedText) => {
      if (isScanningRef.current) return;
      isScanningRef.current = true;
      try {
        if (scanner && scanner.isScanning) {
          scanner.pause(true);
        }
      } catch (e) {}
      handleVerifyTicket(decodedText);
    };

    // Camera execution ladder:
    // 1. Resolved specific hardware device ID if known (most reliable across desktop and mobile)
    // 2. Mobile-optimal ideal facingMode with crisp resolution
    // 3. Inverted facingMode (allows laptops to instantly activate user webcam if rear requested)
    // 4. Any enumerated camera device ID
    // 5. Permissive fallback
    const attempts = [];

    // Attempt 1: Resolved specific hardware camera device ID
    const specificId = choice === "front" ? frontCameraIdRef.current : backCameraIdRef.current;
    if (specificId) {
      attempts.push({
        cameraConfig: specificId,
        scanConfig: {
          fps: 15,
          disableFlip: choice === "back",
          videoConstraints: {
            deviceId: { exact: specificId },
          },
        },
      });
    }

    // Attempt 2: Flexible facingMode with ideal constraints
    attempts.push({
      cameraConfig: { facingMode: choice === "front" ? "user" : "environment" },
      scanConfig: {
        fps: 15,
        disableFlip: choice === "back",
        videoConstraints: {
          facingMode: { ideal: choice === "front" ? "user" : "environment" },
        },
      },
    });

    // Attempt 3: Alternate facingMode (lets laptops activate front webcam if back was requested)
    attempts.push({
      cameraConfig: { facingMode: choice === "front" ? "environment" : "user" },
      scanConfig: {
        fps: 15,
        disableFlip: choice !== "back",
        videoConstraints: {
          facingMode: { ideal: choice === "front" ? "environment" : "user" },
        },
      },
      isAlternate: true,
    });

    // Attempt 4: Any enumerated device ID
    try {
      const devs = await Html5Qrcode.getCameras();
      if (devs && devs.length > 0) {
        devs.forEach((d) => {
          if (d.id && d.id !== specificId) {
            attempts.push({
              cameraConfig: d.id,
              scanConfig: {
                fps: 15,
                disableFlip: choice === "back",
              },
            });
          }
        });
      }
    } catch (e) {}

    // Attempt 5: Permissive fallback
    attempts.push({
      cameraConfig: { facingMode: "user" },
      scanConfig: { fps: 15 },
    });

    let started = false;
    let lastError = null;

    for (let i = 0; i < attempts.length; i++) {
      const attempt = attempts[i];
      try {
        await scanner.start(attempt.cameraConfig, attempt.scanConfig, onScanSuccess, () => {});
        started = true;
        isScanningRef.current = false;
        setScannerPaused(false);

        // Configure video track capabilities (Autofocus, Torch, Zoom) & iOS WebKit playsinline
        setTimeout(async () => {
          try {
            const v = document.querySelector("#qr-reader-box video");
            if (v) {
              v.setAttribute("playsinline", "true");
              v.setAttribute("webkit-playsinline", "true");
              v.setAttribute("muted", "true");
              v.muted = true;
              v.play().catch(() => {});

              if (v.srcObject && typeof v.srcObject.getVideoTracks === "function") {
                const [track] = v.srcObject.getVideoTracks();
                if (track) {
                  cameraTrackRef.current = track;
                  if (track.getCapabilities) {
                    const caps = track.getCapabilities();
                    if (caps.torch) setHasTorch(true);
                    if (caps.zoom) setHasZoom(true);

                    // Apply continuous focus and exposure if supported
                    const adv = {};
                    if (caps.focusMode && caps.focusMode.includes("continuous")) {
                      adv.focusMode = "continuous";
                    }
                    if (caps.exposureMode && caps.exposureMode.includes("continuous")) {
                      adv.exposureMode = "continuous";
                    }
                    if (Object.keys(adv).length > 0) {
                      await track.applyConstraints({ advanced: [adv] }).catch(() => {});
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.warn("Video surface enhancement error:", e);
          }
        }, 80);

        if (attempt.isAlternate) {
          setCameraChoice(choice === "front" ? "back" : "front");
        }
        break;
      } catch (err) {
        lastError = err;
        console.warn(`Camera start attempt ${i + 1}/${attempts.length} failed:`, attempt, err);
      }
    }

    if (!started) {
      console.error("All camera start attempts failed:", lastError);
      let errMsg = "Could not activate camera. Please ensure camera permissions are granted.";
      const errName = lastError?.name || "";
      const errStr = String(lastError?.message || lastError || "").toLowerCase();
      if (errName === "NotAllowedError" || errName === "PermissionDeniedError" || errStr.includes("permission") || errStr.includes("denied")) {
        errMsg = "Camera permission was denied. Please allow camera permissions in your browser address bar settings.";
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError" || errStr.includes("not found")) {
        errMsg = "No camera was detected on this device. You can use 'Upload QR' or enter the code manually.";
      } else if (errName === "NotReadableError" || errName === "TrackStartError" || errStr.includes("in use") || errStr.includes("could not start")) {
        errMsg = "Camera is currently in use by another app or browser tab. Please close other camera apps and retry.";
      } else if (errName === "OverconstrainedError") {
        errMsg = "Camera constraints not supported by your hardware. Please switch camera or use 'Upload QR'.";
      }
      setCameraError(errMsg);
    }

    setCameraLoading(false);
  };

  // Initialize or reconfigure camera scanner when modal opens in camera mode
  useEffect(() => {
    let isMounted = true;
    if (scannerOpen && scannerMode === "camera" && !verifiedAttendee && !confirmedSuccess) {
      const startScanner = async () => {
        try {
          if (!isMounted) return;

          const box = document.getElementById("qr-reader-box");
          if (!box) return;

          // Stop existing stream if any before creating fresh instance
          await stopActiveStream();
          if (!isMounted) return;

          // Resolve cameras first to detect laptop webcams vs multi-camera phones
          let targetChoice = cameraChoice;
          const { backId, frontId, frontOk, backOk, count } = await resolveLogicalCameras();
          if (isMounted) {
            backCameraIdRef.current = backId;
            frontCameraIdRef.current = frontId;
            setHasFrontCamera(frontOk);
            setHasBackCamera(backOk);
            // Default to front camera on laptops (1 camera) or where no rear camera exists
            if (count === 1 || (!backId && frontId)) {
              targetChoice = "front";
              setCameraChoice("front");
            }
          }

          if (!isMounted) return;

          const scanner = new Html5Qrcode("qr-reader-box", {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            verbose: false,
          });
          html5QrCodeInstance.current = scanner;

          if (isMounted) {
            await startCameraStream(scanner, targetChoice);
          }
        } catch (e) {
          console.warn("Camera scanner initialization error:", e);
        }
      };

      const timer = setTimeout(startScanner, 100);
      return () => {
        isMounted = false;
        clearTimeout(timer);
        stopActiveStream();
      };
    } else {
      stopActiveStream();
    }
  }, [scannerOpen, scannerMode, verifiedAttendee, confirmedSuccess]);

  // Select camera choice directly: strictly "back" or "front"
  const handleSelectCamera = async (targetChoice) => {
    if (switchingCamera || cameraLoading) return;

    setSwitchingCamera(true);
    setCameraError(null);

    try {
      await stopActiveStream();
      setCameraChoice(targetChoice);

      const scanner = new Html5Qrcode("qr-reader-box", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      html5QrCodeInstance.current = scanner;

      await startCameraStream(scanner, targetChoice);
      toast.success(`Switched to ${targetChoice === "back" ? "Back" : "Front"} Camera`);
    } catch (err) {
      console.error("Camera switch error:", err);
      toast.error("Failed to switch camera.");
    } finally {
      setSwitchingCamera(false);
    }
  };

  // Camera Switch Handler: toggles between Front and Back camera
  const handleSwitchCamera = async () => {
    if (switchingCamera || cameraLoading) return;
    const nextChoice = cameraChoice === "back" ? "front" : "back";
    await handleSelectCamera(nextChoice);
  };

  // Torch / Flashlight Toggle Handler
  const handleToggleTorch = async () => {
    const track = cameraTrackRef.current;
    if (!track) return;
    try {
      const nextTorch = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
      toast.success(nextTorch ? "Flashlight ON" : "Flashlight OFF");
    } catch (e) {
      console.warn("Torch toggle failed:", e);
      toast.error("Flashlight could not be toggled");
    }
  };

  // Hardware Zoom Cycle Handler (1x -> 1.5x -> 2x -> 1x)
  const handleCycleZoom = async () => {
    const track = cameraTrackRef.current;
    if (!track || !track.getCapabilities) return;
    try {
      const caps = track.getCapabilities();
      if (!caps.zoom) return;
      const minZoom = caps.zoom.min || 1;
      const maxZoom = Math.min(caps.zoom.max || 3, 3);

      let nextZoom = 1;
      if (zoomLevel === 1) nextZoom = Math.min(1.5, maxZoom);
      else if (zoomLevel === 1.5) nextZoom = Math.min(2.0, maxZoom);
      else nextZoom = minZoom;

      await track.applyConstraints({
        advanced: [{ zoom: nextZoom }],
      });
      setZoomLevel(nextZoom);
    } catch (e) {
      console.warn("Zoom adjustment failed:", e);
    }
  };

  // Restart camera scanner cleanly
  const handleRestartScanner = async () => {
    isScanningRef.current = false;
    setVerifyError(null);
    setCameraError(null);
    setScannerPaused(false);
    await stopActiveStream();
    const box = document.getElementById("qr-reader-box");
    if (!box) return;
    try {
      const scanner = new Html5Qrcode("qr-reader-box", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      html5QrCodeInstance.current = scanner;
      await startCameraStream(scanner, cameraChoice);
    } catch (err) {
      console.warn("Scanner restart error:", err);
    }
  };

  // Pause / Resume camera scanner
  const handleTogglePause = () => {
    const scanner = html5QrCodeInstance.current;
    if (!scanner) return;
    try {
      if (scannerPaused) {
        scanner.resume();
        setScannerPaused(false);
      } else {
        scanner.pause(true);
        setScannerPaused(true);
      }
    } catch (e) {
      console.warn("Could not toggle pause:", e);
    }
  };

  // Clean modal close
  const handleCloseScanner = async () => {
    await stopActiveStream();
    handleResetScanner();
    setScannerOpen(false);
  };

  // QR Image File Upload & Decoding Handler with Two-Pass Preprocessing Fallback
  const handleFileUpload = async (file) => {
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (PNG, JPG, JPEG, or WebP)");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size exceeds 15MB limit.");
      return;
    }

    setUploadedFile(file);
    setUploadedPreview(URL.createObjectURL(file));
    setDecodingFile(true);
    setVerifyError(null);

    try {
      await stopActiveStream();

      let scanner = html5QrCodeInstance.current;
      if (!scanner) {
        scanner = new Html5Qrcode("qr-reader-box", {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        html5QrCodeInstance.current = scanner;
      }

      // Pass 1: Standard scanFile
      let decodedText = null;
      try {
        decodedText = await scanner.scanFile(file, true);
      } catch (pass1Error) {
        // Pass 2: High-contrast canvas preprocessed fallback
        try {
          const preprocessedBlob = await preprocessImageForQR(file);
          if (preprocessedBlob) {
            decodedText = await scanner.scanFile(preprocessedBlob, false);
          }
        } catch (pass2Error) {
          throw pass1Error;
        }
      }

      if (decodedText) {
        toast.success("QR Code detected successfully!");
        await handleVerifyTicket(decodedText);
      }
    } catch (err) {
      console.error("QR decode from file error:", err);
      setVerifyError(
        "No readable QR code found in this image. Please ensure the QR code is clearly visible, well-lit, and in focus, or enter the code manually."
      );
    } finally {
      setDecodingFile(false);
    }
  };

  const handleClearUploadedFile = () => {
    setUploadedFile(null);
    if (uploadedPreview) {
      URL.revokeObjectURL(uploadedPreview);
      setUploadedPreview(null);
    }
    setVerifyError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Download Volunteer Scans Log as PDF
  const handleDownloadScansPDF = () => {
    if (!stats.recent_scans || stats.recent_scans.length === 0) {
      toast.error("No scans recorded to generate PDF report.");
      return;
    }
    const targetEvent = stats.assigned_events?.find((e) => e.id === selectedEventId);
    generateVolunteerScansPDF({
      scans: stats.recent_scans,
      volunteerName: stats.volunteer_name,
      volunteerId: stats.volunteer_id,
      eventTitle: targetEvent?.title || null,
    });
    toast.success("Volunteer Attendance Report downloaded as PDF!");
  };

  const handleVerifyTicket = async (ticketPayload) => {
    const input = ticketPayload || manualCode || "";
    const { ticketCode, eventId: payloadEventId } = parseTicketPayload(
      input,
      selectedEventId ? parseInt(selectedEventId, 10) : null
    );

    if (!ticketCode) {
      toast.error("Please enter or scan a valid ticket code");
      return;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(60);
      }
    } catch (e) {}

    setVerifying(true);
    setVerifyError(null);
    setVerifiedAttendee(null);
    setConfirmedSuccess(null);

    const targetEventId = selectedEventId ? parseInt(selectedEventId, 10) : payloadEventId;

    try {
      const { data } = await volunteerService.verifyTicket({
        ticket_code: ticketCode,
        event_id: targetEventId,
      });

      setVerifiedAttendee(data);

      // Stop camera while viewing attendee verification card to save device resources
      await stopActiveStream();

      if (data.already_attended) {
        setVerifyError("⚠️ Attendance has already been confirmed for this student.");
      }
    } catch (err) {
      const detail = err.response?.data?.detail || "Registration not found or invalid QR code.";
      setVerifyError(detail);
      isScanningRef.current = false;
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirmAttendance = async () => {
    if (!verifiedAttendee || confirming) return;
    setConfirming(true);
    try {
      const { data } = await volunteerService.confirmAttendance({
        registration_id: verifiedAttendee.registration_id,
        event_id: verifiedAttendee.event_id,
      });
      toast.success(`Attendance confirmed for ${verifiedAttendee.student_name}!`);
      setConfirmedSuccess(data);
      setVerifiedAttendee(null);
      setVerifyError(null);
      fetchDashboardData();
    } catch (err) {
      const msg = err.response?.data?.detail || "Could not confirm attendance.";
      toast.error(msg);
      setVerifyError(msg);
    } finally {
      setConfirming(false);
    }
  };

  const handleResetScanner = () => {
    isScanningRef.current = false;
    setVerifiedAttendee(null);
    setVerifyError(null);
    setConfirmedSuccess(null);
    setManualCode("");
    setScannerPaused(false);
  };

  const openScannerForEvent = (eventId) => {
    setSelectedEventId(eventId);
    handleResetScanner();
    setScannerOpen(true);
  };

  return (
    <PageTransition>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header Hero Banner */}
        <div
          className="glass-card float-card"
          style={{
            padding: "32px",
            borderRadius: "24px",
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)",
            border: "1.5px solid rgba(139, 92, 246, 0.3)",
            marginBottom: "32px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 20,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span
                  style={{
                    background: "rgba(139, 92, 246, 0.2)",
                    color: "#a5b4fc",
                    padding: "4px 12px",
                    borderRadius: "999px",
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <FiShield size={14} /> Volunteer Desk
                </span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>ID: #{stats.volunteer_id}</span>
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px 0", color: "var(--text-primary)" }}>
                Welcome, {stats.volunteer_name}
              </h1>
              <p style={{ fontSize: 14.5, color: "var(--text-secondary)", margin: 0, maxWidth: 600 }}>
                Scan student QR tickets, verify registrations, and manage contactless attendee entry for campus events.
              </p>
            </div>

            {/* Quick Action Button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedEventId(null);
                handleResetScanner();
                setScannerOpen(true);
              }}
              className="btn btn-primary"
              style={{
                padding: "14px 28px",
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 16,
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                boxShadow: "0 10px 25px rgba(139, 92, 246, 0.4)",
              }}
            >
              <FiCamera size={20} />
              Scan Registration QR
            </motion.button>
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
            marginBottom: 32,
          }}
        >
          <div
            className="glass-card"
            style={{
              padding: "24px",
              borderRadius: "20px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              <FiCheckCircle />
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Total Scanned</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }}>{stats.total_scanned}</div>
            </div>
          </div>

          <div
            className="glass-card"
            style={{
              padding: "24px",
              borderRadius: "20px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: "rgba(139, 92, 246, 0.15)",
                color: "#8b5cf6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              <FiClock />
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Scanned Today</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }}>{stats.today_scanned}</div>
            </div>
          </div>

          <div
            className="glass-card"
            style={{
              padding: "24px",
              borderRadius: "20px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: "rgba(14, 165, 233, 0.15)",
                color: "#0ea5e9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              <FiCalendar />
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Active Events</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }}>
                {stats.assigned_events?.length || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Assigned & Today's Events Grid */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px 0" }}>Active Campus Events</h2>
              <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: 0 }}>
                Select an event to restrict scanning or launch check-in desk
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {stats.assigned_events && stats.assigned_events.length > 0 && (
                <div style={{ position: "relative", minWidth: 0, width: "100%", maxWidth: 360 }}>
                  <input
                    className="form-input"
                    style={{ padding: "8px 34px 8px 34px", fontSize: 13 }}
                    placeholder="Search events, venue, category..."
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
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
                      <FiX size={14} />
                    </button>
                  )}
                </div>
              )}
              <button
                onClick={fetchDashboardData}
                className="btn btn-outline btn-sm"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <FiRefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 20,
            }}
          >
            {(() => {
              const filteredEvents = (stats.assigned_events || []).filter((ev) => {
                if (!eventSearch.trim()) return true;
                const q = eventSearch.trim().toLowerCase();
                return (
                  (ev.title || "").toLowerCase().includes(q) ||
                  (ev.category || "").toLowerCase().includes(q) ||
                  (ev.venue || "").toLowerCase().includes(q)
                );
              });

              if (filteredEvents.length === 0 && (stats.assigned_events || []).length > 0) {
                return (
                  <div style={{ gridColumn: "1 / -1", padding: "36px", textAlign: "center", background: "var(--bg-elevated)", borderRadius: "20px", border: "1px dashed var(--border-color)" }}>
                    <p style={{ color: "var(--text-secondary)", margin: "0 0 10px" }}>
                      No events matched "{eventSearch}".
                    </p>
                    <button className="btn btn-outline btn-sm" onClick={() => setEventSearch("")}>
                      Clear Search
                    </button>
                  </div>
                );
              }

              if (filteredEvents.length === 0) {
                return (
                  <div style={{ gridColumn: "1 / -1", padding: "36px", textAlign: "center", background: "var(--bg-elevated)", borderRadius: "20px", border: "1px dashed var(--border-color)" }}>
                    <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                      No campus events scheduled for today. You can still scan valid passes using the universal QR scanner.
                    </p>
                  </div>
                );
              }

              return filteredEvents.map((ev) => {
                const pct = ev.registered > 0 ? Math.round((ev.checked_in / ev.registered) * 100) : 0;
                return (
                  <div
                    key={ev.id}
                    className="glass-card"
                    style={{
                      padding: "20px",
                      borderRadius: "20px",
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: 999,
                            background: "rgba(139, 92, 246, 0.15)",
                            color: "#a5b4fc",
                            textTransform: "uppercase",
                          }}
                        >
                          {ev.category}
                        </span>
                        <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                          {ev.remaining} remaining
                        </span>
                      </div>

                      <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 10px 0", color: "var(--text-primary)" }}>
                        {ev.title}
                      </h3>

                      <div style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <FiCalendar size={14} color="#8b5cf6" /> {ev.event_date} ({ev.event_time})
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <FiMapPin size={14} color="#8b5cf6" /> {ev.venue}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                          <span style={{ color: "var(--text-muted)" }}>Checked In</span>
                          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                            {ev.checked_in} / {ev.registered} ({pct}%)
                          </span>
                        </div>
                        <div style={{ height: 8, background: "var(--border-color)", borderRadius: 999, overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              background: "var(--gradient-primary)",
                              borderRadius: 999,
                              transition: "width 0.5s ease",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openScannerForEvent(ev.id)}
                      className="btn btn-outline btn-sm"
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        fontWeight: 600,
                      }}
                    >
                      <FiCamera size={15} /> Scan Attendees for this Event
                    </button>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Scan History Table */}
        <div
          className="glass-card"
          style={{
            padding: "24px",
            borderRadius: "24px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Recent Scans Log</h2>
              {stats.recent_scans && stats.recent_scans.length > 0 && (
                <span className="badge badge-info">{stats.recent_scans.length} Verified</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {stats.recent_scans && stats.recent_scans.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadScansPDF}
                  className="btn btn-sm btn-outline"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    borderRadius: 10,
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                  title="Download Attendance Scans Log as PDF"
                >
                  <FiDownload size={14} /> Download Scans PDF
                </button>
              )}
              {stats.recent_scans && stats.recent_scans.length > 0 && (
                <div style={{ position: "relative", minWidth: 0, width: "100%", maxWidth: 360 }}>
                  <input
                    className="form-input"
                    style={{ padding: "8px 34px 8px 34px", fontSize: 13 }}
                    placeholder="Search student, reg no, event..."
                    value={scanSearch}
                    onChange={(e) => setScanSearch(e.target.value)}
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
                  {scanSearch && (
                    <button
                      type="button"
                      onClick={() => setScanSearch("")}
                      style={{
                        position: "absolute",
                        right: 10,
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
              )}
            </div>
          </div>

          {(() => {
            const filteredScans = (stats.recent_scans || []).filter((scan) => {
              if (!scanSearch.trim()) return true;
              const q = scanSearch.trim().toLowerCase();
              return (
                (scan.student_name || "").toLowerCase().includes(q) ||
                (scan.registration_number || "").toLowerCase().includes(q) ||
                (scan.event_title || "").toLowerCase().includes(q)
              );
            });

            if (stats.recent_scans && stats.recent_scans.length > 0) {
              if (filteredScans.length === 0) {
                return (
                  <div style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>
                    No scans matching "{scanSearch}".
                  </div>
                );
              }

              return (
                <div className="table-wrap" style={{ overflowX: "auto" }}>
                  <table className="data-table" style={{ width: "100%", minWidth: 540, borderCollapse: "collapse", fontSize: 13.5, textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                        <th style={{ padding: "12px 16px" }}>Student</th>
                        <th style={{ padding: "12px 16px" }}>Reg No</th>
                        <th style={{ padding: "12px 16px" }}>Event</th>
                        <th style={{ padding: "12px 16px" }}>Check-in Time</th>
                        <th style={{ padding: "12px 16px" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredScans.map((scan, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: "1px solid var(--border-color)",
                        transition: "background 0.2s ease",
                      }}
                    >
                      <td style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {scan.student_name}
                      </td>
                      <td style={{ padding: "14px 16px", fontFamily: "monospace", color: "#a5b4fc" }}>
                        {scan.registration_number || "N/A"}
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--text-secondary)" }}>
                        {scan.event_title}
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--text-muted)", fontSize: 12.5 }}>
                        {scan.scanned_at}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            background: "rgba(16, 185, 129, 0.15)",
                            color: "#10b981",
                            fontWeight: 700,
                            fontSize: 12,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <FiCheck size={12} /> Present
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

            return (
              <div style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                No check-in activity recorded yet. Scans confirmed by you will appear here in real-time.
              </div>
            );
          })()}
        </div>

        {/* QR SCANNER & ATTENDEE VERIFICATION MODAL - ZERO SCROLL OPTIMIZED */}
        {/* QR SCANNER & ATTENDEE VERIFICATION MODAL - PORTALED DIRECTLY TO BODY FOR TRUE VIEWPORT CENTERING */}
        {typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>
              {scannerOpen && (
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    inset: 0,
                    width: "100vw",
                    height: "100dvh",
                    background: "rgba(3, 7, 18, 0.85)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 999999,
                    padding: "16px",
                    boxSizing: "border-box",
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      handleCloseScanner();
                    }
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="glass-card"
                    style={{
                      width: "100%",
                      maxWidth: 480,
                      maxHeight: "92dvh",
                      margin: "auto",
                      background: "var(--bg-elevated)",
                      borderRadius: 20,
                      border: "1.5px solid rgba(139, 92, 246, 0.35)",
                      boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                      boxSizing: "border-box",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                {/* Slim Header: zero wasted space */}
                <div
                  style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--border-color)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "var(--bg-glass)",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      type="button"
                      onClick={handleCloseScanner}
                      className="btn btn-sm btn-outline"
                      style={{
                        padding: "4px 10px",
                        fontSize: 12,
                        borderRadius: 8,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        cursor: "pointer",
                      }}
                      title="Back to Dashboard"
                    >
                      <FiArrowLeft size={14} />
                      <span>Back</span>
                    </button>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "var(--gradient-primary)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <FiCamera size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text-primary)", lineHeight: 1.2 }}>
                        QR Ticket Scanner
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
                        {selectedEventId ? `Event #${selectedEventId}` : "All Active Events"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {scannerMode === "camera" && !verifiedAttendee && !confirmedSuccess && (
                      <button
                        type="button"
                        onClick={handleSwitchCamera}
                        disabled={switchingCamera || cameraLoading}
                        className="btn btn-sm btn-outline"
                        style={{
                          padding: "4px 10px",
                          fontSize: 11.5,
                          borderRadius: 8,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                        title="Toggle Front / Back Camera"
                      >
                        <FiRepeat size={12} className={switchingCamera ? "spin-icon" : ""} />
                        <span>{cameraChoice === "back" ? "Back Cam" : "Front Cam"}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCloseScanner}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                        padding: 4,
                        display: "flex",
                        alignItems: "center",
                      }}
                      aria-label="Close scanner"
                    >
                      <FiX size={20} />
                    </button>
                  </div>
                </div>

                {/* Modal Body: Compact, Fits 100% on Screen with No Scrolling */}
                <div
                  style={{
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    overflowY: "auto",
                  }}
                >
                  {/* STATE 1: ATTENDANCE CONFIRMED SUCCESS */}
                  {confirmedSuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{ textAlign: "center", padding: "16px 8px" }}
                    >
                      <div
                        style={{
                          width: 58,
                          height: 58,
                          borderRadius: "50%",
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#10b981",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 28,
                          margin: "0 auto 10px",
                          border: "2px solid #10b981",
                        }}
                      >
                        <FiCheck />
                      </div>
                      <h3 style={{ fontSize: 19, fontWeight: 800, color: "#10b981", margin: "0 0 4px 0" }}>
                        Attendance Confirmed!
                      </h3>
                      <p style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 700, margin: "0 0 2px 0" }}>
                        {confirmedSuccess.student_name} ({confirmedSuccess.registration_number || "Student"})
                      </p>
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 16px 0" }}>
                        {confirmedSuccess.event_title} • {confirmedSuccess.checked_in_at}
                      </p>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          type="button"
                          onClick={handleResetScanner}
                          className="btn btn-primary"
                          style={{
                            flex: 2,
                            padding: "12px",
                            fontSize: 14,
                            fontWeight: 700,
                            borderRadius: 12,
                          }}
                        >
                          Scan Next Attendee
                        </button>
                        <button
                          type="button"
                          onClick={handleCloseScanner}
                          className="btn btn-outline"
                          style={{
                            flex: 1,
                            padding: "12px",
                            fontSize: 14,
                            fontWeight: 600,
                            borderRadius: 12,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          <FiArrowLeft size={16} />
                          <span>Back</span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STATE 2: ATTENDEE VERIFIED (CONFIRMATION CARD) */}
                  {!confirmedSuccess && verifiedAttendee && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <div
                        style={{
                          background: "var(--bg-base)",
                          borderRadius: 14,
                          padding: "14px",
                          border: "1px solid var(--border-color)",
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <div>
                            <span style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Attendee Verification
                            </span>
                            <h4 style={{ fontSize: 17, fontWeight: 800, margin: "2px 0 0 0", color: "var(--text-primary)" }}>
                              {verifiedAttendee.student_name}
                            </h4>
                          </div>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 999,
                              background: verifiedAttendee.already_attended ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                              color: verifiedAttendee.already_attended ? "#ef4444" : "#10b981",
                              fontSize: 11.5,
                              fontWeight: 700,
                            }}
                          >
                            {verifiedAttendee.already_attended ? "Already Checked In" : "Valid Pass"}
                          </span>
                        </div>

                        {/* 2x2 Grid Info: Compact, zero scroll */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: 12 }}>
                          <div>
                            <span style={{ color: "var(--text-muted)", fontSize: 10.5, display: "block" }}>Reg No</span>
                            <strong style={{ color: "var(--text-primary)", fontFamily: "monospace" }}>
                              {verifiedAttendee.registration_number || "N/A"}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)", fontSize: 10.5, display: "block" }}>Department</span>
                            <strong style={{ color: "var(--text-primary)" }}>
                              {verifiedAttendee.department || "General"}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)", fontSize: 10.5, display: "block" }}>Event</span>
                            <strong style={{ color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                              {verifiedAttendee.event_title}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)", fontSize: 10.5, display: "block" }}>Ticket Code</span>
                            <strong style={{ color: "#a5b4fc", fontFamily: "monospace" }}>
                              #{verifiedAttendee.ticket_code}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {verifiedAttendee.already_attended && (
                        <div
                          style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            color: "#fca5a5",
                            fontSize: 12,
                            marginBottom: 10,
                          }}
                        >
                          ⚠️ Checked in at {verifiedAttendee.checked_in_at || "previously"} by {verifiedAttendee.checked_in_by || "staff"}.
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          type="button"
                          onClick={handleResetScanner}
                          className="btn btn-outline btn-sm"
                          style={{ flex: 1, padding: "10px", borderRadius: 10, fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                        >
                          <FiArrowLeft size={14} />
                          <span>Back to Scan</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmAttendance}
                          disabled={confirming || verifiedAttendee.already_attended}
                          className="btn btn-primary"
                          style={{
                            flex: 2,
                            padding: "10px",
                            borderRadius: 10,
                            fontWeight: 700,
                            fontSize: 13.5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          {confirming ? "Confirming..." : "✓ Confirm Attendance"}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STATE 3: LIVE SCANNER / CODE ENTRY */}
                  {!confirmedSuccess && !verifiedAttendee && (
                    <div>
                      {/* Compact Mode Switcher */}
                      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setScannerMode("camera");
                            setVerifyError(null);
                          }}
                          className="btn btn-sm"
                          style={{
                            flex: 1,
                            padding: "6px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                            background: scannerMode === "camera" ? "var(--gradient-primary)" : "var(--bg-glass)",
                            color: scannerMode === "camera" ? "#ffffff" : "var(--text-secondary)",
                            border: scannerMode === "camera" ? "none" : "1px solid var(--border-color)",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 5,
                          }}
                        >
                          <FiCamera size={13} /> Live Camera
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setScannerMode("upload");
                            setVerifyError(null);
                          }}
                          className="btn btn-sm"
                          style={{
                            flex: 1,
                            padding: "6px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                            background: scannerMode === "upload" ? "var(--gradient-primary)" : "var(--bg-glass)",
                            color: scannerMode === "upload" ? "#ffffff" : "var(--text-secondary)",
                            border: scannerMode === "upload" ? "none" : "1px solid var(--border-color)",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 5,
                          }}
                        >
                          <FiUpload size={13} /> Upload QR
                        </button>
                      </div>

                      {/* MODE A: LIVE CAMERA */}
                      <div style={{ display: scannerMode === "camera" ? "block" : "none" }}>
                        {cameraError && (
                          <div
                            style={{
                              padding: "10px 12px",
                              borderRadius: 10,
                              background: "rgba(239, 68, 68, 0.1)",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              color: "#fca5a5",
                              fontSize: 12,
                              marginBottom: 10,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 4 }}>
                              <FiAlertCircle size={14} /> Camera Notice
                            </div>
                            <div style={{ marginBottom: 8 }}>{cameraError}</div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={() => handleSelectCamera(cameraChoice)}
                                className="btn btn-sm btn-outline"
                                style={{ fontSize: 11, padding: "4px 10px" }}
                              >
                                <FiRefreshCw size={11} /> Retry
                              </button>
                              <button
                                type="button"
                                onClick={() => setScannerMode("upload")}
                                className="btn btn-sm btn-primary"
                                style={{ fontSize: 11, padding: "4px 10px" }}
                              >
                                <FiUpload size={11} /> Upload QR
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Front-and-Center Live Camera Viewfinder Box with High-Aesthetic Glassmorphism Reticle */}
                        <div style={{ position: "relative", width: "100%", borderRadius: 16, overflow: "hidden", background: "#000" }}>
                          <div
                            id="qr-reader-box"
                            style={{
                              width: "100%",
                              minHeight: 220,
                              background: "#000",
                              borderRadius: 16,
                              overflow: "hidden",
                              position: "relative",
                              border: "1.5px solid rgba(139, 92, 246, 0.4)",
                            }}
                          />

                          {!cameraError && !cameraLoading && (
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                pointerEvents: "none",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 5,
                              }}
                            >
                              <div
                                style={{
                                  width: "65%",
                                  height: "65%",
                                  maxWidth: 210,
                                  maxHeight: 210,
                                  position: "relative",
                                  border: "1.5px solid rgba(168, 85, 247, 0.4)",
                                  borderRadius: 16,
                                  boxShadow: "0 0 30px rgba(139, 92, 246, 0.25)",
                                }}
                              >
                                {!scannerPaused && <div className="qr-laser-line" />}
                                <div className="reticle-corner reticle-tl" />
                                <div className="reticle-corner reticle-tr" />
                                <div className="reticle-corner reticle-bl" />
                                <div className="reticle-corner reticle-br" />
                              </div>

                              <div
                                style={{
                                  position: "absolute",
                                  bottom: 8,
                                  background: "rgba(15, 23, 42, 0.85)",
                                  backdropFilter: "blur(8px)",
                                  WebkitBackdropFilter: "blur(8px)",
                                  border: "1px solid rgba(255, 255, 255, 0.15)",
                                  color: "#e2e8f0",
                                  padding: "3px 12px",
                                  borderRadius: 999,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  letterSpacing: "0.02em",
                                  textAlign: "center",
                                  maxWidth: "92%",
                                }}
                              >
                                {scannerPaused ? "⏸ Scanner Paused" : "Align QR inside reticle • 15–25 cm distance"}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Mobile Camera Action Controls Toolbar (Torch, Zoom, Pause, Restart, Switch) */}
                        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {hasTorch && (
                            <button
                              type="button"
                              onClick={handleToggleTorch}
                              disabled={cameraLoading || !!cameraError}
                              className="btn btn-sm"
                              style={{
                                fontSize: 11,
                                padding: "4px 9px",
                                borderRadius: 8,
                                background: torchOn ? "rgba(234, 179, 8, 0.25)" : "var(--bg-glass)",
                                color: torchOn ? "#facc15" : "var(--text-secondary)",
                                border: torchOn ? "1px solid #facc15" : "1px solid var(--border-color)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                              title="Toggle Flashlight / Torch"
                            >
                              <FiZap size={12} />
                              <span>{torchOn ? "Torch ON" : "Torch"}</span>
                            </button>
                          )}

                          {hasZoom && (
                            <button
                              type="button"
                              onClick={handleCycleZoom}
                              disabled={cameraLoading || !!cameraError}
                              className="btn btn-sm btn-outline"
                              style={{ fontSize: 11, padding: "4px 9px", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 4 }}
                              title="Cycle Camera Zoom Level"
                            >
                              <span>🔍 {zoomLevel}x</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={handleTogglePause}
                            disabled={cameraLoading || !!cameraError}
                            className="btn btn-sm btn-outline"
                            style={{ fontSize: 11, padding: "4px 9px", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 4 }}
                            title={scannerPaused ? "Resume Scanning" : "Pause Scanning"}
                          >
                            {scannerPaused ? <FiPlay size={12} /> : <FiPause size={12} />}
                            <span>{scannerPaused ? "Resume" : "Pause"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleRestartScanner}
                            disabled={cameraLoading}
                            className="btn btn-sm btn-outline"
                            style={{ fontSize: 11, padding: "4px 9px", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 4 }}
                            title="Restart Camera Scanner"
                          >
                            <FiRefreshCw size={12} className={cameraLoading ? "spin-icon" : ""} />
                            <span>Restart</span>
                          </button>

                          {(hasFrontCamera || hasBackCamera) && (
                            <button
                              type="button"
                              onClick={handleSwitchCamera}
                              disabled={switchingCamera || cameraLoading}
                              className="btn btn-sm btn-outline"
                              style={{ fontSize: 11, padding: "4px 9px", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 4 }}
                              title="Switch Camera (Rear / Front)"
                            >
                              <FiRepeat size={12} className={switchingCamera ? "spin-icon" : ""} />
                              <span>{cameraChoice === "back" ? "Front" : "Back"}</span>
                            </button>
                          )}
                        </div>

                        {/* Mobile Scanning Instructions */}
                        <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", margin: "6px 0 0 0" }}>
                          💡 If scanning another phone, tilt slightly to avoid screen glare. Hold steady for autofocus.
                        </p>
                      </div>

                      {/* MODE B: UPLOAD QR IMAGE */}
                      <div style={{ display: scannerMode === "upload" ? "block" : "none" }}>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(e.target.files[0]);
                            }
                          }}
                        />

                        {!uploadedPreview ? (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                handleFileUpload(e.dataTransfer.files[0]);
                              }
                            }}
                            style={{
                              border: "2px dashed rgba(139, 92, 246, 0.5)",
                              borderRadius: 14,
                              padding: "24px 14px",
                              textAlign: "center",
                              cursor: "pointer",
                              background: "rgba(139, 92, 246, 0.05)",
                              transition: "all 0.2s ease",
                            }}
                          >
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                background: "rgba(139, 92, 246, 0.15)",
                                color: "#8b5cf6",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 8px",
                                fontSize: 18,
                              }}
                            >
                              <FiUpload />
                            </div>
                            <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 2px 0", color: "var(--text-primary)" }}>
                              Select or Drop QR Code Image
                            </h4>
                            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                              Tap to pick screenshot or image from gallery
                            </p>
                          </div>
                        ) : (
                          <div
                            style={{
                              borderRadius: 14,
                              padding: 12,
                              background: "var(--bg-glass)",
                              border: "1px solid var(--border-color)",
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <img
                              src={uploadedPreview}
                              alt="QR Preview"
                              style={{
                                width: 60,
                                height: 60,
                                objectFit: "cover",
                                borderRadius: 10,
                                border: "1px solid var(--border-color)",
                              }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                                {uploadedFile?.name || "QR Image"}
                              </div>
                              <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginBottom: 6 }}>
                                {decodingFile ? (
                                  <span style={{ color: "#8b5cf6", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                    <FiRefreshCw className="spin-icon" size={11} /> Decoding...
                                  </span>
                                ) : (
                                  "Ready to verify"
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={handleClearUploadedFile}
                                className="btn btn-sm btn-outline"
                                style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6 }}
                              >
                                Replace
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {verifyError && (
                        <div
                          style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            background: "rgba(239, 68, 68, 0.12)",
                            border: "1px solid rgba(239, 68, 68, 0.35)",
                            color: "#fca5a5",
                            fontSize: 12,
                            marginTop: 8,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                            <FiAlertCircle size={15} style={{ flexShrink: 0 }} />
                            <span>{verifyError}</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleRestartScanner}
                            className="btn btn-sm"
                            style={{
                              padding: "4px 10px",
                              fontSize: 11,
                              borderRadius: 6,
                              background: "rgba(239, 68, 68, 0.2)",
                              color: "#fff",
                              border: "1px solid rgba(239, 68, 68, 0.4)",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <FiRefreshCw size={11} /> Scan Again
                          </button>
                        </div>
                      )}

                      {/* Fast Manual Code Entry Row directly under the scanner without taking vertical space */}
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Or type code (e.g. ESP-12345, BA6436533EF14244)..."
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleVerifyTicket();
                            }}
                            style={{ flex: 1, padding: "7px 12px", fontSize: 12.5, height: 36 }}
                          />
                          <button
                            type="button"
                            onClick={() => handleVerifyTicket()}
                            disabled={verifying || !manualCode.trim()}
                            className="btn btn-primary btn-sm"
                            style={{ padding: "0 14px", fontWeight: 700, height: 36, fontSize: 12.5 }}
                          >
                            {verifying ? "Checking..." : "Verify"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <style>{`
                  #qr-reader-box {
                    width: 100% !important;
                    max-width: 380px !important;
                    margin: 0 auto !important;
                    background: #000000 !important;
                    border-radius: 16px !important;
                    overflow: hidden !important;
                    position: relative !important;
                  }
                  #qr-reader-box video,
                  #qr-reader-box__scan_region video {
                    width: 100% !important;
                    height: auto !important;
                    max-height: 50vh !important;
                    object-fit: contain !important;
                    border-radius: 14px !important;
                    display: block !important;
                    margin: 0 auto !important;
                    -webkit-transform: translateZ(0);
                    transform: translateZ(0);
                  }
                  #qr-reader-box__scan_region {
                    width: 100% !important;
                    height: auto !important;
                    background: transparent !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                  }
                  #qr-reader-box canvas {
                    display: none !important;
                  }
                  #qr-reader-box__dashboard_section,
                  #qr-reader-box__dashboard,
                  #qr-reader-box__header_message {
                    display: none !important;
                  }
                  @keyframes qrLaserMove {
                    0% { top: 6px; opacity: 0.3; }
                    50% { opacity: 1; }
                    100% { top: calc(100% - 8px); opacity: 0.3; }
                  }
                  .qr-laser-line {
                    position: absolute;
                    left: 6px;
                    right: 6px;
                    height: 2.5px;
                    background: linear-gradient(90deg, transparent, #c084fc, #6366f1, transparent);
                    box-shadow: 0 0 12px #c084fc, 0 0 5px #6366f1;
                    border-radius: 999px;
                    animation: qrLaserMove 1.8s ease-in-out infinite alternate;
                  }
                  .reticle-corner {
                    position: absolute;
                    width: 18px;
                    height: 18px;
                    border-color: #c084fc;
                    border-style: solid;
                  }
                  .reticle-tl { top: -2px; left: -2px; border-width: 3px 0 0 3px; border-top-left-radius: 8px; }
                  .reticle-tr { top: -2px; right: -2px; border-width: 3px 3px 0 0; border-top-right-radius: 8px; }
                  .reticle-bl { bottom: -2px; left: -2px; border-width: 0 0 3px 3px; border-bottom-left-radius: 8px; }
                  .reticle-br { bottom: -2px; right: -2px; border-width: 0 3px 3px 0; border-bottom-right-radius: 8px; }
                `}</style>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
      </div>
    </PageTransition>
  );
}
