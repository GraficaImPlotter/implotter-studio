import { useState, useMemo } from 'react';
import { products as initialProducts, categories, Product, getCategoryFullName, getMainCategories, getSubcategories, formatPrice } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Star, Trash2 } from 'lucide-react';

export default function AdminProdutos() {
  const [prods, setProds] = useState<Product[]>([...initialProducts]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', categoryId: '', price: '', description: '', image: '' });
  const { toast } = useToast();

  const mainCats = getMainCategories();

  const openNew = () => { setEditing(null); setForm({ name: '', categoryId: '', price: '', description: '', image: '' }); setOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, categoryId: p.categoryId, price: String(p.price), description: p.description, image: p.image });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.categoryId) return;
    if (editing) {
      setProds(prev => prev.map(p => p.id === editing.id ? { ...p, name: form.name, categoryId: form.categoryId, price: parseFloat(form.price) || 0, description: form.description, image: form.image, slug: form.name.toLowerCase().replace(/\s+/g, '-') } : p));
      toast({ title: 'Produto atualizado!' });
    } else {
      const newProd: Product = {
        id: `prod-${Date.now()}`, name: form.name, slug: form.name.toLowerCase().replace(/\s+/g, '-'),
        categoryId: form.categoryId, price: parseFloat(form.price) || 0, description: form.description,
        longDescription: form.description, image: form.image || 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=600&h=400&fit=crop', variations: [],
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
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.name}</span>
                        {p.is_featured === true && (
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-amber-600 border-amber-200">
                            <Star className="h-3 w-3 fill-current" />
                          </Badge>
                        )}
                      </div>
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
