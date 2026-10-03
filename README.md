# Nextera

## Offchain Heroes wallet support

The bot dashboard accepts Abstract Global Wallet and EOA wallets on Abstract
mainnet (2741). RainbowKit exposes AGW, Rabby and injected browser wallets;
WalletConnect and MetaMask mobile are enabled when `NEXT_PUBLIC_REOWN_PROJECT_ID`
is configured. The integration follows the
[official AGW/RainbowKit setup](https://docs.abs.xyz/abstract-global-wallet/agw-react/integrating-with-rainbowkit).

Copy `.env.example` to `.env.local`, configure the API URL and your public Reown
project ID, then run `pm ci` and `pm dev --port 3001`. Set the same project ID in
the deployment's build environment and allow the app's domain in Reown.
`NEXT_PUBLIC_*` values are embedded at build time. No private key is needed.

Users connect a wallet, sign in to the dashboard, then sign a second message to
link or renew the game's session. Both signatures use the connected account;
EOAs switch to Abstract when necessary. Changed wallets/networks and rejected
requests stop the handshake. AGW's stored connection expiry applies only to AGW.
The bot still runs with its encrypted game cookie, independently of the browser
wallet. Reconnecting another wallet does not change the signed-in bot account;
log out and sign in to change accounts.

Validation: `pm test` runs Vitest/jsdom/React Testing Library wallet regressions;
`pm exec tsc --noEmit`, `pm lint`, and `pm build` check the app. Tests mock wallet
transports and HTTP calls. Before release, check real AGW and EOA sign-in plus
game-session linking/renewal, account changes, reload/reconnect and WalletConnect
mobile handoff with controlled wallets. Automated tests do not prove those live
journeys or the production Reown domain configuration.

The scoped `cuer@0.0.3>qr` override keeps WalletConnect QR rendering compatible:
newer `qr` versions reject the zero-width border used by Cuer
([upstream issue](https://github.com/wevm/cuer/issues/12)). The QR regression test
executes the installed encoder through RainbowKit's dependency resolution.

A modern and elegant NextJS template with advanced theme management, pre-configured UI components, and optimized for rapid professional web application development.

![License](https://img.shields.io/badge/license-MIT-blue)
![Next.js](https://img.shields.io/badge/Next.js-15.3.0-black)
![React](https://img.shields.io/badge/React-19.0.0-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.17-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## 🚀 Features

- **Next.js 15.3** - The latest version with optimized performance and TurboPack
- **React 19** - Enjoy the latest React features
- **TypeScript** - Static typing for more robust code
- **TailwindCSS** - With advanced configuration and animations
- **Theme Management** - Full support for light, dark, and dim themes
- **UI Components** - Based on shadcn/ui for an elegant and consistent interface
- **Sonner** - Stylish and accessible toast notifications
- **ESLint & Prettier** - For clean and consistent code

## 🛠️ Project Structure

```
.
├── public/
├── src/
│   ├── app/
│   │   ├── globals.css           # Global styles with CSS variables for themes
│   │   ├── layout.tsx            # Main application layout
│   │   └── page.tsx              # Home page
│   ├── components/
│   │   ├── theme-provider.tsx    # Provider for theme management
│   │   ├── theme-switcher.tsx    # Theme switching component
│   │   └── ui/                   # Reusable UI components
│   └── lib/
│       └── utils.ts              # Utility functions
├── .eslintrc.json
├── .gitignore
├── next.config.ts
├── package.json
├── README.md
├── tailwind.config.ts
└── tsconfig.json
```

## 🌗 Themes

This template includes advanced theme management with:

- **Light** - Default light theme
- **Dark** - Dark theme
- **Dim** - Softened dark theme
- **System** - Adapts to system preferences

Themes are fully customizable via CSS variables in `globals.css`.

## 🚀 Quick Start

1. Clone this repo

```bash
git clone https://github.com/your-username/nextera.git my-project
cd my-project
```

2. Install dependencies

```bash
npm install
# or
yarn
# or
pnpm install
```

3. Start the development server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser

## 📦 Available Scripts

- `dev` - Starts the development server with TurboPack
- `build` - Builds the application for production
- `start` - Runs the application in production mode
- `lint` - Checks the code with ESLint
- `format` - Formats the code with Prettier

## 🧩 UI Components

This template uses [shadcn/ui](https://ui.shadcn.com/) components for an elegant and consistent user interface. You can easily add more components using the shadcn CLI:

```bash
npx shadcn-ui@latest add [component]
```

## 📱 Responsive Design

All components are optimized for responsive design thanks to TailwindCSS.

## 🛡️ TypeScript

The project is fully configured with TypeScript for static typing and a better development experience.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/)
- [TailwindCSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Lucide Icons](https://lucide.dev/)
- [next-themes](https://github.com/pacocoursey/next-themes)
- [Sonner](https://sonner.emilkowal.ski/)
