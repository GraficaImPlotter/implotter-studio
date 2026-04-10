import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import PageHero from "@/components/layout/PageHero";

const Blog = () => {
  const [posts, setPosts] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("blog_posts").select("*").eq("is_published", true).order("published_at", { ascending: false }).then(({ data }) => setPosts(data ?? []));
  }, []);

  return (
    <PublicLayout>
      <PageHero title="Blog ImPlotter" badge="Conteúdo Acadêmico & Dicas" />
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          {posts.length === 0 ? (
            <p className="text-muted-foreground">Nenhum artigo publicado ainda.</p>
          ) : (
            <div className="space-y-6">
              {posts.map(p => (
                <Link key={p.id} to={`/blog/${p.slug}`} className="block bg-card rounded-xl border border-border p-6 shadow-card hover:shadow-elevated transition-shadow">
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">{p.title}</h2>
                  {p.excerpt && <p className="text-muted-foreground text-sm mb-3">{p.excerpt}</p>}
                  <p className="text-xs text-muted-foreground">{p.published_at ? new Date(p.published_at).toLocaleDateString("pt-BR") : ""} {p.category && `• ${p.category}`}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default Blog;
