import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  ChevronDown, ChevronRight, FolderOpen, FileText, File,
  Download, Upload, CheckCircle, Circle, CheckSquare
} from 'lucide-react';

export default function MiContenido({ previewProfile, isPreview = false }) {
  const authContext = useAuth();
  const profile = previewProfile || authContext.profile;
  const [apartados, setApartados] = useState([]);
  const [modulos, setModulos] = useState({});
  const [archivos, setArchivos] = useState({});
  const [progreso, setProgreso] = useState({});
  const [expanded, setExpanded] = useState({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile?.nivel_aprendizaje_id) loadContenido();
  }, [profile]);

  async function loadContenido() {
    const { data: apts } = await supabase.from('apartados')
      .select('*').eq('nivel_aprendizaje_id', profile.nivel_aprendizaje_id).order('nombre');
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
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Mi Contenido</h1>
        <p>Material de estudio asignado a tu nivel. Marcá lo que completaste.</p>
      </div>

      {apartados.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FolderOpen size={48} />
            <h3>Sin contenido disponible</h3>
            <p>Tu profesor aún no ha cargado contenido para tu nivel.</p>
          </div>
        </div>
      ) : (
        <div className="content-tree">
          {apartados.map(apt => (
            <div className="tree-item" key={apt.id}>
              <div className="tree-item-header" onClick={() => setExpanded(prev => ({ ...prev, [apt.id]: !prev[apt.id] }))}>
                {expanded[apt.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <FolderOpen size={18} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ flex: 1, fontWeight: 600 }}>{apt.nombre}</span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {(modulos[apt.id] || []).filter(m => progreso[m.id]?.completado).length}/
                  {(modulos[apt.id] || []).length} completados
                </span>
              </div>

              {expanded[apt.id] && (
                <div className="tree-item-children">
                  {(modulos[apt.id] || []).map(mod => {
                    const isCompleted = progreso[mod.id]?.completado;
                    return (
                      <div key={mod.id}>
                        <div className="tree-module" style={{
                          borderColor: isCompleted ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-primary)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button
                              className="btn btn-ghost btn-icon"
                              onClick={() => toggleCompletado(mod.id)}
                              style={{ color: isCompleted ? 'var(--success)' : 'var(--text-muted)' }}
                            >
                              {isCompleted ? <CheckCircle size={20} /> : <Circle size={20} />}
                            </button>
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
                              <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }}>
                                <Upload size={14} /> Entregar
                                <input type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.xls,.xlsx"
                                  onChange={(e) => handleEntrega(mod.id, e)} disabled={uploading} />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Archivos del módulo */}
                        {(archivos[mod.id] || []).length > 0 && (
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
