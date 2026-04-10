import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Search, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  productId: string;
}

interface Product {
  id: string;
  name: string;
}

const RelatedProductsManager = ({ productId }: Props) => {
  const { toast } = useToast();
  const [related, setRelated] = useState<{ id: string; related_product_id: string; name: string }[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("related_products")
      .select("id, related_product_id, related:products!related_products_related_product_id_fkey(name)")
      .eq("product_id", productId)
      .order("sort_order");

    setRelated(
      (data ?? []).map((r: any) => ({
        id: r.id,
        related_product_id: r.related_product_id,
        name: r.related?.name || "Produto",
      }))
    );
  };

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("id, name").eq("is_active", true).order("name");
    setAllProducts((data as Product[]) ?? []);
  };

  useEffect(() => { load(); loadProducts(); }, [productId]);

  const addRelated = async (relatedProductId: string) => {
    if (relatedProductId === productId) { toast({ title: "Não é possível relacionar o produto consigo mesmo" }); return; }
    if (related.find(r => r.related_product_id === relatedProductId)) { toast({ title: "Produto já relacionado" }); return; }

    await supabase.from("related_products").insert({
      product_id: productId,
      related_product_id: relatedProductId,
      sort_order: related.length,
    });

    toast({ title: "Produto relacionado adicionado!" });
    setShowPicker(false);
    setSearch("");
    load();
  };

  const removeRelated = async (id: string) => {
    await supabase.from("related_products").delete().eq("id", id);
    toast({ title: "Relacionamento removido" });
    load();
  };

  const filtered = allProducts.filter(p =>
    p.id !== productId && p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Link2 className="w-4 h-4 text-highlight" /> Produtos Relacionados
        </Label>
        <Button variant="outline" size="sm" onClick={() => setShowPicker(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Se nenhum produto for selecionado, serão exibidos automaticamente produtos da mesma categoria.
      </p>

      {related.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3 text-center border border-dashed border-border rounded-lg">
          Nenhum — sugestão automática por categoria ativa.
        </p>
      ) : (
        <div className="space-y-1.5">
          {related.map(r => (
            <div key={r.id} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
              <span className="flex-1 text-sm text-foreground truncate">{r.name}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRelated(r.id)}>
                <X className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {showPicker && (
        <div className="border border-border rounded-lg p-3 space-y-2 bg-card">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filtered.slice(0, 20).map(p => (
              <button
                key={p.id}
                onClick={() => addRelated(p.id)}
                className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-secondary transition-colors truncate"
              >
                {p.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">Nenhum produto encontrado.</p>
            )}
          </div>
          <Button variant="ghost" size="sm" className="w-full" onClick={() => { setShowPicker(false); setSearch(""); }}>
            Fechar
          </Button>
        </div>
      )}
    </div>
  );
};

export default RelatedProductsManager;
