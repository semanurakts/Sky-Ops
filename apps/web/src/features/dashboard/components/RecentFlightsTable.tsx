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

type PaginationItem =
  | number
  | "ellipsis-left"
  | "ellipsis-right";

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
      flight: "Uçuş No",
      route: "Rota",
      date: "Tarih / Saat",
      gate: "Kapı",
      status: "Durum",
      crew: "Ekip",
      inspect: "İncele",
      viewCrew: "Ekibi Görüntüle",
      previous: "Önceki",
      next: "Sonraki",
      noFlights: "Gösterilecek uçuş bulunamadı.",
      loading: "Uçuşlar yükleniyor...",
      scheduled: "Zamanında",
      boarding: "Yolcu Alımı",
      departed: "Havalandı",
      arrived: "İndi",
      delayed: "Gecikmeli",
      cancelled: "İptal",
      unknown: "Tanımsız",
      showArchived: "Arşiv kayıtlarını göster",
      hideArchived: "Arşiv görünümünü kapat",
      archiveHint: "Arşiv kayıtları dahil",
    },
    en: {
      title: "Live Flight List",
      allFlightsTitle: "All Flights",
      flight: "Flight No",
      route: "Route",
      date: "Date / Time",
      gate: "Gate",
      status: "Status",
      crew: "Crew",
      inspect: "Inspect",
      viewCrew: "View Crew",
      previous: "Previous",
      next: "Next",
      noFlights: "No flights to display.",
      loading: "Loading flights...",
      scheduled: "On Time",
      boarding: "Boarding",
      departed: "Departed",
      arrived: "Landed",
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

  const statusClasses: Record<string, string> = {
    SCHEDULED: "status-on-time",
    BOARDING: "status-default",
    DEPARTED: "status-default",
    ARRIVED: "status-landed",
    DELAYED: "status-delayed",
    CANCELLED: "status-cancelled",
  };

  const formatDate = (dateValue: string) => {
    const [year, month, day] = dateValue.split("-");
    return `${day}.${month}.${year}`;
  };

  const getPaginationItems = (): PaginationItem[] => {
    const totalPages = pagination.totalPages;

    if (totalPages <= 1) return [];

    let startPage = Math.max(1, pagination.page - 7);
    let endPage = Math.min(totalPages, startPage + 14);

    if (endPage - startPage < 14) {
      startPage = Math.max(1, endPage - 14);
    }

    const items: PaginationItem[] = [];

    if (startPage > 1) {
      items.push(1);

      if (startPage > 2) {
        items.push("ellipsis-left");
      }
    }

    for (let page = startPage; page <= endPage; page++) {
      items.push(page);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push("ellipsis-right");
      }

      items.push(totalPages);
    }

    return items;
  };

  return (
    <section className="dashboard-content-box dashboard-flights-box">
      <div className="dashboard-box-header">
        <div>
          <h2 className="dashboard-box-title">
            {showArchived ? t.allFlightsTitle : t.title}
          </h2>
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
              <th>{t.route}</th>
              <th>{t.date}</th>
              <th>{t.gate}</th>
              <th>{t.status}</th>
              <th>{t.crew}</th>
              <th>{t.inspect}</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="dashboard-table-message">
                  {t.loading}
                </td>
              </tr>
            ) : flights.length === 0 ? (
              <tr>
                <td colSpan={7} className="dashboard-table-message">
                  {t.noFlights}
                </td>
              </tr>
            ) : (
              flights.map((flight) => (
                <tr key={flight.id}>
                  <td>
                    <strong className="dashboard-flight-number">
                      {flight.flightNo}
                    </strong>
                  </td>

                  <td>
                    <span className="dashboard-route">
                      {flight.route}
                    </span>
                  </td>

                  <td>
                    <div className="dashboard-flight-datetime">
                      <span>{formatDate(flight.departureDate)}</span>
                      <strong>{flight.departureTime}</strong>
                    </div>
                  </td>

                  <td>
                    <span className="dashboard-gate-badge">
                      {flight.gate ?? "—"}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`dashboard-status ${
                        statusClasses[flight.status] ?? "status-default"
                      }`}
                    >
                      {statusLabels[flight.status] ?? t.unknown}
                    </span>
                  </td>

                  <td>
                    <div className="dashboard-crew-cell">
                      <div className="dashboard-table-pilot">
                        <i
                          className={`fa-solid ${
                            flight.pilot?.genderIcon ?? "fa-question-circle"
                          } dashboard-pilot-icon`}
                          aria-hidden="true"
                        />

                        <span>
                          {flight.pilot?.name ?? t.unknown}
                        </span>
                      </div>

                      {flight.crewCount > 0 && (
                        <button
                          type="button"
                          className="dashboard-crew-count-button"
                          onClick={() => onCrewSelect(flight.id)}
                        >
                          +{flight.crewCount} {t.crew}
                        </button>
                      )}
                    </div>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="dashboard-inspect-button"
                      onClick={() => onCrewSelect(flight.id)}
                      title={t.viewCrew}
                      aria-label={`${t.viewCrew}: ${flight.flightNo}`}
                    >
                      <i className="fa-solid fa-eye" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="dashboard-pagination">
        <div className="dashboard-pagination-controls">
          <button
            type="button"
            disabled={!pagination.hasPrevious || loading}
            onClick={() => onPageChange(pagination.page - 1)}
            aria-label={t.previous}
          >
            <i className="fa-solid fa-chevron-left" />
          </button>

          {getPaginationItems().map((item) =>
            typeof item === "number" ? (
              <button
                type="button"
                key={item}
                className={item === pagination.page ? "active" : ""}
                disabled={loading}
                onClick={() => onPageChange(item)}
                aria-current={
                  item === pagination.page ? "page" : undefined
                }
              >
                {item}
              </button>
            ) : (
              <span
                key={item}
                className="dashboard-pagination-ellipsis"
              >
                ...
              </span>
            ),
          )}

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
