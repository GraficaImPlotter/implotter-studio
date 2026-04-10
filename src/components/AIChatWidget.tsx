import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, User, MessageCircle, LogIn, ChevronDown, Sparkles, MoreVertical, Trash2, Paperclip, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import logo from "@/assets/logo.png";

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
  const [isUploading, setIsUploading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Carregar histórico do banco de dados quando o chat abre e o usuário está logado
  // ... (keeping existing logic)
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
            file_url: m.file_url,
            file_type: m.file_type,
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
                  file_url: newMsg.file_url,
                  file_type: newMsg.file_type,
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

  const sendMessage = useCallback(async (text: string, fileInfo?: { url: string, type: string }) => {
    if ((!text.trim() && !fileInfo) || !user || isSending) return;

    const tempId = crypto.randomUUID();
    const userMsg: Msg = { 
      role: "user", 
      content: text.trim(), 
      id: tempId,
      file_url: fileInfo?.url,
      file_type: fileInfo?.type
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-human', {
        body: {
          message: text.trim(),
          userId: user.id,
          userName: user.user_metadata?.full_name || user.email,
          userEmail: user.email,
          fileUrl: fileInfo?.url,
          fileType: fileInfo?.type
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

  const handleClearChat = async () => {
    if (!user) return;
    if (!confirm("Tem certeza que deseja limpar todo o histórico desta conversa?")) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setMessages([]);
      setShowOptions(false);
      toast.success("Histórico limpo!");
    } catch (error) {
      console.error("Erro ao limpar chat:", error);
      toast.error("Erro ao limpar o histórico.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("O arquivo é muito grande (máximo 5MB)");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      await sendMessage("", { url: publicUrl, type: file.type });
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar arquivo.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30 shadow-inner group overflow-hidden p-2">
                    <img src={logo} alt="ImPlotter" className="w-full h-full object-contain group-hover:scale-110 transition-transform brightness-110" />
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
              <div className="flex items-center gap-2 relative z-10">
                <button 
                  onClick={() => setShowOptions(!showOptions)}
                  className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-300",
                    showOptions ? "bg-white/20 text-white" : "bg-black/10 text-white/70 hover:text-white hover:bg-black/20"
                  )}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {/* Options Menu */}
                <AnimatePresence>
                  {showOptions && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute top-12 left-0 w-48 bg-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-1 z-20"
                    >
                      <button
                        onClick={handleClearChat}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Limpar Conversa
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  onClick={() => setOpen(false)} 
                  className="w-10 h-10 flex items-center justify-center rounded-2xl bg-black/10 text-white/70 hover:text-white hover:bg-black/20 hover:rotate-90 transition-all duration-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
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
                    <div className="w-24 h-24 rounded-[32px] bg-primary/10 flex items-center justify-center border border-primary/20 animate-float-gentle p-4">
                       <img src={logo} alt="ImPlotter" className="w-full h-full object-contain opacity-50 transition-transform" />
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
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-sm animate-float-gentle p-1.5">
                        <img src={logo} alt="ImPlotter" className="w-full h-full object-contain" />
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
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-sm self-end p-1.5">
                            <img src={logo} alt="ImPlotter" className="w-full h-full object-contain" />
                          </div>
                        ) : m.role === "assistant" ? (
                          <div className="w-10 h-10 shrink-0" /> // Spacer for grouped messages
                        ) : null}
                        
                        <div
                          className={cn(
                            "rounded-[24px] px-5 py-3.5 text-[13px] leading-relaxed shadow-sm max-w-[85%] w-fit font-medium transition-all flex flex-col gap-2",
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
                          {m.file_url && (
                            <div className="mb-1">
                              {m.file_type?.includes("image") ? (
                                <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-xl border border-white/10">
                                  <img src={m.file_url} alt="Anexo" className="max-w-full h-auto max-h-48 object-cover group-hover:scale-105 transition-transform" />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <ImageIcon className="w-6 h-6 text-white" />
                                  </div>
                                </a>
                              ) : (
                                <a 
                                  href={m.file_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                                >
                                  <FileText className="w-5 h-5 text-highlight" />
                                  <span className="text-xs truncate max-w-[150px]">Ver Arquivo</span>
                                </a>
                              )}
                            </div>
                          )}
                          {m.content && <span className="whitespace-pre-line">{m.content}</span>}
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
              <div className="p-6 bg-white/5 backdrop-blur-3xl border-t border-white/5 shrink-0 relative">
                <form
                  onSubmit={e => { e.preventDefault(); sendMessage(input); }}
                  className="flex items-center gap-3"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload}
                    accept="image/*,application/pdf"
                  />
                  
                  <button
                    type="button"
                    disabled={isUploading || isSending}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white/70 hover:text-white"
                  >
                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                  </button>

                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder="Sua mensagem aqui..."
                      autoComplete="off"
                      className="w-full bg-white/5 border border-white/10 rounded-[24px] pl-6 pr-14 py-4 text-[14px] text-white placeholder:text-white/30 outline-none focus:ring-4 focus:ring-primary/20 focus:bg-white/10 focus:border-primary/40 transition-all font-medium"
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                      <button
                        type="submit"
                        disabled={(!input.trim() && !isUploading) || isSending}
                        className="w-10 h-10 rounded-[18px] bg-primary text-white flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-20 transition-all shadow-glow"
                      >
                        <Send className="w-4 h-4 ml-0.5" />
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
