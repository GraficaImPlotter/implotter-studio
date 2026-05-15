import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

const AdminBlog = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    setPosts(data ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: fd.get("title") as string,
      slug: fd.get("slug") as string,
      excerpt: fd.get("excerpt") as string,
      content: fd.get("content") as string,
      category: fd.get("category") as string,
      is_published: fd.get("is_published") === "on",
      meta_title: fd.get("meta_title") as string,
      meta_description: fd.get("meta_description") as string,
      published_at:
        fd.get("is_published") === "on" ? new Date().toISOString() : null,
    };
    if (editing) {
      await supabase.from("blog_posts").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("blog_posts").insert(payload);
    }
    toast({ title: editing ? "Post atualizado!" : "Post criado!" });
    setOpen(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir post?")) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    toast({ title: "Post excluído" });
    load();
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-3xl font-bold text-foreground">
          Blog
        </h1>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" /> Novo Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar" : "Novo"} Post</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Título *</label>
                <Input name="title" defaultValue={editing?.title} required />
              </div>
              <div>
                <label className="text-sm font-medium">Slug *</label>
                <Input name="slug" defaultValue={editing?.slug} required />
              </div>
              <div>
                <label className="text-sm font-medium">Categoria</label>
                <Input name="category" defaultValue={editing?.category} />
              </div>
              <div>
                <label className="text-sm font-medium">Resumo</label>
                <Textarea
                  name="excerpt"
                  rows={2}
                  defaultValue={editing?.excerpt}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Conteúdo</label>
                <Textarea
                  name="content"
                  rows={8}
                  defaultValue={editing?.content}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Meta Title</label>
                  <Input name="meta_title" defaultValue={editing?.meta_title} />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Meta Description
                  </label>
                  <Input
                    name="meta_description"
                    defaultValue={editing?.meta_description}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="is_published"
                  defaultChecked={editing?.is_published}
                />{" "}
                Publicado
              </label>
              <Button type="submit" variant="hero" className="w-full">
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">
                Título
              </th>
              <th className="text-left p-3 font-medium text-muted-foreground">
                Categoria
              </th>
              <th className="text-left p-3 font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-left p-3 font-medium text-muted-foreground">
                Data
              </th>
              <th className="text-right p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr
                key={p.id}
                className="border-t border-border hover:bg-muted/30"
              >
                <td className="p-3 font-medium text-foreground">{p.title}</td>
                <td className="p-3 text-muted-foreground">
                  {p.category || "—"}
                </td>
                <td className="p-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${p.is_published ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}
                  >
                    {p.is_published ? "Publicado" : "Rascunho"}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="p-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(p);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(p.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-muted-foreground"
                >
                  Nenhum post
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminBlog;
