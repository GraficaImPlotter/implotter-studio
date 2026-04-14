import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, FolderTree, Upload, Image as ImageIcon, Loader2, Home } from "lucide-react";
import { generateSlug } from "@/lib/slug";
import { generateUUID } from "@/lib/uuid";

interface CatalogNode {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  show_on_home: boolean;
  sort_order: number;
  children?: CatalogNode[];
}

const buildTree = (nodes: CatalogNode[], parentId: string | null = null): CatalogNode[] => {
  return nodes
    .filter(n => n.parent_id === parentId)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .map(n => ({ ...n, children: buildTree(nodes, n.id) }));
};

const getPath = (nodes: CatalogNode[], nodeId: string): string[] => {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return [];
  if (!node.parent_id) return [node.name];
  return [...getPath(nodes, node.parent_id), node.name];
};

const AdminCategorias = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Dialog
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogNode | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);

  const { data: nodes = [], refetch } = useQuery({
    queryKey: ["catalog-nodes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("catalog_nodes").select("*").order("name");
      if (error) throw error;
      return (data || []) as CatalogNode[];
    }
  });

  const tree = buildTree(nodes);

  const load = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["catalog-nodes"] });
  }, [queryClient]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openCreate = (parent: string | null) => {
    setEditing(null);
    setParentId(parent);
    setOpen(true);
  };

  const openEdit = (node: CatalogNode) => {
    setEditing(node);
    setParentId(node.parent_id);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    
    try {
      const fd = new FormData(e.currentTarget);
      const name = fd.get("name") as string;
      const rawSlug = fd.get("slug") as string;
      const payload = {
        name,
        slug: rawSlug.trim() || generateSlug(name),
        description: (fd.get("description") as string) || null,
        image_url: (fd.get("image_url") as string) || null,
        is_active: fd.get("is_active") === "on",
        show_on_home: fd.get("show_on_home") === "on",
        parent_id: parentId,
      };

      if (editing) {
        const { error } = await supabase.from("catalog_nodes").update(payload).eq("id", editing.id);
        if (error) { toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" }); return; }
        toast({ title: "Nó atualizado!" });
      } else {
        const { error } = await supabase.from("catalog_nodes").insert(payload);
        if (error) { toast({ title: "Erro ao criar", description: error.message, variant: "destructive" }); return; }
        toast({ title: "Nó criado!" });
        // Auto-expand parent
        if (parentId) setExpanded(prev => new Set(prev).add(parentId));
      }
      setOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["catalog-nodes"] });
    } catch (error: any) {
      toast({ title: "Erro inesperado", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (node: CatalogNode) => {
    const childCount = nodes.filter(n => n.parent_id === node.id).length;
    const msg = childCount > 0
      ? `Excluir "${node.name}" e todos os ${childCount} subnível(is) dentro dele?`
      : `Excluir "${node.name}"?`;
    if (!confirm(msg)) return;
    const { error } = await supabase.from("catalog_nodes").delete().eq("id", node.id);
    if (error) {
       toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
       toast({ title: "Excluído!" });
       queryClient.invalidateQueries({ queryKey: ["catalog-nodes"] });
    }
  };

  const renderNode = (node: CatalogNode, depth: number = 0) => {
    const hasChildren = (node.children?.length ?? 0) > 0;
    const isExpanded = expanded.has(node.id);
    const path = getPath(nodes, node.id);

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 py-2.5 px-3 hover:bg-muted/30 rounded-lg transition-colors group ${depth > 0 ? "ml-6" : ""}`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {/* Expand toggle */}
          <button
            onClick={() => toggleExpand(node.id)}
            className={`w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors ${hasChildren ? "" : "invisible"}`}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {/* Node info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground text-sm truncate">{node.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${node.is_active ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                {node.is_active ? "Ativo" : "Inativo"}
              </span>
              {node.show_on_home && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary flex items-center gap-1">
                  <Home className="w-2.5 h-2.5" /> Home
                </span>
              )}
            </div>
            {depth > 0 && (
              <p className="text-[11px] text-muted-foreground truncate">{path.join(" › ")}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCreate(node.id)} title="Adicionar subnível">
              <Plus className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(node)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(node)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Children */}
        {isExpanded && node.children?.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  const parentPath = parentId ? getPath(nodes, parentId).join(" › ") : null;

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
            <FolderTree className="w-8 h-8 text-highlight" />
            Catálogo Hierárquico
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie a árvore de navegação do catálogo • {nodes.length} nós
          </p>
        </div>
        <Button variant="hero" onClick={() => openCreate(null)}>
          <Plus className="w-4 h-4 mr-2" /> Nova Categoria Raiz
        </Button>
      </div>

      {/* Tree view */}
      <div className="bg-card rounded-xl border border-border shadow-card p-4 min-h-[300px]">
        {tree.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Nenhum nó cadastrado</p>
            <p className="text-sm">Crie a primeira categoria raiz para começar.</p>
          </div>
        ) : (
          tree.map(node => renderNode(node, 0))
        )}
      </div>

      {/* Instructions card */}
      <div className="bg-secondary/50 rounded-xl border border-border p-5 mt-6">
        <h3 className="font-display font-bold text-foreground text-sm mb-2">Como funciona</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Categorias raiz</strong>: níveis principais (ex: Cartão de Visita, Banner)</li>
          <li>• <strong>Subníveis</strong>: clique no <Plus className="w-3 h-3 inline" /> ao lado de um nó para criar filhos (ex: Couchê 300g)</li>
          <li>• <strong>Profundidade ilimitada</strong>: crie quantos níveis precisar (Material → Acabamento → Tipo)</li>
          <li>• <strong>Produtos</strong>: vincule produtos ao nó final desejado em Produtos → Caminho no catálogo</li>
          <li>• Nomes iguais em caminhos diferentes são tratados de forma independente</li>
        </ul>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Nó" : "Novo Nó"}
              {parentPath && (
                <span className="block text-sm font-normal text-muted-foreground mt-1">
                  Dentro de: {parentPath}
                </span>
              )}
              {!parentId && !editing && (
                <span className="block text-sm font-normal text-muted-foreground mt-1">
                  Categoria raiz (nível principal)
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Formulário para {editing ? "editar" : "criar"} nó do catálogo
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input name="name" defaultValue={editing?.name} required />
            </div>
            <div>
              <label className="text-sm font-medium">Slug</label>
              <Input name="slug" defaultValue={editing?.slug} placeholder="Gerado automaticamente do nome" />
              <p className="text-[11px] text-muted-foreground mt-1">Deixe em branco para gerar automaticamente.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input name="description" defaultValue={editing?.description ?? ""} />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-highlight" /> Imagem
              </label>
              {(editing?.image_url) && (
                <img src={editing.image_url} alt="" className="w-20 h-20 object-cover rounded-lg mb-2 border border-border" />
              )}
              <div className="flex gap-2">
                <Input name="image_url" defaultValue={editing?.image_url ?? ""} placeholder="URL da imagem ou faça upload" className="flex-1" />
                <label className="cursor-pointer">
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { toast({ title: "Máximo 5MB", variant: "destructive" }); return; }
                    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
                    const path = `categories/${Date.now()}-${generateUUID().slice(0,8)}.${ext}`;
                    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
                    if (error) { toast({ title: "Erro no upload", variant: "destructive" }); return; }
                    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
                    const input = e.target.closest("div")?.querySelector("input[name='image_url']") as HTMLInputElement;
                    if (input) { input.value = urlData.publicUrl; }
                    toast({ title: "Imagem enviada!" });
                  }} />
                  <Button type="button" variant="outline" size="icon" className="pointer-events-none" title="Upload de imagem">
                    <Upload className="w-4 h-4" />
                  </Button>
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Cole uma URL ou faça upload de uma imagem.</p>
            </div>
            <div className="pt-2 flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground transition-colors">
                <input type="checkbox" name="is_active" defaultChecked={editing?.is_active ?? true} className="rounded border-input text-primary focus:ring-primary" />
                Ativo (visível no catálogo)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground transition-colors">
                <input type="checkbox" name="show_on_home" defaultChecked={editing?.show_on_home ?? false} className="rounded border-input text-primary focus:ring-primary" />
                <span className="flex items-center gap-1.5 text-highlight font-semibold">
                  <Home className="w-3.5 h-3.5" /> Mostrar como destaque na Home
                </span>
              </label>
              <p className="text-[11px] text-muted-foreground ml-6">Marque apenas 6 categorias macro para um visual limpo.</p>
            </div>
            {editing && (
              <div>
                <label className="text-sm font-medium">Mover para dentro de</label>
                <select
                  value={parentId ?? ""}
                  onChange={e => setParentId(e.target.value || null)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Raiz (nível principal)</option>
                  {nodes
                    .filter(n => n.id !== editing.id)
                    .sort((a, b) => {
                      const pa = getPath(nodes, a.id).join(" › ");
                      const pb = getPath(nodes, b.id).join(" › ");
                      return pa.localeCompare(pb, "pt-BR");
                    })
                    .map(n => (
                      <option key={n.id} value={n.id}>
                        {getPath(nodes, n.id).join(" › ")}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
              ) : (
                "Salvar"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCategorias;
