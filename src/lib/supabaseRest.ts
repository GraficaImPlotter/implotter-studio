const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const ensureSupabaseEnv = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Configuração do Supabase ausente. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
  }

  return { supabaseUrl, supabaseAnonKey };
};

const sanitizeFileName = (fileName: string) =>
  fileName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const uploadBannerImage = async (file: File) => {
  const { supabaseUrl, supabaseAnonKey } = ensureSupabaseEnv();
  const filePath = `${Date.now()}-${sanitizeFileName(file.name)}`;

  const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/banners/${filePath}`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": file.type,
      "x-upsert": "false",
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.text();
    throw new Error(`Falha no upload da imagem. ${errorBody}`);
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/banners/${filePath}`;
  return publicUrl;
};

export const createBanner = async (imageUrl: string) => {
  const { supabaseUrl, supabaseAnonKey } = ensureSupabaseEnv();

  const response = await fetch(`${supabaseUrl}/rest/v1/banners`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ image_url: imageUrl }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Falha ao salvar banner no banco de dados. ${errorBody}`);
  }

  return response.json();
};
