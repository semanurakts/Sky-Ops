import LoginPage from "./features/auth/LoginPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import { useAuth } from "./features/auth/useAuth";

function App() {
  const { user, isLoading } = useAuth();

  const currentPath = window.location.pathname.replace(/\/+$/, "");

  if (currentPath === "/dashboard") {
    // Wait until the existing session has been checked.
    if (isLoading) {
      return (
        <div
          role="status"
          aria-live="polite"
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            fontFamily: "Arial, sans-serif",
          }}
        >
          Checking your session...
        </div>
      );
    }

    // Users without a valid session cannot access the dashboard.
    if (!user) {
      return <LoginPage />;
    }

    // Only ADMIN and STAFF can access the operations dashboard.
    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      return <LoginPage />;
    }

    return <DashboardPage />;
  }

  return <LoginPage />;
}

export default App;
