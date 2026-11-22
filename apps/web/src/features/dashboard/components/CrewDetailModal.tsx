
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

interface CrewDetailModalProps {
  flight: FlightCrewDetails | null;
  loading: boolean;
  error: string | null;
  language: DashboardLanguage;
  onClose: () => void;
}

function CrewDetailModal({
  flight,
  loading,
  error,
  language,
  onClose,
}: CrewDetailModalProps) {
  const translations = {
    tr: {
      title: "Uçuş Ekibi Detayları",
      pilot: "Kaptan Pilot",
      cabinCrew: "Kabin Ekibi",
      loading: "Ekip bilgileri yükleniyor...",
      error: "Ekip bilgileri alınamadı.",
      empty: "Bu uçuş için ekip bilgisi bulunamadı.",
      fatigue: "Yorgunluk Puanı",
      status: "Durum",
      available: "Müsait",
      onDuty: "Görevde",
      unavailable: "Müsait Değil",
      rest: "Dinlenmede",
      unknown: "Bilinmiyor",
      close: "Kapat",
    },
    en: {
      title: "Flight Crew Details",
      pilot: "Captain Pilot",
      cabinCrew: "Cabin Crew",
      loading: "Loading crew information...",
      error: "Unable to load crew information.",
      empty: "No crew information found for this flight.",
      fatigue: "Fatigue Score",
      status: "Status",
      available: "Available",
      onDuty: "On Duty",
      unavailable: "Unavailable",
      rest: "Resting",
      unknown: "Unknown",
      close: "Close",
    },
  };

  const t = translations[language];

  useEffect(() => {
    if (!flight && !loading) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [flight, loading, onClose]);

  if (!loading && !flight && !error) {
    return null;
  }

  const statusLabels: Record<string, string> = {
    AVAILABLE: t.available,
    ON_DUTY: t.onDuty,
    UNAVAILABLE: t.unavailable,
    RESTING: t.rest,
  };

  const renderMember = (member: CrewMember, isPilot = false) => {
    const fatigue = Math.min(
      100,
      Math.max(0, member.fatiguePoint),
    );

    return (
      <article
        className="dashboard-crew-member"
        key={member.id}
      >
        <div className="dashboard-crew-member-heading">
          <div className="dashboard-crew-avatar">
            <i
              className={`fa-solid ${
                member.gender?.icon ?? "fa-user"
              }`}
              aria-hidden="true"
            />
          </div>

          <div className="dashboard-crew-member-info">
            <strong>{member.name}</strong>
            <span>{isPilot ? t.pilot : member.role}</span>
          </div>

          <span
            className={`dashboard-status status-${member.status.toLowerCase()}`}
          >
            {statusLabels[member.status] ?? t.unknown}
          </span>
        </div>

        <div className="dashboard-fatigue-info">
          <div className="dashboard-fatigue-label">
            <span>{t.fatigue}</span>
            <strong>{member.fatiguePoint.toFixed(1)} / 100</strong>
          </div>

          <div
            className="dashboard-fatigue-track"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={fatigue}
          >
            <div
              className={`dashboard-fatigue-fill ${
                fatigue > 80
                  ? "high"
                  : fatigue > 50
                    ? "medium"
                    : "low"
              }`}
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
            <h2 id="dashboard-crew-modal-title">{t.title}</h2>
            {flight && (
              <span className="dashboard-modal-flight-number">
                {flight.flightNo}
              </span>
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
            <p className="dashboard-modal-message">{t.loading}</p>
          ) : error ? (
            <p className="dashboard-modal-error">
              {t.error} {error}
            </p>
          ) : flight ? (
            <>
              {flight.pilot && (
                <div className="dashboard-crew-section">
                  <h3>{t.pilot}</h3>
                  {renderMember(flight.pilot, true)}
                </div>
              )}

              <div className="dashboard-crew-section">
                <h3>{t.cabinCrew}</h3>

                {flight.crew.length > 0 ? (
                  <div className="dashboard-crew-list">
                    {flight.crew.map((member) =>
                      renderMember(member),
                    )}
                  </div>
                ) : (
                  <p className="dashboard-modal-message">
                    {t.empty}
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="dashboard-modal-message">{t.empty}</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default CrewDetailModal;
