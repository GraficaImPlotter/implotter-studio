import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { generatePixQRCode } from "@/lib/pix";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, CheckCircle, ShieldCheck, CreditCard } from "lucide-react";

const Pagamento = () => {
  const { orderId } = useParams();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [pixCode, setPixCode] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [error, setError] = useState("");
  const [ccName, setCcName] = useState("");
  const [ccNumber, setCcNumber] = useState("");
  const [ccExpiryMonth, setCcExpiryMonth] = useState("");
  const [ccExpiryYear, setCcExpiryYear] = useState("");
  const [ccCcv, setCcCcv] = useState("");
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [paymentApproved, setPaymentApproved] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const loadOrder = async () => {
      // SEC-005: Fetch order with basic data
      const { data, error: fetchError } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
      if (fetchError || !data) { setLoading(false); return; }

      // SEC-005: Verify ownership — logged-in users can only see their own orders
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && data.customer_id && data.customer_id !== session.user.id) {
        console.warn("Tentativa de acesso a pedido de outro usuário");
        setLoading(false);
        return; // Block access — this order belongs to a different user
      }

      setOrder(data);

      if (data.status === "pagamento_confirmado" || data.status === "pedido_recebido") {
         setPaymentApproved(true);
      }

      if (data.payment_method === "credit_card") {
        setLoading(false);
        return; // We don't generate PIX for credit card
      }

      // Generate PIX code server-side (tamper-proof)
      try {
        const { data: pixData, error: pixError } = await supabase.functions.invoke("generate-pix", {
          body: { orderId },
        });

        if (pixError) {
          console.error("PIX generation error:", pixError);
          setError("Erro ao gerar código PIX. Tente novamente.");
          setLoading(false);
          return;
        }

        if (pixData?.pixCode) {
          setPixCode(pixData.pixCode);
          if (pixData.encodedImage) {
            // Asaas retorna string Base64 limpa, precisamos adicionar o prefixo do formato.
            // Para segurança testamos se ele já enviou prefixado
            const prefix = pixData.encodedImage.startsWith("data:image") ? "" : "data:image/png;base64,";
            setQrDataUrl(prefix + pixData.encodedImage);
          } else {
            setQrDataUrl(generatePixQRCode(pixData.pixCode)); // Fallback legado
          }
        } else if (pixData?.error) {
          setError(pixData.error);
        }
      } catch (err) {
        console.error("PIX fetch error:", err);
        setError("Erro ao gerar código PIX.");
      }

      setLoading(false);
    };
    loadOrder();
  }, [orderId]);

  const submitCreditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingCard(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("process-asaas-card", {
        body: {
          orderId,
          creditCard: {
            holderName: ccName,
            number: ccNumber.replace(/\D/g, ""),
            expiryMonth: ccExpiryMonth,
            expiryYear: ccExpiryYear,
            ccv: ccCcv
          }
        }
      });

      if (fnError) throw fnError;
      if (data?.error) {
        let errorMsg = data.error;
        if (data.details && Array.isArray(data.details)) {
          errorMsg += ": " + data.details.map((d: any) => d.description).join(", ");
        }
        setError(errorMsg);
        console.error("Asaas API Error Details:", data.details);
        return;
      }

      setPaymentApproved(true);
      toast({ title: "Pagamento aprovado com sucesso!" });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro inesperado ao conectar com o serviço de pagamentos.");
    } finally {
      setIsProcessingCard(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast({ title: "Código PIX copiado!" });
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading || !order) {
    return <PublicLayout><div className="py-20 text-center text-muted-foreground">Carregando...</div></PublicLayout>;
  }

  const statusLabels: Record<string, string> = {
    aguardando_pagamento: "Aguardando Pagamento",
    pagamento_confirmado: "Pagamento Confirmado",
    pedido_recebido: "Pedido Recebido",
  };

  return (
    <PublicLayout>
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-lg text-center">
          <div className="bg-card rounded-xl border border-border p-5 sm:p-8 shadow-elevated">
            <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-success mx-auto mb-4" />
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">Seu pedido foi criado!</h1>
            <p className="text-muted-foreground mb-6">Pedido <strong className="text-foreground">#{order.order_number}</strong></p>

            <div className="mb-6">
              <span className="inline-block text-xs px-3 py-1 rounded-full bg-highlight/20 text-highlight font-medium">
                {statusLabels[order.status] || order.status}
              </span>
            </div>

            {paymentApproved ? (
              <div className="bg-success/10 rounded-lg p-6 text-center shadow-sm">
                <CheckCircle className="w-10 h-10 text-success mx-auto mb-2" />
                <h3 className="font-display font-bold text-foreground text-lg mb-1">Pagamento Confirmado!</h3>
                <p className="text-sm text-muted-foreground">Obrigado! Seu pagamento foi processado com sucesso. Acompanhe seu pedido na área do cliente.</p>
                <Button className="mt-4" onClick={() => window.location.href = "/minha-conta"}>Ir para Meus Pedidos</Button>
              </div>
            ) : order.payment_method === "credit_card" ? (
              <form onSubmit={submitCreditCard} className="bg-card rounded-xl border border-border p-6 mt-4 text-left shadow-sm">
                <h3 className="font-display font-bold text-foreground text-lg flex items-center gap-2 mb-4">
                  <CreditCard className="w-5 h-5 text-highlight" />
                  Pagar com Cartão de Crédito
                </h3>
                {error && <div className="bg-warning/10 p-3 rounded-lg text-warning text-sm mb-4">{error}</div>}
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1 block">Nome impresso no cartão</label>
                    <Input required value={ccName} onChange={(e) => setCcName(e.target.value)} className="bg-secondary" placeholder="Como está no cartão" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1 block">Número do cartão</label>
                    <Input required value={ccNumber} onChange={(e) => setCcNumber(e.target.value)} className="bg-secondary" placeholder="0000 0000 0000 0000" maxLength={19} />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-1 block">Mês</label>
                      <Input required value={ccExpiryMonth} onChange={(e) => setCcExpiryMonth(e.target.value)} className="bg-secondary" placeholder="MM" maxLength={2} />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-1 block">Ano</label>
                      <Input required value={ccExpiryYear} onChange={(e) => setCcExpiryYear(e.target.value)} className="bg-secondary" placeholder="AAAA" maxLength={4} />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-1 block">CVC</label>
                      <Input required value={ccCcv} onChange={(e) => setCcCcv(e.target.value)} className="bg-secondary" placeholder="123" maxLength={4} type="password" />
                    </div>
                  </div>
                  <Button type="submit" variant="highlight" className="w-full mt-2" disabled={isProcessingCard}>
                    {isProcessingCard ? "Processando..." : `Pagar R$ ${Number(order.total).toFixed(2)}`}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground pt-2">Processado de forma segura e criptografada por Asaas.</p>
                </div>
              </form>
            ) : error ? (
              <div className="bg-warning/10 rounded-lg p-4 text-sm text-warning">
                {error}
              </div>
            ) : qrDataUrl ? (
              <>
                <div className="bg-background rounded-xl p-6 mb-6">
                  <p className="text-sm text-muted-foreground mb-4">Escaneie o QR Code ou copie o código abaixo:</p>
                  <img src={qrDataUrl} alt="QR Code PIX" className="mx-auto mb-4 w-44 h-44 sm:w-56 sm:h-56" />
                  <p className="font-bold text-lg text-foreground mb-2">R$ {Number(order.total).toFixed(2)}</p>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-success">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Valor verificado pelo servidor</span>
                  </div>
                </div>

                <div className="bg-muted rounded-lg p-4 mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Código PIX copia e cola:</p>
                  <p className="text-xs font-mono break-all text-foreground mb-3">{pixCode}</p>
                  <Button variant="highlight" onClick={copyCode} className="w-full">
                    {copied ? <><CheckCircle className="w-4 h-4 mr-2" /> Copiado!</> : <><Copy className="w-4 h-4 mr-2" /> Copiar Código PIX</>}
                  </Button>
                </div>

                <div className="text-left bg-highlight/5 rounded-lg p-4 text-sm space-y-2">
                  <p className="font-semibold text-foreground">📌 Instruções:</p>
                  <ol className="list-decimal pl-4 text-muted-foreground space-y-1">
                    <li>Abra o app do seu banco</li>
                    <li>Escolha pagar com PIX</li>
                    <li>Escaneie o QR Code ou cole o código</li>
                    <li>Confirme o pagamento</li>
                    <li>Aguarde a confirmação pelo admin</li>
                  </ol>
                </div>
              </>
            ) : (
              <div className="bg-warning/10 rounded-lg p-4 text-sm text-warning">
                A chave PIX ainda não foi configurada pelo administrador. Entre em contato para concluir o pagamento.
              </div>
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Pagamento;
