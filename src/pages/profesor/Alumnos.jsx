import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/Modal';
import {
  Plus, Edit2, Trash2, Users, Search, UserPlus,
  UserCheck, UserX, Clock, Award
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    nombre: '', apellido: '', telefono: '', email: '',
    direccion: '', password: '', nivel_aprendizaje_id: '', estado: 'ACTIVO'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: alums }, { data: na }] = await Promise.all([
      supabase.from('alumnos')
        .select('*, niveles_aprendizaje(*, materias(*), niveles_educativos(*))')
        .order('nombre'),
      supabase.from('niveles_aprendizaje')
        .select('*, materias(*), niveles_educativos(*)')
        .order('id')
    ]);
    setAlumnos(alums || []);
    setNivelesAprendizaje(na || []);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({
      nombre: '', apellido: '', telefono: '', email: '',
      direccion: '', password: '', nivel_aprendizaje_id: nivelesAprendizaje[0]?.id || '', estado: 'ACTIVO'
    });
    setModalOpen(true);
  }

  function openEdit(alumno) {
    setEditing(alumno);
    setForm({
      nombre: alumno.nombre, apellido: alumno.apellido,
      telefono: alumno.telefono || '', email: alumno.email || '',
      direccion: alumno.direccion || '', password: '',
      nivel_aprendizaje_id: alumno.nivel_aprendizaje_id, estado: alumno.estado
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.nombre.trim() || !form.apellido.trim() || !form.nivel_aprendizaje_id) return;

    if (editing) {
      await supabase.from('alumnos')
        .update({
          nombre: form.nombre, apellido: form.apellido,
          telefono: form.telefono, email: form.email,
          direccion: form.direccion, nivel_aprendizaje_id: form.nivel_aprendizaje_id,
          estado: form.estado
        })
        .eq('id', editing.id);
    } else {
      // Create auth user first
      if (!form.email || !form.password) {
        alert('Email y contraseña son requeridos para crear un alumno.');
        return;
      }
      const { data: authData, error: authErr } = await supabase.auth.admin
        ? await supabase.auth.admin.createUser({
            email: form.email, password: form.password, email_confirm: true
          })
        : await supabase.auth.signUp({ email: form.email, password: form.password });

      if (authErr) {
        // Fallback: create without auth link
        console.warn('Auth creation issue, creating alumno record only:', authErr);
      }

      const userId = authData?.user?.id || null;

      await supabase.from('alumnos').insert({
        nombre: form.nombre, apellido: form.apellido,
        telefono: form.telefono, email: form.email,
        direccion: form.direccion, nivel_aprendizaje_id: form.nivel_aprendizaje_id,
        estado: 'ACTIVO', user_id: userId
      });
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
                <th>Materia / Nivel</th>
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
                    <span className="badge badge-purple">
                      {a.niveles_aprendizaje?.materias?.nombre} - {a.niveles_aprendizaje?.niveles_educativos?.nombre}
                    </span>
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
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
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
            <label className="form-label">Nivel de Aprendizaje (Materia + Nivel)</label>
            <select className="form-select" value={form.nivel_aprendizaje_id}
              onChange={(e) => setForm({ ...form, nivel_aprendizaje_id: e.target.value })}>
              <option value="">Seleccionar...</option>
              {nivelesAprendizaje.map(na => (
                <option key={na.id} value={na.id}>
                  {na.materias?.nombre} - {na.niveles_educativos?.nombre}
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
      </Modal>
    </div>
  );
}
