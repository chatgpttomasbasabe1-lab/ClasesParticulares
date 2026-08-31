import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { Plus, Edit2, Trash2, GraduationCap } from 'lucide-react';

export default function NivelesEducativos() {
  const [niveles, setNiveles] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNiveles(); }, []);

  async function loadNiveles() {
    const { data } = await supabase.from('niveles_educativos')
      .select('*').order('nombre');
    setNiveles(data || []);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ nombre: '', descripcion: '' });
    setModalOpen(true);
  }

  function openEdit(nivel) {
    setEditing(nivel);
    setForm({ nombre: nivel.nombre, descripcion: nivel.descripcion || '' });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.nombre.trim()) return;
    if (editing) {
      await supabase.from('niveles_educativos')
        .update({ nombre: form.nombre, descripcion: form.descripcion })
        .eq('id', editing.id);
    } else {
      await supabase.from('niveles_educativos')
        .insert({ nombre: form.nombre, descripcion: form.descripcion });
    }
    setModalOpen(false);
    loadNiveles();
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este nivel educativo?')) return;
    await supabase.from('niveles_educativos').delete().eq('id', id);
    loadNiveles();
  }

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Niveles Educativos</h1>
          <p>Configurá los niveles que ofrecés: Primario, Secundario, Universitario, etc.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Nuevo Nivel
        </button>
      </div>

      {niveles.length === 0 && !loading ? (
        <div className="card">
          <div className="empty-state">
            <GraduationCap size={48} />
            <h3>Sin niveles educativos</h3>
            <p>Creá tu primer nivel educativo para empezar a parametrizar tu oferta académica.</p>
            <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 16 }}>
              <Plus size={18} /> Crear Nivel
            </button>
          </div>
        </div>
      ) : (
        <div className="card-grid">
          {niveles.map((nivel) => (
            <div className="card" key={nivel.id}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="kpi-icon purple"><GraduationCap size={20} /></div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600 }}>{nivel.nombre}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                      {nivel.descripcion || 'Sin descripción'}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-icon" onClick={() => openEdit(nivel)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(nivel.id)}
                    style={{ color: 'var(--danger)' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Nivel Educativo' : 'Nuevo Nivel Educativo'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave}>
              {editing ? 'Guardar Cambios' : 'Crear Nivel'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Nombre</label>
          <input
            className="form-input"
            placeholder="Ej: Primario, Secundario, Universitario"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Descripción (opcional)</label>
          <textarea
            className="form-textarea"
            placeholder="Descripción del nivel..."
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
