/**
 * Universal Cross-Device & Mobile-Friendly File / PDF Download Utility
 * 
 * Supports:
 * - Desktop Chrome, Edge, Firefox, Safari (HTML5 a[download] with delayed blob URL cleanup)
 * - iOS Safari & iPadOS (Web Share API to "Save to Files" or fallback tab opening)
 * - Android Chrome, Firefox, Samsung Internet (Web Share API or native downloads)
 * - Safe Blob conversion, error handling, and duplicate click prevention
 */

export function isMobileDevice() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  const isTouchMac = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  return isMobileUA || isTouchMac;
}

export function isIOS() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  const isTouchMac = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/i.test(ua) || isTouchMac;
}

/**
 * Downloads or shares a Blob/binary file across any desktop or mobile browser.
 * 
 * @param {Blob|ArrayBuffer|Uint8Array} blobData - The file content
 * @param {string} filename - The target filename with extension (e.g. "report.pdf")
 * @param {string} mimeType - The MIME type (default "application/pdf")
 * @returns {Promise<{success: boolean, method: string}>}
 */
export async function downloadBlobOrFile(blobData, filename = "document.pdf", mimeType = "application/pdf") {
  if (!blobData) {
    throw new Error("No file content received for download.");
  }

  // Ensure blob instance with correct MIME type
  let blob;
  if (blobData instanceof Blob) {
    blob = blobData.type === mimeType ? blobData : new Blob([blobData], { type: mimeType });
  } else {
    blob = new Blob([blobData], { type: mimeType });
  }

  if (blob.size === 0) {
    throw new Error("The generated file is empty.");
  }

  // EventSphere report/export downloads are PDF-only. Prevent HTML/JSON error
  // responses from being silently saved with a .pdf extension.
  if (mimeType === "application/pdf") {
    const signature = new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer());
    if (signature !== "%PDF-") {
      throw new Error("The server did not return a valid PDF file. Please retry the download.");
    }
  }

  const safeFilename = (filename || "document.pdf").replace(/[/\\?%*:|"<>]/g, "_");
  const isMobile = isMobileDevice();

  // 1. Mobile devices: Try Web Share API with File if supported (native "Save to Files" / "Downloads")
  if (isMobile && typeof navigator !== "undefined" && typeof navigator.canShare === "function" && typeof File !== "undefined") {
    try {
      const file = new File([blob], safeFilename, {
        type: mimeType,
        lastModified: Date.now(),
      });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: safeFilename,
        });
        return { success: true, method: "share" };
      }
    } catch (shareErr) {
      // User tapped cancel or closed the share sheet
      if (shareErr.name === "AbortError") {
        return { success: true, method: "share-cancelled" };
      }
      // Otherwise fall through to standard download / open tab
      console.warn("Web Share API failed, falling back to download link:", shareErr);
    }
  }

  // 2. Standard Browser Object URL Download with safe delayed revocation
  const url = window.URL.createObjectURL(blob);

  // Safe delayed cleanup: Never revoke immediately as mobile browsers download asynchronously!
  const scheduleCleanup = (objUrl) => {
    setTimeout(() => {
      try {
        window.URL.revokeObjectURL(objUrl);
      } catch (e) {
        // ignore
      }
    }, 90000); // 90 seconds retention
  };

  try {
    const link = document.createElement("a");
    link.style.display = "none";
    link.href = url;
    link.download = safeFilename;
    link.setAttribute("download", safeFilename);
    link.rel = "noopener noreferrer";

    // iOS Safari fallback when download attribute is ignored
    if (isIOS()) {
      link.target = "_blank";
    }

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) {
        document.body.removeChild(link);
      }
    }, 200);

    scheduleCleanup(url);
    return { success: true, method: "download" };
  } catch (downloadErr) {
    console.error("Direct anchor click failed:", downloadErr);
    // 3. Fallback: Open URL in new window/tab for user to save
    try {
      const newTab = window.open(url, "_blank", "noopener,noreferrer");
      if (newTab) {
        scheduleCleanup(url);
        return { success: true, method: "tab" };
      }
    } catch (openErr) {
      console.error("Popup window open failed:", openErr);
    }
    scheduleCleanup(url);
    throw new Error("Unable to trigger file download on this browser.");
  }
}
