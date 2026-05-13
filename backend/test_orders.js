import 'dotenv/config';
import { supabaseAdmin } from './services/supabaseService.js';

async function test() {
  try {
    const { data: config, error } = await supabaseAdmin
      .from('nfe_config')
      .select('*')
      .single();
      
    if (error) {
      console.error("Error querying nfe_config:", error);
      return;
    }
    
    console.log("NFE CONFIG:");
    console.log(JSON.stringify(config, null, 2));
  } catch (err) {
    console.error("Catch error:", err);
  }
}

test();
