import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiSearch, FiDownload } from "react-icons/fi";
import PublicNavbar from "../../components/landing/PublicNavbar.jsx";
import PublicFooter from "../../components/landing/PublicFooter.jsx";
import EventCard from "../../components/dashboard/EventCard.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { SkeletonGrid } from "../../components/ui/Loader.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Modal from "../../components/ui/Modal.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import { eventService, registrationService } from "../../api/services.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { fileUrl } from "../../utils/format.js";
import QRCodeDisplay from "../../components/common/QRCodeDisplay.jsx";

export default function EventsBrowse({ embedded = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState(null);
  const [qrModal, setQrModal] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    category: "",
    sort_by: "event_date",
    sort_order: "asc",
    page: 1,
    page_size: 9,
  });

  useEffect(() => {
    eventService
      .categories()
      .then(({ data }) => {
        const categoryList = Array.isArray(data)
          ? data
          : Array.isArray(data?.categories)
          ? data.categories
          : [];
        setCategories(categoryList);
      })
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { ...filters };
    if (!params.search) delete params.search;
    if (!params.category) delete params.category;
    eventService
      .list(params)
      .then(({ data }) => {
        const itemList = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setEvents(itemList);
        setTotal(data?.total ?? itemList.length);
      })
      .catch(() => {
        toast.error("Could not load events");
        setEvents([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [filters]);

  const [searchVal, setSearchVal] = useState("");

  // Debounced search update
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchVal.trim(), page: 1 }));
    }, 280);
    return () => clearTimeout(timer);
  }, [searchVal]);

  const update = (patch) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  const handleRegister = async (eventId) => {
    if (!user) {
      toast("Please login to register", { icon: "🔒" });
      navigate("/login");
      return;
    }
    if (user.role !== "student") {
      toast.error("Only students can register for events");
      return;
    }
    setRegisteringId(eventId);
    try {
      const { data: reg } = await registrationService.register(eventId);
      toast.success("Registered! Your QR ticket is ready.");
      setQrModal(reg);
      setFilters((f) => ({ ...f }));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed");
    } finally {
      setRegisteringId(null);
    }
  };

  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeEvents = Array.isArray(events) ? events : [];

  const content = (
    <>
      <div className="section-head">
        <div>
          <h1 className="page-title">Browse Events</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Find your next hackathon, workshop, or fest.</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 18, marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--input-bg)", border: "1.5px solid var(--border-color)", borderRadius: 999, padding: "9px 16px", flex: "1 1 240px" }}>
          <FiSearch color="var(--text-muted)" />
          <input
            placeholder="Search by title, venue, category..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            style={{ border: "none", background: "transparent", outline: "none", color: "var(--text-primary)", width: "100%", fontSize: 14 }}
          />
          {searchVal && (
            <button
              type="button"
              onClick={() => setSearchVal("")}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}
            >
              ✕
            </button>
          )}
        </div>
        <select className="form-select" style={{ width: 180 }} value={filters.category} onChange={(e) => update({ category: e.target.value })}>
          <option value="">All categories</option>
          {safeCategories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="form-select"
          style={{ width: 200 }}
          value={`${filters.sort_by}:${filters.sort_order}`}
          onChange={(e) => {
            const [sort_by, sort_order] = e.target.value.split(":");
            update({ sort_by, sort_order });
          }}
        >
          <option value="event_date:asc">Date (soonest first)</option>
          <option value="event_date:desc">Date (latest first)</option>
          <option value="title:asc">Title (A-Z)</option>
          <option value="available_seats:desc">Most seats available</option>
        </select>
      </div>

      {loading ? (
        <SkeletonGrid count={6} />
      ) : safeEvents.length === 0 ? (
        <EmptyState title="No events found" message="Try adjusting your search or filters." />
      ) : (
        <>
          <div className="grid-cards">
            {safeEvents.map((ev, i) => (
              <EventCard
                key={ev.id}
                event={ev}
                index={i}
                actionSlot={
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    disabled={ev.available_seats <= 0 || registeringId === ev.id}
                    onClick={() => handleRegister(ev.id)}
                  >
                    {ev.available_seats <= 0 ? "Full" : registeringId === ev.id ? "Registering..." : "Register"}
                  </button>
                }
              />
            ))}
          </div>
          <Pagination page={filters.page} pageSize={filters.page_size} total={total} onPageChange={(page) => update({ page })} />
        </>
      )}

      <Modal open={!!qrModal} onClose={() => setQrModal(null)} title="Your Event Ticket" width={380}>
        {qrModal && (
          <div style={{ textAlign: "center" }}>
            <div style={{ background: "#ffffff", padding: 12, borderRadius: 16, display: "inline-block", marginBottom: 16 }}>
              <QRCodeDisplay
                registration={qrModal}
                ticketCode={qrModal.ticket_code}
                size={200}
                alt={`QR Ticket Pass - ${qrModal.ticket_code || qrModal.id}`}
              />
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{qrModal.event?.title || "Event Registration"}</h4>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
              Ticket Code: <strong style={{ color: "#8b5cf6" }}>#{qrModal.ticket_code}</strong>
            </p>
            <button
              className="btn btn-outline btn-sm"
              style={{ width: "100%" }}
              onClick={() => registrationService.downloadSlip(qrModal.id)}
            >
              <FiDownload /> Download Slip PDF
            </button>
          </div>
        )}
      </Modal>
    </>
  );

  if (embedded) return content;

  return (
    <PageTransition>
      <PublicNavbar />
      <section className="container" style={{ padding: "48px 24px 90px" }}>{content}</section>
      <PublicFooter />
    </PageTransition>
  );
}
