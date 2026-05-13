import 'dotenv/config';
import { supabaseAdmin } from './services/supabaseService.js';

async function test() {
  // Get the NF-e to test
  const { data: nfes } = await supabaseAdmin
    .from('nfe')
    .select('id, status, xml_gerado')
    .eq('status', 'gerada')
    .limit(1);

  if (!nfes || nfes.length === 0) {
    console.log('No NF-e in "gerada" status found. Checking all:');
    const { data: all } = await supabaseAdmin.from('nfe').select('id, status, numero, serie');
    console.log(all);
    return;
  }

  const nfe = nfes[0];
  console.log('Testing sign update on NF-e:', nfe.id, 'status:', nfe.status);

  // Simulate the update the server does
  const { error } = await supabaseAdmin
    .from('nfe')
    .update({
      status: 'assinada',
      xml_assinado: '<signed_xml_test>',
      updated_at: new Date().toISOString(),
    })
    .eq('id', nfe.id);

  if (error) {
    console.error('UPDATE FAILED:', error);
  } else {
    console.log('UPDATE SUCCESS! Verifying...');
    const { data: updated } = await supabaseAdmin.from('nfe').select('id, status').eq('id', nfe.id).single();
    console.log('New status:', updated?.status);
  }
}

test();
