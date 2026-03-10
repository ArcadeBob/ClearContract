# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClearContract is a **Glazing Contract Review AI** web application for Clean Glass Installation Inc. It provides AI-powered contract analysis, risk scoring, finding categorization, and date/milestone tracking for construction/glazing industry contracts.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server
npm run build        # Production build (vite build)
npm run lint         # ESLint: eslint . --ext .js,.jsx,.ts,.tsx
npm run preview      # Preview production build
```

No test framework is configured.

## Tech Stack

- **React 18** with TypeScript (strict mode), Vite, ES modules
- **Tailwind CSS** for styling, **Framer Motion** for animations
- **Lucide React** for icons, **React Dropzone** for file uploads
- **Anthropic SDK** (`@anthropic-ai/sdk`) for Claude API integration
- **unpdf** for server-side PDF text extraction
- Deployed on **Vercel** with serverless functions (`@vercel/node`)
- No router library — navigation is view-based via `ViewState` string identifiers

## Architecture

**State management:** Single `useContractStore` hook (`src/hooks/useContractStore.ts`) using React `useState`. Manages contracts array, active contract/view, and upload state. No Redux or Context API. State is in-memory only — no persistence layer, data resets on refresh.

**Routing:** View-based via `ViewState` type (`'dashboard' | 'upload' | 'review' | 'contracts' | 'settings'`). `App.tsx` renders `Sidebar` + the active page component based on current view state. Navigation via `navigateTo(view, contractId?)`.

**Type system:** Core domain types in `src/types/contract.ts` — `Contract`, `Finding`, `ContractDate`, `Severity`, `Category`, `ViewState`. Contract types: Prime Contract, Subcontract, Purchase Order, Change Order. Nine finding categories (Legal Issues, Scope of Work, Contract Compliance, etc.).

### AI Analysis Pipeline

The contract analysis flow spans client and server:

1. User uploads PDF via `UploadZone` (react-dropzone, 3MB max, PDF only)
2. `App.tsx` creates a placeholder contract in "Analyzing" state and navigates to review page immediately
3. `src/api/analyzeContract.ts` converts the PDF to base64 via `FileReader` and POSTs to `/api/analyze`
4. `api/analyze.ts` (Vercel serverless function, 60s timeout) decodes PDF, extracts text with `pdf-parse`, truncates to 100k chars, and sends to Claude (`claude-sonnet-4-20250514`, 4096 max tokens)
5. Claude returns structured JSON: client name, contract type, risk score (0-100), findings array, dates array
6. On success, the placeholder contract is updated with real data via `updateContract()`; on failure, the error appears as a Critical finding

The system prompt instructs Claude to analyze from a glazing/glass installation subcontractor perspective, flagging indemnification clauses, pay-if-paid, liquidated damages, retainage, insurance requirements, and scope ambiguities.

### Environment Variables

- `ANTHROPIC_API_KEY` — required, stored in `.env.local` (git-ignored) and in Vercel project settings

## Source Layout

```
api/
└── analyze.ts               # Vercel serverless function (PDF parse + Claude API)
src/
├── App.tsx                   # Root component, view routing, upload handling
├── index.tsx                 # Entry point
├── index.css                 # Tailwind imports, Inter font, custom utilities (.glass-panel)
├── types/contract.ts         # All domain type definitions
├── hooks/useContractStore.ts # Central app state hook
├── api/analyzeContract.ts    # Client-side API wrapper (base64 encode + fetch)
├── data/mockContracts.ts     # Sample contract data (3 contracts at varying risk levels)
├── components/               # Reusable UI (SeverityBadge, FindingCard, Sidebar, UploadZone, etc.)
└── pages/                    # Page components (Dashboard, ContractReview, ContractUpload, AllContracts, Settings)
```

## Conventions

- Functional components only, hooks-based state
- Tailwind utility classes for all styling (plus a `.glass-panel` custom class)
- Color-coded severity: red=Critical, amber=High, yellow=Medium, blue=Low, slate=Info
- Framer Motion for staggered entry animations (`index * 0.05` delay pattern) and `AnimatePresence` for filtered lists
- Inter font family throughout

## Deployment

- Hosted on Vercel; `vercel.json` sets `api/analyze.ts` max duration to 60 seconds
- The `/api/analyze` endpoint handles CORS, validates input, and returns specific HTTP errors (400, 401, 405, 422 for image-based PDFs, 429 for rate limits)
