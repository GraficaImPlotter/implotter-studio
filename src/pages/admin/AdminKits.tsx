import { useEffect, useState, useRef } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Package, X, Search, Upload, ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface Kit {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  normal_price: number;
  promo_price: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
}

interface KitItem {
  id: string;
  kit_id: string;
  product_id: string;
  quantity: number;
  sort_order: number;
  product?: { name: string; slug: string };
}

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
}

const slugify = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const AdminKits = () => {
  const { toast } = useToast();
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<Kit | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [normalPrice, setNormalPrice] = useState("");
  const [promoPrice, setPromoPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  // Kit items
  const [kitItems, setKitItems] = useState<{ product_id: string; quantity: number; product_name?: string }[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `kits/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) {
      toast({ title: "Erro ao enviar imagem", variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    setImageUrl(urlData.publicUrl);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const loadKits = async () => {
    setLoading(true);
    const { data } = await supabase.from("kits").select("*").order("sort_order").order("name");
    setKits((data as Kit[]) ?? []);
    setLoading(false);
  };

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("id, name, slug, price").eq("is_active", true).order("name");
    setAllProducts((data as Product[]) ?? []);
  };

  useEffect(() => { loadKits(); loadProducts(); }, []);

  const resetForm = () => {
    setName(""); setDescription(""); setImageUrl(""); setNormalPrice(""); setPromoPrice("");
    setIsActive(true); setIsFeatured(false); setKitItems([]); setEditingKit(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = async (kit: Kit) => {
    setEditingKit(kit);
    setName(kit.name);
    setDescription(kit.description || "");
    setImageUrl(kit.image_url || "");
    setNormalPrice(String(kit.normal_price));
    setPromoPrice(String(kit.promo_price));
    setIsActive(kit.is_active);
    setIsFeatured(kit.is_featured);

    const { data } = await supabase
      .from("kit_items")
      .select("*, product:products(name, slug)")
      .eq("kit_id", kit.id)
      .order("sort_order");

    setKitItems(
      (data ?? []).map((item: any) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        product_name: item.product?.name || "Produto removido",
      }))
    );
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: "Informe o nome do kit", variant: "destructive" }); return; }
    if (kitItems.length === 0) { toast({ title: "Adicione pelo menos um produto ao kit", variant: "destructive" }); return; }

    const slug = slugify(name);
    const kitData = {
      name: name.trim(),
      slug,
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      normal_price: Number(normalPrice) || 0,
      promo_price: Number(promoPrice) || 0,
      is_active: isActive,
      is_featured: isFeatured,
      updated_at: new Date().toISOString(),
    };

    let kitId: string;

    if (editingKit) {
      const { error } = await supabase.from("kits").update(kitData).eq("id", editingKit.id);
      if (error) { toast({ title: "Erro ao atualizar kit", variant: "destructive" }); return; }
      kitId = editingKit.id;
      // Remove old items
      await supabase.from("kit_items").delete().eq("kit_id", kitId);
    } else {
      const { data, error } = await supabase.from("kits").insert([kitData]).select().single();
      if (error || !data) { toast({ title: "Erro ao criar kit", variant: "destructive" }); return; }
      kitId = (data as any).id;
    }

    // Insert items
    const items = kitItems.map((item, i) => ({
      kit_id: kitId,
      product_id: item.product_id,
      quantity: item.quantity,
      sort_order: i,
    }));
    await supabase.from("kit_items").insert(items);

    toast({ title: editingKit ? "Kit atualizado!" : "Kit criado!" });
    setDialogOpen(false);
    resetForm();
    loadKits();
  };

  const handleDelete = async (kit: Kit) => {
    if (!confirm(`Excluir o kit "${kit.name}"?`)) return;
    await supabase.from("kits").delete().eq("id", kit.id);
    toast({ title: "Kit excluído" });
    loadKits();
  };

  const addProductToKit = (product: Product) => {
    if (kitItems.find(i => i.product_id === product.id)) {
      toast({ title: "Produto já adicionado ao kit" }); return;
    }
    setKitItems([...kitItems, { product_id: product.id, quantity: 1, product_name: product.name }]);
    setShowProductPicker(false);
    setProductSearch("");
  };

  const updateItemQuantity = (idx: number, qty: number) => {
    setKitItems(kitItems.map((item, i) => i === idx ? { ...item, quantity: Math.max(1, qty) } : item));
  };

  const removeItem = (idx: number) => {
    setKitItems(kitItems.filter((_, i) => i !== idx));
  };

  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Kits de Produtos</h1>
            <p className="text-muted-foreground text-sm">Monte combos promocionais</p>
          </div>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Novo Kit</Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : kits.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum kit cadastrado.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {kits.map(kit => (
              <div key={kit.id} className="glass-card rounded-xl p-5 flex items-center gap-4">
                {kit.image_url && (
                  <img src={kit.image_url} alt={kit.name} className="w-16 h-16 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{kit.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">{kit.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm">
                    {kit.normal_price > kit.promo_price && (
                      <span className="text-muted-foreground line-through">R$ {Number(kit.normal_price).toFixed(2)}</span>
                    )}
                    <span className="text-highlight font-bold">R$ {Number(kit.promo_price).toFixed(2)}</span>
                    {!kit.is_active && <span className="text-destructive text-xs font-semibold">Inativo</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => openEdit(kit)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => handleDelete(kit)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingKit ? "Editar Kit" : "Novo Kit"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Kit *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Kit Empresa" />
              </div>
              <div className="space-y-2">
                <Label>Imagem do Kit</Label>
                <div className="flex items-start gap-3">
                  {imageUrl && (
                    <img src={imageUrl} alt="Preview" className="w-20 h-20 rounded-lg object-cover border border-border" />
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="URL da imagem ou faça upload" className="flex-1" />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    {uploading && <p className="text-xs text-muted-foreground animate-pulse">Enviando imagem...</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o kit..." rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço Normal (R$)</Label>
                <Input type="number" step="0.01" value={normalPrice} onChange={e => setNormalPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Preço Promocional (R$)</Label>
                <Input type="number" step="0.01" value={promoPrice} onChange={e => setPromoPrice(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Ativo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
                <Label>Destaque</Label>
              </div>
            </div>

            {/* Kit items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Produtos do Kit</Label>
                <Button variant="outline" size="sm" onClick={() => setShowProductPicker(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Produto
                </Button>
              </div>

              {kitItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                  Nenhum produto adicionado ao kit.
                </p>
              ) : (
                <div className="space-y-2">
                  {kitItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-secondary/50 rounded-lg px-3 py-2">
                      <span className="flex-1 text-sm text-foreground truncate">{item.product_name}</span>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Qtd:</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => updateItemQuantity(idx, Number(e.target.value))}
                          className="w-20 h-8 text-sm"
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(idx)}>
                        <X className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Product picker */}
              {showProductPicker && (
                <div className="border border-border rounded-lg p-3 space-y-2 bg-card">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produto..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      className="pl-9 h-9"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredProducts.slice(0, 20).map(p => (
                      <button
                        key={p.id}
                        onClick={() => addProductToKit(p)}
                        className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-secondary transition-colors flex items-center justify-between"
                      >
                        <span className="truncate">{p.name}</span>
                        <span className="text-muted-foreground text-xs ml-2 flex-shrink-0">R$ {Number(p.price).toFixed(2)}</span>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">Nenhum produto encontrado.</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => { setShowProductPicker(false); setProductSearch(""); }}>
                    Fechar
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancelar</Button>
              <Button onClick={handleSave}>{editingKit ? "Salvar Alterações" : "Criar Kit"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminKits;
