import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { encrypt, requireAdmin } from "../_shared/payment-config.ts";
serve(async (req) => {
 const preflight=handleCors(req); if(preflight)return preflight;
 const headers={...getCorsHeaders(req.headers.get("origin")),"Content-Type":"application/json"};
 try {
  const {db,user}=await requireAdmin(req);
  if(req.method==="GET"){const {data}=await db.from("payment_settings").select("pix_enabled,card_enabled,environment,api_key_ciphertext,webhook_token_ciphertext,updated_at").eq("id",true).single(); return new Response(JSON.stringify({...data,apiKeyConfigured:!!data?.api_key_ciphertext,webhookTokenConfigured:!!data?.webhook_token_ciphertext,webhookUrl:`${Deno.env.get("SUPABASE_URL")}/functions/v1/asaas-webhook`}),{headers});}
  if(req.method!=="PUT") return new Response("Method not allowed",{status:405,headers});
  const body=await req.json(); const update:any={pix_enabled:!!body.pixEnabled,card_enabled:!!body.cardEnabled,environment:body.environment==="production"?"production":"sandbox",updated_at:new Date().toISOString(),updated_by:user.id};
  if(body.apiKey){const v=await encrypt(body.apiKey.trim());update.api_key_ciphertext=v.ciphertext;update.api_key_iv=v.iv;}
  if(body.webhookToken){const v=await encrypt(body.webhookToken.trim());update.webhook_token_ciphertext=v.ciphertext;update.webhook_token_iv=v.iv;}
  const {error}=await db.from("payment_settings").upsert({id:true,...update}); if(error)throw error;
  return new Response(JSON.stringify({success:true}),{headers});
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:"Erro"}),{status:401,headers});}
});
