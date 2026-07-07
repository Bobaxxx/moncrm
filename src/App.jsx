import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Database from './pages/Database';
import Pipeline from './pages/Pipeline';
import Import from './pages/Import';
import Dashboard from './pages/Dashboard';
import TodoList from './pages/TodoList';
import Planning from './pages/Planning';
import Analytics from './pages/Analytics';
import ClientDetail from './pages/ClientDetail';
import Clients from './pages/Clients';
import Facturation from './pages/Facturation';
import Products from './pages/Products';
import Login from './pages/Login';
import Calls from './pages/Calls';
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
          <Route path="/todo" element={<TodoList />} />
          <Route path="/calls" element={<Calls />} />
          <Route path="/database" element={<Database />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/prospect/:id" element={<ClientDetail />} />

          <Route path="/import" element={<Import />} />
          <Route path="/planning" element={<Planning />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/billing" element={<Facturation />} />
          <Route path="/products" element={<Products />} />
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
