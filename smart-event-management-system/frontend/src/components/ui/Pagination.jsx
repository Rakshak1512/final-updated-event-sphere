import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function Pagination({ page, pageSize, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 28 }}>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <FiChevronLeft /> Prev
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          className="btn btn-sm"
          style={{
            background: p === page ? "var(--gradient-primary)" : "transparent",
            color: p === page ? "#fff" : "var(--text-primary)",
            border: p === page ? "none" : "1.5px solid var(--border-color)",
            minWidth: 38,
          }}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className="btn btn-outline btn-sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        Next <FiChevronRight />
      </button>
    </div>
  );
}
