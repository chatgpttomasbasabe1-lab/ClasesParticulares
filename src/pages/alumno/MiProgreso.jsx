import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function MiProgreso({ previewProfile }) {
  const authContext = useAuth();
  const profile = previewProfile || authContext.profile;
  const [stats, setStats] = useState({ total: 0, completados: 0, pendientes: 0 });
  const [apartadosProgreso, setApartadosProgreso] = useState([]);

  useEffect(() => {
    if (profile?.alumno_niveles_aprendizaje?.length > 0 || profile?.nivel_aprendizaje_id) {
      loadProgreso();
    }
  }, [profile]);

  async function loadProgreso() {
    const ids = (profile?.alumno_niveles_aprendizaje || []).map(na => na.nivel_aprendizaje_id);
    if (ids.length === 0 && profile?.nivel_aprendizaje_id) ids.push(profile.nivel_aprendizaje_id);
    if (ids.length === 0) return;

    const { data: apts } = await supabase.from('apartados')
      .select('*, niveles_aprendizaje(materias(nombre))')
      .in('nivel_aprendizaje_id', ids);

    let totalMods = 0;
    let totalCompletados = 0;
    const aptProgreso = [];

    for (const apt of (apts || [])) {
      const { data: mods } = await supabase.from('modulos')
        .select('*').eq('apartado_id', apt.id);

      const { data: prog } = await supabase.from('progreso_alumno_modulo')
        .select('*').eq('alumno_id', profile.id)
        .in('modulo_id', (mods || []).map(m => m.id))
        .eq('completado', true);

      const modCount = (mods || []).length;
      const compCount = (prog || []).length;
      totalMods += modCount;
      totalCompletados += compCount;

      aptProgreso.push({
        nombre: apt.nombre + (apt.niveles_aprendizaje ? ` (${apt.niveles_aprendizaje.materias?.nombre})` : ''),
        total: modCount,
        completados: compCount,
        porcentaje: modCount > 0 ? Math.round((compCount / modCount) * 100) : 0
      });
    }

    setStats({
      total: totalMods,
      completados: totalCompletados,
      pendientes: totalMods - totalCompletados
    });
    setApartadosProgreso(aptProgreso);
  }

  const porcentajeGeneral = stats.total > 0 ? Math.round((stats.completados / stats.total) * 100) : 0;
  const pieData = [
    { name: 'Completado', value: stats.completados },
    { name: 'Pendiente', value: stats.pendientes }
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Mi Progreso</h1>
        <p>Seguimiento de tu avance en el contenido asignado.</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon purple"><TrendingUp size={22} /></div>
          <div className="kpi-value">{porcentajeGeneral}%</div>
          <div className="kpi-label">Progreso General</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><CheckCircle size={22} /></div>
          <div className="kpi-value">{stats.completados}</div>
          <div className="kpi-label">Módulos Completados</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon orange"><Clock size={22} /></div>
          <div className="kpi-value">{stats.pendientes}</div>
          <div className="kpi-label">Módulos Pendientes</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Progreso por Apartado</h3>
          </div>
          {apartadosProgreso.map((apt, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 500, fontSize: 14 }}>{apt.nombre}</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {apt.completados}/{apt.total} ({apt.porcentaje}%)
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${apt.porcentaje}%` }}></div>
              </div>
            </div>
          ))}
          {apartadosProgreso.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Sin progreso registrado.</p>
          )}
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 className="card-title" style={{ width: '100%', marginBottom: 20 }}>Balance General</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                <Cell fill="var(--success)" />
                <Cell fill="var(--warning)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: -20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--success)' }}></div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Completado</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--warning)' }}></div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Pendiente</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
