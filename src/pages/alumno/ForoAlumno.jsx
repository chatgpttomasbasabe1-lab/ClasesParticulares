import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import Modal from '../../components/Modal';
import { HelpCircle, MessageCircle, Send, Plus, ChevronDown, ChevronRight } from 'lucide-react';

export default function ForoAlumno() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [consultas, setConsultas] = useState([]);
  const [expandedConsulta, setExpandedConsulta] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ titulo: '', contenido: '', modulo_id: '', nivel_aprendizaje_id: '' });
  const [modulosDisponibles, setModulosDisponibles] = useState([]);

  useEffect(() => {
    if (profile?.alumno_niveles_aprendizaje?.length > 0 || profile?.nivel_aprendizaje_id) {
      loadConsultas();
      loadModulosForo();
    }
  }, [profile]);

  useEffect(() => {
    const moduloQuery = searchParams.get('modulo');
    if (moduloQuery) {
      setForm(prev => ({ ...prev, modulo_id: moduloQuery }));
      setModalOpen(true);
      setSearchParams({});
    }
  }, [searchParams]);

  function getNivelesIds() {
    const ids = (profile?.alumno_niveles_aprendizaje || []).map(na => na.nivel_aprendizaje_id);
    if (ids.length === 0 && profile?.nivel_aprendizaje_id) ids.push(profile.nivel_aprendizaje_id);
    return ids;
  }

  async function loadConsultas() {
    const ids = getNivelesIds();
    if (ids.length === 0) return;

    const { data } = await supabase.from('consultas_foro')
      .select('*, alumnos(nombre, apellido), modulos(nombre)')
      .in('nivel_aprendizaje_id', ids)
      .order('created_at', { ascending: false });
    setConsultas(data || []);
  }

  async function loadModulosForo() {
    const ids = getNivelesIds();
    if (ids.length === 0) return;

    const { data: apts } = await supabase.from('apartados').select('id, nivel_aprendizaje_id').in('nivel_aprendizaje_id', ids);
    if (!apts || apts.length === 0) return;
    
    const { data: mods } = await supabase.from('modulos')
      .select('id, nombre, apartado_id')
      .in('apartado_id', apts.map(a => a.id))
      .eq('foro_habilitado', true);
    
    // attach nivel_aprendizaje_id to each module
    const modsWithNa = (mods || []).map(m => {
       const apt = apts.find(a => a.id === m.apartado_id);
       return { ...m, nivel_aprendizaje_id: apt?.nivel_aprendizaje_id };
    });
    setModulosDisponibles(modsWithNa);
  }

  async function loadRespuestas(consultaId) {
    const { data } = await supabase.from('respuestas_foro')
      .select('*, alumnos(nombre, apellido)')
      .eq('consulta_id', consultaId)
      .order('created_at');
    setRespuestas(prev => ({ ...prev, [consultaId]: data || [] }));
  }

  function toggleConsulta(consultaId) {
    if (expandedConsulta === consultaId) {
      setExpandedConsulta(null);
    } else {
      setExpandedConsulta(consultaId);
      loadRespuestas(consultaId);
    }
  }

  async function crearConsulta() {
    if (!form.titulo.trim() || !form.contenido.trim()) return;
    
    let targetNaId = profile.nivel_aprendizaje_id;
    
    if (form.modulo_id) {
       const mod = modulosDisponibles.find(m => m.id == form.modulo_id);
       if (mod) targetNaId = mod.nivel_aprendizaje_id;
    } else if (form.nivel_aprendizaje_id) {
       targetNaId = form.nivel_aprendizaje_id;
    } else {
       const ids = getNivelesIds();
       if (ids.length > 0) targetNaId = ids[0];
    }
    
    if (!targetNaId) return;

    await supabase.from('consultas_foro').insert({
      alumno_id: profile.id,
      nivel_aprendizaje_id: targetNaId,
      titulo: form.titulo,
      contenido: form.contenido,
      modulo_id: form.modulo_id ? parseInt(form.modulo_id) : null
    });
    setModalOpen(false);
    setForm({ titulo: '', contenido: '', modulo_id: '', nivel_aprendizaje_id: '' });
    loadConsultas();
  }

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Foro de Consultas</h1>
          <p>Consultá tus dudas. Las respuestas son visibles para todos los alumnos de tu nivel.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={18} /> Nueva Consulta
        </button>
      </div>

      {consultas.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <HelpCircle size={48} />
            <h3>Sin consultas</h3>
            <p>Todavía no hay consultas en el foro. ¡Sé el primero en preguntar!</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {consultas.map(c => {
            const isExpanded = expandedConsulta === c.id;
            return (
              <div key={c.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 20, cursor: 'pointer' }} onClick={() => toggleConsulta(c.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: 16 }}>{c.titulo}</h3>
                      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span>Por {c.alumnos?.nombre} {c.alumnos?.apellido}</span>
                        <span>•</span>
                        <span>{new Date(c.created_at).toLocaleDateString('es-AR')}</span>
                        {c.modulos?.nombre && (
                          <>
                            <span>•</span>
                            <span className="badge badge-purple" style={{ fontSize: 11, padding: '2px 6px' }}>{c.modulos.nombre}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14, whiteSpace: 'pre-wrap' }}>
                    {c.contenido}
                  </p>
                </div>

                {isExpanded && (
                  <div style={{ background: 'var(--bg-glass)', borderTop: '1px solid var(--border-primary)', padding: 20 }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MessageCircle size={16} />
                      Respuestas ({(respuestas[c.id] || []).length})
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {(respuestas[c.id] || []).map(r => (
                        <div key={r.id} style={{ 
                          background: r.es_profesor ? 'var(--bg-glass-hover)' : 'var(--bg-primary)', 
                          padding: 16, borderRadius: 8, 
                          border: r.es_profesor ? '1px solid var(--accent-primary)' : '1px solid var(--border-primary)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                            <span style={{ 
                              fontWeight: 600, 
                              color: r.es_profesor ? 'var(--accent-primary)' : 'var(--text-secondary)'
                            }}>
                              {r.es_profesor ? 'Profesor' : `${r.alumnos?.nombre} ${r.alumnos?.apellido}`}
                            </span>
                            <span style={{ color: 'var(--text-tertiary)' }}>
                              {new Date(r.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                            {r.contenido}
                          </p>
                        </div>
                      ))}
                      {(respuestas[c.id] || []).length === 0 && (
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                          Nadie ha respondido aún.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nueva Consulta"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={crearConsulta}>
              <Send size={16} /> Publicar Consulta
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Módulo Asociado (Opcional)</label>
          <select className="form-select" value={form.modulo_id}
            onChange={(e) => setForm({ ...form, modulo_id: e.target.value })}>
            <option value="">Consulta General</option>
            {modulosDisponibles.map(m => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
        </div>
        
        {/* Si es general y tiene varias materias, preguntar para cual es */}
        {!form.modulo_id && getNivelesIds().length > 1 && (
           <div className="form-group">
             <label className="form-label">Materia de la Consulta</label>
             <select className="form-select" value={form.nivel_aprendizaje_id}
               onChange={(e) => setForm({ ...form, nivel_aprendizaje_id: e.target.value })}>
               <option value="">Seleccionar materia...</option>
               {(profile?.alumno_niveles_aprendizaje || []).map(na => (
                 <option key={na.nivel_aprendizaje_id} value={na.nivel_aprendizaje_id}>
                    Materia (Nivel Educativo no disponible fácilmente aquí)
                 </option>
               ))}
             </select>
           </div>
        )}

        <div className="form-group">
          <label className="form-label">Título de la Consulta</label>
          <input className="form-input" placeholder="Ej: Duda sobre el ejercicio 3" value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Detalle de la Consulta</label>
          <textarea className="form-input" rows={4} placeholder="Explicá detalladamente tu duda..." value={form.contenido}
            onChange={(e) => setForm({ ...form, contenido: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
