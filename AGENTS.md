# Guide Agents Frontend

Ce dépôt contient le frontend Next.js (App Router) de la console Offchain Heroes. Ce guide résume l’organisation, les commandes utiles et les bonnes pratiques pour assurer une collaboration fluide entre agents.

---

## Structure & conventions

- `src/app/` : routes App Router.
  - `layout.tsx` : providers globaux (`ThemeProvider`, `AbstractProvider`, `QueryProvider`).
  - `page.tsx` : console principale (auth + dashboard).
- `src/components/` : composants réutilisables.
  - `dashboard/` : widgets spécifiques (BotDashboard, etc.).
  - `providers/` : wrappers (Abstract, React Query, Theme).
  - `ui/` : primitives Shadcn générées via `pnpm dlx shadcn add ...`.
- `src/hooks/` : hooks client (ex. `use-auth-tokens`).
- `src/lib/` : helpers partagés (`api.ts`, `utils.ts`).

### Conventions shadcn / Tailwind

- Utiliser `pnpm dlx shadcn@latest add <component>` pour ajouter des primitives.
- Pas de CSS custom tant que Tailwind/Shadcn couvre le besoin.
- Privilégier les composants headless Shadcn pour la cohérence UX.

### Principes de design

- Remplacer les emojis par des icônes cohérentes (Lucide/Shadcn) pour conserver une esthétique premium.
- Gestion des espacements : chaque section doit respirer sans gaspiller l’espace ; ajuster padding/marges pour un alignement précis.
- Style général : objectif « spa suisse » — sobre, minimaliste, haut de gamme ; quelque chose qu’un pro paierait des milliers $/mois et qui ferait sourire Steve Jobs.
- Palette restreinte : s’en tenir à un jeu de couleurs cohérent (base Zinc shadcn) et n’introduire une couleur que si elle a une raison fonctionnelle claire.
- Responsive by default : chaque composant doit rester élégant sur desktop **et** mobile, sans rupture visuelle.

### API & React Query

- `src/lib/api.ts` centralise les appels REST (`/auth`, `/bot`, `/user`).
- Toujours consommer l’API via React Query (providers déjà câblés).
- Le hook `useAuthTokens` synchronise localStorage et déclencheur d’événements.

### Gestion d’état

- Pas d’état global type Redux. React Query + hooks suffisent.
- Les toasts passent par `sonner`.

---

## Commandes utiles

```bash
pnpm install        # dépendances
pnpm dev            # serveur Next en dev (localhost:3000)
pnpm lint           # ESLint (via next lint)
pnpm build && pnpm start  # build / production
```

- Préférer `pnpm` (monorepo aligné sur backend).
- Lancer `pnpm lint` avant de proposer une MR.

---

## Bonnes pratiques

1. **Pages légères** : placer la logique dans des composants dédiés/garder `app/page.tsx` minimal.
2. **Séparation UI / data** : hook(s) pour la data, composants pour le rendu.
3. **Typing strict** : importer les types depuis `src/lib/api.ts`. Aucun `any`.
4. **Accessibilité** : utiliser les compos Shadcn accessibles ; boutons `Button`, formulaires `Label/Input`, etc.
5. **Gestion des tokens** : utiliser `saveTokens`, `clearTokens`, `useAuthTokens`. Ne jamais stocker les JWT ailleurs.
6. **Formatting** : Tailwind Utility-first, classes `clsx`/`cn` du `lib/utils.ts` (shadcn standard).
7. **Tests** : pas de setup Jest pour l’instant. Prévoir d’introduire Testing Library/Vitest si besoin (documenter).
8. **Docs** : mettre à jour `README.md` et ce fichier sur tout changement majeur de flow.

---

## Checklist avant commit

- Lint (`pnpm lint`).
- Code cohérent avec les conventions shadcn.
- Types valides ; pas de warnings TypeScript.
- Endpoints consommés via `api.ts` uniquement.
- Documenter les nouveaux composants/flows si nécessaire.

---

## Ajouter des composants Shadcn

```bash
pnpm dlx shadcn@latest add <component>
```

Cela mettra à jour `components.json` et créera/actualisera les fichiers `src/components/ui/…`. Vérifier ensuite Tailwind et `globals.css`.

---

## Points de contact

- Backend : se référer au `docs/frontend-api-guide.md` côté backend pour les endpoints.
- Auth : wallets Abstract (provider déjà configuré).
- Scheduling : données issues de `/bot/config`, `/bot/state`, `/bot/logs`.

Ce guide doit rester court mais maintenu à jour. Ajouter toute règle qui faciliterait la vie du prochain agent.
