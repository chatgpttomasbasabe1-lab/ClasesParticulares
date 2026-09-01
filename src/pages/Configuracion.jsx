import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToPush, unsubscribeFromPush, getNotificationStatus } from '../lib/notifications';
import { supabase } from '../lib/supabase';
import { Bell, CheckCircle, BellOff, Settings } from 'lucide-react';

export default function Configuracion() {
  const { user } = useAuth();
  const [status, setStatus] = useState('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStatus(getNotificationStatus());
  }, []);

  async function handleEnable() {
    if (!user) return;
    setLoading(true);
    await subscribeToPush(supabase, user.id);
    setStatus(getNotificationStatus());
    setLoading(false);
  }

  async function handleDisable() {
    if (!user) return;
    setLoading(true);
    await unsubscribeFromPush(supabase, user.id);
    setStatus(getNotificationStatus());
    setLoading(false);
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Configuración</h1>
        <p>Administrá tus preferencias y permisos de la plataforma.</p>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'var(--accent-primary-alpha)', padding: 10, borderRadius: 'var(--radius-md)', color: 'var(--accent-primary)' }}>
            <Bell size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>Notificaciones Push</h3>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-tertiary)' }}>Recibí alertas importantes en este dispositivo.</p>
          </div>
        </div>

        {status === 'unsupported' ? (
          <div className="empty-state">
            <BellOff size={32} style={{ color: 'var(--danger)' }} />
            <p>Tu navegador actual no soporta notificaciones push. Te recomendamos usar Google Chrome en Android o Safari en iOS (añadiendo la app a la pantalla de inicio).</p>
          </div>
        ) : status === 'granted' ? (
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', padding: 20, borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--success)', marginBottom: 12, fontWeight: 500 }}>
              <CheckCircle size={20} />
              Las notificaciones están activadas
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 20 }}>
              Recibirás alertas cuando te envíen un mensaje en el chat, respondan el foro o agenden una nueva clase.
            </p>
            <button className="btn btn-secondary" onClick={handleDisable} disabled={loading}>
              {loading ? 'Desactivando...' : 'Desactivar Notificaciones'}
            </button>
          </div>
        ) : status === 'denied' ? (
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', padding: 20, borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--danger)', marginBottom: 12, fontWeight: 500 }}>
              <BellOff size={20} />
              Permiso bloqueado
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
              Bloqueaste las notificaciones en tu navegador. Para activarlas, debés hacer clic en el candadito al lado de la barra de direcciones de tu navegador y cambiar el permiso de notificaciones a "Permitir".
            </p>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', padding: 20, borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 20 }}>
              Al activar las notificaciones, tu teléfono sonará cuando recibas mensajes nuevos aunque la aplicación esté cerrada.
            </p>
            <button className="btn btn-primary" onClick={handleEnable} disabled={loading}>
              {loading ? 'Activando...' : 'Activar Notificaciones'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
