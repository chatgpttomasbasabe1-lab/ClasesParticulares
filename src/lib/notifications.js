// ===== PUSH NOTIFICATION UTILITIES =====

const VAPID_PUBLIC_KEY = 'BANUVObEm9ipCWb09K8fZAkmN4kThKoCEPdIpQjO7aNgQrj5MmpR8eAfhNtlDn9oSC--xmLpzSXbWkh8QWoCEbk';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// Register Service Worker
export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[SW] Registered:', reg.scope);
    return reg;
  } catch (err) {
    console.error('[SW] Registration failed:', err);
    return null;
  }
}

// Request permission + subscribe to push
export async function subscribeToPush(supabase, userId) {
  if (!('Notification' in window) || !('PushManager' in window)) {
    console.warn('[Push] Not supported');
    return false;
  }

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('[Push] Permission denied');
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const subJson = subscription.toJSON();

    // Save subscription to Supabase
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys?.p256dh,
      auth: subJson.keys?.auth,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    console.log('[Push] Subscribed successfully');
    return true;
  } catch (err) {
    console.error('[Push] Subscription failed:', err);
    return false;
  }
}

// Unsubscribe
export async function unsubscribeFromPush(supabase, userId) {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    return true;
  } catch {
    return false;
  }
}

// Check current permission status
export function getNotificationStatus() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

// Send a local notification (while app is open)
export function sendLocalNotification(title, body, url = '/') {
  if (Notification.permission !== 'granted') return;
  const n = new Notification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url },
  });
  n.onclick = () => { window.focus(); n.close(); };
}

// ===== CENTRALIZED PUSH NOTIFICATION SENDERS =====
import { supabase } from './supabase';

/**
 * Enviar notificación push a un usuario específico (por su user_id de auth).
 * Funciona aunque la app esté cerrada.
 */
export async function notifyUser(userId, title, body, url = '/') {
  try {
    console.log('[Push] Enviando notificación a usuario:', userId, title);
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: { user_id: userId, title, body, url }
    });
    if (error) {
      console.error('[Push] Error al invocar send-push:', error);
    } else {
      console.log('[Push] Notificación enviada OK:', data);
    }
    return !error;
  } catch (err) {
    console.error('[Push] Excepción al enviar notificación:', err);
    return false;
  }
}

/**
 * Enviar notificación push al profesor.
 * Busca al primer usuario con rol 'profesor' en la tabla perfiles.
 */
export async function notifyProfesor(title, body, url = '/') {
  try {
    const { data: profs, error: profErr } = await supabase
      .from('perfiles')
      .select('id')
      .eq('rol', 'profesor')
      .limit(1);

    if (profErr || !profs || profs.length === 0) {
      console.warn('[Push] No se encontró profesor para notificar:', profErr);
      return false;
    }

    return await notifyUser(profs[0].id, title, body, url);
  } catch (err) {
    console.error('[Push] Error buscando profesor:', err);
    return false;
  }
}
