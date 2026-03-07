import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { products, formatPrice, banners, getMainCategories } from '@/data/mockData';
import { ArrowRight, Printer, Zap, Shield } from 'lucide-react';
import HeroCarousel from '@/components/HeroCarousel';

const highlights = products.slice(0, 4);

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Carousel */}
      <HeroCarousel banners={banners} />

      {/* Sobre */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Montserrat' }}>Sobre a Gráfica ImPlotter</h2>
          <p className="text-muted-foreground">
            Com anos de experiência no mercado gráfico, a ImPlotter é referência em qualidade de impressão. Utilizamos equipamentos de última geração e materiais premium para garantir que cada projeto supere suas expectativas.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Printer, title: 'Qualidade Superior', desc: 'Impressão digital e offset com resolução máxima e cores fiéis ao seu projeto.' },
            { icon: Zap, title: 'Agilidade', desc: 'Prazos competitivos sem comprometer a qualidade. Produção expressa disponível.' },
            { icon: Shield, title: 'Confiança', desc: 'Milhares de clientes satisfeitos. Garantia de qualidade em todos os materiais.' },
          ].map((item, i) => (
            <Card key={i} className="text-center border-none shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2" style={{ fontFamily: 'Montserrat' }}>{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Categorias */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8" style={{ fontFamily: 'Montserrat' }}>Nossas Categorias</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {getMainCategories().map(cat => (
              <Link key={cat.id} to={`/servicos?cat=${cat.id}`}>
                <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                  <CardContent className="p-4 text-center">
                    <h4 className="font-medium text-sm">{cat.name}</h4>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Destaques */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-8" style={{ fontFamily: 'Montserrat' }}>PRODUTOS EM DESTAQUE</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map(prod => (
            <Link key={prod.id} to={`/servicos/${prod.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow group h-full">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-1 line-clamp-1">{prod.name}</h4>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{prod.description}</p>
                  <p className="text-lg font-bold text-primary">A partir de {formatPrice(prod.price)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8">
          <Button size="lg" asChild>
            <Link to="/servicos">Ver Todos os Produtos <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
