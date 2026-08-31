import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { HelpCircle, MessageCircle, Send, Plus, ChevronDown, ChevronRight } from 'lucide-react';

export default function ForoAlumno() {
  const { profile } = useAuth();
  const [consultas, setConsultas] = useState([]);
  const [expandedConsulta, setExpandedConsulta] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ titulo: '', contenido: '' });

  useEffect(() => {
    if (profile?.nivel_aprendizaje_id) loadConsultas();
  }, [profile]);

  async function loadConsultas() {
    const { data } = await supabase.from('consultas_foro')
      .select('*, alumnos(nombre, apellido)')
      .eq('nivel_aprendizaje_id', profile.nivel_aprendizaje_id)
      .order('created_at', { ascending: false });
    setConsultas(data || []);
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
    await supabase.from('consultas_foro').insert({
      alumno_id: profile.id,
      nivel_aprendizaje_id: profile.nivel_aprendizaje_id,
      titulo: form.titulo,
      contenido: form.contenido
    });
    setModalOpen(false);
    setForm({ titulo: '', contenido: '' });
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
            <p>Sé el primero en hacer una pregunta en el foro.</p>
          </div>
        </div>
      ) : (
        <div>
          {consultas.map(c => (
            <div className="foro-post" key={c.id}>
              <div className="foro-post-header" onClick={() => toggleConsulta(c.id)} style={{ cursor: 'pointer' }}>
                {expandedConsulta === c.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <div className="chat-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                  {c.alumnos?.nombre?.[0]}{c.alumnos?.apellido?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{c.titulo}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {c.alumnos?.nombre} {c.alumnos?.apellido} • {new Date(c.created_at).toLocaleDateString('es-AR')}
                    {c.alumno_id === profile.id && (
                      <span className="badge badge-info" style={{ marginLeft: 8, fontSize: 10, padding: '1px 6px' }}>Tu consulta</span>
                    )}
                  </div>
                </div>
                <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                  <MessageCircle size={12} /> {(respuestas[c.id] || []).length}
                </span>
              </div>

              {expandedConsulta === c.id && (
                <>
                  <div className="foro-post-content" style={{ marginTop: 12 }}>{c.contenido}</div>
                  <div style={{ marginTop: 16 }}>
                    {(respuestas[c.id] || []).map(r => (
                      <div className="foro-reply" key={r.id}
                        style={{ borderLeftColor: r.es_de_profesor ? 'var(--accent-primary)' : 'var(--success)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>
                            {r.es_de_profesor ? '👨‍🏫 Profesor' : `${r.alumnos?.nombre} ${r.alumnos?.apellido}`}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                            {new Date(r.created_at).toLocaleString('es-AR')}
                          </span>
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{r.contenido}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nueva Consulta"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={crearConsulta}>Publicar Consulta</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Título</label>
          <input className="form-input" placeholder="Resumen de tu duda..." value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Detalle</label>
          <textarea className="form-textarea" placeholder="Explicá tu duda en detalle..."
            value={form.contenido}
            onChange={(e) => setForm({ ...form, contenido: e.target.value })}
            style={{ minHeight: 150 }} />
        </div>
      </Modal>
    </div>
  );
}
