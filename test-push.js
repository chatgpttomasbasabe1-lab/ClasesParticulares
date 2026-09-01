import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eyemmwjsfjebxzjzfqvi.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZW1td2pzZmplYnh6anpmcXZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODEyMzgxNywiZXhwIjoyMTAzNjk5ODE3fQ.BwR4C515keiQsoHPxtnoqbfmLS7YaIEXXfMex6iIk8Q';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  console.log('Fetching user_ids from push_subscriptions...');
  const { data: subs, error: subErr } = await supabase.from('push_subscriptions').select('user_id');
  console.log('Subs:', subs, 'Err:', subErr);

  if (subs && subs.length > 0) {
    const userId = subs[0].user_id;
    console.log('Invoking send-push for user:', userId);
    
    const res = await supabase.functions.invoke('send-push', {
      body: {
        user_id: userId,
        title: 'Test from script',
        body: 'This is a test'
      }
    });
    console.log('Invoke response:', res);
  } else {
    console.log('No subscriptions found to test with.');
  }
}

test();
