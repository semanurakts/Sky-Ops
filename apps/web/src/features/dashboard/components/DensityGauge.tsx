import type { DashboardLanguage } from "./DashboardSidebar";

interface DensityGaugeProps {
  score: number;
  maxScore: number;
  gateOccupancyPercent: number;
  language: DashboardLanguage;
}

function DensityGauge({
  score,
  maxScore,
  gateOccupancyPercent,
  language,
}: DensityGaugeProps) {
  const safeMax = maxScore > 0 ? maxScore : 10;
  const safeScore = Math.min(Math.max(score, 0), safeMax);
  const safeOccupancy = Math.min(
    Math.max(Math.round(gateOccupancyPercent), 0),
    100,
  );

  const percentage = (safeScore / safeMax) * 100;
  const rotation = (percentage / 100) * 180;

  const translations = {
    tr: {
      title: "Tahmini Yoğunluk Skoru",
      aiAnalysis: "AI Operasyonel Analiz",
      low: "Düşük Yoğunluk",
      medium: "Orta Yoğunluk",
      high: "Yüksek Yoğunluk",
      critical: "Kritik Durum",
      warning: "Yoğunluk Artıyor",
      normal: "Sistem Normal",
      criticalMessage: `Kapı doluluğu %${safeOccupancy} seviyesinde! Ekip takviyesi önerilir.`,
      warningMessage: `Kapıların %${safeOccupancy} kadarı dolu. Operasyon yakından takip edilmeli.`,
      normalMessage: `Kapı doluluğu %${safeOccupancy} seviyesinde. Operasyonel akış planlandığı gibi gidiyor.`,
    },
    en: {
      title: "Estimated Density Score",
      aiAnalysis: "AI Operational Analysis",
      low: "Low Density",
      medium: "Medium Density",
      high: "High Density",
      critical: "Critical Situation",
      warning: "Increasing Density",
      normal: "System Normal",
      criticalMessage: `Gate occupancy is at ${safeOccupancy}%. Additional staffing is recommended.`,
      warningMessage: `${safeOccupancy}% of gates are occupied. Operations should be monitored closely.`,
      normalMessage: `Gate occupancy is at ${safeOccupancy}%. Operations are proceeding as planned.`,
    },
  };

  const t = translations[language];

  const scoreColor =
    safeScore >= 8
      ? "#ef4444"
      : safeScore >= 5
        ? "#f59e0b"
        : "#10b981";

  const alert = safeOccupancy > 70
    ? {
        icon: "⚠️",
        heading: t.critical,
        message: t.criticalMessage,
        className: "critical",
      }
    : safeOccupancy > 40
      ? {
          icon: "ℹ️",
          heading: t.warning,
          message: t.warningMessage,
          className: "warning",
        }
      : {
          icon: "✅",
          heading: t.normal,
          message: t.normalMessage,
          className: "normal",
        };

  return (
    <section className="dashboard-content-box dashboard-density-box">
      <div className="dashboard-box-header">
        <h2 className="dashboard-box-title">{t.title}</h2>
      </div>

      <div
        className="dashboard-gauge"
        role="meter"
        aria-label={t.title}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeScore}
      >
        <div className="dashboard-gauge-body">
          <div
            className="dashboard-gauge-fill"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        </div>

        <div className="dashboard-gauge-cover" />
      </div>

      <div className="dashboard-score-text">
        <span
          className="dashboard-score-value"
          style={{ color: scoreColor }}
        >
          {safeScore.toFixed(1)}
        </span>

        <span className="dashboard-score-total">
          / {safeMax}
        </span>
      </div>

      <div className="dashboard-ai-analysis-badge">
        <i className="fa-solid fa-circle-exclamation" />
        {t.aiAnalysis}
      </div>

      <p
        className={`dashboard-ai-alert ${alert.className}`}
        role="status"
        aria-live="polite"
      >
        <span>{alert.icon}</span>{" "}
        <strong>{alert.heading}:</strong>{" "}
        {alert.message}
      </p>
    </section>
  );
}

export default DensityGauge;
