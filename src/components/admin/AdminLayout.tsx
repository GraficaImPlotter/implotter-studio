import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Tags, Package, ClipboardList, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/banners', label: 'Banners', icon: ImageIcon },
  { to: '/admin/categorias', label: 'Categorias', icon: Tags },
  { to: '/admin/produtos', label: 'Produtos', icon: Package },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList },
];

export default function AdminLayout() {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-[calc(100vh-8rem)]">
      <aside className="w-56 shrink-0 border-r bg-sidebar text-sidebar-foreground hidden md:block">
        <div className="p-4 border-b border-sidebar-border">
          <h2 className="font-bold text-sm uppercase tracking-wider text-sidebar-foreground/70">Painel Admin</h2>
        </div>
        <nav className="p-2 space-y-1">
          {links.map(l => {
            const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
            return (
              <Link key={l.to} to={l.to}
                className={cn('flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/50')}>
                <l.icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t flex">
        {links.map(l => {
          const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
          return (
            <Link key={l.to} to={l.to} className={cn('flex-1 flex flex-col items-center py-2 text-xs',
              active ? 'text-primary' : 'text-muted-foreground')}>
              <l.icon className="h-5 w-5" />
              {l.label}
            </Link>
          );
        })}
      </div>

      <main className="flex-1 p-6 pb-20 md:pb-6">
        <Outlet />
      </main>
    </div>
  );
}
