import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { HelpCircle, MessageCircle, Send, ChevronDown, ChevronRight } from 'lucide-react';

export default function ForoProfesor() {
  const [nivelesAprendizaje, setNivelesAprendizaje] = useState([]);
  const [selectedNA, setSelectedNA] = useState(null);
  const [consultas, setConsultas] = useState([]);
  const [expandedConsulta, setExpandedConsulta] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [replyText, setReplyText] = useState('');

  useEffect(() => { loadNA(); }, []);

  async function loadNA() {
    const { data } = await supabase.from('niveles_aprendizaje')
      .select('*, materias(*), niveles_educativos(*)').order('id');
    setNivelesAprendizaje(data || []);
    if (data?.length) setSelectedNA(data[0]);
  }

  useEffect(() => {
    if (selectedNA) loadConsultas();
  }, [selectedNA]);

  async function loadConsultas() {
    const { data } = await supabase.from('consultas_foro')
      .select('*, alumnos(nombre, apellido), modulos(nombre)')
      .eq('nivel_aprendizaje_id', selectedNA.id)
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

  async function enviarRespuesta(consultaId) {
    if (!replyText.trim()) return;
    await supabase.from('respuestas_foro').insert({
      consulta_id: consultaId,
      contenido: replyText.trim(),
      es_de_profesor: true,
      alumno_id: null
    });

    // Send notification to all students of this nivel
    const { data: alumnosNA } = await supabase.from('alumnos')
      .select('id')
      .eq('nivel_aprendizaje_id', selectedNA.id);

    for (const alumno of (alumnosNA || [])) {
      await supabase.from('notificaciones').insert({
        alumno_id: alumno.id,
        tipo: 'FORO_RESPUESTA',
        mensaje: `El profesor respondió una consulta en el foro`,
        leida: false
      });
    }

    setReplyText('');
    loadRespuestas(consultaId);
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Foro de Consultas</h1>
        <p>Respondé las dudas de tus alumnos. Las respuestas son visibles para todos los del mismo nivel.</p>
      </div>

      <div className="tabs" style={{ flexWrap: 'wrap' }}>
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

      {consultas.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <HelpCircle size={48} />
            <h3>Sin consultas</h3>
            <p>No hay consultas para este nivel de aprendizaje aún.</p>
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
                  <div style={{ fontWeight: 600 }}>
                    {c.titulo}
                    {c.modulo_id && (
                      <span style={{ fontSize: 10, background: 'var(--info-bg)', color: 'var(--info)', padding: '2px 6px', borderRadius: 4, marginLeft: 8, verticalAlign: 'middle' }}>
                        Módulo: {c.modulos?.nombre}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {c.alumnos?.nombre} {c.alumnos?.apellido} • {new Date(c.created_at).toLocaleDateString('es-AR')}
                  </div>
                </div>
                <span className="badge badge-info" style={{ fontSize: 11 }}>
                  <MessageCircle size={12} /> {(respuestas[c.id] || []).length} respuestas
                </span>
              </div>

              {expandedConsulta === c.id && (
                <>
                  <div className="foro-post-content" style={{ marginTop: 12 }}>{c.contenido}</div>

                  {/* Respuestas */}
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

                  {/* Reply form */}
                  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    <input
                      className="form-input"
                      placeholder="Escribí tu respuesta..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && enviarRespuesta(c.id)}
                    />
                    <button className="btn btn-primary" onClick={() => enviarRespuesta(c.id)}>
                      <Send size={16} /> Responder
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
