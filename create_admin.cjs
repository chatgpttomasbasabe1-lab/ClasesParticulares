const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eyemmwjsfjebxzjzfqvi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZW1td2pzZmplYnh6anpmcXZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODEyMzgxNywiZXhwIjoyMTAzNjk5ODE3fQ.BwR4C515keiQsoHPxtnoqbfmLS7YaIEXXfMex6iIk8Q'; // service_role key

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createAdmin() {
  const email = 'profesor@clases.com';
  const password = 'password123';

  console.log('Creating auth user...');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError) {
    console.error('Auth error:', authError);
    return;
  }

  const userId = authData.user.id;
  console.log('User created:', userId);

  console.log('Inserting into profesores table...');
  const { data: profData, error: profError } = await supabase.from('profesores').insert({
    user_id: userId,
    nombre: 'Profesor',
    apellido: 'Demo',
    email: email
  });

  if (profError) {
    console.error('DB error:', profError);
    return;
  }

  console.log('\n--- CREDENTIALS ---');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('-------------------\n');
}

createAdmin();
