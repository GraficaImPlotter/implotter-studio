import { useState, useMemo } from 'react';
import { categories as initialCategories, Category, getMainCategories as getMainCats } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, CornerDownRight } from 'lucide-react';

export default function AdminCategorias() {
  const [cats, setCats] = useState<Category[]>([...initialCategories]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', description: '', parentId: '' });
  const { toast } = useToast();

  const mainCats = useMemo(() => cats.filter(c => c.parentId === null), [cats]);
  const getSubs = (parentId: string) => cats.filter(c => c.parentId === parentId);

  // Build flat list: main cat, then its subs, then next main cat...
  const sortedCats = useMemo(() => {
    const result: Category[] = [];
    mainCats.forEach(main => {
      result.push(main);
      getSubs(main.id).forEach(sub => result.push(sub));
    });
    return result;
  }, [cats, mainCats]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', description: '', parentId: '' });
    setOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description, parentId: c.parentId || '' });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const parentId = form.parentId || null;
    if (editing) {
      setCats(prev => prev.map(c => c.id === editing.id ? {
        ...c, name: form.name, description: form.description, parentId,
        slug: form.name.toLowerCase().replace(/\s+/g, '-')
      } : c));
      toast({ title: 'Categoria atualizada!' });
    } else {
      const newCat: Category = {
        id: `cat-${Date.now()}`, name: form.name,
        slug: form.name.toLowerCase().replace(/\s+/g, '-'),
        description: form.description, icon: 'Tag', parentId,
      };
      setCats(prev => [...prev, newCat]);
      toast({ title: 'Categoria criada!' });
    }
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    // Also delete subcategories
    setCats(prev => prev.filter(c => c.id !== id && c.parentId !== id));
    toast({ title: 'Categoria excluída!' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat' }}>Categorias</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova Categoria</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-28">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCats.map(c => (
                <TableRow key={c.id} className={c.parentId ? 'bg-muted/30' : ''}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {c.parentId && <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground ml-2" />}
                      {c.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.parentId ? 'outline' : 'default'} className="text-xs">
                      {c.parentId ? 'Subcategoria' : 'Principal'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.description}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
            <DialogTitle>{editing ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nome</label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome da categoria" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Descrição</label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrição" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Categoria Pai <span className="text-muted-foreground font-normal">(opcional — deixe vazio para categoria principal)</span></label>
              <Select value={form.parentId} onValueChange={v => setForm(p => ({ ...p, parentId: v === '_none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhuma (Categoria Principal)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhuma (Categoria Principal)</SelectItem>
                  {mainCats.filter(c => c.id !== editing?.id).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
