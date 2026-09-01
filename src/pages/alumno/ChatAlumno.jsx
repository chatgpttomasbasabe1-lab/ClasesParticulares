import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Send, MessageSquare } from 'lucide-react';
import { notifyProfesor } from '../../lib/notifications';

export default function ChatAlumno() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!profile) return;
    loadMessages();

    // Mark as read
    supabase.from('mensajes_chat')
      .update({ leido: true })
      .eq('alumno_id', profile.id)
      .eq('es_de_profesor', true)
      .eq('leido', false);

    // Realtime
    const channel = supabase.channel(`chat-alumno-${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensajes_chat',
        filter: `alumno_id=eq.${profile.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        scrollToBottom();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  async function loadMessages() {
    const { data } = await supabase.from('mensajes_chat')
      .select('*')
      .eq('alumno_id', profile.id)
      .order('created_at');
    setMessages(data || []);
    setTimeout(scrollToBottom, 100);
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!newMsg.trim()) return;

    const texto = newMsg.trim();
    setNewMsg('');

    await supabase.from('mensajes_chat').insert({
      alumno_id: profile.id,
      contenido: texto,
      es_de_profesor: false,
      leido: false
    });

    loadMessages(); // Refrescar lista localmente

    // Enviar notificación push al profesor
    notifyProfesor(`Mensaje de ${profile.nombre || 'un alumno'}`, texto, '/profesor/chat');
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Chat con el Profesor</h1>
        <p>Enviá tus consultas directamente al profesor.</p>
      </div>

      <div className="card" style={{ padding: 0, height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="chat-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>P</div>
            <span>Profesor</span>
          </div>
        </div>

        <div className="chat-messages" style={{ flex: 1 }}>
          {messages.length === 0 ? (
            <div className="empty-state">
              <MessageSquare size={40} />
              <h3>Sin mensajes</h3>
              <p>Escribí tu primer mensaje al profesor.</p>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`chat-message ${m.es_de_profesor ? 'received' : 'sent'}`}>
                <div>{m.contenido}</div>
                <div className="time">
                  {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
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
      </div>
    </div>
  );
}
