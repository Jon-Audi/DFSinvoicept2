# Project TODO List

## Upcoming Implementations

### High Priority
- [x] **Back of House Orders/Receiving Management System**
  - [x] Create new "Receiving" or "Warehouse" page in navigation
  - [x] Add ability to create/add orders from office
  - [x] Display order tracking with fields:
    - Vendor Name (prioritized)
    - PO Number
    - Date Ordered
    - Ordered From (supplier/vendor)
    - Expected Delivery Date (to yard)
  - [x] Add packing slip viewing/upload functionality
  - [x] Add order status tracking (Expected, In Transit, Partially Received, Received, Discrepancy, Voided)
  - [x] Add search and filter capabilities (by category/subcategory)
  - [x] Touch-friendly iPad/tablet interface (matching Shop tab pattern)
  - [x] Inline received quantity editing per line item
  - [x] Real-time status updates via Firebase
  - [x] Add notification system for upcoming deliveries
  - [ ] Consider adding barcode scanning for receiving (skipped - not needed)

- [x] **Invoice Finalization Feature**
  - [x] Add "Finalize" button/toggle to invoice interface
  - [x] Add `isFinalized` boolean field to Invoice type
  - [x] Lock finalized invoices from editing (line items, customer, amounts, etc.)
  - [x] Add "Unfinalize" option for authorized users to unlock invoices
  - [x] Display visual indicator when invoice is finalized (badge, banner, etc.)
  - [x] Update invoice save/edit handlers to check finalized status
  - [x] Add confirmation dialog when finalizing/unfinalizing

- [x] **Employee Name Display**
  - [x] Add employee/user mapping system (email -> first name)
    - jon@delawarefencesolutions.com → "Jon"
    - karl@delawarefencesolutions.com → "Karl"
    - kevin@delawarefencesolutions.com → "Kevin"
  - [x] Display employee names on Estimates (creator/assigned)
  - [x] Display employee names on Orders (creator/assigned)
  - [x] Display employee names on Invoices (creator/assigned)
  - [x] Display employee names in Reports/Analytics
  - [x] Add employee name to printable documents
  - [x] Added "Created By" field to all document types

### Medium Priority
- [ ] **iOS App Store Deployment**
  - [x] Configure Capacitor for iOS builds
  - [x] Add native plugins (camera, filesystem, keyboard, etc.)
  - [x] Set up hybrid approach with Vercel URL
  - [ ] Add app icons and splash screen assets
  - [ ] Build and submit to App Store (requires Mac)

### Low Priority
- [ ]

### Technical Debt & Improvements
- [ ] Fix 5 remaining TypeScript errors (down from 64)
  - [ ] chainlink/page.tsx - LineItem/status type mismatch when converting estimate→order/invoice
  - [ ] invoice-dialog.tsx + order-dialog.tsx - customer save callback contravariance mismatch

### Completed ✓
- [x] **TypeScript cleanup** - Fixed 59/64 errors. Root cause: dual types/index.ts files (root + src/). Synced missing fields.
- [x] Replace `xlsx` with `exceljs` (security fix - removed CVE-laden library)
- [x] Remove debug console.logs (already handled by next.config compiler.removeConsole in production)
- [x] Add React Error Boundary - catches unhandled component crashes, shows friendly UI
- [x] Firestore offline persistence - IndexedDB cache for instant cold loads
- [x] Performance fixes - Firestore listener loop (use-data-query.ts) + reduced page animation (400ms→150ms)
- [x] Add Vercel Speed Insights
- [x] Add Top Selling Products report with date range filtering
- [x] Add category-based filtering to Top Selling Products
- [x] Fix GitHub secret exposure in `.claude/settings.local.json`
- [x] Fix WCAG 2 AA accessibility violations
- [x] Fix Dashboard Settings save button (user.uid bug)
- [x] Update jsPDF to v4.0.0 (security fix)
- [x] Deploy development branch to production
- [x] **Mobile/Tablet Responsiveness Improvements** - Fixed viewport zoom, improved responsive layouts, added touch-friendly UI
- [x] **Inventory Improvements** - Inventory now only deducts on Invoices (not Orders/Estimates), added real-time stock display on all ticket forms with visual warnings for out-of-stock items
- [x] **Shop Tab Touch-Friendly Interface** - Card-based UI with detail sheets, inline editing
- [x] **Receiving Tab Touch-Friendly Interface** - Matching Shop tab pattern, warehouse-focused (no pricing)
- [x] **Dark Mode Color Fixes** - Fixed unreadable bright colors in dark mode for Shop and Receiving
- [x] **Bulk Payment Firebase Fix** - Fixed undefined field values causing addDoc errors

---

## Notes
- Keep this file updated as you complete tasks
- Mark items with [x] when completed
- Add new tasks as they come up
- Use priority sections to organize work
