import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, GraduationCap, BookOpen, Users, Calendar,
  DollarSign, MessageSquare, HelpCircle, LogOut, ChevronLeft,
  ChevronRight, FileText, Menu, X, TrendingUp
} from 'lucide-react';
import { Eye } from 'lucide-react';
import logoImg from '../assets/logo_tb.png';
import NotificationBell from './NotificationBell';

const profesorLinks = [
  { to: '/profesor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/profesor/niveles', icon: GraduationCap, label: 'Niveles' },
  { to: '/profesor/materias', icon: BookOpen, label: 'Materias' },
  { to: '/profesor/contenido', icon: FileText, label: 'Contenido' },
  { to: '/profesor/alumnos', icon: Users, label: 'Alumnos' },
  { to: '/profesor/calendario', icon: Calendar, label: 'Calendario' },
  { to: '/profesor/facturacion', icon: DollarSign, label: 'Facturación' },
  { to: '/profesor/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/profesor/foro', icon: HelpCircle, label: 'Foro' },
  { to: '/profesor/vista-alumno', icon: Eye, label: 'Vista Alumno' },
];

const alumnoLinks = [
  { to: '/alumno/contenido', icon: BookOpen, label: 'Contenido' },
  { to: '/alumno/progreso', icon: TrendingUp, label: 'Progreso' },
  { to: '/alumno/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/alumno/foro', icon: HelpCircle, label: 'Foro' },
];

// Bottom nav shows max 5 items for mobile
const profesorBottomLinks = [
  { to: '/profesor/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/profesor/alumnos', icon: Users, label: 'Alumnos' },
  { to: '/profesor/calendario', icon: Calendar, label: 'Agenda' },
  { to: '/profesor/facturacion', icon: DollarSign, label: 'Cobros' },
  { to: '/profesor/chat', icon: MessageSquare, label: 'Chat' },
];

const alumnoBottomLinks = [
  { to: '/alumno/contenido', icon: BookOpen, label: 'Contenido' },
  { to: '/alumno/progreso', icon: TrendingUp, label: 'Progreso' },
  { to: '/alumno/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/alumno/foro', icon: HelpCircle, label: 'Foro' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut, isProfesor } = useAuth();
  const navigate = useNavigate();
  const links = isProfesor ? profesorLinks : alumnoLinks;
  const bottomLinks = isProfesor ? profesorBottomLinks : alumnoBottomLinks;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      {/* ===== MOBILE TOPBAR ===== */}
      <div className="mobile-topbar">
        <div className="mobile-topbar-logo">
          <img src={logoImg} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain' }} alt="Logo" />
          <span className="mobile-topbar-title">Clases Particulares</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NotificationBell />
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 13, fontWeight: 700
          }}>
            {profile?.nombre?.[0] || profile?.email?.[0] || 'U'}
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: 4 }}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* ===== SIDEBAR OVERLAY (mobile) ===== */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* ===== SIDEBAR ===== */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <img src={logoImg} className="sidebar-logo-img" alt="Logo" />
          {!collapsed && (
            <div style={{ flex: 1 }}>
              <div className="sidebar-title">Clases Particulares</div>
              <div className="sidebar-subtitle">
                {isProfesor ? 'Panel Profesor' : 'Portal Alumno'}
              </div>
            </div>
          )}
          {/* Close button for mobile */}
          <button
            className="mobile-topbar"
            onClick={() => setMobileOpen(false)}
            style={{
              display: 'none', /* shown only inside sidebar on mobile via CSS */
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', padding: 4
            }}
          >
            <X size={20} />
          </button>
        </div>

        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <nav className="sidebar-nav">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={20} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item" style={{ marginBottom: 8 }}>
            <div className="chat-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
              {profile?.nombre?.[0] || profile?.email?.[0] || 'U'}
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {profile?.nombre || profile?.email || 'Usuario'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {isProfesor ? 'Profesor' : 'Alumno'}
                </div>
              </div>
            )}
          </div>
          <button className="nav-item" onClick={handleSignOut} style={{ color: 'var(--danger)' }}>
            <LogOut size={20} />
            {!collapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* ===== BOTTOM NAV (mobile only) ===== */}
      <nav className="bottom-nav">
        {bottomLinks.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button className="bottom-nav-item" onClick={handleSignOut} style={{ color: 'var(--danger)' }}>
          <LogOut size={22} />
          <span>Salir</span>
        </button>
      </nav>
    </>
  );
}
