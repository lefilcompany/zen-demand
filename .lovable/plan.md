

## Ativação de SEO — Plano atualizado

Domínio principal: **`https://pla.soma.lefil.com.br`**

### 1. `index.html` — Meta tags e JSON-LD
- Adicionar `<link rel="canonical" href="https://pla.soma.lefil.com.br" />`
- Atualizar `og:url` para `https://pla.soma.lefil.com.br`
- Adicionar `og:site_name` como "SoMA"
- Melhorar `description` com palavras-chave: gestão de demandas, kanban, equipes, produtividade, marketing
- Adicionar meta `keywords`
- Inserir bloco `<script type="application/ld+json">` com schema `SoftwareApplication`

### 2. `public/sitemap.xml` (novo)
- Listar páginas públicas (`/`, `/auth`, `/get-started`, `/privacy-policy`, `/terms-of-service`) com base em `https://pla.soma.lefil.com.br`

### 3. `public/robots.txt`
- Adicionar `Sitemap: https://pla.soma.lefil.com.br/sitemap.xml`
- Bloquear rotas protegidas: `/demands`, `/kanban`, `/boards`, `/settings`, `/profile`, `/teams`, `/notes`, `/reports`, `/admin`

### 4. Componente `SEOHead` + `react-helmet-async`
- Instalar `react-helmet-async`
- Criar `src/components/SEOHead.tsx` — componente reutilizável que injeta `<title>`, `<meta description>`, `<link canonical>` dinamicamente
- Wrap do App com `HelmetProvider` em `src/App.tsx`
- Aplicar `SEOHead` nas páginas públicas: `Auth`, `GetStarted`, `Welcome`, `Pricing`, `PrivacyPolicy`, `TermsOfService`

### Arquivos
| Ação | Arquivo |
|------|---------|
| Criar | `public/sitemap.xml` |
| Criar | `src/components/SEOHead.tsx` |
| Editar | `index.html` |
| Editar | `public/robots.txt` |
| Editar | `src/App.tsx` |
| Editar | Páginas públicas (Auth, Welcome, GetStarted, Pricing, PrivacyPolicy, TermsOfService) |
| Instalar | `react-helmet-async` |

