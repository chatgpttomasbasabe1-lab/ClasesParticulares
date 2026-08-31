import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/Modal';
import {
  Plus, Edit2, Trash2, FileText, ChevronDown, ChevronRight,
  Upload, Download, CheckSquare, FolderOpen, File, MessageSquare
} from 'lucide-react';

export default function Contenido() {
  const [nivelesAprendizaje, setNivelesAprendizaje] = useState([]);
  const [selectedNA, setSelectedNA] = useState(null);
  const [apartados, setApartados] = useState([]);
  const [modulos, setModulos] = useState({});
  const [archivos, setArchivos] = useState({});
  const [expandedApartados, setExpandedApartados] = useState({});
  const [modalType, setModalType] = useState(null); // 'apartado', 'modulo', 'archivo'
  const [editingItem, setEditingItem] = useState(null);
  const [parentId, setParentId] = useState(null);
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadNA(); }, []);

  async function loadNA() {
    const { data } = await supabase.from('niveles_aprendizaje')
      .select('*, materias(*), niveles_educativos(*)').order('id');
    setNivelesAprendizaje(data || []);
    if (data?.length && !selectedNA) setSelectedNA(data[0]);
  }

  useEffect(() => {
    if (selectedNA) loadContenido();
  }, [selectedNA]);

  async function loadContenido() {
    const { data: apts } = await supabase.from('apartados')
      .select('*').eq('nivel_aprendizaje_id', selectedNA.id).order('nombre');
    setApartados(apts || []);

    const modulosMap = {};
    const archivosMap = {};
    for (const apt of (apts || [])) {
      const { data: mods } = await supabase.from('modulos')
        .select('*').eq('apartado_id', apt.id).order('orden');
      modulosMap[apt.id] = mods || [];

      for (const mod of (mods || [])) {
        const { data: archs } = await supabase.from('archivos')
          .select('*').eq('modulo_id', mod.id).order('created_at');
        archivosMap[mod.id] = archs || [];
      }
    }
    setModulos(modulosMap);
    setArchivos(archivosMap);
  }

  function toggleApartado(id) {
    setExpandedApartados(prev => ({ ...prev, [id]: !prev[id] }));
  }

  // APARTADO CRUD
  function openCreateApartado() {
    setModalType('apartado');
    setEditingItem(null);
    setForm({ nombre: '' });
  }

  function openEditApartado(apt) {
    setModalType('apartado');
    setEditingItem(apt);
    setForm({ nombre: apt.nombre });
  }

  async function saveApartado() {
    if (!form.nombre.trim()) return;
    if (editingItem) {
      await supabase.from('apartados').update({ nombre: form.nombre }).eq('id', editingItem.id);
    } else {
      await supabase.from('apartados').insert({
        nombre: form.nombre, nivel_aprendizaje_id: selectedNA.id
      });
    }
    setModalType(null);
    loadContenido();
  }

  async function deleteApartado(id) {
    if (!confirm('¿Eliminar este apartado y todo su contenido?')) return;
    await supabase.from('apartados').delete().eq('id', id);
    loadContenido();
  }

  // MODULO CRUD
  function openCreateModulo(apartadoId) {
    setModalType('modulo');
    setEditingItem(null);
    setParentId(apartadoId);
    const existingMods = modulos[apartadoId] || [];
    setForm({ nombre: '', orden: existingMods.length + 1, requiere_entrega: false, foro_habilitado: false });
  }

  function openEditModulo(mod) {
    setModalType('modulo');
    setEditingItem(mod);
    setParentId(mod.apartado_id);
    setForm({ nombre: mod.nombre, orden: mod.orden, requiere_entrega: mod.requiere_entrega, foro_habilitado: mod.foro_habilitado });
  }

  async function saveModulo() {
    if (!form.nombre.trim()) return;
    if (editingItem) {
      await supabase.from('modulos').update({
        nombre: form.nombre, orden: form.orden, requiere_entrega: form.requiere_entrega, foro_habilitado: form.foro_habilitado
      }).eq('id', editingItem.id);
    } else {
      await supabase.from('modulos').insert({
        nombre: form.nombre, apartado_id: parentId, orden: form.orden,
        requiere_entrega: form.requiere_entrega, foro_habilitado: form.foro_habilitado
      });
    }
    setModalType(null);
    loadContenido();
  }

  async function deleteModulo(id) {
    if (!confirm('¿Eliminar este módulo?')) return;
    await supabase.from('modulos').delete().eq('id', id);
    loadContenido();
  }

  // ARCHIVO Upload
  async function handleFileUpload(moduloId, e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const filePath = `contenido/${selectedNA.id}/${moduloId}/${Date.now()}.${fileExt}`;

    const { error: uploadErr } = await supabase.storage
      .from('material-didactico')
      .upload(filePath, file);

    if (uploadErr) {
      alert('Error subiendo archivo: ' + uploadErr.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('material-didactico')
      .getPublicUrl(filePath);

    await supabase.from('archivos').insert({
      modulo_id: moduloId,
      nombre: file.name,
      tipo: file.type,
      url: publicUrl,
      storage_path: filePath,
      tamano: file.size
    });

    setUploading(false);
    loadContenido();
  }

  async function deleteArchivo(archivo) {
    if (!confirm('¿Eliminar este archivo?')) return;
    if (archivo.storage_path) {
      await supabase.storage.from('material-didactico').remove([archivo.storage_path]);
    }
    await supabase.from('archivos').delete().eq('id', archivo.id);
    loadContenido();
  }

  const modalTitle = modalType === 'apartado'
    ? (editingItem ? 'Editar Apartado' : 'Nuevo Apartado')
    : (editingItem ? 'Editar Módulo' : 'Nuevo Módulo');

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Contenido Académico</h1>
        <p>Estructura jerárquica: Nivel de Aprendizaje → Apartados → Módulos → Archivos</p>
      </div>

      {/* Selector de Nivel de Aprendizaje */}
      <div className="tabs" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
        {nivelesAprendizaje.map(na => (
          <button
            key={na.id}
            className={`tab ${selectedNA?.id === na.id ? 'active' : ''}`}
            onClick={() => setSelectedNA(na)}
          >
            {na.materias?.nombre} - {na.niveles_educativos?.nombre}
          </button>
        ))}
      </div>

      {selectedNA && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>
              {selectedNA.materias?.nombre} — {selectedNA.niveles_educativos?.nombre}
            </h2>
            <button className="btn btn-primary" onClick={openCreateApartado}>
              <Plus size={16} /> Nuevo Apartado
            </button>
          </div>

          {apartados.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <FolderOpen size={48} />
                <h3>Sin apartados</h3>
                <p>Creá apartados como Teoría, Práctica o Trabajos Prácticos.</p>
              </div>
            </div>
          ) : (
            <div className="content-tree">
              {apartados.map(apt => (
                <div className="tree-item" key={apt.id}>
                  <div className="tree-item-header" onClick={() => toggleApartado(apt.id)}>
                    {expandedApartados[apt.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <FolderOpen size={18} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ flex: 1, fontWeight: 600 }}>{apt.nombre}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginRight: 8 }}>
                      {(modulos[apt.id] || []).length} módulos
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEditApartado(apt); }}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                      onClick={(e) => { e.stopPropagation(); deleteApartado(apt.id); }}>
                      <Trash2 size={14} />
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); openCreateModulo(apt.id); }}>
                      <Plus size={14} /> Módulo
                    </button>
                  </div>

                  {expandedApartados[apt.id] && (
                    <div className="tree-item-children">
                      {(modulos[apt.id] || []).map(mod => (
                        <div key={mod.id}>
                          <div className="tree-module">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <FileText size={16} style={{ color: 'var(--accent-secondary)' }} />
                              <div>
                                <div style={{ fontWeight: 500, fontSize: 14 }}>{mod.nombre}</div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                                    Orden: {mod.orden} • Archivos: {(archivos[mod.id] || []).length}
                                  </span>
                                  {mod.requiere_entrega && (
                                    <span style={{ fontSize: 11, background: 'var(--warning-bg)', color: 'var(--warning)', padding: '0 6px', borderRadius: 4 }}>
                                      Con Entrega
                                    </span>
                                  )}
                                  {mod.foro_habilitado && (
                                    <span style={{ fontSize: 11, background: 'var(--info-bg)', color: 'var(--info)', padding: '0 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <MessageSquare size={10} /> Foro
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }}>
                                <Upload size={14} /> Subir Archivo
                                <input type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                                  onChange={(e) => handleFileUpload(mod.id, e)} disabled={uploading} />
                              </label>
                              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditModulo(mod)}>
                                <Edit2 size={14} />
                              </button>
                              <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }}
                                onClick={() => deleteModulo(mod.id)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          {/* Archivos del módulo */}
                          {(archivos[mod.id] || []).length > 0 && (
                            <div style={{ paddingLeft: 32, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {(archivos[mod.id] || []).map(arch => (
                                <div key={arch.id} style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  padding: '8px 12px', background: 'var(--bg-glass)', borderRadius: 6,
                                  border: '1px solid var(--border-primary)', fontSize: 13
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <File size={14} style={{ color: 'var(--text-tertiary)' }} />
                                    <span>{arch.nombre}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                                      ({(arch.tamano / 1024).toFixed(1)} KB)
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <a href={arch.url} target="_blank" rel="noopener" className="btn btn-ghost btn-icon btn-sm">
                                      <Download size={14} />
                                    </a>
                                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }}
                                      onClick={() => deleteArchivo(arch)}>
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal Apartado / Módulo */}
      <Modal
        isOpen={!!modalType}
        onClose={() => setModalType(null)}
        title={modalTitle}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalType(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={modalType === 'apartado' ? saveApartado : saveModulo}>
              Guardar
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Nombre</label>
          <input className="form-input"
            placeholder={modalType === 'apartado' ? 'Ej: Teoría, Práctica, TP' : 'Ej: Nivel 1, Introducción'}
            value={form.nombre || ''}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>
        {modalType === 'modulo' && (
          <>
            <div className="form-group">
              <label className="form-label">Orden</label>
              <input className="form-input" type="number" min="1" value={form.orden || 1}
                onChange={(e) => setForm({ ...form, orden: parseInt(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-checkbox">
                <input type="checkbox" checked={form.requiere_entrega || false}
                  onChange={(e) => setForm({ ...form, requiere_entrega: e.target.checked })} />
                <span>Requiere entrega de tarea por el alumno</span>
              </label>
            </div>
            <div className="form-group">
              <label className="form-checkbox">
                <input type="checkbox" checked={form.foro_habilitado || false}
                  onChange={(e) => setForm({ ...form, foro_habilitado: e.target.checked })} />
                <span>Habilitar foro de consultas para este módulo</span>
              </label>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
