
import LoginPage from "./features/auth/LoginPage";
import DashboardPage from "./features/dashboard/DashboardPage";

function App() {
  const currentPath = window.location.pathname.replace(/\/+$/, "");

  if (currentPath === "/dashboard") {
    return <DashboardPage />;
  }

  return <LoginPage />;
}

export default App;
