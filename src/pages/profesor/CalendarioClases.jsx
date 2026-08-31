import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalIcon, Clock, CheckCircle } from 'lucide-react';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function CalendarioClases() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [clases, setClases] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [nivelesAprendizaje, setNivelesAprendizaje] = useState([]);
  const [preciosConfig, setPreciosConfig] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [form, setForm] = useState({
    alumno_id: '', nivel_aprendizaje_id: '', fecha: '', hora: '10:00', duracion_horas: 1
  });

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadClases(); }, [currentMonth]);

  async function loadData() {
    const [{ data: alums }, { data: na }, { data: precios }] = await Promise.all([
      supabase.from('alumnos').select('*, niveles_aprendizaje(*, materias(*), niveles_educativos(*))').eq('estado', 'ACTIVO'),
      supabase.from('niveles_aprendizaje').select('*, materias(*), niveles_educativos(*)'),
      supabase.from('precios_config').select('*')
    ]);
    setAlumnos(alums || []);
    setNivelesAprendizaje(na || []);
    setPreciosConfig(precios || []);
  }

  async function loadClases() {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    const { data } = await supabase.from('clases')
      .select('*, alumnos(nombre, apellido), niveles_aprendizaje(*, materias(*), niveles_educativos(*))')
      .gte('fecha', start).lte('fecha', end)
      .order('hora');
    setClases(data || []);
  }

  function openNewClase(date) {
    const fechaStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(date);
    setForm({ alumno_id: '', nivel_aprendizaje_id: '', fecha: fechaStr, hora: '10:00', duracion_horas: 1 });
    setModalOpen(true);
  }

  function onAlumnoChange(alumnoId) {
    const alumno = alumnos.find(a => a.id == alumnoId);
    setForm(prev => ({
      ...prev,
      alumno_id: alumnoId,
      nivel_aprendizaje_id: alumno?.nivel_aprendizaje_id || prev.nivel_aprendizaje_id
    }));
  }

  async function handleSave() {
    if (!form.alumno_id || !form.fecha || !form.hora) return;

    const precio = preciosConfig.find(p => p.nivel_aprendizaje_id == form.nivel_aprendizaje_id);
    const costo = (precio?.precio_por_hora || 0) * form.duracion_horas;

    await supabase.from('clases').insert({
      alumno_id: form.alumno_id,
      nivel_aprendizaje_id: form.nivel_aprendizaje_id,
      fecha: form.fecha,
      hora: form.hora,
      duracion_horas: form.duracion_horas,
      estado: 'PENDIENTE',
      costo_calculado: costo
    });

    setModalOpen(false);
    loadClases();
  }

  async function marcarDictada(clase) {
    await supabase.from('clases')
      .update({ estado: 'DICTADA' })
      .eq('id', clase.id);

    loadClases();
  }

  async function cancelarClase(claseId) {
    await supabase.from('clases').update({ estado: 'CANCELADA' }).eq('id', claseId);
    loadClases();
  }

  // Calendar generation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);
  const today = new Date();

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Calendario de Clases</h1>
          <p>Agendá y gestioná tus clases. Marcalas como dictadas para facturar.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openNewClase(new Date())}>
          <Plus size={18} /> Nueva Clase
        </button>
      </div>

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <button className="btn btn-secondary" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft size={18} />
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 600, textTransform: 'capitalize' }}>
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h2>
        <button className="btn btn-secondary" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {DIAS.map(d => (
          <div key={d} className="calendar-header-cell">{d}</div>
        ))}
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} className="calendar-cell other-month"></div>
        ))}
        {days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayClases = clases.filter(c => c.fecha === dayStr);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={dayStr}
              className={`calendar-cell ${isToday ? 'today' : ''}`}
              onClick={() => openNewClase(day)}
            >
              <div className="calendar-day">{format(day, 'd')}</div>
              {dayClases.map(c => (
                <div
                  key={c.id}
                  className={`calendar-event ${c.estado.toLowerCase()}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {c.hora} - {c.alumnos?.nombre}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* List of classes this month */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Clases del Mes</h3>
        </div>
        {clases.length === 0 ? (
          <div className="empty-state">
            <CalIcon size={40} />
            <h3>Sin clases este mes</h3>
            <p>Hacé clic en un día del calendario para agendar una clase.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Alumno</th>
                  <th>Materia</th>
                  <th>Duración</th>
                  <th>Costo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clases.map(c => (
                  <tr key={c.id}>
                    <td>{c.fecha}</td>
                    <td>{c.hora}</td>
                    <td>{c.alumnos?.nombre} {c.alumnos?.apellido}</td>
                    <td>{c.niveles_aprendizaje?.materias?.nombre}</td>
                    <td>{c.duracion_horas}h</td>
                    <td>${c.costo_calculado?.toLocaleString('es-AR')}</td>
                    <td>
                      <span className={`badge ${
                        c.estado === 'PENDIENTE' ? 'badge-warning' :
                        c.estado === 'DICTADA' ? 'badge-success' : 'badge-danger'
                      }`}>
                        {c.estado}
                      </span>
                    </td>
                    <td>
                      {c.estado === 'PENDIENTE' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm btn-primary" onClick={() => marcarDictada(c)}>
                            <CheckCircle size={14} /> Dictada
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => cancelarClase(c.id)}>
                            Cancelar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nueva Clase */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nueva Clase"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave}>Agendar Clase</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Alumno</label>
          <select className="form-select" value={form.alumno_id} onChange={(e) => onAlumnoChange(e.target.value)}>
            <option value="">Seleccionar alumno...</option>
            {alumnos.map(a => (
              <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Fecha</label>
            <input className="form-input" type="date" value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Hora</label>
            <input className="form-input" type="time" value={form.hora}
              onChange={(e) => setForm({ ...form, hora: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Duración (horas)</label>
          <input className="form-input" type="number" min="0.5" step="0.5" value={form.duracion_horas}
            onChange={(e) => setForm({ ...form, duracion_horas: parseFloat(e.target.value) })} />
        </div>
      </Modal>
    </div>
  );
}
