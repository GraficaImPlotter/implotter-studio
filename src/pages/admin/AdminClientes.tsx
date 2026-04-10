import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Eye, Download } from "lucide-react";
import { exportToCSV } from "@/lib/export-csv";

const AdminClientes = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => setClients(data ?? []));
  }, []);

  const filtered = search.trim()
    ? clients.filter((c) => {
        const q = search.toLowerCase();
        return (c.full_name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q) || (c.phone || "").includes(q);
      })
    : clients;

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl font-bold text-foreground">Clientes</h1>
          <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered.map(c => ({
            Nome: c.full_name || "", Email: c.email || "", Telefone: c.phone || "",
            Cidade: c.address_city || "", Cadastro: new Date(c.created_at).toLocaleDateString("pt-BR"),
          })), "clientes")}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card rounded-xl border border-border overflow-hidden shadow-card border-gradient-premium"
      >
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
          <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Telefone</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Cidade</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Cadastro</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3 font-medium text-foreground">{c.full_name || "—"}</td>
                <td className="p-3 text-muted-foreground">{c.email}</td>
                <td className="p-3 text-muted-foreground">{c.phone || "—"}</td>
                <td className="p-3 text-muted-foreground">{c.address_city || "—"}</td>
                <td className="p-3 text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="p-3">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/clientes/${c.id}`}><Eye className="h-4 w-4 mr-1" /> Ver</Link>
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum cliente</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </motion.div>
    </AdminLayout>
  );
};

export default AdminClientes;
