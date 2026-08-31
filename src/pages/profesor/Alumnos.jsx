import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import Modal from '../../components/Modal';
import {
  Plus, Edit2, Trash2, Users, Search, UserPlus,
  UserCheck, UserX, Clock, Award, CheckSquare, Square
} from 'lucide-react';

const ESTADOS = ['ACTIVO', 'CLASE_PENDIENTE', 'CICLO_CUMPLIDO', 'ABANDONO'];
const ESTADO_BADGE = {
  ACTIVO: 'badge-success',
  CLASE_PENDIENTE: 'badge-warning',
  CICLO_CUMPLIDO: 'badge-info',
  ABANDONO: 'badge-danger'
};
const ESTADO_LABEL = {
  ACTIVO: 'Activo',
  CLASE_PENDIENTE: 'Clase Pendiente',
  CICLO_CUMPLIDO: 'Ciclo Cumplido',
  ABANDONO: 'Abandono'
};

export default function Alumnos() {
  const [alumnos, setAlumnos] = useState([]);
  const [nivelesAprendizaje, setNivelesAprendizaje] = useState([]);
  const [nivelesEducativos, setNivelesEducativos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    nombre: '', apellido: '', telefono: '', email: '',
    direccion: '', password: '', nivel_educativo_id: '', niveles_aprendizaje_ids: [], estado: 'ACTIVO'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: alums }, { data: na }] = await Promise.all([
      supabase.from('alumnos')
        .select('*, alumno_niveles_aprendizaje(nivel_aprendizaje_id, niveles_aprendizaje(*, materias(*), niveles_educativos(*)))')
        .order('nombre'),
      supabase.from('niveles_aprendizaje')
        .select('*, materias(*), niveles_educativos(*)')
        .order('id')
    ]);
    
    setAlumnos(alums || []);
    setNivelesAprendizaje(na || []);
    
    // Extract unique niveles_educativos for the dropdown
    const neMap = {};
    (na || []).forEach(n => {
      if (n.niveles_educativos) {
        neMap[n.niveles_educativos.id] = n.niveles_educativos;
      }
    });
    setNivelesEducativos(Object.values(neMap));
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({
      nombre: '', apellido: '', telefono: '', email: '',
      direccion: '', password: '', nivel_educativo_id: nivelesEducativos[0]?.id || '', niveles_aprendizaje_ids: [], estado: 'ACTIVO'
    });
    setModalOpen(true);
  }

  function openEdit(alumno) {
    setEditing(alumno);
    // Identify their current nivel_educativo_id from the first mapped subject, or default
    const currentMappings = alumno.alumno_niveles_aprendizaje || [];
    let neId = nivelesEducativos[0]?.id || '';
    if (currentMappings.length > 0 && currentMappings[0].niveles_aprendizaje) {
      neId = currentMappings[0].niveles_aprendizaje.nivel_educativo_id;
    }
    
    setForm({
      nombre: alumno.nombre, apellido: alumno.apellido,
      telefono: alumno.telefono || '', email: alumno.email || '',
      direccion: alumno.direccion || '', password: '',
      nivel_educativo_id: neId, 
      niveles_aprendizaje_ids: currentMappings.map(m => m.nivel_aprendizaje_id), 
      estado: alumno.estado
    });
    setModalOpen(true);
  }

  function toggleMateria(naId) {
    setForm(prev => {
      const ids = [...prev.niveles_aprendizaje_ids];
      if (ids.includes(naId)) {
        return { ...prev, niveles_aprendizaje_ids: ids.filter(id => id !== naId) };
      } else {
        ids.push(naId);
        return { ...prev, niveles_aprendizaje_ids: ids };
      }
    });
  }

  async function handleSave() {
    if (!form.nombre.trim() || !form.apellido.trim() || form.niveles_aprendizaje_ids.length === 0) {
      alert('Debe completar nombre, apellido y seleccionar al menos una materia.');
      return;
    }

    // fallback for old columns
    const primaryNaId = form.niveles_aprendizaje_ids[0];

    let alumnoId = null;

    if (editing) {
      alumnoId = editing.id;
      await supabase.from('alumnos')
        .update({
          nombre: form.nombre, apellido: form.apellido,
          telefono: form.telefono, email: form.email,
          direccion: form.direccion, nivel_aprendizaje_id: primaryNaId,
          estado: form.estado
        })
        .eq('id', alumnoId);
    } else {
      if (!form.email || !form.password) {
        alert('Email y contraseña son requeridos para crear un alumno.');
        return;
      }
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
            email: form.email, password: form.password, email_confirm: true
          });

      if (authErr) {
        alert('Error al crear el usuario en Auth: ' + authErr.message);
        return;
      }

      const userId = authData?.user?.id;
      if (!userId) {
         alert('Error crítico: No se pudo obtener el ID del usuario creado.');
         return;
      }

      // Crear perfil en tabla profiles con rol alumno
      await supabaseAdmin.from('profiles').insert({
        id: userId,
        nombre: form.nombre,
        email: form.email,
        rol: 'alumno'
      });

      const { data: insertData } = await supabaseAdmin.from('alumnos').insert({
        nombre: form.nombre, apellido: form.apellido,
        telefono: form.telefono, email: form.email,
        direccion: form.direccion, nivel_aprendizaje_id: primaryNaId,
        estado: 'ACTIVO', user_id: userId
      }).select();
      
      if (insertData && insertData.length > 0) {
        alumnoId = insertData[0].id;
      }

    }

    if (alumnoId) {
      // Manage alumno_niveles_aprendizaje
      await supabase.from('alumno_niveles_aprendizaje').delete().eq('alumno_id', alumnoId);
      
      const insertMappings = form.niveles_aprendizaje_ids.map(naId => ({
        alumno_id: alumnoId,
        nivel_aprendizaje_id: naId
      }));
      
      if (insertMappings.length > 0) {
        await supabase.from('alumno_niveles_aprendizaje').insert(insertMappings);
      }
    }

    setModalOpen(false);
    loadData();
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este alumno?')) return;
    await supabase.from('alumnos').delete().eq('id', id);
    loadData();
  }

  async function updateEstado(alumnoId, estado) {
    await supabase.from('alumnos').update({ estado }).eq('id', alumnoId);
    loadData();
  }

  const filtered = alumnos.filter(a =>
    `${a.nombre} ${a.apellido}`.toLowerCase().includes(search.toLowerCase())
  );
  
  const materiasDisponibles = nivelesAprendizaje.filter(na => na.nivel_educativo_id == form.nivel_educativo_id);

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Alumnos</h1>
          <p>Gestión de alumnos: alta, asignación de nivel y seguimiento de estados.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <UserPlus size={18} /> Nuevo Alumno
        </button>
      </div>

      <div className="search-bar">
        <Search size={18} />
        <input
          placeholder="Buscar alumno por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 && !loading ? (
        <div className="card">
          <div className="empty-state">
            <Users size={48} />
            <h3>{search ? 'Sin resultados' : 'Sin alumnos registrados'}</h3>
            <p>{search ? 'No se encontraron alumnos con ese nombre.' : 'Registrá tu primer alumno para comenzar.'}</p>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Email</th>
                <th>Materias (Nivel)</th>
                <th>Estado</th>
                <th style={{ width: 140 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="chat-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                        {a.nombre?.[0]}{a.apellido?.[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{a.nombre} {a.apellido}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{a.telefono}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{a.email}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(a.alumno_niveles_aprendizaje || []).map(mapping => {
                        const na = mapping.niveles_aprendizaje;
                        if (!na) return null;
                        return (
                          <span key={mapping.nivel_aprendizaje_id} className="badge badge-purple" style={{ width: 'fit-content', fontSize: 11 }}>
                            {na.materias?.nombre} - {na.niveles_educativos?.nombre}
                          </span>
                        );
                      })}
                      {(!a.alumno_niveles_aprendizaje || a.alumno_niveles_aprendizaje.length === 0) && (
                         <span className="badge badge-neutral" style={{ width: 'fit-content', fontSize: 11 }}>
                            Sin materias asignadas
                         </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <select
                      className="form-select"
                      style={{ padding: '4px 30px 4px 10px', fontSize: 12 }}
                      value={a.estado}
                      onChange={(e) => updateEstado(a.id, e.target.value)}
                    >
                      {ESTADOS.map(e => (
                        <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-icon" onClick={() => openEdit(a)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }}
                        onClick={() => handleDelete(a.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Alumno' : 'Nuevo Alumno'}
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave}>
              {editing ? 'Guardar' : 'Crear Alumno'}
            </button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input className="form-input" placeholder="Juan" value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Apellido</label>
            <input className="form-input" placeholder="Pérez" value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="juan@email.com" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} />
          </div>
          <div className="form-group">
            <label className="form-label">Teléfono</label>
            <input className="form-input" placeholder="+54 11 1234-5678" value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </div>
        </div>
        {!editing && (
          <div className="form-group">
            <label className="form-label">Contraseña (para acceso del alumno)</label>
            <input className="form-input" type="password" placeholder="Mínimo 6 caracteres" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Dirección</label>
          <input className="form-input" placeholder="Dirección del alumno" value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">1. Seleccionar Nivel Educativo</label>
            <select className="form-select" value={form.nivel_educativo_id}
              onChange={(e) => setForm({ ...form, nivel_educativo_id: e.target.value, niveles_aprendizaje_ids: [] })}>
              {nivelesEducativos.map(ne => (
                <option key={ne.id} value={ne.id}>
                  {ne.nombre}
                </option>
              ))}
            </select>
          </div>
          {editing && (
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-select" value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
              </select>
            </div>
          )}
        </div>
        
        <div className="form-group" style={{ marginTop: 16 }}>
          <label className="form-label">2. Seleccionar Materias (Múltiples)</label>
          {materiasDisponibles.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No hay materias configuradas para este nivel.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {materiasDisponibles.map(na => {
                const isSelected = form.niveles_aprendizaje_ids.includes(na.id);
                return (
                  <div key={na.id} 
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                      background: isSelected ? 'var(--bg-glass-hover)' : 'var(--bg-glass)',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-primary)',
                      borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onClick={() => toggleMateria(na.id)}
                  >
                    {isSelected ? (
                      <CheckSquare size={18} style={{ color: 'var(--accent-primary)' }} />
                    ) : (
                      <Square size={18} style={{ color: 'var(--text-tertiary)' }} />
                    )}
                    <span style={{ fontWeight: isSelected ? 600 : 400 }}>{na.materias?.nombre}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
