import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, FileText, Plus, Edit2, Trash2, ChevronDown, ChevronRight,
  Upload, Download, File, MessageSquare
} from 'lucide-react';

export default function Contenido() {
  const navigate = useNavigate();
  const [nivelesAprendizaje, setNivelesAprendizaje] = useState([]);
  const [selectedNA, setSelectedNA] = useState(null);
  const [apartados, setApartados] = useState([]);
  const [modulos, setModulos] = useState({});
  const [submodulos, setSubmodulos] = useState({});
  const [archivos, setArchivos] = useState({});
  const [expandedApartados, setExpandedApartados] = useState({});
  const [expandedModulos, setExpandedModulos] = useState({});
  const [modalType, setModalType] = useState(null); // 'apartado', 'modulo', 'archivo'
  const [editingItem, setEditingItem] = useState(null);
  const [parentId, setParentId] = useState(null);
  const [moduloPadreId, setModuloPadreId] = useState(null);
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
    const aptsData = apts || [];
    setApartados(aptsData);

    const aptIds = aptsData.map(a => a.id);
    
    let modsData = [];
    if (aptIds.length > 0) {
      const { data: mods } = await supabase.from('modulos').select('*').in('apartado_id', aptIds).order('orden');
      modsData = mods || [];
    }

    const modIds = modsData.map(m => m.id);
    let archsData = [];
    if (modIds.length > 0) {
      const { data: archs } = await supabase.from('archivos').select('*').in('modulo_id', modIds).order('created_at');
      archsData = archs || [];
    }

    const modulosMap = {};
    const submodulosMap = {};
    const archivosMap = {};

    aptsData.forEach(apt => {
      modulosMap[apt.id] = modsData.filter(m => m.apartado_id === apt.id && !m.modulo_padre_id);
    });

    modsData.forEach(mod => {
      if (mod.modulo_padre_id) {
        if (!submodulosMap[mod.modulo_padre_id]) submodulosMap[mod.modulo_padre_id] = [];
        submodulosMap[mod.modulo_padre_id].push(mod);
      }
      archivosMap[mod.id] = archsData.filter(a => a.modulo_id === mod.id);
    });

    setModulos(modulosMap);
    setSubmodulos(submodulosMap);
    setArchivos(archivosMap);
  }

  function toggleApartado(id) {
    setExpandedApartados(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleModulo(id) {
    setExpandedModulos(prev => ({ ...prev, [id]: !prev[id] }));
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
  function openCreateModulo(apartadoId, padreId = null) {
    setModalType('modulo');
    setEditingItem(null);
    setParentId(apartadoId);
    setModuloPadreId(padreId);
    const existingMods = padreId ? (submodulos[padreId] || []) : (modulos[apartadoId] || []);
    setForm({ nombre: '', orden: existingMods.length + 1, requiere_entrega: false, foro_habilitado: false });
  }

  function openEditModulo(mod) {
    setModalType('modulo');
    setEditingItem(mod);
    setParentId(mod.apartado_id);
    setModuloPadreId(mod.modulo_padre_id);
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
        nombre: form.nombre, apartado_id: parentId, modulo_padre_id: moduloPadreId, orden: form.orden,
        requiere_entrega: form.requiere_entrega, foro_habilitado: form.foro_habilitado
      });
    }
    setModalType(null);
    loadContenido();
  }

  async function deleteModulo(id) {
    if (!confirm('¿Eliminar este módulo y su contenido?')) return;
    await supabase.from('modulos').delete().eq('id', id);
    loadContenido();
  }

  // FOLDER UPLOAD LOGIC
  async function handleFolderUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);

    const createdApartados = {};
    const createdModulos = {};

    for (const file of files) {
      const pathParts = file.webkitRelativePath.split('/');
      // parts[0] = Apartado
      // parts[1] = Modulo
      // parts[2] = Submodulo or File
      
      if (pathParts.length < 2) continue;
      
      const apartadoName = pathParts[0];
      let apartadoId = createdApartados[apartadoName];

      if (!apartadoId) {
        const existingApt = apartados.find(a => a.nombre === apartadoName);
        if (existingApt) {
          apartadoId = existingApt.id;
        } else {
          const { data } = await supabase.from('apartados').insert({
            nombre: apartadoName, nivel_aprendizaje_id: selectedNA.id
          }).select().single();
          if (data) apartadoId = data.id;
        }
        if (apartadoId) createdApartados[apartadoName] = apartadoId;
      }
      
      if (!apartadoId) continue;
      
      let parentModuloId = null;
      let currentPath = apartadoName;

      // Si el archivo está directamente en la raíz de la carpeta (ej. MiCarpeta/archivo.pdf)
      // pathParts.length será 2. Necesitamos crear un módulo por defecto para contenerlo.
      if (pathParts.length === 2) {
        let modId = createdModulos[currentPath + '/General'];
        if (!modId) {
           const { data } = await supabase.from('modulos').insert({
              nombre: 'General', 
              apartado_id: apartadoId,
              modulo_padre_id: null,
              orden: 1 
           }).select().single();
           if (data) modId = data.id;
           if (modId) createdModulos[currentPath + '/General'] = modId;
        }
        parentModuloId = modId;
      } else {
        // Recorrer las subcarpetas
        for (let i = 1; i < pathParts.length - 1; i++) {
          const modName = pathParts[i];
          currentPath += '/' + modName;
          
          let modId = createdModulos[currentPath];
          if (!modId) {
             const { data } = await supabase.from('modulos').insert({
                nombre: modName, 
                apartado_id: apartadoId,
                modulo_padre_id: parentModuloId,
                orden: 1 
             }).select().single();
             if (data) modId = data.id;
             if (modId) createdModulos[currentPath] = modId;
          }
          parentModuloId = modId;
        }
      }
      
      // Subir archivo al módulo/submódulo final
      if (parentModuloId) {
         const fileExt = file.name.split('.').pop();
         // Evitar colisiones si se suben varios archivos en el mismo milisegundo
         const randomId = Math.random().toString(36).substring(2, 9);
         const filePath = `contenido/${selectedNA.id}/${parentModuloId}/${Date.now()}_${randomId}_${file.name}`;
         const { error: uploadErr } = await supabase.storage
           .from('material-didactico')
           .upload(filePath, file);

         if (!uploadErr) {
           const { data: { publicUrl } } = supabase.storage
             .from('material-didactico')
             .getPublicUrl(filePath);

           await supabase.from('archivos').insert({
             modulo_id: parentModuloId,
             nombre: file.name,
             tipo: file.type,
             url: publicUrl,
             storage_path: filePath,
             tamano: file.size
           });
         }
      }
    }

    setUploading(false);
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
    : (editingItem ? 'Editar Módulo' : (moduloPadreId ? 'Nuevo Submódulo' : 'Nuevo Módulo'));

  // RENDER MÓDULOS RECURSIVO
  const renderModulo = (mod, isSub = false) => {
    const children = submodulos[mod.id] || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedModulos[mod.id];
    
    return (
      <div key={mod.id} style={{ marginLeft: isSub ? 20 : 0, borderLeft: isSub ? '1px dashed var(--border-primary)' : 'none', paddingLeft: isSub ? 16 : 0, marginTop: isSub ? 8 : 0 }}>
        <div className="tree-module" style={{ cursor: hasChildren ? 'pointer' : 'default' }} onClick={(e) => {
          if (hasChildren && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'LABEL' && e.target.tagName !== 'INPUT') {
            toggleModulo(mod.id);
          }
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {hasChildren && (
              <span onClick={(e) => { e.stopPropagation(); toggleModulo(mod.id); }} style={{ cursor: 'pointer' }}>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            )}
            {!hasChildren && <FileText size={16} style={{ color: 'var(--accent-secondary)' }} />}
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
            {!isSub && (
               <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); openCreateModulo(mod.apartado_id, mod.id); }}>
                 <Plus size={14} /> Submódulo
               </button>
            )}
            <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
              <Upload size={14} /> Archivo
              <input type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                onChange={(e) => handleFileUpload(mod.id, e)} disabled={uploading} />
            </label>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); openEditModulo(mod); }}>
              <Edit2 size={14} />
            </button>
            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }}
              onClick={(e) => { e.stopPropagation(); deleteModulo(mod.id); }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        
        {/* Archivos del módulo */}
        {(!hasChildren || isExpanded) && (archivos[mod.id] || []).length > 0 && (
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

        {/* Render Submodulos */}
        {isExpanded && children.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {children.map(child => renderModulo(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Contenido Académico</h1>
        <p>Estructura jerárquica: Nivel de Aprendizaje → Apartados → Módulos → Submódulos → Archivos</p>
      </div>

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
            <div style={{ display: 'flex', gap: 10 }}>
              <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                <FolderOpen size={16} /> Subir Carpeta
                <input type="file" hidden webkitdirectory="" directory="" onChange={handleFolderUpload} disabled={uploading} />
              </label>
              <button className="btn btn-primary" onClick={openCreateApartado}>
                <Plus size={16} /> Nuevo Apartado
              </button>
            </div>
          </div>

          {uploading && (
             <div style={{ padding: 12, marginBottom: 20, background: 'var(--info-bg)', color: 'var(--info)', borderRadius: 6 }}>
                Procesando y subiendo archivos... por favor espera.
             </div>
          )}

          {apartados.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <FolderOpen size={48} />
                <h3>Sin apartados</h3>
                <p>Creá apartados como Teoría, Práctica o subí una carpeta completa.</p>
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
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={(e) => { e.stopPropagation(); navigate(`/profesor/foro?apartado=${apt.id}`); }}
                      title="Foro del apartado"
                    >
                      <MessageSquare size={14} />
                    </button>
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
                      {(modulos[apt.id] || []).map(mod => renderModulo(mod))}
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
