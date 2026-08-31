import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Users, BookOpen, Calendar, DollarSign,
  TrendingUp, Clock, AlertCircle, CheckCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalAlumnos: 0, clasesDelMes: 0, ingresosMes: 0, deudasPendientes: 0
  });
  const [alumnosProgreso, setAlumnosProgreso] = useState([]);
  const [estadosAlumnos, setEstadosAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      // Load alumnos
      const { data: alumnos } = await supabase.from('alumnos')
        .select('*, alumno_niveles_aprendizaje(nivel_aprendizaje_id)');

      // Load clases del mes
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data: clasesMes } = await supabase.from('clases')
        .select('*')
        .gte('fecha', firstDay)
        .lte('fecha', lastDay);

      // Load pagos del mes
      const { data: pagosMes } = await supabase.from('pagos')
        .select('*')
        .gte('fecha', firstDay);

      // Load deudas pendientes
      const { data: deudas } = await supabase.from('deudas')
        .select('*')
        .in('estado', ['PENDIENTE', 'PARCIAL']);

      const totalIngresos = (pagosMes || []).reduce((sum, p) => sum + p.monto, 0);
      const totalDeudas = (deudas || []).reduce((sum, d) => sum + d.monto_pendiente, 0);

      setStats({
        totalAlumnos: (alumnos || []).length,
        clasesDelMes: (clasesMes || []).filter(c => c.estado === 'DICTADA').length,
        ingresosMes: totalIngresos,
        deudasPendientes: totalDeudas
      });

      // Progreso por alumno
      const progresoData = [];
      for (const alumno of (alumnos || [])) {
        const ids = (alumno.alumno_niveles_aprendizaje || []).map(na => na.nivel_aprendizaje_id);
        if (ids.length === 0 && alumno.nivel_aprendizaje_id) ids.push(alumno.nivel_aprendizaje_id);

        let totalModulos = 0;
        if (ids.length > 0) {
           const { data: apts } = await supabase.from('apartados').select('id').in('nivel_aprendizaje_id', ids);
           if (apts && apts.length > 0) {
             const { count } = await supabase.from('modulos')
               .select('*', { count: 'exact', head: true })
               .in('apartado_id', apts.map(a => a.id));
             totalModulos = count || 0;
           }
        }

        const { count: completados } = await supabase.from('progreso_alumno_modulo')
          .select('*', { count: 'exact', head: true })
          .eq('alumno_id', alumno.id)
          .eq('completado', true);

        const porcentaje = totalModulos > 0 ? Math.round(((completados || 0) / totalModulos) * 100) : 0;
        progresoData.push({
          nombre: `${alumno.nombre} ${alumno.apellido}`,
          progreso: porcentaje
        });
      }
      setAlumnosProgreso(progresoData);

      // Estados
      const estadosCount = {};
      (alumnos || []).forEach(a => {
        estadosCount[a.estado] = (estadosCount[a.estado] || 0) + 1;
      });
      setEstadosAlumnos(Object.entries(estadosCount).map(([name, value]) => ({ name, value })));

    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (val) => `$${val.toLocaleString('es-AR')}`;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Bienvenido, {profile?.nombre || 'Profesor'}. Resumen general de tu academia.</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon purple"><Users size={22} /></div>
          <div className="kpi-value">{stats.totalAlumnos}</div>
          <div className="kpi-label">Alumnos Activos</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><Calendar size={22} /></div>
          <div className="kpi-value">{stats.clasesDelMes}</div>
          <div className="kpi-label">Clases Dictadas (Mes)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon blue"><DollarSign size={22} /></div>
          <div className="kpi-value">{formatCurrency(stats.ingresosMes)}</div>
          <div className="kpi-label">Ingresos del Mes</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon red"><AlertCircle size={22} /></div>
          <div className="kpi-value">{formatCurrency(stats.deudasPendientes)}</div>
          <div className="kpi-label">Deudas Pendientes</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Progreso por Alumno</h3>
            <TrendingUp size={20} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          {alumnosProgreso.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={alumnosProgreso} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={12} />
                <YAxis type="category" dataKey="nombre" stroke="#64748b" fontSize={12} width={80} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  formatter={(val) => [`${val}%`, 'Progreso']}
                />
                <Bar dataKey="progreso" fill="url(#barGradient)" radius={[0, 4, 4, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <TrendingUp size={40} />
              <h3>Sin datos aún</h3>
              <p>Los datos de progreso aparecerán cuando tengas alumnos y contenido registrado.</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Estados de Alumnos</h3>
          </div>
          {estadosAlumnos.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={estadosAlumnos}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {estadosAlumnos.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                />
                <Legend
                  formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <Users size={40} />
              <h3>Sin alumnos</h3>
              <p>Registrá alumnos para ver la distribución de estados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
