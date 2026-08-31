import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { Plus, Edit2, Trash2, BookOpen } from 'lucide-react';

export default function Materias() {
  const [materias, setMaterias] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [nivelesAprendizaje, setNivelesAprendizaje] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nombre: '', nivel_educativo_id: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: mat }, { data: niv }, { data: na }] = await Promise.all([
      supabase.from('materias').select('*').order('nombre'),
      supabase.from('niveles_educativos').select('*').order('nombre'),
      supabase.from('niveles_aprendizaje').select('*, materias(*), niveles_educativos(*)').order('id')
    ]);
    setMaterias(mat || []);
    setNiveles(niv || []);
    setNivelesAprendizaje(na || []);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ nombre: '', nivel_educativo_id: niveles[0]?.id || '' });
    setModalOpen(true);
  }

  function openEdit(na) {
    setEditing(na);
    setForm({ nombre: na.materias.nombre, nivel_educativo_id: na.nivel_educativo_id });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.nombre.trim() || !form.nivel_educativo_id) return;

    if (editing) {
      await supabase.from('materias')
        .update({ nombre: form.nombre })
        .eq('id', editing.materia_id);
      await supabase.from('niveles_aprendizaje')
        .update({ nivel_educativo_id: form.nivel_educativo_id })
        .eq('id', editing.id);
    } else {
      // Create materia
      const { data: newMat } = await supabase.from('materias')
        .insert({ nombre: form.nombre })
        .select().single();

      if (newMat) {
        // Create nivel_aprendizaje
        await supabase.from('niveles_aprendizaje')
          .insert({ materia_id: newMat.id, nivel_educativo_id: form.nivel_educativo_id });
      }
    }
    setModalOpen(false);
    loadData();
  }

  async function handleDelete(na) {
    if (!confirm('¿Eliminar esta materia y su nivel de aprendizaje?')) return;
    await supabase.from('niveles_aprendizaje').delete().eq('id', na.id);
    loadData();
  }

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Materias</h1>
          <p>Gestión de materias vinculadas a niveles educativos (Niveles de Aprendizaje).</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} disabled={niveles.length === 0}>
          <Plus size={18} /> Nueva Materia
        </button>
      </div>

      {niveles.length === 0 && (
        <div className="card" style={{ borderColor: 'rgba(245, 158, 11, 0.3)', marginBottom: 20 }}>
          <p style={{ color: 'var(--warning)', fontSize: 14 }}>
            ⚠️ Primero debés crear al menos un Nivel Educativo antes de registrar materias.
          </p>
        </div>
      )}

      {nivelesAprendizaje.length === 0 && !loading ? (
        <div className="card">
          <div className="empty-state">
            <BookOpen size={48} />
            <h3>Sin materias registradas</h3>
            <p>Creá una materia y vinculala a un nivel educativo para generar tu oferta académica.</p>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Materia</th>
                <th>Nivel Educativo</th>
                <th>Nivel de Aprendizaje</th>
                <th style={{ width: 100 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {nivelesAprendizaje.map((na) => (
                <tr key={na.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <BookOpen size={16} style={{ color: 'var(--accent-primary)' }} />
                      <span style={{ fontWeight: 500 }}>{na.materias?.nombre}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-purple">{na.niveles_educativos?.nombre}</span></td>
                  <td><span style={{ color: 'var(--text-secondary)' }}>#{na.id}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-icon" onClick={() => openEdit(na)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }}
                        onClick={() => handleDelete(na)}>
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
        title={editing ? 'Editar Materia' : 'Nueva Materia'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave}>
              {editing ? 'Guardar' : 'Crear Materia'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Nombre de la Materia</label>
          <input
            className="form-input"
            placeholder="Ej: Matemáticas, Física, Lengua"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Nivel Educativo</label>
          <select
            className="form-select"
            value={form.nivel_educativo_id}
            onChange={(e) => setForm({ ...form, nivel_educativo_id: e.target.value })}
          >
            <option value="">Seleccionar nivel...</option>
            {niveles.map((n) => (
              <option key={n.id} value={n.id}>{n.nombre}</option>
            ))}
          </select>
        </div>
      </Modal>
    </div>
  );
}
