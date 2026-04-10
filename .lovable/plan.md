

## Plano: Visibilidade dos Kits para Clientes

### O que será feito

1. **Nova seção "Kits em Destaque" na Homepage**
   - Criar `src/components/home/KitsSection.tsx`
   - Buscar kits ativos e em destaque da tabela `kits`
   - Cards com imagem, nome, preço original riscado, preço promo e badge de desconto (%)
   - Botão "Ver todos os kits" linkando para `/loja#kits`
   - Inserir entre `CategoriesSection` e `HowItWorksSection` em `Index.tsx`

2. **Link "Kits" no menu de navegação**
   - Adicionar item "Kits" no array `navLinks` do `Header.tsx` apontando para `/loja#kits`
   - Aparece tanto no desktop quanto no mobile

3. **Âncora na página da Loja**
   - Adicionar `id="kits"` na seção de kits promocionais em `Loja.tsx` para scroll direto

### Arquivos alterados
- `src/components/home/KitsSection.tsx` — novo
- `src/pages/Index.tsx` — importar e renderizar KitsSection
- `src/components/layout/Header.tsx` — adicionar link "Kits"
- `src/pages/Loja.tsx` — adicionar âncora id="kits"

