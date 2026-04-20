import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { generateUUID } from "@/lib/uuid";

interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
}

interface Props {
  productId: string;
  onUpdate?: () => void;
}

const MAX_IMAGES = 5;

const ProductImageUploader = ({ productId, onUpdate }: Props) => {
  const { toast } = useToast();
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");
    setImages((data ?? []) as ProductImage[]);
  };

  useEffect(() => { load(); }, [productId]);

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > MAX_IMAGES) {
      toast({ title: `Máximo de ${MAX_IMAGES} imagens`, variant: "destructive" });
      return;
    }
    setUploading(true);
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({ title: `Tipo não permitido: ${file.name}`, description: "Use JPG, PNG, WebP ou GIF.", variant: "destructive" });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: `Arquivo muito grande: ${file.name}`, description: "Máximo 10MB por imagem.", variant: "destructive" });
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const safeName = `${Date.now()}-${generateUUID().slice(0, 8)}.${ext}`;
      const path = `${productId}/${safeName}`;
      const { error: uploadErr } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
      if (uploadErr) { toast({ title: "Erro no upload", variant: "destructive" }); continue; }
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      await supabase.from("product_images").insert({
        product_id: productId,
        image_url: urlData.publicUrl,
        sort_order: images.length,
      });
    }
    await load();
    setUploading(false);
    onUpdate?.();
  };

  const handleDelete = async (img: ProductImage) => {
    // Extract path from URL
    const urlParts = img.image_url.split("/product-images/");
    if (urlParts[1]) {
      await supabase.storage.from("product-images").remove([urlParts[1]]);
    }
    await supabase.from("product_images").delete().eq("id", img.id);
    await load();
    onUpdate?.();
  };
  
  const handleMove = async (index: number, direction: "left" | "right") => {
    const newImages = [...images];
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= images.length) return;
    
    const [moved] = newImages.splice(index, 1);
    newImages.splice(targetIndex, 0, moved);
    
    // Update locally
    setImages(newImages);
    
    // Persist to DB
    for (let i = 0; i < newImages.length; i++) {
        await supabase
            .from("product_images")
            .update({ sort_order: i })
            .eq("id", newImages[i].id);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-highlight" /> Imagens do Produto ({images.length}/{MAX_IMAGES})
        </label>
        {images.length < MAX_IMAGES && (
          <label className="cursor-pointer">
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
            <Button type="button" variant="outline" size="sm" className="pointer-events-none" disabled={uploading}>
              <Plus className="w-3.5 h-3.5 mr-1" /> {uploading ? "Enviando..." : "Adicionar"}
            </Button>
          </label>
        )}
      </div>
      {images.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
          <ImageIcon className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma imagem. Clique em Adicionar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3">
          {images.map((img, idx) => (
            <div key={img.id} className={`relative group rounded-xl overflow-hidden border-2 aspect-square transition-all ${idx === 0 ? "border-primary shadow-glow-sm" : "border-border"}`}>
              <img src={img.image_url} alt={img.alt_text || ""} className="w-full h-full object-cover" />
              
              {/* Order Badge */}
              <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">
                {idx === 0 ? "Capa" : `#${idx + 1}`}
              </div>

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                    type="button"
                    onClick={() => handleMove(idx, "left")}
                    disabled={idx === 0}
                    className="bg-white text-black rounded-full p-1 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                    type="button"
                    onClick={() => handleDelete(img)}
                    className="bg-destructive text-white rounded-full p-1.5 hover:scale-110 transition-transform"
                >
                    <Trash2 className="w-4 h-4" />
                </button>

                <button
                    type="button"
                    onClick={() => handleMove(idx, "right")}
                    disabled={idx === images.length - 1}
                    className="bg-white text-black rounded-full p-1 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary hover:text-white transition-colors"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageUploader;
