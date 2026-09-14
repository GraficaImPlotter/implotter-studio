# VULNERABILIDADES RESTANTES - REQUEREM BREAKING CHANGES

## Status: 8 vulnerabilidades (2 low, 5 moderate, 1 high)
**Progresso:** 88% resolvido (de 66 para 8)

---

## VULNERABILIDADES PENDENTES

### 1. react-router-dom (MODERATE - 2 issues)
**Versão atual:** 6.30.1
**Versão segura:** 7.18.3+
**Riscos:**
- Open redirect via backslash em <Link>
- Arbitrary Constructor Injection

**Impacto do upgrade:**
- Breaking changes na API de rotas
- Necessário ajustar todos os componentes que usam rotas

**Ação recomendada:**
```bash
npm install react-router-dom@latest
# Testar rotas: /, /loja, /admin/*, /checkout, /pagamento
```

---

### 2. vite + esbuild (MODERATE)
**Versão atual:** vite 5.4.19, esbuild 0.21.5
**Versão segura:** vite 8.3.0+
**Risco:**
- Servidor de desenvolvimento pode ser explorado para enviar requests

**Impacto do upgrade:**
- Breaking changes na configuração do Vite
- Pode afetar plugins (vite-plugin-pwa)

**Ação recomendada:**
```bash
npm install vite@latest @vitejs/plugin-react-swc@latest
# Testar build: npm run build
# Testar dev: npm run dev
```

---

### 3. quill / react-quill-new (LOW - XSS)
**Versão atual:** quill 2.0.3
**Risco:**
- XSS via HTML export (afeta apenas RichTextEditor no admin)

**Mitigação atual:**
- Já usamos DOMPurify para sanitizar HTML
- Risco baixo pois só admin tem acesso

**Ação recomendada:**
```bash
npm install react-quill-new@latest
# Testar AdminBlog, AdminProdutos (descrição completa)
```

---

### 4. vitest (MODERATE - Path Traversal)
**Versão atual:** 3.2.4
**Versão segura:** 5.0.0+
**Risco:**
- Path traversal em testes (ambiente dev apenas)

**Impacto do upgrade:**
- API de testes pode mudar

**Ação recomendada:**
```bash
npm install vitest@latest @vitest/ui@latest
# Rodar testes: npm test
```

---

## PRIORIDADE DE CORREÇÃO

### ALTA PRIORIDADE (1-2 dias):
1. ✅ **react-router-dom** - afeta segurança de produção
2. ✅ **vite/esbuild** - afeta servidor de dev

### MÉDIA PRIORIDADE (1 semana):
3. **vitest** - afeta apenas testes

### BAIXA PRIORIDADE (quando possível):
4. **quill** - já mitigado com DOMPurify

---

## COMANDO PARA APLICAR TODOS (COM RISCOS):

```bash
# ATENÇÃO: Pode quebrar funcionalidades!
npm audit fix --force

# Depois de aplicar, TESTAR:
1. Navegação entre páginas
2. Build de produção (npm run build)
3. Testes (npm test)
4. Editor de texto no admin
5. Rotas protegidas (/admin/*)
```

---

## ALTERNATIVA SEGURA (SEM BREAKING CHANGES):

Manter as 8 vulnerabilidades atuais e implementar mitigações:

1. **react-router:** Não usar <Link> com dados de usuário não validados
2. **vite/esbuild:** Usar apenas em desenvolvimento, não expor servidor dev
3. **quill:** Continuar usando DOMPurify (já implementado)
4. **vitest:** Isolar testes em ambiente separado

**Recomendação:** Aplicar updates em ambiente de staging primeiro.
