import { useAuth } from "../auth/useAuth";
import { useCallback, useEffect, useState } from "react";
import "./DashboardPage.css";
import UserManagementPage from "./users/UserManagementPage";

import DashboardSidebar, {
  type DashboardLanguage,
  type DashboardNavItem,
} from "./components/DashboardSidebar";

import DashboardTopbar from "./components/DashboardTopbar";
import DashboardKpis from "./components/DashboardKpis";
import FlightTrafficChart from "./components/FlightTrafficChart";
import DensityGauge from "./components/DensityGauge";
import RecentFlightsTable from "./components/RecentFlightsTable";

import CrewDetailModal, {
  type FlightCrewDetails,
} from "./components/CrewDetailModal";

import type {
  DashboardOverview,
  DashboardTraffic,
  DashboardFlight,
} from "./types/dashboard.types";

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface FlightPageResponse {
  flights: DashboardFlight[];
  pagination: PaginationInfo;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result?.error?.message ?? `Request failed: ${response.status}`,
    );
  }

  return result as T;
}

function getLocalDateString(): string {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const emptyPagination: PaginationInfo = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
};

function DashboardPage() {
  const { logout, user } = useAuth();

const canManageUsers = user?.role === "ADMIN";
  const [language, setLanguage] = useState<DashboardLanguage>(() => {
    return localStorage.getItem("skyOpsAdminLang") === "en"
      ? "en"
      : "tr";
  });

  const [activeItem, setActiveItem] =
    useState<DashboardNavItem>("overview");

  const [overview, setOverview] =
    useState<DashboardOverview | null>(null);

  const [traffic, setTraffic] =
    useState<DashboardTraffic | null>(null);

  const [period, setPeriod] = useState<"today" | "week">("today");

  const [flights, setFlights] = useState<DashboardFlight[]>([]);

  const [pagination, setPagination] =
    useState<PaginationInfo>(emptyPagination);

  const [page, setPage] = useState(1);

  // Archive visibility
  const [showArchived, setShowArchived] = useState(false);

  // Loading states
  const [trafficLoading, setTrafficLoading] = useState(true);
  const [flightsLoading, setFlightsLoading] = useState(true);

  // Error states
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [trafficError, setTrafficError] = useState<string | null>(null);
  const [flightsError, setFlightsError] = useState<string | null>(null);

  // Crew modal states
  const [selectedFlightId, setSelectedFlightId] =
    useState<string | null>(null);

  const [crewDetails, setCrewDetails] =
    useState<FlightCrewDetails | null>(null);

  const [crewLoading, setCrewLoading] = useState(false);
  const [crewError, setCrewError] = useState<string | null>(null);

  const [navigationNotice, setNavigationNotice] = useState("");

  // Save selected language.
  useEffect(() => {
    localStorage.setItem("skyOpsAdminLang", language);
  }, [language]);

  // Load dashboard overview.
  useEffect(() => {
    let active = true;

    async function loadOverview() {
      setOverviewError(null);

      try {
        const data = await fetchJson<DashboardOverview>(
          "/api/dashboard/overview",
        );

        if (active) {
          setOverview(data);
        }
      } catch (error) {
        if (active) {
          setOverviewError(
            error instanceof Error ? error.message : "Unknown error",
          );
        }
      }
    }

    void loadOverview();

    return () => {
      active = false;
    };
  }, []);

  // Load flight traffic.
  useEffect(() => {
    let active = true;

    async function loadTraffic() {
      setTrafficLoading(true);
      setTrafficError(null);

      const date = getLocalDateString();

      try {
        const data = await fetchJson<DashboardTraffic>(
          `/api/dashboard/traffic?period=${period}&date=${date}`,
        );

        if (active) {
          setTraffic(data);
        }
      } catch (error) {
        if (active) {
          setTraffic(null);
          setTrafficError(
            error instanceof Error ? error.message : "Unknown error",
          );
        }
      } finally {
        if (active) {
          setTrafficLoading(false);
        }
      }
    }

    void loadTraffic();

    return () => {
      active = false;
    };
  }, [period]);

  // Load paginated flights.
  // Archived records are included only when requested.
  useEffect(() => {
    let active = true;

    async function loadFlights() {
      setFlightsLoading(true);
      setFlightsError(null);

      const archiveQuery = showArchived
        ? "&includeArchived=true"
        : "";

      try {
        const data = await fetchJson<FlightPageResponse>(
          `/api/dashboard/flights?page=${page}&pageSize=10${archiveQuery}`,
        );

        if (active) {
          setFlights(data.flights);
          setPagination(data.pagination);
        }
      } catch (error) {
        if (active) {
          setFlights([]);
          setPagination(emptyPagination);

          setFlightsError(
            error instanceof Error ? error.message : "Unknown error",
          );
        }
      } finally {
        if (active) {
          setFlightsLoading(false);
        }
      }
    }

    void loadFlights();

    return () => {
      active = false;
    };
  }, [page, showArchived]);

  // Open crew details.
  const handleCrewSelect = async (flightId: string) => {
    setSelectedFlightId(flightId);
    setCrewDetails(null);
    setCrewError(null);
    setCrewLoading(true);

    try {
      const data = await fetchJson<FlightCrewDetails>(
        `/api/dashboard/flights/${encodeURIComponent(flightId)}/crew`,
      );

      setCrewDetails(data);
    } catch (error) {
      setCrewError(
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setCrewLoading(false);
    }
  };

  // Close crew modal.
  const handleCrewClose = useCallback(() => {
    setSelectedFlightId(null);
    setCrewDetails(null);
    setCrewError(null);
    setCrewLoading(false);
  }, []);

  // Toggle archive mode.
const handleArchivedToggle = () => {
  setShowArchived((current) => !current);
  setPage(1);
};

  // Sidebar navigation.
  const handleNavigate = (item: DashboardNavItem) => {
    setNavigationNotice("");

    if (item === "overview") {
      setActiveItem("overview");
      setShowArchived(false);
      setPage(1);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    if (item === "flights") {
      setActiveItem("flights");
      setShowArchived(false);
      setPage(1);

      document.getElementById("dashboard-flights")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      return;
    }

    if (item === "archive") {
      setActiveItem("archive");
      setShowArchived(true);
      setPage(1);

      document.getElementById("dashboard-flights")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      return;
    }
if (item === "users") {
  if (!canManageUsers) return;

  setActiveItem("users");
  return;
}

    setActiveItem(item);

    setNavigationNotice(
      language === "tr"
        ? "Bu modül henüz yeni mimariye taşınmadı."
        : "This module has not been migrated to the new architecture yet.",
    );
  };

  // Logout confirmation.
const handleLogout = async () => {
  const message =
    language === "tr"
      ? "Dashboard ekranından çıkmak istiyor musunuz?"
      : "Do you want to leave the dashboard?";

  if (!window.confirm(message)) {
    return;
  }

  try {
    await logout();
    window.location.assign("/");
  } catch {
    window.alert(
      language === "tr"
        ? "Oturum kapatılamadı. Lütfen tekrar deneyin."
        : "Could not sign out. Please try again.",
    );
  }
};

  // KPI values.
  const metrics = overview?.metrics ?? {
    totalFlights: 0,
    delayedFlights: 0,
    riskyPersonnel: 0,
    occupiedGates: 0,
    gateCapacity: 20,
    gateOccupancyPercent: 0,
    activeFlights: 0,
    densityScore: 0,
    densityMax: 10,
  };

  return (
    <div className="dashboard-shell">
      <DashboardSidebar
  language={language}
  activeItem={activeItem}
  canManageUsers={canManageUsers}
  onNavigate={handleNavigate}
  onLogout={handleLogout}
/>

      <main className="dashboard-main-content">
        <DashboardTopbar
          language={language}
          onLanguageChange={setLanguage}
          onLogout={handleLogout}
        />

                {activeItem === "users" ? (
          <UserManagementPage language={language} />
        ) : (
          <>
            {navigationNotice && (
              <div className="dashboard-notice" role="status">
                {navigationNotice}
              </div>
            )}

            {(overviewError || trafficError || flightsError) && (
              <div className="dashboard-error-message" role="alert">
                <i className="fa-solid fa-circle-exclamation" />
                <span>
                  {language === "tr"
                    ? "Bazı Dashboard verileri yüklenemedi: "
                    : "Some dashboard data could not be loaded: "}

                  {[overviewError, trafficError, flightsError]
                    .filter(Boolean)
                    .join(" | ")}
                </span>
              </div>
            )}

            {/* KPI Cards */}
            <DashboardKpis
              metrics={metrics}
              language={language}
            />

            {/* Traffic Chart and Density Gauge */}
            <div className="dashboard-analytics-grid">
              <FlightTrafficChart
                traffic={trafficLoading ? null : traffic}
                period={period}
                onPeriodChange={setPeriod}
                language={language}
              />

              <DensityGauge
                score={metrics.densityScore}
                maxScore={metrics.densityMax}
                language={language}
              />
            </div>

            {/* Paginated Flight Table */}
            <div id="dashboard-flights">
              <RecentFlightsTable
                flights={flights}
                pagination={pagination}
                language={language}
                loading={flightsLoading}
                showArchived={showArchived}
                onPageChange={setPage}
                onCrewSelect={handleCrewSelect}
                onArchivedToggle={handleArchivedToggle}
              />
            </div>
          </>
        )}
      </main>

      {/* Crew Detail Modal */}
      {selectedFlightId !== null && (
        <CrewDetailModal
          flight={crewDetails}
          loading={crewLoading}
          error={crewError}
          language={language}
          onClose={handleCrewClose}
        />
      )}
    </div>
  );
}

export default DashboardPage;
