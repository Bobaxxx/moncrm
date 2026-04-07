import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Database from './pages/Database';
import Pipeline from './pages/Pipeline';
import Import from './pages/Import';
import Dashboard from './pages/Dashboard';
import Marketing from './pages/Marketing';
import Planning from './pages/Planning';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

function AppContent() {
  return (
    <div className="flex min-h-screen bg-surface-950 text-surface-50 font-sans selection:bg-primary-500/30">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden p-6 lg:p-10">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/database" element={<Database />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/analytics" element={<Analytics />} />

          <Route path="/import" element={<Import />} />
          <Route path="/marketing" element={<Marketing />} />
          <Route path="/planning" element={<Planning />} />
          <Route path="*" element={<Navigate to="/database" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Route publique */}
          <Route path="/login" element={<Login />} />

          {/* Routes protégées */}
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<AppContent />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
