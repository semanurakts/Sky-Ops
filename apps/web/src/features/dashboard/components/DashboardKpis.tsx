
import type { DashboardMetrics } from "../types/dashboard.types";
import type { DashboardLanguage } from "./DashboardSidebar";

interface DashboardKpisProps {
  metrics: DashboardMetrics;
  language: DashboardLanguage;
}

function DashboardKpis({ metrics, language }: DashboardKpisProps) {
  const translations = {
    tr: {
      totalFlights: "Toplam Uçuş",
      totalFlightsDetail: "Sistemde kayıtlı uçuşlar",
      delayedFlights: "Geciken / İptal Uçuşlar",
      delayedFlightsDetail: "Operasyonel aksaklıklar",
      riskyPersonnel: "Riskli Personel",
      riskyPersonnelDetail: "Yüksek yorgunluk seviyesinde",
      gateOccupancy: "Kapı Doluluk Oranı",
      gateOccupancyDetail: "Aktif kapı kullanımı",
      gates: "kullanılan kapı",
    },
    en: {
      totalFlights: "Total Flights",
      totalFlightsDetail: "Flights registered in the system",
      delayedFlights: "Delayed / Cancelled",
      delayedFlightsDetail: "Operational disruptions",
      riskyPersonnel: "Risky Personnel",
      riskyPersonnelDetail: "High fatigue level",
      gateOccupancy: "Gate Occupancy",
      gateOccupancyDetail: "Active gate utilization",
      gates: "occupied gates",
    },
  };

  const t = translations[language];

  const cards = [
    {
      id: "flights",
      label: t.totalFlights,
      value: metrics.totalFlights,
      detail: t.totalFlightsDetail,
      icon: "fa-solid fa-plane",
      color: "blue",
    },
    {
      id: "delays",
      label: t.delayedFlights,
      value: metrics.delayedFlights,
      detail: t.delayedFlightsDetail,
      icon: "fa-solid fa-clock",
      color: "red",
    },
    {
      id: "personnel",
      label: t.riskyPersonnel,
      value: metrics.riskyPersonnel,
      detail: t.riskyPersonnelDetail,
      icon: "fa-solid fa-user-shield",
      color: "yellow",
    },
    {
      id: "gates",
      label: t.gateOccupancy,
      value: `${metrics.gateOccupancyPercent}%`,
      detail: `${metrics.occupiedGates} / ${metrics.gateCapacity} ${t.gates}`,
      icon: "fa-solid fa-door-open",
      color: "green",
    },
  ];

  return (
    <section className="dashboard-kpi-grid" aria-label="Key performance indicators">
      {cards.map((card) => (
        <article
          key={card.id}
          className={`dashboard-kpi-card border-${card.color}`}
        >
          <div className="dashboard-kpi-content">
            <span className="dashboard-kpi-label">
              {card.label}
            </span>

            <h2 className="dashboard-kpi-value">
              {card.value}
            </h2>

            <span className="dashboard-kpi-detail">
              {card.detail}
            </span>
          </div>

          <div className={`dashboard-kpi-icon bg-${card.color}-light text-${card.color}`}>
            <i className={card.icon} aria-hidden="true" />
          </div>
        </article>
      ))}
    </section>
  );
}

export default DashboardKpis;
