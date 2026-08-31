const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eyemmwjsfjebxzjzfqvi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZW1td2pzZmplYnh6anpmcXZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODEyMzgxNywiZXhwIjoyMTAzNjk5ODE3fQ.BwR4C515keiQsoHPxtnoqbfmLS7YaIEXXfMex6iIk8Q'; // service_role key

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seed() {
  console.log('Seeding data...');

  // Niveles Educativos
  const { data: niveles } = await supabase.from('niveles_educativos').insert([
    { nombre: 'Secundario', descripcion: 'Nivel medio' },
    { nombre: 'Universitario', descripcion: 'Nivel superior' }
  ]).select();
  const nivelSecId = niveles.find(n => n.nombre === 'Secundario').id;

  // Materias
  const { data: materias } = await supabase.from('materias').insert([
    { nombre: 'Matemáticas' },
    { nombre: 'Física' }
  ]).select();
  const matMathId = materias.find(m => m.nombre === 'Matemáticas').id;

  // Nivel Aprendizaje
  const { data: na } = await supabase.from('niveles_aprendizaje').insert([
    { materia_id: matMathId, nivel_educativo_id: nivelSecId }
  ]).select();
  const naId = na[0].id;

  // Precio
  await supabase.from('precios_config').insert([
    { nivel_aprendizaje_id: naId, precio_por_hora: 5000 }
  ]);

  // Contenido
  const { data: apts } = await supabase.from('apartados').insert([
    { nombre: 'Unidad 1: Funciones', nivel_aprendizaje_id: naId }
  ]).select();
  const aptId = apts[0].id;

  await supabase.from('modulos').insert([
    { nombre: 'Introducción a Funciones', apartado_id: aptId, orden: 1 },
    { nombre: 'Funciones Lineales', apartado_id: aptId, orden: 2, requiere_entrega: true }
  ]);

  // Alumno
  const alumnoEmail = 'alumno@prueba.com';
  const alumnoPass = 'alumno123';
  const { data: authData } = await supabase.auth.admin.createUser({
    email: alumnoEmail,
    password: alumnoPass,
    email_confirm: true
  });
  
  const { data: alumnos } = await supabase.from('alumnos').insert([
    { 
      user_id: authData.user.id, 
      nombre: 'Tomás', 
      apellido: 'Alumno', 
      email: alumnoEmail, 
      telefono: '1122334455',
      nivel_aprendizaje_id: naId,
      estado: 'ACTIVO'
    }
  ]).select();
  const alumnoId = alumnos[0].id;

  // Clases
  const hoy = new Date();
  const fechaHoyStr = hoy.toISOString().split('T')[0];
  
  hoy.setDate(hoy.getDate() - 2);
  const fechaPasadaStr = hoy.toISOString().split('T')[0];

  hoy.setDate(hoy.getDate() + 5);
  const fechaFuturaStr = hoy.toISOString().split('T')[0];

  await supabase.from('clases').insert([
    { alumno_id: alumnoId, nivel_aprendizaje_id: naId, fecha: fechaPasadaStr, hora: '10:00', duracion_horas: 1, estado: 'DICTADA', costo_calculado: 5000 },
    { alumno_id: alumnoId, nivel_aprendizaje_id: naId, fecha: fechaHoyStr, hora: '14:00', duracion_horas: 1.5, estado: 'PENDIENTE', costo_calculado: 0 },
    { alumno_id: alumnoId, nivel_aprendizaje_id: naId, fecha: fechaFuturaStr, hora: '16:00', duracion_horas: 2, estado: 'PENDIENTE', costo_calculado: 0 }
  ]);

  // Deuda
  await supabase.from('deudas').insert([
    { alumno_id: alumnoId, monto_original: 5000, monto_pendiente: 5000, fecha: fechaPasadaStr, estado: 'PENDIENTE' }
  ]);

  // Mensaje de Chat
  await supabase.from('mensajes_chat').insert([
    { alumno_id: alumnoId, contenido: 'Hola Tomás, ¡bienvenido a las clases de matemáticas!', es_de_profesor: true }
  ]);

  console.log('Seed completed!');
}

seed();
