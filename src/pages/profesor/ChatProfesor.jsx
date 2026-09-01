import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Send, MessageSquare } from 'lucide-react';
import { notifyUser } from '../../lib/notifications';

export default function ChatProfesor() {
  const { user } = useAuth();
  const [alumnos, setAlumnos] = useState([]);
  const [selectedAlumno, setSelectedAlumno] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => { loadAlumnos(); }, []);

  useEffect(() => {
    if (!selectedAlumno) return;
    loadMessages();

    // Mark as read
    supabase.from('mensajes_chat')
      .update({ leido: true })
      .eq('alumno_id', selectedAlumno.id)
      .eq('es_de_profesor', false)
      .eq('leido', false)
      .then(() => loadUnreadCounts());

    // Realtime subscription
    const channel = supabase.channel(`chat-${selectedAlumno.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensajes_chat',
        filter: `alumno_id=eq.${selectedAlumno.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        scrollToBottom();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedAlumno]);

  async function loadAlumnos() {
    const { data } = await supabase.from('alumnos').select('*').order('nombre');
    setAlumnos(data || []);
    loadUnreadCounts();
  }

  async function loadUnreadCounts() {
    const { data } = await supabase.from('mensajes_chat')
      .select('alumno_id')
      .eq('es_de_profesor', false)
      .eq('leido', false);

    const counts = {};
    (data || []).forEach(m => {
      counts[m.alumno_id] = (counts[m.alumno_id] || 0) + 1;
    });
    setUnreadCounts(counts);
  }

  async function loadMessages() {
    const { data } = await supabase.from('mensajes_chat')
      .select('*')
      .eq('alumno_id', selectedAlumno.id)
      .order('created_at');
    setMessages(data || []);
    setTimeout(scrollToBottom, 100);
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!newMsg.trim() || !selectedAlumno) return;

    const texto = newMsg.trim();
    setNewMsg(''); // Limpiar input instantáneamente para mejor UX

    await supabase.from('mensajes_chat').insert({
      alumno_id: selectedAlumno.id,
      contenido: texto,
      es_de_profesor: true,
      leido: false
    });

    loadMessages(); // Refrescar lista de mensajes localmente por si Realtime falla

    // Enviar notificación push al alumno
    notifyUser(selectedAlumno.user_id || selectedAlumno.id, 'Nuevo mensaje de tu profesor', texto, '/alumno/chat');
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Chat</h1>
        <p>Mensajería directa con tus alumnos.</p>
      </div>

      <div className="chat-layout">
        <div className="chat-list">
          <div className="chat-list-header">Conversaciones</div>
          {alumnos.map(a => (
            <div
              key={a.id}
              className={`chat-list-item ${selectedAlumno?.id === a.id ? 'active' : ''}`}
              onClick={() => setSelectedAlumno(a)}
            >
              <div className="chat-avatar">
                {a.nombre?.[0]}{a.apellido?.[0]}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{a.nombre} {a.apellido}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{a.email}</div>
              </div>
              {unreadCounts[a.id] > 0 && (
                <span className="unread-count">{unreadCounts[a.id]}</span>
              )}
            </div>
          ))}
        </div>

        <div className="chat-area">
          {!selectedAlumno ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="empty-state">
                <MessageSquare size={48} />
                <h3>Seleccioná un alumno</h3>
                <p>Elegí un alumno de la lista para iniciar una conversación.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="chat-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="chat-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                    {selectedAlumno.nombre?.[0]}{selectedAlumno.apellido?.[0]}
                  </div>
                  <span>{selectedAlumno.nombre} {selectedAlumno.apellido}</span>
                </div>
              </div>

              <div className="chat-messages">
                {messages.map(m => (
                  <div key={m.id} className={`chat-message ${m.es_de_profesor ? 'sent' : 'received'}`}>
                    <div>{m.contenido}</div>
                    <div className="time">
                      {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form className="chat-input-area" onSubmit={sendMessage}>
                <input
                  placeholder="Escribí un mensaje..."
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-icon">
                  <Send size={18} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
