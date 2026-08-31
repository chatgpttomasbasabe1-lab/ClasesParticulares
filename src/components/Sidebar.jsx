import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, GraduationCap, BookOpen, Users, Calendar,
  DollarSign, MessageSquare, HelpCircle, LogOut, ChevronLeft,
  ChevronRight, Settings, FileText, Home
} from 'lucide-react';

import logoImg from '../assets/logo.png';

const profesorLinks = [
  { to: '/profesor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/profesor/niveles', icon: GraduationCap, label: 'Niveles Educativos' },
  { to: '/profesor/materias', icon: BookOpen, label: 'Materias' },
  { to: '/profesor/contenido', icon: FileText, label: 'Contenido' },
  { to: '/profesor/alumnos', icon: Users, label: 'Alumnos' },
  { to: '/profesor/calendario', icon: Calendar, label: 'Calendario' },
  { to: '/profesor/facturacion', icon: DollarSign, label: 'Facturación' },
  { to: '/profesor/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/profesor/foro', icon: HelpCircle, label: 'Foro' },
];

const alumnoLinks = [
  { to: '/alumno/contenido', icon: BookOpen, label: 'Mi Contenido' },
  { to: '/alumno/progreso', icon: LayoutDashboard, label: 'Mi Progreso' },
  { to: '/alumno/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/alumno/foro', icon: HelpCircle, label: 'Foro' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { profile, signOut, isProfesor } = useAuth();
  const navigate = useNavigate();
  const links = isProfesor ? profesorLinks : alumnoLinks;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <img src={logoImg} className="sidebar-logo-img" alt="Logo" />
        {!collapsed && (
          <div>
            <div className="sidebar-title">Clases Particulares</div>
            <div className="sidebar-subtitle">
              {isProfesor ? 'Panel Profesor' : 'Portal Alumno'}
            </div>
          </div>
        )}
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
  );
}
