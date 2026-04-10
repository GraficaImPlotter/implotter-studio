import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const MelhorEnvioCallback = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setStatus("error");
      setErrorMsg("Código de autorização não encontrado na URL.");
      return;
    }

    const exchange = async () => {
      try {
        const redirectUri = `${window.location.origin}/melhor-envio/callback`;
        const { data, error } = await supabase.functions.invoke("melhor-envio-oauth", {
          body: { code, redirect_uri: redirectUri },
        });

        if (error || data?.error) {
          setStatus("error");
          setErrorMsg(data?.error || error?.message || "Erro ao trocar código OAuth.");
          return;
        }

        setStatus("success");
      } catch {
        setStatus("error");
        setErrorMsg("Erro ao conectar com o servidor.");
      }
    };

    exchange();
  }, [searchParams]);

  return (
    <PublicLayout>
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-md text-center">
          {status === "loading" && (
            <div>
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold text-foreground">Conectando ao Melhor Envio...</h1>
              <p className="text-muted-foreground mt-2">Aguarde enquanto processamos a autorização.</p>
            </div>
          )}

          {status === "success" && (
            <div>
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold text-foreground">Conectado com sucesso!</h1>
              <p className="text-muted-foreground mt-2">
                O Melhor Envio foi integrado. O cálculo de frete e rastreamento já estão funcionando.
              </p>
              <Link
                to="/admin/configuracoes"
                className="inline-block mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition"
              >
                Voltar às Configurações
              </Link>
            </div>
          )}

          {status === "error" && (
            <div>
              <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold text-foreground">Erro na autorização</h1>
              <p className="text-muted-foreground mt-2">{errorMsg}</p>
              <Link
                to="/admin/configuracoes"
                className="inline-block mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition"
              >
                Voltar às Configurações
              </Link>
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default MelhorEnvioCallback;
