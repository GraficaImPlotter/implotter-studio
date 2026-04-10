import { useEffect, useState } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHTML } from "@/lib/sanitize";

const TermosDeUso = () => {
  const [page, setPage] = useState<{ title: string; content: string } | null>(null);

  useEffect(() => {
    supabase.from("site_pages").select("title, content").eq("slug", "termos-de-uso").maybeSingle().then(({ data }) => {
      if (data) setPage(data);
    });
  }, []);

  return (
    <PublicLayout>
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="font-display text-4xl font-bold text-foreground mb-8">{page?.title || "Termos de Uso"}</h1>
          <div
            className="prose max-w-none text-muted-foreground space-y-4"
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(page?.content || "<p>Carregando...</p>") }}
          />
        </div>
      </section>
    </PublicLayout>
  );
};

export default TermosDeUso;
