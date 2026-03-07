import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { createBanner, uploadBannerImage } from "@/lib/supabaseRest";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const AdminBanners = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const previewUrl = useMemo(() => {
    if (!selectedFile) return "";
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Selecione apenas arquivos de imagem.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 2MB.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      toast({
        title: "Selecione uma imagem",
        description: "Você precisa escolher uma imagem antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const publicUrl = await uploadBannerImage(selectedFile);
      await createBanner(publicUrl);

      toast({
        title: "Banner salvo",
        description: "Imagem enviada e banner cadastrado com sucesso.",
      });

      setSelectedFile(null);
      (event.currentTarget.elements.namedItem("banner-image") as HTMLInputElement | null)?.value = "";
    } catch (error) {
      toast({
        title: "Erro ao salvar banner",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Banners</CardTitle>
          <CardDescription>Painel Admin /admin/banners</CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="banner-image">Imagem do Banner</Label>
              <label
                htmlFor="banner-image"
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center transition hover:bg-muted/40"
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium">Clique para selecionar uma imagem</span>
                <span className="text-xs text-muted-foreground">Aceita PNG, JPG, WEBP e outros formatos de imagem.</span>
              </label>
              <Input
                id="banner-image"
                name="banner-image"
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
              <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                Tamanho recomendado: 1920x1080 pixels (Formato Horizontal). Máximo de 2MB.
              </p>
            </div>

            {previewUrl ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Pré-visualização</p>
                <img
                  src={previewUrl}
                  alt="Prévia do banner selecionado"
                  className="max-h-64 w-full rounded-md border object-cover"
                />
              </div>
            ) : null}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando imagem...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default AdminBanners;
