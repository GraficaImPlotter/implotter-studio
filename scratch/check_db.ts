
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY // Need service role to check everything

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  console.log('Checking bucket "documents"...')
  const { data: buckets, error: bError } = await supabase.storage.listBuckets()
  if (bError) console.error('Error listing buckets:', bError)
  else {
    const docBucket = buckets.find(b => b.id === 'documents')
    console.log('Bucket "documents":', docBucket ? 'Found' : 'Not found')
  }

  console.log('\nChecking columns in "orders" table...')
  const { data: columns, error: cError } = await supabase.rpc('get_table_columns', { t_name: 'orders' })
  // If rpc doesn't exist, try a simple select
  if (cError) {
    console.log('RPC get_table_columns not found, trying select...')
    const { data, error } = await supabase.from('orders').select('pix_receipt_url, invoice_url').limit(1)
    if (error) console.error('Error selecting columns:', error.message)
    else console.log('Columns pix_receipt_url and invoice_url exist.')
  } else {
    console.log('Columns:', columns)
  }
}

check()
