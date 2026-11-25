
export type DashboardLanguage = "tr" | "en";

export type DashboardNavItem =
  | "overview"
  | "flights"
  | "personnel"
  | "reports"
  | "archive"
  | "users";

interface DashboardSidebarProps {
  language: DashboardLanguage;
  activeItem: DashboardNavItem;
  canManageUsers: boolean;
  onNavigate: (item: DashboardNavItem) => void;
  onLogout: () => void;
}

const translations = {
  tr: {
    subtitle: "UÇUŞ OPERASYON SİSTEMİ",
    overview: "Genel Bakış",
    flights: "Uçuş Yönetimi",
    personnel: "Personel Planlama",
    reports: "Raporlar",
    archive: "Uçuş Arşivi",
    logout: "Çıkış Yap",
    users: "Kullanıcı Yönetimi",
  },
  en: {
    subtitle: "FLIGHT OPERATIONS SYSTEM",
    overview: "Overview",
    flights: "Flight Management",
    personnel: "Personnel Planning",
    reports: "Reports",
    archive: "Flight Archive",
    logout: "Log Out",
    users: "User Management",
  },
};

const navigation: {
  id: DashboardNavItem;
  icon: string;
}[] = [
  { id: "overview", icon: "fa-solid fa-house" },
  { id: "flights", icon: "fa-solid fa-plane" },
  { id: "personnel", icon: "fa-solid fa-users" },
  { id: "reports", icon: "fa-solid fa-chart-pie" },
  { id: "archive", icon: "fa-solid fa-box-archive" },
  { id: "users", icon: "fa-solid fa-user-gear" },
];

function DashboardSidebar({
  language,
  activeItem,
  canManageUsers,
  onNavigate,
  onLogout,
}: DashboardSidebarProps) {
  const t = translations[language];

  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-sidebar-header">
        <div className="dashboard-brand">
          <i className="fa-solid fa-plane-departure" />
          <span>SkyOps</span>
        </div>

        <div className="dashboard-brand-subtitle">
          {t.subtitle}
        </div>
      </div>

      <div className="dashboard-sidebar-divider" />

      <nav aria-label="Main navigation">
        <ul className="dashboard-nav-links">
          {navigation
  .filter((item) => item.id !== "users" || canManageUsers)
  .map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`dashboard-nav-link ${
                  activeItem === item.id ? "active" : ""
                }`}
                onClick={() => onNavigate(item.id)}
                aria-current={
                  activeItem === item.id ? "page" : undefined
                }
              >
                <i className={item.icon} />
                <span>{t[item.id]}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="dashboard-sidebar-footer">
        <button
          type="button"
          className="dashboard-logout-button"
          onClick={onLogout}
        >
          <i className="fa-solid fa-right-from-bracket" />
          <span>{t.logout}</span>
        </button>
      </div>
    </aside>
  );
}

export default DashboardSidebar;
