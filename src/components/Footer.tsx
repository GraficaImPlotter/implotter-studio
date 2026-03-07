import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo_2025.png" alt="ImPlotter" className="h-8" />
              <span className="font-bold text-lg" style={{ fontFamily: 'Montserrat' }}>ImPlotter</span>
            </div>
            <p className="text-sm text-muted-foreground">Soluções completas em impressão gráfica com qualidade e agilidade.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3" style={{ fontFamily: 'Montserrat' }}>Navegação</h4>
            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
              <Link to="/servicos" className="hover:text-foreground transition-colors">Serviços</Link>
              <Link to="/contato" className="hover:text-foreground transition-colors">Contato</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3" style={{ fontFamily: 'Montserrat' }}>Conta</h4>
            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <Link to="/login" className="hover:text-foreground transition-colors">Login</Link>
              <Link to="/cadastro" className="hover:text-foreground transition-colors">Cadastro</Link>
            </div>
          </div>
        </div>
        <div className="border-t mt-6 pt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Gráfica ImPlotter. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
