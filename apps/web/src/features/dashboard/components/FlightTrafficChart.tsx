
import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";

import type { DashboardTraffic } from "../types/dashboard.types";
import type { DashboardLanguage } from "./DashboardSidebar";

Chart.register(
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
);

interface FlightTrafficChartProps {
  traffic: DashboardTraffic | null;
  period: "today" | "week";
  onPeriodChange: (period: "today" | "week") => void;
  language: DashboardLanguage;
}

function FlightTrafficChart({
  traffic,
  period,
  onPeriodChange,
  language,
}: FlightTrafficChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<"line"> | null>(null);

  const translations = {
    tr: {
      title: "Uçuş Trafiği Analizi",
      today: "Son 24 Saat",
      week: "Son 7 Gün",
      flights: "Uçuş Sayısı",
      loading: "Grafik verileri yükleniyor...",
      noData: "Grafik verisi bulunamadı.",
    },
    en: {
      title: "Flight Traffic Analysis",
      today: "Last 24 Hours",
      week: "Last 7 Days",
      flights: "Number of Flights",
      loading: "Loading chart data...",
      noData: "No chart data available.",
    },
  };

  const t = translations[language];

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !traffic || traffic.data.length === 0) {
      return;
    }

    const labels = traffic.data.map((point) => {
      if (period === "today") {
        return point.label ?? "";
      }

      if (!point.date) {
        return "";
      }

      return new Intl.DateTimeFormat(
        language === "tr" ? "tr-TR" : "en-GB",
        {
          day: "2-digit",
          month: "short",
          timeZone: "UTC",
        },
      ).format(new Date(`${point.date}T12:00:00Z`));
    });

    const counts = traffic.data.map((point) => point.count);
    const hasFlights = counts.some((count) => count > 0);

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const gradient = context.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, "rgba(59, 130, 246, 0.25)");
    gradient.addColorStop(1, "rgba(59, 130, 246, 0.01)");

    chartRef.current?.destroy();

    chartRef.current = new Chart(context, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: t.flights,
            data: counts,
            borderColor: "#3b82f6",
            backgroundColor: gradient,
            borderWidth: 3,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "#3b82f6",
            pointBorderWidth: 2,
            pointRadius: period === "today" ? 2 : 5,
            pointHoverRadius: 7,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "#1e293b",
            titleFont: {
              family: "Inter",
              size: 12,
            },
            bodyFont: {
              family: "Inter",
              size: 12,
            },
            padding: 12,
            displayColors: false,
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            border: {
              display: false,
            },
            ticks: {
  precision: 0,
  color: "#94a3b8",
  font: {
    family: "Inter",
    size: 11,
  },
  callback: (value) => {
    if (!hasFlights && Number(value) > 0) {
      return "";
    }

    return value;
  },
},
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: "#94a3b8",
              font: {
                family: "Inter",
                size: 11,
              },
            },
            grid: {
              color: "#f1f5f9",
            },
            border: {
              display: false,
              dash: [4, 4],
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [traffic, period, language, t.flights]);

  return (
    <section className="dashboard-content-box dashboard-traffic-box">
      <div className="dashboard-box-header">
        <h2 className="dashboard-box-title">{t.title}</h2>

        <div className="dashboard-period-toggle">
          <button
            type="button"
            className={period === "today" ? "active" : ""}
            onClick={() => onPeriodChange("today")}
            aria-pressed={period === "today"}
          >
            {t.today}
          </button>

          <button
            type="button"
            className={period === "week" ? "active" : ""}
            onClick={() => onPeriodChange("week")}
            aria-pressed={period === "week"}
          >
            {t.week}
          </button>
        </div>
      </div>

      <div className="dashboard-chart-container">
        {traffic ? (
          traffic.data.length > 0 ? (
            <canvas
              ref={canvasRef}
              aria-label={t.title}
              role="img"
            />
          ) : (
            <p className="dashboard-chart-message">{t.noData}</p>
          )
        ) : (
          <p className="dashboard-chart-message">{t.loading}</p>
        )}
      </div>
    </section>
  );
}

export default FlightTrafficChart;
