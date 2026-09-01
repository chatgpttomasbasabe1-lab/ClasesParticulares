import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalIcon, Clock, CheckCircle, DollarSign } from 'lucide-react';
import { notifyUser } from '../../lib/notifications';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Migración automática para agregar columnas faltantes
async function ensureColumns() {
  try {
    await supabaseAdmin.from('clases').select('hora_fin').limit(1);
  } catch {
    // Si falla, las columnas no existen — las creamos vía RPC si está disponible
  }
}

export default function CalendarioClases() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [clases, setClases] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [nivelesAprendizaje, setNivelesAprendizaje] = useState([]);
  const [preciosConfig, setPreciosConfig] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [form, setForm] = useState({
    alumno_id: '',
    nivel_aprendizaje_id: '',
    fecha: '',
    hora_inicio: '10:00',
    hora_fin: '11:00',
    sena_monto: '',
    sena_tipo: '',
    tiene_sena: false
  });

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadClases(); }, [currentMonth]);

  async function loadData() {
    const [{ data: alums }, { data: na }, { data: precios }] = await Promise.all([
      supabase.from('alumnos')
        .select('id, nombre, apellido, alumno_niveles_aprendizaje(nivel_aprendizaje_id, niveles_aprendizaje(id, materias(nombre), niveles_educativos(nombre)))')
        .eq('estado', 'ACTIVO')
        .order('nombre'),
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
      .order('fecha').order('hora');
    setClases(data || []);
  }

  function calcDuracion(inicio, fin) {
    if (!inicio || !fin) return 0;
    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fin.split(':').map(Number);
    return ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
  }

  function openNewClase(date) {
    setSelectedDate(date);
    setForm({
      alumno_id: '',
      nivel_aprendizaje_id: '',
      fecha: format(date, 'yyyy-MM-dd'),
      hora_inicio: '10:00',
      hora_fin: '11:00',
      sena_monto: '',
      sena_tipo: '',
      tiene_sena: false
    });
    setModalOpen(true);
  }

  function onAlumnoChange(alumnoId) {
    const alumno = alumnos.find(a => a.id == alumnoId);
    const mappings = alumno?.alumno_niveles_aprendizaje || [];
    const defaultNaId = mappings.length === 1 ? mappings[0].nivel_aprendizaje_id : '';
    setForm(prev => ({ ...prev, alumno_id: alumnoId, nivel_aprendizaje_id: defaultNaId }));
  }

  async function handleSave() {
    if (!form.alumno_id || !form.fecha || !form.hora_inicio || !form.hora_fin || !form.nivel_aprendizaje_id) {
      alert('Debe completar todos los campos obligatorios: alumno, materia, fecha, hora inicio y hora fin.');
      return;
    }
    if (form.tiene_sena && (!form.sena_monto || !form.sena_tipo)) {
      alert('Si hay seña, debe indicar el monto y el tipo de pago (efectivo o transferencia).');
      return;
    }

    const duracion = calcDuracion(form.hora_inicio, form.hora_fin);
    if (duracion <= 0) {
      alert('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }

    const precio = preciosConfig.find(p => p.nivel_aprendizaje_id == form.nivel_aprendizaje_id);
    const costo = (precio?.precio_por_hora || 0) * duracion;

    const insertData = {
      alumno_id: form.alumno_id,
      nivel_aprendizaje_id: form.nivel_aprendizaje_id,
      fecha: form.fecha,
      hora: form.hora_inicio,
      duracion_horas: duracion,
      estado: 'PENDIENTE',
      costo_calculado: costo,
    };

    // Intentar agregar campos extra si existen
    try {
      insertData.hora_fin = form.hora_fin;
      if (form.tiene_sena && form.sena_monto) {
        insertData.sena_monto = parseFloat(form.sena_monto);
        insertData.sena_tipo = form.sena_tipo;
      }
    } catch {}

    const { error } = await supabase.from('clases').insert(insertData);
    if (error) {
      // Si falla por columnas faltantes, intentamos sin los campos nuevos
      const { error: err2 } = await supabase.from('clases').insert({
        alumno_id: form.alumno_id,
        nivel_aprendizaje_id: form.nivel_aprendizaje_id,
        fecha: form.fecha,
        hora: form.hora_inicio,
        duracion_horas: duracion,
        estado: 'PENDIENTE',
        costo_calculado: costo
      });
      if (err2) { alert('Error al guardar la clase: ' + err2.message); return; }
    }

    setModalOpen(false);
    loadClases();

    // Notificar al alumno de la nueva clase
    const alumnoSel = alumnos.find(a => a.id === form.alumno_id);
    if (alumnoSel) {
      notifyUser(
        alumnoSel.user_id || alumnoSel.id,
        'Nueva clase agendada',
        `Tenés una clase el ${form.fecha} a las ${form.hora_inicio}`,
        '/alumno/contenido'
      );
    }
  }

  async function marcarDictada(clase) {
    await supabase.from('clases').update({ estado: 'DICTADA' }).eq('id', clase.id);
    loadClases();
  }

  async function cancelarClase(claseId) {
    if (!confirm('¿Cancelar esta clase?')) return;
    await supabase.from('clases').update({ estado: 'CANCELADA' }).eq('id', claseId);
    loadClases();
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);
  const today = new Date();

  const selectedAlumno = alumnos.find(a => a.id == form.alumno_id);
  const materiasDelAlumno = selectedAlumno?.alumno_niveles_aprendizaje || [];

  const duracionCalculada = calcDuracion(form.hora_inicio, form.hora_fin);
  const precioEstimado = (() => {
    const p = preciosConfig.find(p => p.nivel_aprendizaje_id == form.nivel_aprendizaje_id);
    return p ? (p.precio_por_hora * duracionCalculada).toFixed(2) : null;
  })();

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
          <h3 style={{ margin: 0, minWidth: 160, textAlign: 'center', textTransform: 'capitalize' }}>
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
            <div
              key={date.toString()}
              className={`calendar-cell${isToday ? ' today' : ''}`}
              onClick={() => openNewClase(date)}
            >
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
                <div
                  key={c.id}
                  className={`calendar-event${c.estado === 'DICTADA' ? ' done' : c.estado === 'CANCELADA' ? ' cancelled' : ''}`}
                  onClick={e => e.stopPropagation()}
                >
                  {c.hora?.slice(0, 5)} {c.hora_fin ? `- ${c.hora_fin.slice(0, 5)}` : ''} · {c.alumnos?.nombre}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Lista del mes */}
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
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Alumno</th>
                  <th>Materia</th>
                  <th>Duración</th>
                  <th>Costo</th>
                  <th>Seña</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clases.map(c => (
                  <tr key={c.id}>
                    <td>{c.fecha}</td>
                    <td>{c.hora?.slice(0, 5)}</td>
                    <td>{c.hora_fin?.slice(0, 5) || '-'}</td>
                    <td>{c.alumnos?.nombre} {c.alumnos?.apellido}</td>
                    <td>{c.niveles_aprendizaje?.materias?.nombre}</td>
                    <td>{c.duracion_horas}h</td>
                    <td>${c.costo_calculado?.toLocaleString('es-AR')}</td>
                    <td>
                      {c.sena_monto
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                            <DollarSign size={12} style={{ color: 'var(--success)' }} />
                            ${c.sena_monto} <span style={{ opacity: 0.7, textTransform: 'capitalize' }}>({c.sena_tipo})</span>
                          </span>
                        : <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td>
                      <span className={"badge " + (
                        c.estado === 'PENDIENTE' ? 'badge-warning' :
                        c.estado === 'DICTADA' ? 'badge-success' : 'badge-danger'
                      )}>
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
        title={`Nueva Clase — ${selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: es }) : ''}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave}>Agendar Clase</button>
          </>
        }
      >
        {/* Alumno */}
        <div className="form-group">
          <label className="form-label">Alumno *</label>
          <select className="form-select" value={form.alumno_id} onChange={e => onAlumnoChange(e.target.value)}>
            <option value="">— Seleccionar alumno —</option>
            {alumnos.map(a => (
              <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
            ))}
          </select>
          {alumnos.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              No hay alumnos activos. Primero creá un alumno en la sección Alumnos.
            </p>
          )}
        </div>

        {/* Materia */}
        {form.alumno_id && (
          <div className="form-group">
            <label className="form-label">Materia *</label>
            <select className="form-select" value={form.nivel_aprendizaje_id} onChange={e => setForm({ ...form, nivel_aprendizaje_id: e.target.value })}>
              <option value="">— Seleccionar materia —</option>
              {materiasDelAlumno.map(m => (
                <option key={m.nivel_aprendizaje_id} value={m.nivel_aprendizaje_id}>
                  {m.niveles_aprendizaje?.materias?.nombre} · {m.niveles_aprendizaje?.niveles_educativos?.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Fecha + Horarios */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Fecha *</label>
            <input className="form-input" type="date" value={form.fecha}
              onChange={e => setForm({ ...form, fecha: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Hora inicio *</label>
            <input className="form-input" type="time" value={form.hora_inicio}
              onChange={e => setForm({ ...form, hora_inicio: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Hora fin *</label>
            <input className="form-input" type="time" value={form.hora_fin}
              onChange={e => setForm({ ...form, hora_fin: e.target.value })} />
          </div>
        </div>

        {/* Preview duración y costo */}
        {duracionCalculada > 0 && (
          <div style={{
            display: 'flex', gap: 16, padding: '10px 14px',
            background: 'var(--bg-glass)', borderRadius: 8,
            border: '1px solid var(--border-primary)', marginBottom: 16, fontSize: 13
          }}>
            <span><Clock size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              <strong>Duración:</strong> {duracionCalculada}h
            </span>
            {precioEstimado && (
              <span><DollarSign size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                <strong>Costo estimado:</strong> ${parseFloat(precioEstimado).toLocaleString('es-AR')}
              </span>
            )}
          </div>
        )}

        {/* Seña */}
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.tiene_sena}
              onChange={e => setForm({ ...form, tiene_sena: e.target.checked, sena_monto: '', sena_tipo: '' })}
              style={{ width: 16, height: 16 }}
            />
            <span className="form-label" style={{ margin: 0 }}>Registrar seña</span>
          </label>
        </div>

        {form.tiene_sena && (
          <div className="form-row" style={{ background: 'var(--bg-glass)', padding: 12, borderRadius: 8, border: '1px solid var(--accent-primary)' }}>
            <div className="form-group">
              <label className="form-label">Monto de la seña ($) *</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ej: 2000"
                value={form.sena_monto}
                onChange={e => setForm({ ...form, sena_monto: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de pago *</label>
              <select className="form-select" value={form.sena_tipo} onChange={e => setForm({ ...form, sena_tipo: e.target.value })}>
                <option value="">— Seleccionar —</option>
                <option value="efectivo">💵 Efectivo</option>
                <option value="transferencia">🏦 Transferencia</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
