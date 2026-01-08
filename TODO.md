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

- [ ] **Mobile/Tablet Responsiveness Improvements**
  - [ ] Fix viewport zoom issue on iPhone 17 Pro Max
    - [ ] Add/verify proper viewport meta tag in layout
    - [ ] Fix touch-action CSS to prevent auto-zoom
    - [ ] Test zoom behavior on form inputs
  - [ ] Improve responsive layouts for tablet/iPad
    - [ ] Optimize sidebar for tablet sizes
    - [ ] Improve table layouts for smaller screens
    - [ ] Add mobile-friendly navigation patterns
    - [ ] Test all pages on iPad and iPhone
  - [ ] Add touch-friendly UI improvements
    - [ ] Increase tap target sizes for mobile
    - [ ] Add swipe gestures where appropriate
    - [ ] Optimize forms for mobile keyboard

- [ ] **Inventory Improvements**
  - [ ] Change inventory deduction logic to only trigger on Invoices (not Orders/Estimates)
    - [ ] Audit current inventory deduction code
    - [ ] Update to only deduct when ticket type = "Invoice"
    - [ ] Ensure Orders and Estimates don't affect inventory
  - [ ] Add real-time inventory display on tickets
    - [ ] Show current inventory count for each item on Invoices
    - [ ] Show current inventory count for each item on Orders
    - [ ] Show current inventory count for each item on Estimates
    - [ ] Consider showing "Available: X units" next to item selection
    - [ ] Add visual warning when inventory is low or zero

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

---

## Notes
- Keep this file updated as you complete tasks
- Mark items with [x] when completed
- Add new tasks as they come up
- Use priority sections to organize work
