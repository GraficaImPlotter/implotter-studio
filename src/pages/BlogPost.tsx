import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHTML } from "@/lib/sanitize";

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<any>(null);

  useEffect(() => {
    if (!slug) return;
    supabase.from("blog_posts").select("*").eq("slug", slug).eq("is_published", true).maybeSingle().then(({ data }) => setPost(data));
  }, [slug]);

  if (!post) {
    return <PublicLayout><div className="py-20 text-center text-muted-foreground">Carregando...</div></PublicLayout>;
  }

  return (
    <PublicLayout>
      <article className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <p className="text-sm text-highlight mb-2">{post.category} • {post.published_at ? new Date(post.published_at).toLocaleDateString("pt-BR") : ""}</p>
          <h1 className="font-display text-4xl font-bold text-foreground mb-6">{post.title}</h1>
          {post.excerpt && <p className="text-lg text-muted-foreground mb-8">{post.excerpt}</p>}
          {post.content && (
            <div
              className="prose prose-lg max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(post.content) }}
            />
          )}
        </div>
      </article>
    </PublicLayout>
  );
};

export default BlogPost;
