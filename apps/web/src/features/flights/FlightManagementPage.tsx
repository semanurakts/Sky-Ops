
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import type { DashboardLanguage } from "../dashboard/components/DashboardSidebar";

import "./FlightManagementPage.css";

type FlightStatus =
  | "SCHEDULED"
  | "BOARDING"
  | "DEPARTED"
  | "ARRIVED"
  | "DELAYED"
  | "CANCELLED";

type OperationFilter = "all" | "active" | "completed";

interface AirportOption {
  id: string;
  code: string;
  name: string;
  city: { name: string };
}

interface AirlineOption {
  id: string;
  code: string;
  name: string;
}

interface PersonnelOption {
  id: string;
  name: string;
  role: string;
  status: string;
  fatiguePoint: number;
  currentAirportId: string | null;
  currentLocation: string | null;
  currentAirport: {
    code: string;
    name: string;
  } | null;
}

interface RouteDurationOption {
  originAirportId: string;
  destinationAirportId: string;
  durationMinutes: number;
}

interface FlightOptions {
  airlines: AirlineOption[];
  airports: AirportOption[];
  pilots: PersonnelOption[];
  cabinCrew: PersonnelOption[];
  routeDurations: RouteDurationOption[];
}

interface FlightRow {
  id: string;
  flightNo: string;
  route: string;
  departureDate: string;
  departureTime: string;
  gate: string | null;
  status: FlightStatus;
  airlineId: string;
  originAirportId: string;
  destinationAirportId: string;
  pilotId: string | null;
  airlineName: string | null;
  airlineCode: string | null;
  originAirport: {
    code: string;
    name: string;
  } | null;
  destinationAirport: {
    code: string;
    name: string;
  } | null;
  pilot: {
    id: string;
    name: string;
  } | null;
  crewCount: number;
}

interface FlightDetails extends FlightRow {
  crew: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

interface FlightListResponse {
  flights: FlightRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

interface FlightFormState {
  airlineId: string;
  flightNumber: string;
  originAirportId: string;
  destinationAirportId: string;
  departureDate: string;
  departureTime: string;
  gate: string;
  pilotId: string;
  crewIds: string[];
}

interface ApiError {
  error?: {
    code?: string;
    message?: string;
  };
}

const PAGE_SIZE = 10;

const STATUSES: FlightStatus[] = [
  "SCHEDULED",
  "BOARDING",
  "DEPARTED",
  "ARRIVED",
  "DELAYED",
  "CANCELLED",
];

const STATUS_TRANSITIONS: Record<FlightStatus, FlightStatus[]> = {
  SCHEDULED: ["DELAYED", "BOARDING", "CANCELLED"],
  DELAYED: ["SCHEDULED", "BOARDING", "CANCELLED"],
  BOARDING: ["DEPARTED"],
  DEPARTED: ["ARRIVED"],
  ARRIVED: [],
  CANCELLED: [],
};

function getLocalDate(daysFromToday = 1): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createEmptyForm(): FlightFormState {
  return {
    airlineId: "",
    flightNumber: "",
    originAirportId: "",
    destinationAirportId: "",
    departureDate: getLocalDate(),
    departureTime: "12:00",
    gate: "",
    pilotId: "",
    crewIds: [],
  };
}

async function flightApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const result: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = result as ApiError | null;

    throw new Error(
      error?.error?.message ??
        `Request failed with status ${response.status}`,
    );
  }

  return result as T;
}

function getStatusLabel(
  status: FlightStatus,
  language: DashboardLanguage,
): string {
  const labels: Record<FlightStatus, { tr: string; en: string }> = {
    SCHEDULED: { tr: "Planlandı", en: "Scheduled" },
    BOARDING: { tr: "Yolcu Alımı", en: "Boarding" },
    DEPARTED: { tr: "Havalandı", en: "Departed" },
    ARRIVED: { tr: "İndi", en: "Arrived" },
    DELAYED: { tr: "Gecikmeli", en: "Delayed" },
    CANCELLED: { tr: "İptal", en: "Cancelled" },
  };

  return labels[status][language];
}

function formatFlightDate(
  value: string,
  language: DashboardLanguage,
): string {
  const date = new Date(`${value}T12:00:00Z`);

  return new Intl.DateTimeFormat(
    language === "tr" ? "tr-TR" : "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(date);
}

function isAtOrigin(
  person: PersonnelOption,
  originAirportId: string,
): boolean {
  const airport = person.currentAirportId === originAirportId;

  const hasNoLocation =
    !person.currentAirportId && !person.currentLocation;

  return airport || hasNoLocation;
}

function FlightManagementPage({
  language,
}: {
  language: DashboardLanguage;
}) {
  const tr = language === "tr";

  const [options, setOptions] = useState<FlightOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");

  const [flights, setFlights] = useState<FlightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [operation, setOperation] =
    useState<OperationFilter>("all");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [refreshKey, setRefreshKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FlightFormState>(createEmptyForm());
  const [formSaving, setFormSaving] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [statusUpdatingId, setStatusUpdatingId] =
    useState<string | null>(null);

  const [notice, setNotice] = useState("");

  const copy = {
    title: tr ? "Uçuş Yönetimi" : "Flight Management",
    subtitle: tr
      ? "Uçuş planlarını, durumlarını ve ekip atamalarını yönetin."
      : "Manage flight schedules, statuses and crew assignments.",
    addFlight: tr ? "Yeni Uçuş" : "Add Flight",
    all: tr ? "Tüm Uçuşlar" : "All Flights",
    active: tr ? "Aktif / Yaklaşan" : "Active / Upcoming",
    completed: tr ? "Tamamlanan" : "Completed",
    search: tr ? "Uçuş no veya rota ara..." : "Search flight no or route...",
    status: tr ? "Tüm Durumlar" : "All Statuses",
    dateFrom: tr ? "Başlangıç tarihi" : "From date",
    dateTo: tr ? "Bitiş tarihi" : "To date",
    flight: tr ? "Uçuş No" : "Flight",
    airline: tr ? "Havayolu" : "Airline",
    route: tr ? "Rota" : "Route",
    date: tr ? "Tarih / Saat" : "Date / Time",
    gate: tr ? "Kapı" : "Gate",
    pilot: tr ? "Pilot" : "Pilot",
    crew: tr ? "Kabin Ekibi" : "Cabin Crew",
    actions: tr ? "İşlemler" : "Actions",
    noFlights: tr ? "Uçuş bulunamadı." : "No flights found.",
    loading: tr ? "Uçuşlar yükleniyor..." : "Loading flights...",
    previous: tr ? "Önceki" : "Previous",
    next: tr ? "Sonraki" : "Next",
    page: tr ? "Sayfa" : "Page",
    of: tr ? "/" : "of",
    total: tr ? "uçuş" : "flights",
    createTitle: tr ? "Yeni Uçuş Oluştur" : "Create New Flight",
    editTitle: tr ? "Uçuşu Düzenle" : "Edit Flight",
    flightNumber: tr ? "Sefer numarası" : "Flight number",
    selectAirline: tr ? "Havayolu seçin" : "Select airline",
    origin: tr ? "Kalkış havalimanı" : "Origin airport",
    destination: tr ? "Varış havalimanı" : "Destination airport",
    departureDate: tr ? "Kalkış tarihi" : "Departure date",
    departureTime: tr ? "Kalkış saati" : "Departure time",
    gateNumber: tr ? "Kapı numarası" : "Gate number",
    selectPilot: tr ? "Pilot seçin" : "Select pilot",
    selectCrew: tr
      ? "Kabin ekibini seçin (2–8 kişi)"
      : "Select cabin crew (2–8 people)",
    crewHint: tr
      ? "Birden fazla personel seçmek için Ctrl tuşunu kullanın."
      : "Hold Ctrl to select multiple crew members.",
    save: tr ? "Kaydet" : "Save",
    update: tr ? "Değişiklikleri Kaydet" : "Save Changes",
    cancel: tr ? "Vazgeç" : "Cancel",
    saving: tr ? "Kaydediliyor..." : "Saving...",
    close: tr ? "Kapat" : "Close",
    edit: tr ? "Düzenle" : "Edit",
    changeStatus: tr ? "Durum" : "Status",
    optionsLoading: tr
      ? "Seçenekler yükleniyor..."
      : "Loading options...",
    crewCount: tr ? "seçili" : "selected",
    emptyRoute: tr
      ? "Bu kalkış noktası için tanımlı rota yok."
      : "No route is configured for this origin.",
    required: tr
      ? "Lütfen zorunlu alanları doldurun."
      : "Please complete all required fields.",
    crewValidation: tr
      ? "Kabin ekibi 2 ile 8 kişi arasında olmalıdır."
      : "Cabin crew must contain between 2 and 8 people.",
    saved: tr
      ? "Uçuş başarıyla kaydedildi."
      : "Flight saved successfully.",
    statusSaved: tr
      ? "Uçuş durumu güncellendi."
      : "Flight status updated.",
    cancelConfirmation: tr
      ? "Bu uçuşu iptal etmek istediğinize emin misiniz?"
      : "Are you sure you want to cancel this flight?",
    noAirlines: tr
      ? "Havayolu bulunamadı."
      : "No airlines available.",
    noAirports: tr
      ? "Havalimanı bulunamadı."
      : "No airports available.",
    noPilots: tr
      ? "Pilot bulunamadı."
      : "No pilots available.",
    noCrew: tr
      ? "Kabin personeli bulunamadı."
      : "No cabin crew available.",
  };

  // Load form options once.
  useEffect(() => {
    const controller = new AbortController();

    async function loadOptions() {
      setOptionsLoading(true);
      setOptionsError("");

      try {
        const data = await flightApi<FlightOptions>(
          "/flights/options",
          { signal: controller.signal },
        );

        setOptions(data);
      } catch (error) {
        if (!controller.signal.aborted) {
          setOptionsError(
            error instanceof Error ? error.message : "Unknown error",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setOptionsLoading(false);
        }
      }
    }

    void loadOptions();

    return () => controller.abort();
  }, []);

  // Load and filter flights.
  useEffect(() => {
    const controller = new AbortController();

    const timeout = window.setTimeout(() => {
      async function loadFlights() {
        setLoading(true);
        setListError("");

        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
          operation,
        });

        if (search.trim()) params.set("search", search.trim());
        if (statusFilter) params.set("status", statusFilter);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        try {
          const data = await flightApi<FlightListResponse>(
            `/flights?${params.toString()}`,
            { signal: controller.signal },
          );

          if (!controller.signal.aborted) {
            setFlights(data.flights);
            setTotal(data.pagination.total);
            setTotalPages(data.pagination.totalPages);
          }
        } catch (error) {
          if (!controller.signal.aborted) {
            setFlights([]);
            setTotal(0);
            setTotalPages(0);

            setListError(
              error instanceof Error ? error.message : "Unknown error",
            );
          }
        } finally {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        }
      }

      void loadFlights();
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    page,
    operation,
    search,
    statusFilter,
    dateFrom,
    dateTo,
    refreshKey,
  ]);

  function refreshFlights() {
    setRefreshKey((current) => current + 1);
  }

  function updateForm<K extends keyof FlightFormState>(
    field: K,
    value: FlightFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(createEmptyForm());
    setFormError("");
    setFormOpen(true);
  }

  async function openEditForm(flightId: string) {
    setFormLoading(true);
    setFormError("");

    try {
      const flight = await flightApi<FlightDetails>(
        `/flights/${encodeURIComponent(flightId)}`,
      );

      setEditingId(flight.id);

      setForm({
        airlineId: flight.airlineId,
        flightNumber: flight.flightNo.split("-").slice(1).join("-"),
        originAirportId: flight.originAirportId,
        destinationAirportId: flight.destinationAirportId,
        departureDate: flight.departureDate,
        departureTime: flight.departureTime,
        gate: flight.gate ?? "",
        pilotId: flight.pilotId ?? "",
        crewIds: flight.crew.map((person) => person.id),
      });

      setFormOpen(true);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setFormLoading(false);
    }
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (
      !form.airlineId ||
      !form.flightNumber.trim() ||
      !form.originAirportId ||
      !form.destinationAirportId ||
      !form.departureDate ||
      !form.departureTime ||
      !form.gate.trim() ||
      !form.pilotId
    ) {
      setFormError(copy.required);
      return;
    }

    if (form.crewIds.length < 2 || form.crewIds.length > 8) {
      setFormError(copy.crewValidation);
      return;
    }

    setFormSaving(true);

    try {
      const path = editingId
        ? `/flights/${encodeURIComponent(editingId)}`
        : "/flights";

      await flightApi(path, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form),
      });

      setFormOpen(false);
      setEditingId(null);
      setForm(createEmptyForm());
      setNotice(copy.saved);
      setPage(1);
      refreshFlights();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setFormSaving(false);
    }
  }

  async function handleStatusChange(
    flight: FlightRow,
    nextStatus: FlightStatus,
  ) {
    if (nextStatus === flight.status || statusUpdatingId) return;

    if (
      nextStatus === "CANCELLED" &&
      !window.confirm(copy.cancelConfirmation)
    ) {
      return;
    }

    setStatusUpdatingId(flight.id);
    setListError("");

    try {
      await flightApi(
        `/flights/${encodeURIComponent(flight.id)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      setNotice(copy.statusSaved);
      refreshFlights();
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setStatusUpdatingId(null);
    }
  }

  const availableDestinations =
    options?.airports.filter((airport) =>
      options.routeDurations.some(
        (route) =>
          route.originAirportId === form.originAirportId &&
          route.destinationAirportId === airport.id,
      ),
    ) ?? [];

  const availableCrew =
    options?.cabinCrew.filter((person) =>
      isAtOrigin(person, form.originAirportId),
    ) ?? [];

  const availablePilots =
    options?.pilots.filter((person) =>
      isAtOrigin(person, form.originAirportId),
    ) ?? [];

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setOperation("all");
    setPage(1);
  }

  return (
    <section className="flight-management">
      <header className="flight-page-header">
        <div>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>

        <button
          type="button"
          className="flight-primary-button"
          onClick={openCreateForm}
          disabled={optionsLoading || !options}
        >
          <i className="fa-solid fa-plus" />
          {copy.addFlight}
        </button>
      </header>

      {notice && (
        <div className="flight-notice" role="status">
          <span>{notice}</span>
          <button
            type="button"
            aria-label={copy.close}
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}

      {optionsError && (
        <div className="flight-error" role="alert">
          {optionsError}
        </div>
      )}

      {optionsLoading && (
        <div className="flight-loading">{copy.optionsLoading}</div>
      )}

      <div className="flight-summary-row">
  <div className="flight-summary-card">
    <span>{tr ? "Toplam kayıt" : "Total records"}</span>
    <strong>{total}</strong>
  </div>

  <div className="flight-summary-card">
    <span>{tr ? "Bu sayfadaki uçuşlar" : "Flights on this page"}</span>
    <strong>{flights.length}</strong>
  </div>

  <div className="flight-summary-card">
    <span>{tr ? "Sayfa" : "Page"}</span>
    <strong>{totalPages === 0 ? 0 : page} / {totalPages}</strong>
  </div>
</div>

      <div className="flight-management-panel">
        <div className="flight-operation-tabs">
          {(
            [
              ["all", copy.all],
              ["active", copy.active],
              ["completed", copy.completed],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={operation === value ? "active" : ""}
              onClick={() => {
                setOperation(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flight-filter-grid">
          <label className="flight-search-field">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="search"
              value={search}
              placeholder={copy.search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <select
            aria-label={copy.status}
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">{copy.status}</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status, language)}
              </option>
            ))}
          </select>

          <label className="flight-date-filter">
            <span>{copy.dateFrom}</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <label className="flight-date-filter">
            <span>{copy.dateTo}</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <button
            type="button"
            className="flight-clear-button"
            onClick={clearFilters}
          >
            {tr ? "Filtreleri Temizle" : "Clear filters"}
          </button>
        </div>

        {listError && (
          <div className="flight-error" role="alert">
            {listError}
          </div>
        )}

        <div className="flight-table-scroll">
          <table className="flight-management-table">
            <thead>
              <tr>
                <th>{copy.flight}</th>
                <th>{copy.airline}</th>
                <th>{copy.route}</th>
                <th>{copy.date}</th>
                <th>{copy.gate}</th>
                <th>{copy.pilot}</th>
                <th>{copy.crew}</th>
                <th>{copy.status}</th>
                <th>{copy.actions}</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="flight-table-message">
                    {copy.loading}
                  </td>
                </tr>
              ) : flights.length === 0 ? (
                <tr>
                  <td colSpan={9} className="flight-table-message">
                    {copy.noFlights}
                  </td>
                </tr>
              ) : (
                flights.map((flight) => {
                  const transitions =
                    STATUS_TRANSITIONS[flight.status] ?? [];

                  return (
                    <tr key={flight.id}>
                      <td>
                        <strong className="flight-number">
                          {flight.flightNo}
                        </strong>
                      </td>

                      <td>{flight.airlineName ?? "—"}</td>

                      <td>
                        <span className="flight-route-value">
                          {flight.route.replace(" > ", " → ")}
                        </span>
                      </td>

                      <td>
                        <div className="flight-date-value">
                          <span>
                            {formatFlightDate(
                              flight.departureDate,
                              language,
                            )}
                          </span>
                          <strong>{flight.departureTime}</strong>
                        </div>
                      </td>

                      <td>{flight.gate ?? "—"}</td>

                      <td>{flight.pilot?.name ?? "—"}</td>

                      <td>
                        <span className="flight-crew-count">
                          <i className="fa-solid fa-users" />
                          {flight.crewCount}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`flight-status-badge status-${flight.status.toLowerCase()}`}
                        >
                          {getStatusLabel(flight.status, language)}
                        </span>
                      </td>

                      <td>
                        <div className="flight-row-actions">
                          {["SCHEDULED", "DELAYED"].includes(
                            flight.status,
                          ) && (
                            <button
                              type="button"
                              className="flight-edit-button"
                              onClick={() => void openEditForm(flight.id)}
                              disabled={formLoading}
                              title={copy.edit}
                            >
                              <i className="fa-solid fa-pen" />
                            </button>
                          )}

                          {transitions.length > 0 && (
                            <select
                              aria-label={`${copy.changeStatus}: ${flight.flightNo}`}
                              value={flight.status}
                              disabled={statusUpdatingId === flight.id}
                              onChange={(event) => {
                                void handleStatusChange(
                                  flight,
                                  event.target.value as FlightStatus,
                                );
                              }}
                            >
                              <option value={flight.status}>
                                {getStatusLabel(flight.status, language)}
                              </option>

                              {transitions.map((status) => (
                                <option key={status} value={status}>
                                  {getStatusLabel(status, language)}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flight-pagination">
          <span>
            {copy.page} {totalPages === 0 ? 0 : page} {copy.of}{" "}
            {totalPages} · {total} {copy.total}
          </span>

          <div>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {copy.previous}
            </button>

            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              {copy.next}
            </button>
          </div>
        </div>
      </div>

      {formOpen && (
        <div
          className="flight-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !formSaving) {
              setFormOpen(false);
            }
          }}
        >
          <section
            className="flight-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="flight-form-title"
          >
            <header className="flight-modal-header">
              <div>
                <h2 id="flight-form-title">
                  {editingId ? copy.editTitle : copy.createTitle}
                </h2>
                <p>
                  {tr
                    ? "Uçuş bilgilerini ve ekip atamasını tamamlayın."
                    : "Complete flight details and crew assignment."}
                </p>
              </div>

              <button
                type="button"
                aria-label={copy.close}
                onClick={() => setFormOpen(false)}
                disabled={formSaving}
              >
                ×
              </button>
            </header>

            <form onSubmit={handleFormSubmit}>
              <div className="flight-form-grid">
                <label>
                  {copy.airline}
                  <select
                    required
                    value={form.airlineId}
                    onChange={(event) =>
                      updateForm("airlineId", event.target.value)
                    }
                  >
                    <option value="">{copy.selectAirline}</option>
                    {options?.airlines.map((airline) => (
                      <option key={airline.id} value={airline.id}>
                        {airline.code} — {airline.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  {copy.flightNumber}
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    required
                    value={form.flightNumber}
                    onChange={(event) =>
                      updateForm("flightNumber", event.target.value)
                    }
                    placeholder="1001"
                  />
                </label>

                <label>
                  {copy.origin}
                  <select
                    required
                    value={form.originAirportId}
                    onChange={(event) => {
                      const nextOrigin = event.target.value;

                      setForm((current) => ({
                        ...current,
                        originAirportId: nextOrigin,
                        destinationAirportId: "",
                        pilotId: "",
                        crewIds: [],
                      }));
                    }}
                  >
                    <option value="">{copy.origin}</option>
                    {options?.airports.map((airport) => (
                      <option key={airport.id} value={airport.id}>
                        {airport.code} — {airport.name} ({airport.city.name})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  {copy.destination}
                  <select
                    required
                    value={form.destinationAirportId}
                    onChange={(event) =>
                      updateForm("destinationAirportId", event.target.value)
                    }
                    disabled={!form.originAirportId}
                  >
                    <option value="">{copy.destination}</option>
                    {availableDestinations.map((airport) => (
                      <option key={airport.id} value={airport.id}>
                        {airport.code} — {airport.name}
                      </option>
                    ))}
                  </select>

                  {form.originAirportId &&
                    availableDestinations.length === 0 && (
                      <small className="flight-form-hint">
                        {copy.emptyRoute}
                      </small>
                    )}
                </label>

                <label>
                  {copy.departureDate}
                  <input
                    type="date"
                    required
                    value={form.departureDate}
                    onChange={(event) =>
                      updateForm("departureDate", event.target.value)
                    }
                  />
                </label>

                <label>
                  {copy.departureTime}
                  <input
                    type="time"
                    required
                    value={form.departureTime}
                    onChange={(event) =>
                      updateForm("departureTime", event.target.value)
                    }
                  />
                </label>

                <label>
                  {copy.gateNumber}
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={form.gate}
                    onChange={(event) =>
                      updateForm("gate", event.target.value.toUpperCase())
                    }
                    placeholder="A-01"
                  />
                </label>

                <label>
                  {copy.pilot}
                  <select
                    required
                    value={form.pilotId}
                    onChange={(event) =>
                      updateForm("pilotId", event.target.value)
                    }
                    disabled={!form.originAirportId}
                  >
                    <option value="">{copy.selectPilot}</option>
                    {availablePilots.map((pilot) => (
                      <option key={pilot.id} value={pilot.id}>
                        {pilot.name}
                        {pilot.currentAirport?.code
                          ? ` · ${pilot.currentAirport.code}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flight-crew-field">
                {copy.selectCrew}
                <select
                  multiple
                  size={5}
                  value={form.crewIds}
                  onChange={(event) => {
                    const selected = Array.from(
                      event.currentTarget.selectedOptions,
                      (option) => option.value,
                    );

                    if (selected.length <= 8) {
                      updateForm("crewIds", selected);
                    }
                  }}
                  disabled={!form.originAirportId}
                >
                  {availableCrew.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                      {person.currentAirport?.code
                        ? ` · ${person.currentAirport.code}`
                        : ""}
                      {" · "}
                      {person.fatiguePoint} FP
                    </option>
                  ))}
                </select>

                <small className="flight-form-hint">
                  {copy.crewHint} {form.crewIds.length}/8 {copy.crewCount}
                </small>

                {form.originAirportId &&
                  availableCrew.length === 0 && (
                    <small className="flight-form-hint">
                      {copy.noCrew}
                    </small>
                  )}
              </label>

              {formError && (
                <div className="flight-error" role="alert">
                  {formError}
                </div>
              )}

              <footer className="flight-modal-footer">
                <button
                  type="button"
                  className="flight-secondary-button"
                  onClick={() => setFormOpen(false)}
                  disabled={formSaving}
                >
                  {copy.cancel}
                </button>

                <button
                  type="submit"
                  className="flight-primary-button"
                  disabled={formSaving || formLoading || optionsLoading}
                >
                  {formSaving
                    ? copy.saving
                    : editingId
                      ? copy.update
                      : copy.save}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

export default FlightManagementPage;
