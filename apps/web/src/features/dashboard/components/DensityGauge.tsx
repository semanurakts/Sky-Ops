
import type { DashboardLanguage } from "./DashboardSidebar";

interface DensityGaugeProps {
  score: number;
  maxScore: number;
  language: DashboardLanguage;
}

function DensityGauge({
  score,
  maxScore,
  language,
}: DensityGaugeProps) {
  const safeMax = maxScore > 0 ? maxScore : 10;
  const safeScore = Math.min(Math.max(score, 0), safeMax);
  const percentage = (safeScore / safeMax) * 100;
  const rotation = (percentage / 100) * 180;

  const translations = {
    tr: {
      title: "AI Operasyonel Yoğunluk Analizi",
      subtitle: "Mevcut uçuş yoğunluğu",
      low: "Düşük Yoğunluk",
      medium: "Orta Yoğunluk",
      high: "Yüksek Yoğunluk",
      description: "Aktif uçuş sayısına göre hesaplanır.",
    },
    en: {
      title: "AI Operational Density Analysis",
      subtitle: "Current flight density",
      low: "Low Density",
      medium: "Medium Density",
      high: "High Density",
      description: "Calculated based on active flight count.",
    },
  };

  const t = translations[language];

  const status =
    percentage < 40
      ? t.low
      : percentage < 75
        ? t.medium
        : t.high;

  return (
    <section className="dashboard-content-box dashboard-density-box">
      <div className="dashboard-box-header">
        <h2 className="dashboard-box-title">{t.title}</h2>
      </div>

      <p className="dashboard-density-subtitle">
        {t.subtitle}
      </p>

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
        <span className="dashboard-score-value">
          {Number.isInteger(safeScore)
            ? safeScore
            : safeScore.toFixed(1)}
        </span>

        <span className="dashboard-score-total">
          / {safeMax}
        </span>
      </div>

      <div className="dashboard-density-status">
        {status}
      </div>

      <p className="dashboard-density-description">
        {t.description}
      </p>
    </section>
  );
}

export default DensityGauge;
