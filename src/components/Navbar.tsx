import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Menu, ShoppingCart, LogOut, User, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const { user, role, logout, setDemoRole } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const NavLinks = () => (
    <>
      <Link to="/" onClick={close} className="hover:text-accent transition-colors font-medium">Home</Link>
      <Link to="/servicos" onClick={close} className="hover:text-accent transition-colors font-medium">Serviços</Link>
      {role === 'visitor' && (
        <Link to="/contato" onClick={close} className="hover:text-accent transition-colors font-medium">Contato</Link>
      )}
      {role === 'client' && (
        <Link to="/painel/pedidos" onClick={close} className="hover:text-accent transition-colors font-medium">Meus Pedidos</Link>
      )}
      {role === 'admin' && (
        <Link to="/admin" onClick={close} className="hover:text-accent transition-colors font-medium flex items-center gap-1">
          <LayoutDashboard className="h-4 w-4" /> Painel Admin
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      {/* Demo role switcher */}
      <div className="bg-primary text-primary-foreground text-xs text-center py-1 flex items-center justify-center gap-3">
        <span className="opacity-80">Demo:</span>
        {(['visitor', 'client', 'admin'] as UserRole[]).map(r => (
          <button key={r} onClick={() => setDemoRole(r)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${role === r ? 'bg-accent text-accent-foreground' : 'hover:bg-primary-foreground/20'}`}>
            {r === 'visitor' ? 'Visitante' : r === 'client' ? 'Cliente' : 'Admin'}
          </button>
        ))}
      </div>

      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo_2025.png" alt="Gráfica ImPlotter" className="h-10" />
          <span className="font-bold text-lg hidden sm:inline" style={{ fontFamily: 'Montserrat, sans-serif' }}>ImPlotter</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/servicos" className="relative">
            <ShoppingCart className="h-5 w-5 text-foreground" />
            {itemCount > 0 && (
              <Badge className="absolute -top-2 -right-3 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-accent text-accent-foreground">{itemCount}</Badge>
            )}
          </Link>

          {role === 'visitor' ? (
            <Button size="sm" className="hidden md:inline-flex" onClick={() => navigate('/login')}>
              <User className="h-4 w-4 mr-1" /> Entrar
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={logout}>
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          )}

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <nav className="flex flex-col gap-4 mt-8">
                <NavLinks />
                {role === 'visitor' ? (
                  <Button onClick={() => { close(); navigate('/login'); }}>Entrar</Button>
                ) : (
                  <Button variant="ghost" onClick={() => { close(); logout(); }}>
                    <LogOut className="h-4 w-4 mr-1" /> Sair
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
