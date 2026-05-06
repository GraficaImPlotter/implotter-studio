import { Button } from "@/components/ui/button";
import { MessageCircle, Share2, Twitter, Link2, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
}

export const ShareButtons = ({ url, title, description }: ShareButtonsProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const shareText = `${title}${description ? ` - ${description}` : ""}`;

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${shareText} ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "width=600,height=400");
  };

  const handleFacebook = () => {
    const u = encodeURIComponent(url);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`, "_blank", "width=600,height=400");
  };

  const handleTwitter = () => {
    const text = encodeURIComponent(shareText);
    const u = encodeURIComponent(url);
    window.open(`https://twitter.com/intent/tweet?url=${u}&text=${text}`, "_blank", "width=600,height=400");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Link copiado!", description: "O link foi copiado para a área de transferência." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Erro ao copiar", description: "Tente copiar o link manualmente." });
    }
  };

  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mr-2">
        Compartilhar:
      </span>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-xl border-green-500/30 hover:bg-green-500/10 hover:border-green-500/50 transition-all"
        onClick={handleWhatsApp}
        title="Compartilhar no WhatsApp"
      >
        <MessageCircle className="h-4 w-4 text-green-500" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-xl border-blue-600/30 hover:bg-blue-600/10 hover:border-blue-600/50 transition-all"
        onClick={handleFacebook}
        title="Compartilhar no Facebook"
      >
        <Share2 className="h-4 w-4 text-blue-600" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-xl border-sky-500/30 hover:bg-sky-500/10 hover:border-sky-500/50 transition-all"
        onClick={handleTwitter}
        title="Compartilhar no X (Twitter)"
      >
        <Twitter className="h-4 w-4 text-sky-500" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-xl border-muted-foreground/30 hover:bg-muted/50 hover:border-muted-foreground/50 transition-all"
        onClick={copyLink}
        title="Copiar link"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Link2 className="h-4 w-4" />}
      </Button>
    </div>
  );
};
