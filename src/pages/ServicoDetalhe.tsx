import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProductById, getCategoryById, formatPrice } from '@/data/mockData';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ShoppingCart } from 'lucide-react';

export default function ServicoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const product = getProductById(id || '');
  const category = product ? getCategoryById(product.categoryId) : null;
  const { addItem } = useCart();
  const { toast } = useToast();
  const [selections, setSelections] = useState<Record<string, string>>({});

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">Serviço não encontrado.</p>
        <Button asChild><Link to="/servicos">Voltar aos Serviços</Link></Button>
      </div>
    );
  }

  const allSelected = product.variations.every(v => selections[v.label]);

  const handleAdd = () => {
    addItem({
      productId: product.id,
      productName: product.name,
      image: product.image,
      price: product.price,
      quantity: 1,
      variations: selections,
    });
    toast({ title: 'Adicionado ao carrinho!', description: product.name });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/servicos" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar aos Serviços
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="rounded-lg overflow-hidden">
          <img src={product.image} alt={product.name} className="w-full h-auto object-cover" />
        </div>

        <div>
          {category && <Badge variant="secondary" className="mb-2">{category.name}</Badge>}
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Montserrat' }}>{product.name}</h1>
          <p className="text-2xl font-bold text-primary mb-4">A partir de {formatPrice(product.price)}</p>
          <p className="text-muted-foreground mb-6">{product.longDescription}</p>

          <Card className="mb-6">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold" style={{ fontFamily: 'Montserrat' }}>Personalize seu pedido</h3>
              {product.variations.map(v => (
                <div key={v.label}>
                  <label className="text-sm font-medium mb-1 block">{v.label}</label>
                  <Select value={selections[v.label] || ''} onValueChange={val => setSelections(prev => ({ ...prev, [v.label]: val }))}>
                    <SelectTrigger><SelectValue placeholder={`Selecione ${v.label.toLowerCase()}`} /></SelectTrigger>
                    <SelectContent>
                      {v.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          <Button size="lg" className="w-full" onClick={handleAdd} disabled={!allSelected}>
            <ShoppingCart className="h-5 w-5 mr-2" />
            {allSelected ? 'Adicionar ao Carrinho' : 'Selecione todas as opções'}
          </Button>
        </div>
      </div>
    </div>
  );
}
