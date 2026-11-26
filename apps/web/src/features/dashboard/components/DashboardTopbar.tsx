import { useEffect, useState } from "react";
import type {
  DashboardLanguage,
  DashboardNavItem,
} from "./DashboardSidebar";

interface DashboardTopbarProps {
  language: DashboardLanguage;
  activeItem: DashboardNavItem;
  onLanguageChange: (language: DashboardLanguage) => void;
  onLogout: () => void;
}

const pageTranslations: Record<
  DashboardLanguage,
  Record<DashboardNavItem, { title: string; description: string }>
> = {
  tr: {
    overview: {
      title: "Dashboard / Genel Bakış",
      description: "Havaalanı operasyon durumu ve anlık veriler.",
    },
    flights: {
      title: "Uçuş Yönetimi",
      description:
        "Aktif ve yakın geçmiş uçuşların listelenmesi ve operasyon takibi.",
    },
    personnel: {
      title: "Personel Planlama",
      description: "Uçuş operasyon personelinin planlanması ve takibi.",
    },
    reports: {
      title: "Raporlar",
      description:
        "Uçuş operasyonlarına ilişkin raporlar ve performans verileri.",
    },
    archive: {
      title: "Uçuş Arşivi",
      description: "Arşivlenmiş uçuş kayıtlarının görüntülenmesi.",
    },
    users: {
      title: "Kullanıcı Yönetimi",
      description: "Sistem kullanıcıları ve erişim yetkilerinin yönetimi.",
    },
  },
  en: {
    overview: {
      title: "Dashboard / Overview",
      description: "Airport operational status and real-time data.",
    },
    flights: {
      title: "Flight Management",
      description:
        "Listing active and recent past flights and operational tracking.",
    },
    personnel: {
      title: "Personnel Planning",
      description: "Planning and tracking flight operations personnel.",
    },
    reports: {
      title: "Reports",
      description: "Reports and performance data for flight operations.",
    },
    archive: {
      title: "Flight Archive",
      description: "Viewing archived flight records.",
    },
    users: {
      title: "User Management",
      description: "Managing system users and access permissions.",
    },
  },
};

const translations: Record<
  DashboardLanguage,
  {
    admin: string;
    localTime: string;
    logout: string;
    notifications: string;
  }
> = {
  tr: {
    admin: "Yönetici",
    localTime: "YEREL SAAT",
    logout: "Çıkış Yap",
    notifications: "Bildirimler",
  },
  en: {
    admin: "Administrator",
    localTime: "LOCAL TIME",
    logout: "Log Out",
    notifications: "Notifications",
  },
};

function DashboardTopbar({
  language,
  activeItem,
  onLanguageChange,
  onLogout,
}: DashboardTopbarProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const t = translations[language];
  const page = pageTranslations[language][activeItem];

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
        <h1>{page.title}</h1>
        <p>{page.description}</p>
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
