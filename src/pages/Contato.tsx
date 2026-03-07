import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';

export default function Contato() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: 'Mensagem enviada!', description: 'Entraremos em contato em breve.' });
    setForm({ name: '', email: '', message: '' });
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-lg">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl" style={{ fontFamily: 'Montserrat' }}>Entre em Contato</CardTitle>
          <p className="text-sm text-muted-foreground">Envie sua mensagem e retornaremos o mais breve possível.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nome</label>
              <Input placeholder="Seu nome completo" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">E-mail</label>
              <Input type="email" placeholder="seu@email.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Mensagem</label>
              <Textarea placeholder="Escreva sua mensagem..." rows={5} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} required />
            </div>
            <Button type="submit" className="w-full">
              <Send className="h-4 w-4 mr-2" /> Enviar Mensagem
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
