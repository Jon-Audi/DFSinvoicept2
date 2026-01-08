# Project TODO List

## Upcoming Implementations

### High Priority
- [ ] **Back of House Orders/Receiving Management System**
  - [ ] Create new "Receiving" or "Warehouse" page in navigation
  - [ ] Add ability to create/add orders from office
  - [ ] Display order tracking with fields:
    - Customer Name
    - PO Number
    - Date Ordered
    - Ordered From (supplier/vendor)
    - Expected Delivery Date (to yard)
  - [ ] Add packing slip viewing/upload functionality
  - [ ] Add order status tracking (Ordered, In Transit, Received, etc.)
  - [ ] Add search and filter capabilities
  - [ ] Add notification system for upcoming deliveries
  - [ ] Consider adding barcode scanning for receiving

- [ ] **Invoice Finalization Feature**
  - [ ] Add "Finalize" button/toggle to invoice interface
  - [ ] Add `isFinalized` boolean field to Invoice type
  - [ ] Lock finalized invoices from editing (line items, customer, amounts, etc.)
  - [ ] Add "Unfinalize" option for authorized users to unlock invoices
  - [ ] Display visual indicator when invoice is finalized (badge, banner, etc.)
  - [ ] Update invoice save/edit handlers to check finalized status
  - [ ] Add confirmation dialog when finalizing/unfinalizing

- [x] **Employee Name Display**
  - [x] Add employee/user mapping system (email -> first name)
    - jon@delawarefencesolutions.com → "Jon"
    - karl@delawarefencesolutions.com → "Karl"
    - kevin@delawarefencesolutions.com → "Kevin"
  - [x] Display employee names on Estimates (creator/assigned)
  - [x] Display employee names on Orders (creator/assigned)
  - [x] Display employee names on Invoices (creator/assigned)
  - [ ] Display employee names in Reports/Analytics
  - [ ] Add employee name to printable documents
  - [x] Added "Created By" field to all document types

### Medium Priority
- [ ]

### Low Priority
- [ ]

### Technical Debt & Improvements
- [ ] Fix remaining TypeScript compilation warnings (25 total)
  - [ ] Icon name type mismatches
  - [ ] Optional property handling improvements
  - [ ] Type safety enhancements
- [ ] Consider replacing `xlsx` library with `exceljs` (current library has unfixable security vulnerability)
- [ ] Remove debug console.logs from dashboard settings page (lines 71-72, 75, 87)

### Completed ✓
- [x] Add Top Selling Products report with date range filtering
- [x] Add category-based filtering to Top Selling Products
- [x] Fix GitHub secret exposure in `.claude/settings.local.json`
- [x] Fix WCAG 2 AA accessibility violations
- [x] Fix Dashboard Settings save button (user.uid bug)
- [x] Update jsPDF to v4.0.0 (security fix)
- [x] Deploy development branch to production
- [x] **Mobile/Tablet Responsiveness Improvements** - Fixed viewport zoom, improved responsive layouts, added touch-friendly UI
- [x] **Inventory Improvements** - Inventory now only deducts on Invoices (not Orders/Estimates), added real-time stock display on all ticket forms with visual warnings for out-of-stock items

---

## Notes
- Keep this file updated as you complete tasks
- Mark items with [x] when completed
- Add new tasks as they come up
- Use priority sections to organize work
