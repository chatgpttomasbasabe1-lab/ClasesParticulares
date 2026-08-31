import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import MiContenido from '../alumno/MiContenido';
import MiProgreso from '../alumno/MiProgreso';
import { Eye } from 'lucide-react';

export default function VistaAlumno() {
  const [alumnos, setAlumnos] = useState([]);
  const [selectedAlumnoId, setSelectedAlumnoId] = useState('');

  useEffect(() => {
    loadAlumnos();
  }, []);

  async function loadAlumnos() {
    const { data } = await supabase.from('alumnos').select('*').order('nombre');
    setAlumnos(data || []);
  }

  const selectedAlumno = alumnos.find(a => a.id == selectedAlumnoId);

  return (
    <div className="page-container slide-up">
      <div className="page-header">
        <h1>Vista de Alumno</h1>
        <p className="subtitle">Visualizá la plataforma exactamente como la ve un alumno.</p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="form-group">
          <label className="form-label">Seleccionar Alumno a simular</label>
          <select 
            className="form-input" 
            value={selectedAlumnoId} 
            onChange={(e) => setSelectedAlumnoId(e.target.value)}
          >
            <option value="">-- Seleccione un alumno --</option>
            {alumnos.map(a => (
              <option key={a.id} value={a.id}>
                {a.nombre} {a.apellido}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedAlumno ? (
        <div className="preview-container" style={{ border: '2px dashed var(--accent-primary)', padding: '1rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', color: 'var(--accent-primary)' }}>
            <Eye size={20} />
            <strong>Modo Vista: {selectedAlumno.nombre} {selectedAlumno.apellido}</strong>
          </div>
          
          <div style={{ marginBottom: '3rem' }}>
            <MiProgreso previewProfile={selectedAlumno} />
          </div>
          <div>
            <MiContenido previewProfile={selectedAlumno} isPreview={true} />
          </div>
        </div>
      ) : (
        <div className="empty-state">
          Seleccioná un alumno para ver su contenido y progreso
        </div>
      )}
    </div>
  );
}
