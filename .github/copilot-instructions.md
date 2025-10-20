# Delaware Fence Pro - AI Coding Instructions

## Project Overview
This is a Next.js business management app for a fence supply company with Firebase backend, AI-powered features, and comprehensive CRM/inventory functionality.

## Architecture & Key Patterns

### Framework Structure
- **Next.js App Router** with server components in `src/app/` 
- **Route groups**: Main app routes in `src/app/(app)/` requiring authentication
- **Colocation**: Components alongside their route folders (e.g., `components/products/` mirrors `src/app/(app)/products/`)
- **Dual components**: Root-level `components/` for shared UI, route-specific components in app directories

### Data Layer & State
- **Firebase Firestore** as primary database via `src/lib/firebase.ts`
- **TanStack Query** for server state management with `@tanstack-query-firebase/react`
- **React Hook Form + Zod** for all form validation (see `src/types/index.ts` for schemas)
- **Auth Context**: `src/contexts/auth-context.tsx` provides user state and role-based permissions

### Component Conventions
- **Dialog Pattern**: All CRUD operations use `{Entity}Dialog` + `{Entity}Form` pattern (e.g., `ProductDialog`, `ProductForm`)
- **Table Pattern**: Lists use `{Entity}Table` with embedded actions and filters
- **Bulk Operations**: Mass updates via `Bulk{Action}Dialog` components
- **Printable Components**: PDF generation uses `Printable{Entity}` components with custom styling

### AI Integration (Genkit)
- **Configuration**: `src/ai/genkit.ts` exports configured AI instance with Google Gemini 2.5 Pro
- **Flows**: Email generation in `src/ai/flows/` for estimates, orders, invoices
- **Development**: Use `npm run genkit:dev` for AI flow development and debugging

## Development Workflows

### Essential Commands
```bash
# Development with network access for mobile testing
npm run dev

# AI development (separate terminal)
npm run genkit:dev

# Type checking (critical before commits)
npm run typecheck

# Build verification
npm run build
```

### Firebase Deployment
```bash
# Deploy to Firebase App Hosting
firebase deploy --only hosting

# Functions deployment (if needed)
firebase deploy --only functions
```

## Critical Implementation Details

### Authentication & Permissions
- User roles defined in `src/types/index.ts`: `Admin | User | Yard Staff`
- Permissions system in `src/lib/constants.ts` with `ROLE_PERMISSIONS` mapping
- Route protection via `src/app/(app)/layout.tsx` authentication wrapper

### Database Patterns
- **Denormalization**: Products embed `productName` in line items for performance
- **Search Indexing**: Customer search uses concatenated fields (see `buildSearchIndex` in customer helpers)
- **Transactions**: Use Firebase transactions for inventory updates and financial operations

### Styling System
- **Tailwind CSS** with design tokens in `tailwind.config.ts`
- **Theme System**: Dark/light mode via `src/contexts/theme-context.tsx`
- **Component Library**: ShadCN UI components in `src/components/ui/`
- **Brand Colors**: Muted green primary (#8FBC8F), soft blue accent (#A0D6B4)

### Key Files for Context
- `src/types/index.ts` - Complete type definitions and Zod schemas
- `src/lib/constants.ts` - Permissions, product categories, business constants
- `src/lib/utils.ts` - Utility functions including `fullName`, `customerDisplayName`
- `docs/blueprint.md` - Original requirements and design specifications

### Common Gotchas
- Always import types from `@/types` not relative paths
- Use `fullName()` helper for customer display names, not direct concatenation
- Firebase config loads from environment variables in production (`FIREBASE_WEBAPP_CONFIG`)
- Inventory updates require careful transaction handling to prevent race conditions
- AI flows need GEMINI_API_KEY secret configured in Firebase

## File Organization Logic
- Place new features in `src/app/(app)/{feature}/` with corresponding components
- Shared utilities go in `src/lib/`
- Feature-specific types extend base types from `src/types/index.ts`
- Print components follow `Printable{Entity}` naming for PDF generation