import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  FiSearch,
  FiDownload,
  FiGrid,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiMapPin,
  FiUsers,
  FiArrowRight,
  FiInfo,
  FiTag,
} from "react-icons/fi";
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
import { formatDate, fileUrl } from "../../utils/format.js";
import QRCodeDisplay from "../../components/common/QRCodeDisplay.jsx";
import EventImage from "../../components/common/EventImage.jsx";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function EventsBrowse({ embedded = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState(null);
  const [qrModal, setQrModal] = useState(null);

  // View mode: "grid" or "calendar"
  const [viewMode, setViewMode] = useState("grid");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState(null);
  const [selectedDayEventsModal, setSelectedDayEventsModal] = useState(null);

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

  // Fetch paginated events for Grid View
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

  // Fetch all events for Calendar View
  useEffect(() => {
    if (viewMode === "calendar") {
      setCalendarLoading(true);
      const params = {
        page: 1,
        page_size: 250,
        sort_by: "event_date",
        sort_order: "asc",
      };
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;

      eventService
        .list(params)
        .then(({ data }) => {
          const itemList = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
          setCalendarEvents(itemList);
        })
        .catch(() => {
          setCalendarEvents([]);
        })
        .finally(() => setCalendarLoading(false));
    }
  }, [viewMode, filters.search, filters.category]);

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
      if (selectedCalendarEvent?.id === eventId) {
        setSelectedCalendarEvent((prev) =>
          prev ? { ...prev, available_seats: Math.max(0, (prev.available_seats || 1) - 1) } : null
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed");
    } finally {
      setRegisteringId(null);
    }
  };

  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeEvents = Array.isArray(events) ? events : [];

  // Calendar calculations
  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const handlePrevMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCalendarDate(new Date());
  };

  const isToday = (day) => {
    const now = new Date();
    return (
      now.getFullYear() === currentYear &&
      now.getMonth() === currentMonth &&
      now.getDate() === day
    );
  };

  const getEventsForDay = (day) => {
    return calendarEvents.filter((ev) => {
      if (!ev.event_date) return false;
      const d = new Date(ev.event_date);
      return (
        d.getFullYear() === currentYear &&
        d.getMonth() === currentMonth &&
        d.getDate() === day
      );
    });
  };

  const getDetailPath = (eventId) => {
    if (user?.role === "student") return `/student/events/${eventId}`;
    if (user?.role === "faculty") return `/faculty/events/${eventId}`;
    return `/events/${eventId}`;
  };

  const content = (
    <>
      <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">Browse Events</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Find your next hackathon, workshop, or fest in grid or interactive calendar view.
          </p>
        </div>

        {/* View Switcher: Grid View / Calendar View */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "var(--bg-glass, rgba(255, 255, 255, 0.05))",
            padding: 4,
            borderRadius: 12,
            border: "1px solid var(--border-color)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className="btn btn-sm"
            style={{
              background: viewMode === "grid" ? "var(--gradient-primary)" : "transparent",
              color: viewMode === "grid" ? "#fff" : "var(--text-secondary)",
              borderRadius: 8,
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <FiGrid size={15} />
            <span>Grid View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className="btn btn-sm"
            style={{
              background: viewMode === "calendar" ? "var(--gradient-primary)" : "transparent",
              color: viewMode === "calendar" ? "#fff" : "var(--text-secondary)",
              borderRadius: 8,
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <FiCalendar size={15} />
            <span>Calendar View</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: 18, marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
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
        {viewMode === "grid" && (
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
        )}
      </div>

      {/* VIEW MODE 1: GRID VIEW */}
      {viewMode === "grid" && (
        <>
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
        </>
      )}

      {/* VIEW MODE 2: INTERACTIVE CALENDAR VIEW */}
      {viewMode === "calendar" && (
        <div className="glass-card" style={{ padding: 20, borderRadius: 20, overflow: "hidden" }}>
          {/* Calendar Month Navigation Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: "1px solid var(--border-color)",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "var(--gradient-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                <FiCalendar size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                  {monthNames[currentMonth]} {currentYear}
                </h2>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {calendarEvents.length} events scheduled in EventSphere
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="btn btn-outline btn-sm"
                style={{ borderRadius: 8, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 4 }}
                title="Previous Month"
              >
                <FiChevronLeft size={16} />
                <span>Prev</span>
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="btn btn-outline btn-sm"
                style={{ borderRadius: 8, padding: "6px 14px", fontWeight: 700 }}
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="btn btn-outline btn-sm"
                style={{ borderRadius: 8, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 4 }}
                title="Next Month"
              >
                <span>Next</span>
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Responsive Touch Scroll Container for Mobile / Tablets */}
          <div className="calendar-scroll-wrap">
            <div className="calendar-inner-container">
              {/* Days of the Week Header */}
              <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 6,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            {daysOfWeek.map((dayName, idx) => (
              <div
                key={dayName}
                style={{
                  padding: "8px 4px",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: idx === 0 || idx === 6 ? "#a78bfa" : "var(--text-secondary)",
                }}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Calendar Day Grid */}
          {calendarLoading ? (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <SkeletonGrid count={7} />
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 6,
              }}
            >
              {/* Previous Month Padding Days */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => {
                const dayNum = daysInPrevMonth - firstDayOfWeek + i + 1;
                return (
                  <div
                    key={`prev-${i}`}
                    style={{
                      minHeight: 105,
                      padding: 8,
                      borderRadius: 12,
                      background: "rgba(255, 255, 255, 0.01)",
                      border: "1px dashed rgba(255, 255, 255, 0.05)",
                      opacity: 0.35,
                    }}
                  >
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                      {dayNum}
                    </span>
                  </div>
                );
              })}

              {/* Current Month Days */}
              {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDay(day);
                const isCurrentToday = isToday(day);

                return (
                  <motion.div
                    key={`day-${day}`}
                    whileHover={{ scale: 1.01 }}
                    style={{
                      minHeight: 115,
                      padding: "8px 6px",
                      borderRadius: 12,
                      background: isCurrentToday
                        ? "rgba(139, 92, 246, 0.08)"
                        : "var(--bg-base, rgba(255, 255, 255, 0.03))",
                      border: isCurrentToday
                        ? "1.5px solid #8b5cf6"
                        : "1px solid var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-start",
                      transition: "border-color 0.2s ease",
                      position: "relative",
                    }}
                  >
                    {/* Day Number Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: isCurrentToday ? 800 : 600,
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: isCurrentToday ? "var(--gradient-primary)" : "transparent",
                          color: isCurrentToday ? "#fff" : "var(--text-primary)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {day}
                      </span>
                      {dayEvents.length > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: "1px 6px",
                            borderRadius: 999,
                            background: "rgba(139, 92, 246, 0.18)",
                            color: "#c4b5fd",
                            fontWeight: 700,
                          }}
                        >
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Events List on this Day */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedCalendarEvent(ev)}
                          title={`${ev.title} (${ev.category || "Event"})`}
                          style={{
                            padding: "3px 6px",
                            borderRadius: 6,
                            background: "rgba(139, 92, 246, 0.16)",
                            border: "1px solid rgba(139, 92, 246, 0.3)",
                            fontSize: 11,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            color: "var(--text-primary)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: ev.available_seats <= 0 ? "#ef4444" : "#10b981",
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>
                            {ev.title}
                          </span>
                        </div>
                      ))}

                      {dayEvents.length > 3 && (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedDayEventsModal({
                              day,
                              date: new Date(currentYear, currentMonth, day),
                              events: dayEvents,
                            })
                          }
                          style={{
                            background: "none",
                            border: "none",
                            color: "#8b5cf6",
                            fontSize: 10.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            padding: "2px 4px",
                            textAlign: "left",
                          }}
                        >
                          +{dayEvents.length - 3} more
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Next Month Padding Days to Complete Row of 7 */}
              {(() => {
                const totalCells = firstDayOfWeek + daysInCurrentMonth;
                const remainingCells = (7 - (totalCells % 7)) % 7;
                return Array.from({ length: remainingCells }).map((_, i) => (
                  <div
                    key={`next-${i}`}
                    style={{
                      minHeight: 105,
                      padding: 8,
                      borderRadius: 12,
                      background: "rgba(255, 255, 255, 0.01)",
                      border: "1px dashed rgba(255, 255, 255, 0.05)",
                      opacity: 0.35,
                    }}
                  >
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                      {i + 1}
                    </span>
                  </div>
                ));
              })()}
            </div>
          )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CALENDAR SINGLE EVENT PREVIEW & REGISTRATION */}
      <Modal
        open={!!selectedCalendarEvent}
        onClose={() => setSelectedCalendarEvent(null)}
        title={selectedCalendarEvent?.title || "Event Details"}
        width={460}
      >
        {selectedCalendarEvent && (
          <div>
            <div
              style={{
                height: 160,
                borderRadius: 14,
                overflow: "hidden",
                marginBottom: 16,
                position: "relative",
              }}
            >
              <EventImage
                src={selectedCalendarEvent.poster_url}
                alt={selectedCalendarEvent.title}
                category={selectedCalendarEvent.category}
              />
              <span
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "rgba(15, 23, 42, 0.8)",
                  backdropFilter: "blur(8px)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#fff",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
              >
                {selectedCalendarEvent.category || "Event"}
              </span>
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 10px 0", color: "var(--text-primary)" }}>
              {selectedCalendarEvent.title}
            </h3>

            {selectedCalendarEvent.description && (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                  marginBottom: 14,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {selectedCalendarEvent.description}
              </p>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                padding: "12px",
                background: "var(--bg-base, rgba(255,255,255,0.03))",
                borderRadius: 12,
                border: "1px solid var(--border-color)",
                marginBottom: 18,
                fontSize: 12.5,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FiCalendar color="#8b5cf6" size={15} />
                <span>{formatDate(selectedCalendarEvent.event_date)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FiClock color="#8b5cf6" size={15} />
                <span>{selectedCalendarEvent.event_time || "Scheduled"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FiMapPin color="#8b5cf6" size={15} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedCalendarEvent.venue || "Campus Venue"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FiUsers color="#8b5cf6" size={15} />
                <span>
                  {selectedCalendarEvent.available_seats <= 0
                    ? "Full Capacity"
                    : `${selectedCalendarEvent.available_seats} Seats Left`}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 2, padding: "11px", fontWeight: 700 }}
                disabled={
                  selectedCalendarEvent.available_seats <= 0 ||
                  registeringId === selectedCalendarEvent.id
                }
                onClick={() => handleRegister(selectedCalendarEvent.id)}
              >
                {selectedCalendarEvent.available_seats <= 0
                  ? "Event Full"
                  : registeringId === selectedCalendarEvent.id
                  ? "Registering..."
                  : "Register Now"}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1, padding: "11px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                onClick={() => {
                  const path = getDetailPath(selectedCalendarEvent.id);
                  setSelectedCalendarEvent(null);
                  navigate(path);
                }}
              >
                <span>Details</span>
                <FiArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: DAY EVENTS LIST (WHEN DAY HAS MANY EVENTS) */}
      <Modal
        open={!!selectedDayEventsModal}
        onClose={() => setSelectedDayEventsModal(null)}
        title={`Events on ${selectedDayEventsModal ? formatDate(selectedDayEventsModal.date) : ""}`}
        width={420}
      >
        {selectedDayEventsModal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {selectedDayEventsModal.events.map((ev) => (
              <div
                key={ev.id}
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  background: "var(--bg-base, rgba(255,255,255,0.03))",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ overflow: "hidden" }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 3px 0", color: "var(--text-primary)" }}>
                    {ev.title}
                  </h4>
                  <div style={{ fontSize: 11.5, color: "var(--text-secondary)", display: "flex", gap: 8, alignItems: "center" }}>
                    <span>{ev.category || "General"}</span>
                    <span>•</span>
                    <span>{ev.event_time || "All day"}</span>
                    <span>•</span>
                    <span style={{ color: ev.available_seats <= 0 ? "#ef4444" : "#10b981", fontWeight: 600 }}>
                      {ev.available_seats <= 0 ? "Full" : `${ev.available_seats} seats`}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDayEventsModal(null);
                      setSelectedCalendarEvent(ev);
                    }}
                    className="btn btn-outline btn-sm"
                    style={{ padding: "6px 10px", fontSize: 12 }}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    disabled={ev.available_seats <= 0 || registeringId === ev.id}
                    onClick={() => handleRegister(ev.id)}
                    className="btn btn-primary btn-sm"
                    style={{ padding: "6px 12px", fontSize: 12 }}
                  >
                    {ev.available_seats <= 0 ? "Full" : registeringId === ev.id ? "..." : "Register"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* QR TICKET MODAL */}
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
