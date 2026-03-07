import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogIn } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) {
      toast({ title: 'Login realizado!' });
      navigate('/');
    } else {
      toast({ title: 'Erro no login', description: 'E-mail ou senha inválidos.', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <img src="/logo_2025.png" alt="ImPlotter" className="h-12 mx-auto mb-2" />
          <CardTitle style={{ fontFamily: 'Montserrat' }}>Entrar</CardTitle>
          <CardDescription>Acesse sua conta na Gráfica ImPlotter</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">E-mail</label>
              <Input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Senha</label>
              <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <LogIn className="h-4 w-4 mr-2" /> {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p className="mb-2">Demo: <code className="text-xs bg-muted px-1 rounded">admin@implotter.com</code> / <code className="text-xs bg-muted px-1 rounded">admin123</code></p>
            <p>Demo: <code className="text-xs bg-muted px-1 rounded">cliente@email.com</code> / <code className="text-xs bg-muted px-1 rounded">cliente123</code></p>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Não tem conta? <Link to="/cadastro" className="text-primary hover:underline font-medium">Cadastre-se</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
