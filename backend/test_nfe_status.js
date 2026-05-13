import 'dotenv/config';
import { supabaseAdmin } from './services/supabaseService.js';

async function test() {
  // First check what columns exist
  const { data, error } = await supabaseAdmin
    .from('nfe')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(2);

  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Columns available:', Object.keys(data?.[0] || {}));
  console.log('\nNF-e records:');
  data?.forEach(nfe => {
    console.log({
      id: nfe.id,
      status: nfe.status,
      numero: `${nfe.serie}/${nfe.numero}`,
      xml_assinado_len: nfe.xml_assinado?.length || 0,
    });
  });
}

test();
