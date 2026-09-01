import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import LoadingSpinner from './components/LoadingSpinner';
import Login from './pages/auth/Login';
import Dashboard from './pages/profesor/Dashboard';
import NivelesEducativos from './pages/profesor/NivelesEducativos';
import Materias from './pages/profesor/Materias';
import Contenido from './pages/profesor/Contenido';
import Alumnos from './pages/profesor/Alumnos';
import CalendarioClases from './pages/profesor/CalendarioClases';
import Facturacion from './pages/profesor/Facturacion';
import ChatProfesor from './pages/profesor/ChatProfesor';
import ForoProfesor from './pages/profesor/ForoProfesor';
import VistaAlumno from './pages/profesor/VistaAlumno';
import MiContenido from './pages/alumno/MiContenido';
import MiProgreso from './pages/alumno/MiProgreso';
import ChatAlumno from './pages/alumno/ChatAlumno';
import ForoAlumno from './pages/alumno/ForoAlumno';
import Configuracion from './pages/Configuracion';
import './index.css';

function ProtectedRoute({ children, allowedRole }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && profile?.rol !== allowedRole) {
    return <Navigate to={profile?.rol === 'profesor' ? '/profesor/dashboard' : '/alumno/contenido'} replace />;
  }
  return children;
}

function AppLayout({ children }) {
  const { loading } = useAuth();
  if (loading) return <LoadingSpinner />;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function AuthRedirect() {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.rol === 'profesor') return <Navigate to="/profesor/dashboard" replace />;
  if (profile?.rol === 'alumno') return <Navigate to="/alumno/contenido" replace />;
  return <Navigate to="/login" replace />;
}

function LoginGuard() {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (user && profile?.rol === 'profesor') return <Navigate to="/profesor/dashboard" replace />;
  if (user && profile?.rol === 'alumno') return <Navigate to="/alumno/contenido" replace />;
  return <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route path="/" element={<AuthRedirect />} />

          {/* Profesor Routes */}
          <Route path="/profesor/dashboard" element={
            <ProtectedRoute allowedRole="profesor">
              <AppLayout><Dashboard /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/profesor/niveles" element={
            <ProtectedRoute allowedRole="profesor">
              <AppLayout><NivelesEducativos /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/profesor/materias" element={
            <ProtectedRoute allowedRole="profesor">
              <AppLayout><Materias /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/profesor/contenido" element={
            <ProtectedRoute allowedRole="profesor">
              <AppLayout><Contenido /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/profesor/alumnos" element={
            <ProtectedRoute allowedRole="profesor">
              <AppLayout><Alumnos /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/profesor/calendario" element={
            <ProtectedRoute allowedRole="profesor">
              <AppLayout><CalendarioClases /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/profesor/facturacion" element={
            <ProtectedRoute allowedRole="profesor">
              <AppLayout><Facturacion /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/profesor/chat" element={
            <ProtectedRoute allowedRole="profesor">
              <AppLayout><ChatProfesor /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/profesor/foro" element={
            <ProtectedRoute allowedRole="profesor">
              <AppLayout><ForoProfesor /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/profesor/vista-alumno" element={
            <ProtectedRoute allowedRole="profesor">
              <AppLayout><VistaAlumno /></AppLayout>
            </ProtectedRoute>
          } />

          {/* Alumno Routes */}
          <Route path="/alumno/contenido" element={
            <ProtectedRoute allowedRole="alumno">
              <AppLayout><MiContenido /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/alumno/progreso" element={
            <ProtectedRoute allowedRole="alumno">
              <AppLayout><MiProgreso /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/alumno/chat" element={
            <ProtectedRoute allowedRole="alumno">
              <AppLayout><ChatAlumno /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/alumno/foro" element={
            <ProtectedRoute allowedRole="alumno">
              <AppLayout><ForoAlumno /></AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/configuracion" element={
            <ProtectedRoute>
              <AppLayout><Configuracion /></AppLayout>
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
