import { useState } from 'react';
import { products as initialProducts, Product, getCategoryFullName, getMainCategories, getSubcategories, formatPrice } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function AdminProdutos() {
  const [prods, setProds] = useState<Product[]>([...initialProducts]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', categoryId: '', price: '', description: '', image: '', is_featured: false });
  const { toast } = useToast();

  const mainCats = getMainCategories();

  const openNew = () => { setEditing(null); setForm({ name: '', categoryId: '', price: '', description: '', image: '', is_featured: false }); setOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, categoryId: p.categoryId, price: String(p.price), description: p.description, image: p.image, is_featured: Boolean(p.is_featured) });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.categoryId) return;

    const payload = {
      name: form.name,
      slug: form.name.toLowerCase().replace(/\s+/g, '-'),
      category_id: form.categoryId,
      price: parseFloat(form.price) || 0,
      description: form.description,
      image: form.image || 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=600&h=400&fit=crop',
      is_featured: form.is_featured,
    };

    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
      if (error) {
        toast({ title: 'Erro ao atualizar produto', description: error.message, variant: 'destructive' });
        return;
      }

      setProds(prev => prev.map(p => p.id === editing.id ? {
        ...p,
        name: form.name,
        categoryId: form.categoryId,
        price: parseFloat(form.price) || 0,
        description: form.description,
        image: payload.image,
        slug: payload.slug,
        is_featured: form.is_featured,
      } : p));
      toast({ title: 'Produto atualizado!' });
    } else {
      const { data, error } = await supabase.from('products').insert(payload);
      if (error) {
        toast({ title: 'Erro ao criar produto', description: error.message, variant: 'destructive' });
        return;
      }

      const inserted = Array.isArray(data) ? data[0] : null;
      const newProd: Product = {
        id: inserted?.id ?? `prod-${Date.now()}`,
        name: form.name,
        slug: payload.slug,
        categoryId: form.categoryId,
        price: parseFloat(form.price) || 0,
        description: form.description,
        longDescription: form.description,
        image: payload.image,
        variations: [],
        is_featured: form.is_featured,
      };
      setProds(prev => [...prev, newProd]);
      toast({ title: 'Produto criado!' });
    }

    setOpen(false);
  };

  const handleDelete = (id: string) => {
    setProds(prev => prev.filter(p => p.id !== id));
    toast({ title: 'Produto excluído!' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat' }}>Produtos</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Produto</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead className="w-28">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prods.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt={p.name} className="w-10 h-10 rounded object-cover" />
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{getCategoryFullName(p.categoryId)}</Badge></TableCell>
                  <TableCell>{formatPrice(p.price)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nome</label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Subcategoria</label>
              <Select value={form.categoryId} onValueChange={v => setForm(p => ({ ...p, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a subcategoria" /></SelectTrigger>
                <SelectContent>
                  {mainCats.map(main => {
                    const subs = getSubcategories(main.id);
                    return (
                      <SelectGroup key={main.id}>
                        <SelectLabel className="font-semibold text-foreground">{main.name}</SelectLabel>
                        {subs.length > 0 ? (
                          subs.map(sub => (
                            <SelectItem key={sub.id} value={sub.id} className="pl-6">{sub.name}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value={main.id} className="pl-6">{main.name} (geral)</SelectItem>
                        )}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Preço (R$)</label>
              <Input type="number" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Descrição</label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">URL da Imagem</label>
              <Input value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <label htmlFor="is-featured" className="text-sm font-medium">Destacar na Página Inicial</label>
              <Switch id="is-featured" checked={form.is_featured} onCheckedChange={checked => setForm(p => ({ ...p, is_featured: checked }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
