

## Plan: Privacy Policy & Terms of Service Pages

### What will be built

1. **Two new public pages**:
   - `/privacy-policy` — Política de Privacidade
   - `/terms-of-service` — Termos de Serviço

   Content will be tailored to **SoMA+**, a demand/task management platform for teams, covering: data collected (name, email, phone, location, profile photo), authentication (email + Google OAuth), data storage, cookies, user rights (LGPD compliance), and service usage rules.

2. **Links on the Auth page**: Add a footer below the login/signup form with links to both pages (e.g., "Ao continuar, você concorda com nossa Política de Privacidade e Termos de Serviço").

3. **Route registration**: Add both routes as public routes in `App.tsx`.

### Files to create
- `src/pages/PrivacyPolicy.tsx` — Full privacy policy page with SoMA branding, scroll layout, back-to-login link
- `src/pages/TermsOfService.tsx` — Full terms of service page, same layout pattern

### Files to edit
- `src/App.tsx` — Add two public routes (`/privacy-policy`, `/terms-of-service`)
- `src/pages/Auth.tsx` — Add footer links below the form area (after the Dialog, before closing divs around line 740)

### Content highlights
- **Privacy Policy**: Data collected (personal info, location via IBGE, Google profile data), purpose, storage (Lovable Cloud), sharing policy, cookies, LGPD rights (access, correction, deletion), contact info
- **Terms of Service**: Eligibility, account responsibilities, acceptable use, intellectual property, service availability, limitation of liability, termination, governing law (Brazil)

Both pages will use the app's existing styling (dark/light theme support) with a clean reading layout and a header with the SoMA logo.

