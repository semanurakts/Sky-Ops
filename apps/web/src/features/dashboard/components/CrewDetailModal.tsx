import { useEffect } from "react";
import type { DashboardLanguage } from "./DashboardSidebar";

interface CrewMember {
  id: string;
  name: string;
  role: string;
  fatiguePoint: number;
  status: string;
  gender: {
    name: string;
    icon: string | null;
  } | null;
}

export interface FlightCrewDetails {
  flightId: string;
  flightNo: string;
  pilot: CrewMember | null;
  crew: CrewMember[];
}

interface FlightInfo {
  flightNo: string;
  route: string;
  departureTime: string;
}

interface CrewDetailModalProps {
  flight: FlightCrewDetails | null;
  flightInfo: FlightInfo | null;
  loading: boolean;
  error: string | null;
  language: DashboardLanguage;
  onClose: () => void;
}

function CrewDetailModal({
  flight,
  flightInfo,
  loading,
  error,
  language,
  onClose,
}: CrewDetailModalProps) {
  const translations = {
    tr: {
      title: "Ekip Detayları",
      pilot: "Pilot",
      cabinCrew: "Kabin Ekibi",
      loading: "Ekip bilgileri yükleniyor...",
      error: "Ekip bilgileri alınamadı.",
      empty: "Bu uçuş için ekip bilgisi bulunamadı.",
      fatigue: "Yorgunluk",
      unknown: "Bilinmiyor",
      close: "Kapat",
      flight: "Uçuş",
      route: "Rota",
      time: "Saat",
      pilotRole: "Pilot",
    },
    en: {
      title: "Crew Details",
      pilot: "Pilot",
      cabinCrew: "Cabin Crew",
      loading: "Loading crew information...",
      error: "Unable to load crew information.",
      empty: "No crew information found for this flight.",
      fatigue: "Fatigue",
      unknown: "Unknown",
      close: "Close",
      flight: "Flight",
      route: "Route",
      time: "Time",
      pilotRole: "Pilot",
    },
  };

  const t = translations[language];

  useEffect(() => {
    if (!flight && !loading && !error) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [flight, loading, error, onClose]);

  if (!loading && !flight && !error) {
    return null;
  }

  const members = [
    ...(flight?.pilot ? [flight.pilot] : []),
    ...(flight?.crew ?? []),
  ];

  const renderMember = (member: CrewMember, isPilot: boolean) => {
    const fatigue = Math.min(
      100,
      Math.max(0, member.fatiguePoint || 0),
    );

    const fatigueClass =
      fatigue >= 80
        ? "high"
        : fatigue >= 50
          ? "medium"
          : "low";

    return (
      <article
        className="dashboard-crew-member"
        key={member.id}
      >
        <div
          className={`dashboard-crew-role-badge ${
            isPilot ? "role-pilot" : "role-cabin"
          }`}
        >
          {isPilot ? t.pilotRole : member.role}
        </div>

        <div
          className={`dashboard-crew-avatar ${
            isPilot ? "pilot" : "cabin"
          }`}
        >
          <i
            className={`fa-solid ${
              member.gender?.icon ?? "fa-user"
            }`}
            aria-hidden="true"
          />
        </div>

        <h3 className="dashboard-crew-member-name">
          {member.name}
        </h3>

        <p className="dashboard-crew-member-id">
          ID: {member.id}
        </p>

        <div className="dashboard-fatigue-info">
          <div className="dashboard-fatigue-label">
            <span>{t.fatigue}</span>
            <strong>%{Math.round(fatigue)}</strong>
          </div>

          <div
            className="dashboard-fatigue-track"
            role="meter"
            aria-label={t.fatigue}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={fatigue}
          >
            <div
              className={`dashboard-fatigue-fill ${fatigueClass}`}
              style={{ width: `${fatigue}%` }}
            />
          </div>
        </div>
      </article>
    );
  };

  return (
    <div
      className="dashboard-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="dashboard-crew-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-crew-modal-title"
      >
        <header className="dashboard-modal-header">
          <div>
            <h2 id="dashboard-crew-modal-title">
              <i className="fa-solid fa-users" />
              {t.title}
            </h2>

            {flightInfo && (
              <p className="dashboard-modal-flight-info">
                {t.flight}: {flightInfo.flightNo}
                {" | "}
                {t.route}: {flightInfo.route}
                {" | "}
                {t.time}: {flightInfo.departureTime}
              </p>
            )}
          </div>

          <button
            type="button"
            className="dashboard-modal-close"
            onClick={onClose}
            aria-label={t.close}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </header>

        <div className="dashboard-modal-body">
          {loading ? (
            <p className="dashboard-modal-message">
              {t.loading}
            </p>
          ) : error ? (
            <p className="dashboard-modal-error">
              {t.error} {error}
            </p>
          ) : members.length > 0 ? (
            <div className="dashboard-crew-grid">
              {members.map((member) =>
                renderMember(member, member.id === flight?.pilot?.id),
              )}
            </div>
          ) : (
            <p className="dashboard-modal-message">
              {t.empty}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default CrewDetailModal;
