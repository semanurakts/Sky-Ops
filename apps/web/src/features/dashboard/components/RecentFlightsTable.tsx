
import type { DashboardFlight } from "../types/dashboard.types";
import type { DashboardLanguage } from "./DashboardSidebar";

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface RecentFlightsTableProps {
  flights: DashboardFlight[];
  pagination: PaginationInfo;
  language: DashboardLanguage;
  loading: boolean;
  showArchived: boolean;
  onPageChange: (page: number) => void;
  onCrewSelect: (flightId: string) => void;
  onArchivedToggle: () => void;
}

function RecentFlightsTable({
  flights,
  pagination,
  language,
  loading,
  showArchived,
  onPageChange,
  onCrewSelect,
  onArchivedToggle,
}: RecentFlightsTableProps) {
  const translations = {
    tr: {
      title: "Canlı Uçuş Listesi",
      allFlightsTitle: "Tüm Uçuşlar",
      flight: "Uçuş",
      airline: "Havayolu",
      route: "Rota",
      date: "Tarih / Saat",
      gate: "Kapı",
      pilot: "Kaptan Pilot",
      crew: "Ekip",
      status: "Durum",
      actions: "Detay",
      viewCrew: "Ekibi Gör",
      previous: "Önceki",
      next: "Sonraki",
      page: "Sayfa",
      of: "/",
      total: "toplam uçuş",
      noFlights: "Gösterilecek uçuş bulunamadı.",
      loading: "Uçuşlar yükleniyor...",
      scheduled: "Planlandı",
      boarding: "Yolcu Alımı",
      departed: "Havalandı",
      arrived: "İndi",
      delayed: "Gecikmeli",
      cancelled: "İptal",
      unknown: "Bilinmiyor",
      showArchived: "Arşiv kayıtlarını göster",
      hideArchived: "Arşiv görünümünü kapat",
      archiveHint: "Arşiv kayıtları dahil",
    },
    en: {
      title: "Live Flight List",
      allFlightsTitle: "All Flights",
      flight: "Flight",
      airline: "Airline",
      route: "Route",
      date: "Date / Time",
      gate: "Gate",
      pilot: "Captain Pilot",
      crew: "Crew",
      status: "Status",
      actions: "Details",
      viewCrew: "View Crew",
      previous: "Previous",
      next: "Next",
      page: "Page",
      of: "/",
      total: "total flights",
      noFlights: "No flights to display.",
      loading: "Loading flights...",
      scheduled: "Scheduled",
      boarding: "Boarding",
      departed: "Departed",
      arrived: "Arrived",
      delayed: "Delayed",
      cancelled: "Cancelled",
      unknown: "Unknown",
      showArchived: "Include archived flights",
      hideArchived: "Hide archived flights",
      archiveHint: "Including archived records",
    },
  };

  const t = translations[language];

  const statusLabels: Record<string, string> = {
    SCHEDULED: t.scheduled,
    BOARDING: t.boarding,
    DEPARTED: t.departed,
    ARRIVED: t.arrived,
    DELAYED: t.delayed,
    CANCELLED: t.cancelled,
  };

  const formatDate = (dateValue: string) => {
    const date = new Date(`${dateValue}T12:00:00Z`);

    return new Intl.DateTimeFormat(
      language === "tr" ? "tr-TR" : "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      },
    ).format(date);
  };

  const getPaginationPages = () => {
    const totalPages = pagination.totalPages;

    if (totalPages === 0) return [];

    const start = Math.max(
      1,
      Math.min(pagination.page - 7, totalPages - 14),
    );

    const end = Math.min(start + 14, totalPages);

    return Array.from(
      { length: end - start + 1 },
      (_, index) => start + index,
    );
  };

  const displayedPage =
    pagination.totalPages > 0 ? pagination.page : 0;

  return (
    <section className="dashboard-content-box dashboard-flights-box">
      <div className="dashboard-box-header">
        <div>
          <h2 className="dashboard-box-title">
            {showArchived ? t.allFlightsTitle : t.title}
          </h2>

          <p className="dashboard-table-count">
            {pagination.total} {t.total}
            {showArchived ? ` · ${t.archiveHint}` : ""}
          </p>
        </div>

        <button
          type="button"
          className="dashboard-archive-toggle"
          onClick={onArchivedToggle}
          aria-pressed={showArchived}
        >
          <i className="fa-solid fa-box-archive" />
          <span>
            {showArchived ? t.hideArchived : t.showArchived}
          </span>
        </button>
      </div>

      <div className="dashboard-table-wrapper">
        <table className="dashboard-flight-table">
          <thead>
            <tr>
              <th>{t.flight}</th>
              <th>{t.airline}</th>
              <th>{t.route}</th>
              <th>{t.date}</th>
              <th>{t.gate}</th>
              <th>{t.pilot}</th>
              <th>{t.crew}</th>
              <th>{t.status}</th>
              <th>{t.actions}</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="dashboard-table-message">
                  {t.loading}
                </td>
              </tr>
            ) : flights.length === 0 ? (
              <tr>
                <td colSpan={9} className="dashboard-table-message">
                  {t.noFlights}
                </td>
              </tr>
            ) : (
              flights.map((flight) => (
                <tr key={flight.id}>
                  <td>
                    <strong>{flight.flightNo}</strong>
                  </td>

                  <td>{flight.airlineName ?? "—"}</td>

                  <td>
                    <span className="dashboard-route">
                      {flight.route.replace(" > ", " → ")}
                    </span>
                  </td>

                  <td>
                    <div className="dashboard-flight-datetime">
                      <span>
                        {formatDate(flight.departureDate)}
                      </span>
                      <strong>{flight.departureTime}</strong>
                    </div>
                  </td>

                  <td>{flight.gate ?? "—"}</td>

                  <td>
                    <div className="dashboard-table-pilot">
                      <span className="dashboard-pilot-avatar">
                        <i
                          className={`fa-solid ${
                            flight.pilot?.genderIcon ?? "fa-user"
                          }`}
                        />
                      </span>

                      <span>{flight.pilot?.name ?? "—"}</span>
                    </div>
                  </td>

                  <td>
                    <span className="dashboard-crew-count">
                      <i className="fa-solid fa-users" />
                      {flight.crewCount}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`dashboard-status status-${flight.status.toLowerCase()}`}
                    >
                      {statusLabels[flight.status] ?? t.unknown}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="dashboard-crew-button"
                      onClick={() => onCrewSelect(flight.id)}
                      disabled={!flight.pilot && flight.crewCount === 0}
                    >
                      <i className="fa-solid fa-users" />
                      <span>{t.viewCrew}</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="dashboard-pagination">
        <span className="dashboard-pagination-info">
          {t.page} {displayedPage} {t.of} {pagination.totalPages}
        </span>

        <div className="dashboard-pagination-controls">
          <button
            type="button"
            disabled={!pagination.hasPrevious || loading}
            onClick={() => onPageChange(pagination.page - 1)}
            aria-label={t.previous}
          >
            <i className="fa-solid fa-chevron-left" />
          </button>

          {getPaginationPages().map((page) => (
            <button
              type="button"
              key={page}
              className={page === pagination.page ? "active" : ""}
              disabled={loading}
              onClick={() => onPageChange(page)}
              aria-current={
                page === pagination.page ? "page" : undefined
              }
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            disabled={!pagination.hasNext || loading}
            onClick={() => onPageChange(pagination.page + 1)}
            aria-label={t.next}
          >
            <i className="fa-solid fa-chevron-right" />
          </button>
        </div>
      </div>
    </section>
  );
}

export default RecentFlightsTable;
