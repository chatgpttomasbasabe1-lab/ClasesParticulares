import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    // Check if profesor
    const { data: prof } = await supabase
      .from('profesores')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (prof) {
      setProfile({ ...prof, rol: 'profesor' });
      setLoading(false);
      return;
    }

    // Check if alumno
    const { data: alum } = await supabase
      .from('alumnos')
      .select('*, niveles_aprendizaje(*, materias(*), niveles_educativos(*))')
      .eq('user_id', userId)
      .single();

    if (alum) {
      setProfile({ ...alum, rol: 'alumno' });
    }
    setLoading(false);
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signOut,
    signUp,
    isProfesor: profile?.rol === 'profesor',
    isAlumno: profile?.rol === 'alumno',
    refreshProfile: () => user && fetchProfile(user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
