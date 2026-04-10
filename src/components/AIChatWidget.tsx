import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, User, MessageCircle, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Msg = { 
  role: "user" | "assistant"; 
  content: string; 
  id?: string;
  created_at?: string;
};

const AIChatWidget = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Carregar histórico do banco de dados quando o chat abre e o usuário está logado
  useEffect(() => {
    if (open && user) {
      const fetchHistory = async () => {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (!error && data) {
          const formattedMsgs: Msg[] = data.map(m => ({
            id: m.id,
            role: m.sender_type === 'client' ? 'user' : 'assistant',
            content: m.content,
            created_at: m.created_at
          }));
          setMessages(formattedMsgs);
        }
      };
      
      fetchHistory();

      // 2. Inscrever no Realtime para receber respostas do Admin
      const channel = supabase
        .channel(`chat:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newMsg = payload.new;
            // Só adiciona se for do admin (as do client já adicionamos localmente ou esperamos o realtime também)
            // Para evitar duplicidade no envio do client, verificamos o sender_type
            if (newMsg.sender_type === 'admin') {
              setMessages(prev => {
                // Evita duplicatas se o realtime disparar algo que já temos (improvável para admin)
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, {
                  id: newMsg.id,
                  role: 'assistant',
                  content: newMsg.content,
                  created_at: newMsg.created_at
                }];
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !user || isSending) return;

    const tempId = crypto.randomUUID();
    const userMsg: Msg = { role: "user", content: text.trim(), id: tempId };
    
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_CHAT_API_URL || 'http://localhost:3001'}/api/chat/human`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          userId: user.id,
          userName: user.user_metadata?.full_name || user.email,
          userEmail: user.email
        }),
      });

      if (!response.ok) throw new Error("Falha ao enviar mensagem");

    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem. Tente novamente.");
      // Remove a mensagem temporária em caso de erro
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsSending(false);
    }

  }, [user, isSending]);

  const handleLoginRedirect = () => {
    // Aqui você pode redirecionar para a página de login ou abrir seu modal de login
    window.location.href = "/auth";
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
         <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-[112px] right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-highlight/80 to-highlight-glow flex items-center justify-center shadow-glow border border-white/20"
            aria-label="Chat Suporte"
          >
            <MessageCircle className="w-7 h-7 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed inset-0 z-[100] sm:inset-auto sm:bottom-24 sm:right-6 w-full sm:w-[400px] h-[100dvh] sm:h-[600px] bg-card/95 backdrop-blur-3xl sm:rounded-3xl border border-white/5 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-highlight to-highlight-glow p-5 flex items-center justify-between shrink-0 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full translate-x-10 translate-y-[-50%]" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center border border-white/30 shadow-inner">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-base leading-tight">Suporte ImPlotter</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-glow" />
                    <p className="text-white/80 text-[10px] uppercase font-bold tracking-widest">Atendimento Humano</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/10 text-white/70 hover:text-white hover:bg-black/20 transition-all relative z-10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5 bg-gradient-to-b from-transparent to-black/5">
              {!user ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 px-4">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                     <User className="w-10 h-10 text-primary opacity-50" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-lg">Olá! 👋</h4>
                    <p className="text-sm text-muted-foreground">
                      Para iniciar o atendimento com nossa equipe, por favor, crie sua conta ou faça login.
                    </p>
                  </div>
                  <button
                    onClick={handleLoginRedirect}
                    className="flex items-center gap-2 px-8 py-3.5 bg-primary text-white rounded-2xl font-bold text-sm shadow-glow hover:scale-105 transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    Entrar ou Cadastrar
                  </button>
                </div>
              ) : (
                <>
                  {messages.length === 0 && (
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-sm">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="glass-card-premium p-4 rounded-2xl rounded-tl-sm max-w-[85%] shadow-card">
                        <p className="text-sm text-foreground/90 leading-relaxed">
                          Olá <strong>{user.user_metadata?.full_name?.split(' ')[0] || 'Cliente'}</strong>! 👋 Estamos prontos para te atender. Como podemos ajudar hoje?
                        </p>
                      </div>
                    </div>
                  )}

                  {messages.map((m, i) => (
                    <motion.div 
                      key={m.id || i} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("flex gap-3", m.role === "user" && "justify-end")}
                    >
                      {m.role === "assistant" && (
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm max-w-[85%] w-fit",
                          m.role === "user"
                            ? "bg-primary text-white rounded-tr-sm ml-auto"
                            : "glass-card-premium text-foreground/90 rounded-tl-sm text-left"
                        )}
                      >
                        <span className="whitespace-pre-line">{m.content}</span>
                      </div>

                      {m.role === "user" && (
                        <div className="w-9 h-9 rounded-full bg-highlight/20 flex items-center justify-center shrink-0 border border-highlight/30">
                          <div className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-highlight">
                            {user.email?.substring(0, 1).toUpperCase()}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  
                  {isSending && (
                    <div className="flex justify-end gap-3 opacity-50">
                      <div className="rounded-2xl px-4 py-3 text-sm bg-primary/50 text-white animate-pulse">
                        Enviando...
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Input Footer */}
            {user && (
              <div className="p-4 bg-black/10 backdrop-blur-md border-t border-white/5 shrink-0">
                <form
                  onSubmit={e => { e.preventDefault(); sendMessage(input); }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder="Sua mensagem para nós..."
                      autoComplete="off"
                      className="w-full bg-black/20 border border-white/10 rounded-2xl pl-5 pr-12 py-3.5 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:bg-black/30 transition-all font-medium"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={!input.trim() || isSending}
                        className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center hover:shadow-glow disabled:opacity-30 disabled:hover:shadow-none transition-all"
                      >
                        <Send className="w-4 h-4 ml-0.5" />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatWidget;
