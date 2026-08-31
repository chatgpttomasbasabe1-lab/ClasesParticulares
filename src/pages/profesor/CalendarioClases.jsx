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
      supabase.from('alumnos').select('*, alumno_niveles_aprendizaje(nivel_aprendizaje_id, niveles_aprendizaje(*, materias(*), niveles_educativos(*)))').eq('estado', 'ACTIVO'),
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
    let defaultNaId = '';
    const mappings = alumno?.alumno_niveles_aprendizaje || [];
    if (mappings.length === 1) {
      defaultNaId = mappings[0].nivel_aprendizaje_id;
    }
    setForm(prev => ({
      ...prev,
      alumno_id: alumnoId,
      nivel_aprendizaje_id: defaultNaId
    }));
  }

  async function handleSave() {
    if (!form.alumno_id || !form.fecha || !form.hora || !form.nivel_aprendizaje_id) {
      alert('Debe completar todos los campos, incluyendo la materia.');
      return;
    }

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

  // Helper para materias del alumno seleccionado
  const selectedAlumno = alumnos.find(a => a.id == form.alumno_id);
  const materiasDelAlumno = selectedAlumno?.alumno_niveles_aprendizaje || [];

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Calendario</h1>
          <p>Agendá y gestioná tus clases.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft size={20} />
          </button>
          <h3 style={{ margin: 0, minWidth: 150, textAlign: 'center', textTransform: 'capitalize' }}>
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {DIAS.map(d => (
          <div key={d} className="calendar-header-cell">{d}</div>
        ))}
        
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} className="calendar-cell" style={{ opacity: 0.3 }} />
        ))}

        {days.map(date => {
          const isToday = isSameDay(date, today);
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayClases = clases.filter(c => c.fecha === dateStr);

          return (
            <div key={date.toString()} className={calendar-cell } onClick={() => openNewClase(date)}>
              <div className="calendar-cell-header">
                <span style={{ 
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isToday ? 'var(--accent-primary)' : 'transparent',
                  color: isToday ? 'white' : 'inherit', borderRadius: '50%', fontWeight: isToday ? 600 : 400
                }}>
                  {format(date, 'd')}
                </span>
                <button className="btn btn-ghost btn-icon" style={{ opacity: 0.5, transform: 'scale(0.8)' }}>
                  <Plus size={16} />
                </button>
              </div>
              
              {dayClases.map(c => (
                <div key={c.id} 
                  className={calendar-event }
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
                      <span className={adge }>
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
        
        {form.alumno_id && (
          <div className="form-group">
            <label className="form-label">Materia de la clase</label>
            <select className="form-select" value={form.nivel_aprendizaje_id} onChange={(e) => setForm({...form, nivel_aprendizaje_id: e.target.value})}>
              <option value="">Seleccionar materia...</option>
              {materiasDelAlumno.map(m => (
                <option key={m.nivel_aprendizaje_id} value={m.nivel_aprendizaje_id}>
                  {m.niveles_aprendizaje?.materias?.nombre} - {m.niveles_aprendizaje?.niveles_educativos?.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

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
