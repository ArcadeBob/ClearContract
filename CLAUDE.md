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
- No router library — navigation is view-based via `ViewState` string identifiers

## Architecture

**State management:** Single `useContractStore` hook (`src/hooks/useContractStore.ts`) using React `useState`. Manages contracts array, active contract/view, and upload state. No Redux or Context API.

**Routing:** View-based via `ViewState` type (`'dashboard' | 'upload' | 'review' | 'contracts' | 'settings'`). `App.tsx` renders `Sidebar` + the active page component based on current view state.

**Type system:** Core domain types in `src/types/contract.ts` — `Contract`, `Finding`, `ContractDate`, `Severity`, `Category`, `ViewState`. Contract types: Prime Contract, Subcontract, Purchase Order, Change Order. Nine finding categories (Legal Issues, Scope of Work, Contract Compliance, etc.).

## Source Layout

```
src/
├── App.tsx              # Root component, view routing, upload handling
├── index.tsx            # Entry point
├── index.css            # Tailwind imports, Inter font, custom utilities
├── types/contract.ts    # All domain type definitions
├── hooks/useContractStore.ts  # Central app state hook
├── data/mockContracts.ts      # Sample contract data
├── components/          # Reusable UI (SeverityBadge, FindingCard, Sidebar, etc.)
└── pages/               # Page components (Dashboard, ContractReview, ContractUpload, AllContracts, Settings)
```

## Conventions

- Functional components only, hooks-based state
- Tailwind utility classes for all styling (plus a `.glass-panel` custom class)
- Color-coded severity: red=Critical, amber=High, yellow=Medium, green=Low
- Inter font family throughout
