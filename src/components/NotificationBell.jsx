import { useState, useEffect } from 'react';
import { Bell, BellOff, X, CheckCircle } from 'lucide-react';
import { subscribeToPush, unsubscribeFromPush, getNotificationStatus } from '../lib/notifications';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function NotificationBell() {
  const { user } = useAuth();
  const [status, setStatus] = useState(getNotificationStatus());
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    setStatus(getNotificationStatus());
  }, []);

  async function handleEnable() {
    if (!user) return;
    setLoading(true);
    const ok = await subscribeToPush(supabase, user.id);
    setStatus(getNotificationStatus());
    setLoading(false);
    if (ok) setShowPanel(false);
  }

  async function handleDisable() {
    if (!user) return;
    setLoading(true);
    await unsubscribeFromPush(supabase, user.id);
    setStatus(getNotificationStatus());
    setLoading(false);
  }

  if (status === 'unsupported') return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="btn btn-ghost btn-icon"
        title="Notificaciones"
        style={{
          color: status === 'granted' ? 'var(--accent-primary)' : 'var(--text-muted)',
          position: 'relative'
        }}
      >
        {status === 'granted' ? <Bell size={20} /> : <BellOff size={20} />}
        {status === 'granted' && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--success)', border: '2px solid var(--bg-secondary)'
          }} />
        )}
      </button>

      {showPanel && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 300 }}
            onClick={() => setShowPanel(false)}
          />
          <div style={{
            position: 'absolute', right: 0, top: '110%',
            background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)',
            borderRadius: 'var(--radius-md)', padding: 20, width: 280,
            zIndex: 301, boxShadow: 'var(--shadow-lg)',
            animation: 'slideUp 150ms ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <strong style={{ fontSize: 14 }}>Notificaciones Push</strong>
              <button onClick={() => setShowPanel(false)} className="btn btn-ghost btn-icon" style={{ padding: 2 }}>
                <X size={16} />
              </button>
            </div>

            {status === 'granted' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: 'var(--success)', fontSize: 13 }}>
                  <CheckCircle size={16} />
                  <span>Notificaciones activas</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
                  Recibirás alertas de mensajes y clases aunque la app esté cerrada.
                </p>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleDisable}
                  disabled={loading}
                  style={{ width: '100%' }}
                >
                  {loading ? 'Desactivando...' : 'Desactivar notificaciones'}
                </button>
              </>
            ) : status === 'denied' ? (
              <>
                <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 10 }}>
                  Las notificaciones están bloqueadas en tu navegador.
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  Para activarlas, hacé clic en el ícono 🔒 en la barra de dirección y habilitá las notificaciones.
                </p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                  Activá las notificaciones para recibir alertas de mensajes nuevos y clases agendadas, incluso con la app cerrada.
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleEnable}
                  disabled={loading}
                  style={{ width: '100%' }}
                >
                  <Bell size={14} />
                  {loading ? 'Activando...' : 'Activar notificaciones'}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
