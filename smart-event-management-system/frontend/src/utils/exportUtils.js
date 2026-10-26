/**
 * Export and Filename Utilities for EventSphere
 * Standardized for genuine official PDF report generation.
 */

/**
 * Creates clean, slugified filename segments from titles and suffixes
 * @param {string} title
 * @param {string} suffix
 * @returns {string} Safe filename segment
 */
export function slugifyFilename(title, suffix) {
  const clean = (title || "event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return suffix ? `${clean}-${suffix}` : clean;
}
