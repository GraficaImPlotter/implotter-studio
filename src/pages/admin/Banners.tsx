import { useState } from 'react';
import type { BannerSlide } from '@/components/HeroCarousel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import { banners as initialBanners } from '@/data/mockData';

export default function AdminBanners() {
  const [list, setList] = useState<BannerSlide[]>([...initialBanners]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BannerSlide | null>(null);
  const [form, setForm] = useState({ image: '', title: '', subtitle: '', buttonText: '', buttonLink: '', active: true });
  const { toast } = useToast();

  const openNew = () => {
    setEditing(null);
    setForm({ image: '', title: '', subtitle: '', buttonText: 'Saiba Mais', buttonLink: '/servicos', active: true });
    setOpen(true);
  };

  const openEdit = (b: BannerSlide) => {
    setEditing(b);
    setForm({ image: b.image, title: b.title, subtitle: b.subtitle, buttonText: b.buttonText, buttonLink: b.buttonLink, active: b.active });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editing) {
      setList(prev => prev.map(b => b.id === editing.id ? { ...b, ...form } : b));
      toast({ title: 'Banner atualizado!' });
    } else {
      setList(prev => [...prev, { id: `banner-${Date.now()}`, ...form }]);
      toast({ title: 'Banner criado!' });
    }
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    setList(prev => prev.filter(b => b.id !== id));
    toast({ title: 'Banner excluído!' });
  };

  const toggleActive = (id: string) => {
    setList(prev => prev.map(b => b.id === id ? { ...b, active: !b.active } : b));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat' }}>Banners da Home</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Banner</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Imagem</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Subtítulo</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="w-20">Ativo</TableHead>
                <TableHead className="w-28">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map(b => (
                <TableRow key={b.id}>
                  <TableCell>
                    {b.image ? (
                      <img src={b.image} alt={b.title} className="w-14 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-14 h-10 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{b.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{b.subtitle}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.buttonLink}</TableCell>
                  <TableCell>
                    <Switch checked={b.active} onCheckedChange={() => toggleActive(b.id)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum banner cadastrado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Banner' : 'Novo Banner'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">URL da Imagem</label>
              <Input value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} placeholder="https://images.unsplash.com/..." />
              {form.image && <img src={form.image} alt="Preview" className="mt-2 h-28 w-full object-cover rounded" />}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Título</label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Título do banner" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Subtítulo</label>
              <Textarea value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} rows={2} placeholder="Texto de apoio" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Texto do Botão</label>
                <Input value={form.buttonText} onChange={e => setForm(p => ({ ...p, buttonText: e.target.value }))} placeholder="Saiba Mais" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Link de Destino</label>
                <Input value={form.buttonLink} onChange={e => setForm(p => ({ ...p, buttonLink: e.target.value }))} placeholder="/servicos?cat=cat-1" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={v => setForm(p => ({ ...p, active: v }))} />
              <label className="text-sm font-medium">Banner ativo</label>
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
