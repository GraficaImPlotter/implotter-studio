import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PAGE_SLUGS = [
  { slug: "politica-de-privacidade", label: "Política de Privacidade" },
  { slug: "termos-de-uso", label: "Termos de Uso" },
  { slug: "nossa-historia", label: "Nossa História" },
];

const AdminPaginas = () => {
  const { toast } = useToast();
  const [pages, setPages] = useState<Record<string, { title: string; content: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("site_pages").select("*").then(({ data }) => {
      const map: Record<string, { title: string; content: string }> = {};
      data?.forEach((p: any) => {
        map[p.slug] = { title: p.title || "", content: p.content || "" };
      });
      setPages(map);
    });
  }, []);

  const handleSave = async (slug: string) => {
    setSaving(true);
    const page = pages[slug];
    if (!page) { setSaving(false); return; }

    const { data: existing } = await supabase.from("site_pages").select("id").eq("slug", slug).maybeSingle();
    if (existing) {
      await supabase.from("site_pages").update({ title: page.title, content: page.content, updated_at: new Date().toISOString() }).eq("slug", slug);
    } else {
      await supabase.from("site_pages").insert({ slug, title: page.title, content: page.content });
    }
    toast({ title: "Página salva com sucesso!" });
    setSaving(false);
  };

  const updatePage = (slug: string, field: "title" | "content", value: string) => {
    setPages(prev => ({
      ...prev,
      [slug]: { ...prev[slug], [field]: value },
    }));
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-bold text-foreground mb-6">Páginas</h1>
      <Tabs defaultValue={PAGE_SLUGS[0].slug} className="max-w-4xl">
        <TabsList className="mb-6">
          {PAGE_SLUGS.map(p => (
            <TabsTrigger key={p.slug} value={p.slug}>{p.label}</TabsTrigger>
          ))}
        </TabsList>
        {PAGE_SLUGS.map(p => (
          <TabsContent key={p.slug} value={p.slug}>
            <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Título</label>
                <Input
                  value={pages[p.slug]?.title || ""}
                  onChange={e => updatePage(p.slug, "title", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Conteúdo</label>
                <div className="mt-1">
                  <RichTextEditor
                    value={pages[p.slug]?.content || ""}
                    onChange={val => updatePage(p.slug, "content", val)}
                  />
                </div>
              </div>
              <Button variant="hero" size="lg" onClick={() => handleSave(p.slug)} disabled={saving} className="w-full">
                {saving ? "Salvando..." : "Salvar Página"}
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </AdminLayout>
  );
};

export default AdminPaginas;
