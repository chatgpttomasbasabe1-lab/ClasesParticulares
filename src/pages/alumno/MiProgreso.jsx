import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function MiProgreso() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ total: 0, completados: 0, pendientes: 0 });
  const [apartadosProgreso, setApartadosProgreso] = useState([]);

  useEffect(() => {
    if (profile?.nivel_aprendizaje_id) loadProgreso();
  }, [profile]);

  async function loadProgreso() {
    const { data: apts } = await supabase.from('apartados')
      .select('*').eq('nivel_aprendizaje_id', profile.nivel_aprendizaje_id);

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
        nombre: apt.nombre,
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
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Resumen Visual</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                <Cell fill="#6366f1" />
                <Cell fill="rgba(255,255,255,0.06)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ textAlign: 'center', marginTop: -20 }}>
            <div style={{ fontSize: 36, fontWeight: 800 }}>{porcentajeGeneral}%</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Completado</div>
          </div>
        </div>
      </div>
    </div>
  );
}
