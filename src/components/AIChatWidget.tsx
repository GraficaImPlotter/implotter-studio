import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, User, MessageCircle, LogIn, ChevronDown, Sparkles } from "lucide-react";
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
  const [showScrollButton, setShowScrollButton] = useState(false);
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
            if (newMsg.sender_type === 'admin') {
              setMessages(prev => {
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

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !user || isSending) return;

    const tempId = crypto.randomUUID();
    const userMsg: Msg = { role: "user", content: text.trim(), id: tempId };
    
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-human', {
        body: {
          message: text.trim(),
          userId: user.id,
          userName: user.user_metadata?.full_name || user.email,
          userEmail: user.email
        }
      });
      
      if (error) throw error;

    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem. Tente novamente.");
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsSending(false);
    }

  }, [user, isSending]);

  const handleLoginRedirect = () => {
    window.location.href = "/login";
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
         <motion.button
            initial={{ scale: 0, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0, rotate: 20 }}
            whileHover={{ scale: 1.1, y: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-[112px] right-6 z-50 w-16 h-16 rounded-3xl bg-gradient-to-br from-highlight/90 to-highlight-glow flex items-center justify-center shadow-glow-strong border border-white/20 transition-all duration-300 group"
            aria-label="Chat Suporte"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
            <MessageCircle className="w-8 h-8 text-white relative z-10" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-background animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] sm:inset-auto sm:bottom-24 sm:right-6 w-full sm:w-[420px] h-[100dvh] sm:h-[650px] bg-card/95 backdrop-blur-3xl sm:rounded-[40px] border border-white/5 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-highlight to-highlight-glow p-6 flex items-center justify-between shrink-0 shadow-lg relative overflow-hidden">
               <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-3xl rounded-full translate-x-10 translate-y-[-50%]" />
               <div className="absolute bottom-0 left-0 w-32 h-32 bg-highlight-glow/20 blur-2xl rounded-full translate-x-[-50%] translate-y-[50%]" />
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30 shadow-inner group overflow-hidden">
                    <User className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-highlight animate-pulse shadow-glow" />
                </div>
                <div>
                  <h3 className="font-display font-black text-white text-lg leading-tight tracking-tight uppercase">Suporte ImPlotter</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Sparkles className="w-3 h-3 text-white/60" />
                    <p className="text-white/80 text-[10px] uppercase font-bold tracking-[0.2em]">Consultor Online</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setOpen(false)} 
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-black/10 text-white/70 hover:text-white hover:bg-black/20 hover:rotate-90 transition-all duration-300 relative z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Body */}
            <div 
              ref={scrollRef} 
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-transparent to-black/5 scrollbar-thin scrollbar-thumb-white/10"
            >
              {!user ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-8 px-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-[32px] bg-primary/10 flex items-center justify-center border border-primary/20 animate-float-gentle">
                       <User className="w-12 h-12 text-primary opacity-50" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-background border border-border flex items-center justify-center">
                       <LogIn className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-display font-black text-2xl tracking-tight uppercase">Atendimento</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Para iniciar o atendimento personalizado, por favor, conecte-se à sua conta ImPlotter.
                    </p>
                  </div>
                  <button
                    onClick={handleLoginRedirect}
                    className="flex items-center gap-3 px-10 py-4 bg-primary text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-glow hover:scale-105 active:scale-95 transition-all"
                  >
                    Entrar ou Cadastrar
                  </button>
                </div>
              ) : (
                <>
                  {messages.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-3"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-sm animate-float-gentle">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="glass-card-premium p-5 rounded-[24px] rounded-tl-sm max-w-[85%] shadow-xl border-white/5">
                        <p className="text-[13px] text-foreground/90 leading-relaxed font-medium">
                          Olá <strong>{user.user_metadata?.full_name?.split(' ')[0] || 'Cliente'}</strong>! 👋 Estamos prontos para te atender. Como podemos ajudar hoje?
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {messages.map((m, i) => {
                    const isLastFromSender = i === messages.length - 1 || messages[i + 1].role !== m.role;
                    const isFirstFromSender = i === 0 || messages[i - 1].role !== m.role;

                    return (
                      <motion.div 
                        key={m.id || i} 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={cn(
                          "flex gap-3", 
                          m.role === "user" && "justify-end",
                          !isFirstFromSender && "mt-[-12px]"
                        )}
                      >
                        {m.role === "assistant" && isFirstFromSender ? (
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-sm self-end">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                        ) : m.role === "assistant" ? (
                          <div className="w-10 h-10 shrink-0" /> // Spacer for grouped messages
                        ) : null}
                        
                        <div
                          className={cn(
                            "rounded-[24px] px-5 py-3.5 text-[13px] leading-relaxed shadow-sm max-w-[85%] w-fit font-medium transition-all",
                            m.role === "user"
                              ? "bg-primary text-white shadow-glow-sm"
                              : "glass-card-premium text-foreground/90 border-white/5",
                            m.role === "user" && isFirstFromSender && "rounded-tr-sm",
                            m.role === "user" && !isFirstFromSender && !isLastFromSender && "rounded-r-md",
                            m.role === "user" && isLastFromSender && !isFirstFromSender && "rounded-br-sm",
                            m.role === "assistant" && isFirstFromSender && "rounded-tl-sm",
                            m.role === "assistant" && !isFirstFromSender && !isLastFromSender && "rounded-l-md",
                            m.role === "assistant" && isLastFromSender && !isFirstFromSender && "rounded-bl-sm"
                          )}
                        >
                          <span className="whitespace-pre-line">{m.content}</span>
                        </div>

                        {m.role === "user" && isFirstFromSender ? (
                          <div className="w-10 h-10 rounded-2xl bg-highlight/20 flex items-center justify-center shrink-0 border border-highlight/30 shadow-sm self-end">
                            <div className="w-5 h-5 flex items-center justify-center text-[10px] font-black text-highlight">
                              {user.email?.substring(0, 1).toUpperCase()}
                            </div>
                          </div>
                        ) : m.role === "user" ? (
                          <div className="w-10 h-10 shrink-0" />
                        ) : null}
                      </motion.div>
                    );
                  })}
                  
                  {isSending && (
                    <div className="flex justify-end gap-3 translate-y-[-10px]">
                      <div className="rounded-[20px] rounded-br-sm px-5 py-3 text-[11px] font-bold uppercase tracking-widest bg-primary/20 text-primary border border-primary/30 animate-pulse">
                        Enviando...
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Float Scroll Button */}
            <AnimatePresence>
              {showScrollButton && (
                <motion.button
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  onClick={() => scrollToBottom()}
                  className="absolute bottom-28 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-glow border border-white/20 z-10 hover:scale-110 active:scale-95 transition-all"
                >
                  <ChevronDown className="w-5 h-5" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Input Footer */}
            {user && (
              <div className="p-6 bg-black/10 backdrop-blur-md border-t border-white/5 shrink-0 relative">
                <form
                  onSubmit={e => { e.preventDefault(); sendMessage(input); }}
                  className="flex items-center gap-3"
                >
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder="Sua mensagem aqui..."
                      autoComplete="off"
                      className="w-full bg-black/20 border border-white/10 rounded-[28px] pl-6 pr-14 py-5 text-[14px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-4 focus:ring-primary/20 focus:bg-black/40 focus:border-primary/40 transition-all font-semibold"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <button
                        type="submit"
                        disabled={!input.trim() || isSending}
                        className="w-12 h-12 rounded-[22px] bg-primary text-white flex items-center justify-center hover:scale-105 active:scale-90 disabled:opacity-20 disabled:hover:scale-100 transition-all shadow-glow"
                      >
                        <Send className="w-5 h-5 ml-0.5" />
                      </button>
                    </div>
                  </div>
                </form>
                <p className="text-[10px] text-center mt-4 text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-40">
                   Suporte Oficial • Grafica ImPlotter
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatWidget;
