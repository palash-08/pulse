import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext.js";
import { ThemeProvider } from "./context/ThemeContext.js";
import { RequireAuth } from "./auth/RequireAuth.js";
import { AppShell } from "./components/layout/AppShell.js";

import { LoginPage } from "./pages/LoginPage.js";
import { RegisterPage } from "./pages/RegisterPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { MonitorsPage } from "./pages/MonitorsPage.js";
import { MonitorFormPage } from "./pages/MonitorFormPage.js";
import { MonitorDetailPage } from "./pages/MonitorDetailPage.js";
import { IncidentsPage } from "./pages/IncidentsPage.js";
import { ReportsPage } from "./pages/ReportsPage.js";
import { PublicReportPage } from "./pages/PublicReportPage.js";
import { AccountPage } from "./pages/AccountPage.js";
import { NotFoundPage } from "./pages/NotFoundPage.js";

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/report/:token" element={<PublicReportPage />} />

          {/* Authenticated Dashboard Routes */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppShell>
                  <DashboardPage />
                </AppShell>
              </RequireAuth>
            }
          />
          <Route
            path="/monitors"
            element={
              <RequireAuth>
                <AppShell>
                  <MonitorsPage />
                </AppShell>
              </RequireAuth>
            }
          />
          <Route
            path="/monitors/new"
            element={
              <RequireAuth>
                <AppShell>
                  <MonitorFormPage />
                </AppShell>
              </RequireAuth>
            }
          />
          <Route
            path="/monitors/:id"
            element={
              <RequireAuth>
                <AppShell>
                  <MonitorDetailPage />
                </AppShell>
              </RequireAuth>
            }
          />
          <Route
            path="/monitors/:id/edit"
            element={
              <RequireAuth>
                <AppShell>
                  <MonitorFormPage />
                </AppShell>
              </RequireAuth>
            }
          />
          <Route
            path="/incidents"
            element={
              <RequireAuth>
                <AppShell>
                  <IncidentsPage />
                </AppShell>
              </RequireAuth>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireAuth>
                <AppShell>
                  <ReportsPage />
                </AppShell>
              </RequireAuth>
            }
          />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <AppShell>
                  <AccountPage />
                </AppShell>
              </RequireAuth>
            }
          />

          {/* 404 Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
