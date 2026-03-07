import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { categories, products, formatPrice, getCategoryById, getMainCategories, getSubcategories, getProductsByCategoryTree, getCategoryFullName } from '@/data/mockData';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Servicos() {
  const [params, setParams] = useSearchParams();
  const activeCat = params.get('cat') || '';
  const [search, setSearch] = useState('');

  const mainCategories = getMainCategories();

  // Determine which accordion items should be open
  const activeMainCat = useMemo(() => {
    if (!activeCat) return '';
    const cat = getCategoryById(activeCat);
    if (!cat) return '';
    // If it's a main category, return itself
    if (cat.parentId === null) return cat.id;
    // If subcategory, return its parent
    return cat.parentId;
  }, [activeCat]);

  const filtered = useMemo(() => {
    let list = products;
    if (activeCat) {
      list = getProductsByCategoryTree(activeCat);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    return list;
  }, [activeCat, search]);

  const selectCat = (id: string) => {
    if (id === activeCat) { params.delete('cat'); setParams(params); }
    else { params.set('cat', id); setParams(params); }
  };

  const activeCategory = activeCat ? getCategoryById(activeCat) : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Montserrat' }}>Nossos Serviços</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar with Accordion */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="sticky top-28">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Categorias</h3>
            <Accordion
              type="multiple"
              defaultValue={activeMainCat ? [activeMainCat] : []}
              className="space-y-1"
            >
              {mainCategories.map(main => {
                const subs = getSubcategories(main.id);
                return (
                  <AccordionItem key={main.id} value={main.id} className="border-none">
                    <div className="flex items-center">
                      <button
                        onClick={() => selectCat(main.id)}
                        className={cn(
                          'flex-1 text-left px-3 py-2 rounded-l-md text-sm font-medium transition-colors',
                          activeCat === main.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                        )}
                      >
                        {main.name}
                      </button>
                      {subs.length > 0 && (
                        <AccordionTrigger className={cn(
                          'px-2 py-2 rounded-r-md hover:bg-muted [&[data-state=open]>svg]:rotate-180 transition-colors',
                          activeCat === main.id ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''
                        )} />
                      )}
                    </div>
                    {subs.length > 0 && (
                      <AccordionContent className="pb-1 pt-1">
                        <div className="ml-3 border-l-2 border-border pl-2 space-y-0.5">
                          {subs.map(sub => (
                            <button
                              key={sub.id}
                              onClick={() => selectCat(sub.id)}
                              className={cn(
                                'w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors',
                                activeCat === sub.id ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              )}
                            >
                              {sub.name}
                            </button>
                          ))}
                        </div>
                      </AccordionContent>
                    )}
                  </AccordionItem>
                );
              })}
            </Accordion>
            {activeCat && (
              <Button variant="ghost" size="sm" className="w-full mt-3 text-xs" onClick={() => { params.delete('cat'); setParams(params); }}>
                <X className="h-3 w-3 mr-1" /> Limpar filtro
              </Button>
            )}
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar serviços..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>

          {activeCategory && (
            <p className="text-muted-foreground mb-4 text-sm">{activeCategory.description}</p>
          )}

          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">Nenhum serviço encontrado.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(prod => (
                <Link key={prod.id} to={`/servicos/${prod.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow group h-full">
                    <div className="aspect-[4/3] overflow-hidden">
                      <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">{getCategoryFullName(prod.categoryId)}</p>
                      <h4 className="font-semibold mb-1 line-clamp-1">{prod.name}</h4>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{prod.description}</p>
                      <p className="text-lg font-bold text-primary">A partir de {formatPrice(prod.price)}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
