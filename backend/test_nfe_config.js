import 'dotenv/config';
import { supabaseAdmin } from './services/supabaseService.js';

async function test() {
  const { data, error } = await supabaseAdmin
    .from('nfe_config')
    .select('*')
    .single();

  console.log('NFe Config data:', data);
  if (error) console.error('Error:', error);
}

test();
