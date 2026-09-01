import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, FolderOpen, FileText, File,
  Download, Upload, CheckCircle, Circle, CheckSquare, MessageSquare, BookOpen
} from 'lucide-react';
import { notifyProfesor } from '../../lib/notifications';

export default function MiContenido({ previewProfile, isPreview = false }) {
  const authContext = useAuth();
  const profile = previewProfile || authContext.profile;
  const navigate = useNavigate();
  const [apartados, setApartados] = useState([]);
  const [modulos, setModulos] = useState({});
  const [submodulos, setSubmodulos] = useState({});
  const [archivos, setArchivos] = useState({});
  const [progreso, setProgreso] = useState({});
  const [expanded, setExpanded] = useState({});
  const [expandedModulos, setExpandedModulos] = useState({});
  const [uploading, setUploading] = useState(false);
  const [nivelesAprendizaje, setNivelesAprendizaje] = useState([]);
  const [selectedNA, setSelectedNA] = useState(null);

  useEffect(() => {
    if (profile?.id) loadNiveles();
  }, [profile]);

  useEffect(() => {
    if (selectedNA) loadContenido();
  }, [selectedNA]);

  async function loadNiveles() {
    const { data } = await supabase.from('alumno_niveles_aprendizaje')
      .select('nivel_aprendizaje_id, niveles_aprendizaje(*, materias(*), niveles_educativos(*))')
      .eq('alumno_id', profile.id);

    const nas = (data || []).map(d => d.niveles_aprendizaje).filter(Boolean);
    setNivelesAprendizaje(nas);
    if (nas.length > 0) setSelectedNA(nas[0]);
  }

  async function loadContenido() {
    if (!selectedNA) return;
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

    // Load progress
    const { data: prog } = await supabase.from('progreso_alumno_modulo')
      .select('*').eq('alumno_id', profile.id);
    const progresoMap = {};
    (prog || []).forEach(p => {
      progresoMap[p.modulo_id] = p;
    });
    setProgreso(progresoMap);
  }

  async function toggleCompletado(moduloId) {
    if (isPreview) return;
    const existing = progreso[moduloId];
    if (existing) {
      await supabase.from('progreso_alumno_modulo')
        .update({
          completado: !existing.completado,
          fecha_marcado: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('progreso_alumno_modulo').insert({
        alumno_id: profile.id,
        modulo_id: moduloId,
        completado: true,
        fecha_marcado: new Date().toISOString()
      });
    }
    loadContenido();
  }

  async function handleEntrega(moduloId, e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const filePath = `entregas/${profile.id}/${moduloId}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage.from('entregas-alumnos').upload(filePath, file);
    if (error) {
      alert('Error subiendo archivo: ' + error.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('entregas-alumnos').getPublicUrl(filePath);

    await supabase.from('entregas_alumno').insert({
      alumno_id: profile.id,
      modulo_id: moduloId,
      nombre_archivo: file.name,
      url: publicUrl,
      storage_path: filePath
    });

    setUploading(false);
    alert('¡Entrega subida exitosamente!');
    
    // Notificar al profesor de la entrega
    notifyProfesor(
      'Nueva entrega recibida',
      `${profile.nombre || 'Un alumno'} entregó una tarea: ${file.name}`,
      '/profesor/alumnos'
    );
  }

  function toggleModulo(id) {
    setExpandedModulos(prev => ({ ...prev, [id]: !prev[id] }));
  }

  const renderModulo = (mod, isSub = false) => {
    const isCompleted = progreso[mod.id]?.completado;
    const children = submodulos[mod.id] || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedModulos[mod.id];

    return (
      <div key={mod.id} style={{ marginLeft: isSub ? 20 : 0, borderLeft: isSub ? '1px dashed var(--border-primary)' : 'none', paddingLeft: isSub ? 16 : 0, marginTop: isSub ? 8 : 0 }}>
        <div className="tree-module" style={{
          borderColor: isCompleted ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-primary)',
          cursor: hasChildren ? 'pointer' : 'default'
        }} onClick={(e) => {
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
            {!hasChildren && (
              <button
                className="btn btn-ghost btn-icon"
                onClick={(e) => { e.stopPropagation(); toggleCompletado(mod.id); }}
                style={{ color: isCompleted ? 'var(--success)' : 'var(--text-muted)' }}
              >
                {isCompleted ? <CheckCircle size={20} /> : <Circle size={20} />}
              </button>
            )}
            <div>
              <div style={{
                fontWeight: 500, fontSize: 14,
                textDecoration: isCompleted ? 'line-through' : 'none',
                opacity: isCompleted ? 0.7 : 1
              }}>
                {mod.nombre}
              </div>
              {mod.requiere_entrega && (
                <span className="badge badge-warning" style={{ fontSize: 10, padding: '2px 6px', marginTop: 4 }}>
                  <CheckSquare size={10} /> Requiere Entrega
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {mod.requiere_entrega && (
              <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
                <Upload size={14} /> Entregar
                <input type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.xls,.xlsx"
                  onChange={(e) => handleEntrega(mod.id, e)} disabled={uploading} />
              </label>
            )}
            {mod.foro_habilitado && (
              <button 
                className="btn btn-sm" 
                style={{ background: 'var(--info-bg)', color: 'var(--info)' }}
                onClick={(e) => { e.stopPropagation(); if (!isPreview) navigate(`/alumno/foro?modulo=${mod.id}`); }}
                disabled={isPreview}
              >
                <MessageSquare size={14} /> Foro
              </button>
            )}
          </div>
        </div>

        {/* Archivos del módulo */}
        {(!hasChildren || isExpanded) && (archivos[mod.id] || []).length > 0 && (
          <div style={{ paddingLeft: 48, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(archivos[mod.id] || []).map(arch => (
              <a key={arch.id} href={arch.url} target="_blank" rel="noopener"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', background: 'var(--bg-glass)', borderRadius: 6,
                  border: '1px solid var(--border-primary)', fontSize: 13,
                  color: 'var(--text-primary)', textDecoration: 'none',
                  transition: 'all 150ms'
                }}>
                <File size={14} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ flex: 1 }}>{arch.nombre}</span>
                <Download size={14} style={{ color: 'var(--text-tertiary)' }} />
              </a>
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
        <h1>Mi Contenido</h1>
        <p>Material de estudio, apuntes y ejercicios de tus materias.</p>
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

      {!selectedNA && (
        <div className="card">
          <div className="empty-state">
            <BookOpen size={48} />
            <h3>Sin materias</h3>
            <p>Aún no tienes materias asignadas.</p>
          </div>
        </div>
      )}

      {selectedNA && apartados.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FolderOpen size={48} />
            <h3>Sin contenido disponible</h3>
            <p>Tu profesor aún no ha cargado contenido para tu nivel.</p>
          </div>
        </div>
      ) : (
        selectedNA && apartados.length > 0 && (
          <div className="content-tree">
            {apartados.map(apt => (
              <div className="tree-item" key={apt.id}>
                <div className="tree-item-header" onClick={() => setExpanded(prev => ({ ...prev, [apt.id]: !prev[apt.id] }))}>
                  {expanded[apt.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <FolderOpen size={18} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ flex: 1, fontWeight: 600 }}>{apt.nombre}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {(modulos[apt.id] || []).length} módulos
                  </span>
                  {!isPreview && (
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={(e) => { e.stopPropagation(); navigate(`/alumno/foro?apartado=${apt.id}`); }}
                      title="Ir al foro de este apartado"
                    >
                      <MessageSquare size={16} />
                    </button>
                  )}
                </div>

                {expanded[apt.id] && (
                  <div className="tree-item-children">
                    {(modulos[apt.id] || []).length === 0 ? (
                      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: 8 }}>
                        Apartado vacío
                      </p>
                    ) : (
                      (modulos[apt.id] || []).map(mod => renderModulo(mod))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
