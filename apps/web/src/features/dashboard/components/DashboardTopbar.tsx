
import { useEffect, useState } from "react";
import type { DashboardLanguage } from "./DashboardSidebar";

interface DashboardTopbarProps {
  language: DashboardLanguage;
  onLanguageChange: (language: DashboardLanguage) => void;
  onLogout: () => void;
}

const translations = {
  tr: {
    title: "Operasyon Genel Bakışı",
    description: "SkyOps uçuş operasyon kontrol paneli",
    admin: "Yönetici",
    localTime: "YEREL SAAT",
    logout: "Çıkış Yap",
    notifications: "Bildirimler",
  },
  en: {
    title: "Operations Overview",
    description: "SkyOps flight operations dashboard",
    admin: "Administrator",
    localTime: "LOCAL TIME",
    logout: "Log Out",
    notifications: "Notifications",
  },
};

function DashboardTopbar({
  language,
  onLanguageChange,
  onLogout,
}: DashboardTopbarProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const t = translations[language];

useEffect(() => {
  const updateTime = () => {
    setCurrentTime(new Date());
  };

  updateTime();

  const interval = window.setInterval(updateTime, 1000);

  return () => window.clearInterval(interval);
}, []);

const formattedTime = currentTime
  ? new Intl.DateTimeFormat(
      language === "tr" ? "tr-TR" : "en-GB",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      },
    ).format(currentTime)
  : "--:--:--";

  return (
    <header className="dashboard-topbar">
      <div className="dashboard-page-heading">
        <h1>{t.title}</h1>
        <p>{t.description}</p>
      </div>

      <div className="dashboard-topbar-actions">
        <div
          className="dashboard-notification"
          aria-label={t.notifications}
          title={t.notifications}
        >
          <i className="fa-regular fa-bell" />
          <span className="dashboard-notification-dot" />
        </div>

        <div className="dashboard-clock">
          <span className="dashboard-clock-label">
            {t.localTime}
          </span>
          <span className="dashboard-clock-value">
            <i className="fa-regular fa-clock" />
            {formattedTime}
          </span>
        </div>

        <div className="dashboard-user-profile">
          <div className="dashboard-avatar">A</div>
          <div className="dashboard-user-info">
            <span className="dashboard-user-name">Admin</span>
            <span className="dashboard-user-role">{t.admin}</span>
          </div>
        </div>

        <div className="dashboard-language-toggle">
          <button
            type="button"
            className={language === "tr" ? "active" : ""}
            onClick={() => onLanguageChange("tr")}
            aria-pressed={language === "tr"}
          >
            TR
          </button>

          <button
            type="button"
            className={language === "en" ? "active" : ""}
            onClick={() => onLanguageChange("en")}
            aria-pressed={language === "en"}
          >
            EN
          </button>
        </div>

        <button
          type="button"
          className="dashboard-mobile-logout"
          onClick={onLogout}
          aria-label={t.logout}
          title={t.logout}
        >
          <i className="fa-solid fa-right-from-bracket" />
        </button>
      </div>
    </header>
  );
}

export default DashboardTopbar;
