# TAL-170: Documents Library Redesign - Implementation Plan

## Task
Build a new document browser with filtering by type, tax year, category. Document preview, search, and bulk operations.

## Implementation

### 1. New Route: `/documents`
Create a comprehensive document library page that replaces/enhances the existing gallery.

### 2. Features
- **Grid/List view toggle** - User can switch between grid and list views
- **Advanced filtering sidebar**:
  - Document type (Receipt, Invoice, Bank Statement, Dividend Statement, etc.)
  - Tax year (FY 2024-25, FY 2025-26, etc.)
  - Category (Work from Home, Vehicle, Self-Education, etc.)
  - Date range
- **Search bar** - Real-time search across document title, merchant, amount, notes
- **Document preview modal** - Click to preview document with metadata
- **Bulk operations**:
  - Select multiple documents
  - Bulk delete
  - Bulk export
  - Bulk category assignment
- **Sorting options** - By date, amount, merchant, category

### 3. Components Needed
- `DocumentLibrary` - Main page component
- `DocumentFilters` - Sidebar with filter controls
- `DocumentGrid` - Grid view of documents
- `DocumentList` - List view of documents
- `DocumentCard` - Individual document card
- `DocumentPreview` - Preview modal
- `BulkActionsBar` - Floating bar for bulk operations
- `SearchBar` - Search input with filters

### 4. Database Integration
- Use existing `getReceiptsByDateRange` and other DB functions
- May need new queries for filtered searches

### 5. UI/UX
- Use shadcn/ui components
- Align UI design system (already in place)
- Responsive design
- Dark mode support

## Files to Create/Modify
1. `/src/routes/documents.tsx` - New main route
2. `/src/components/documents/` - New component folder
3. May update navigation to include new documents page

## Success Criteria
- [ ] Documents display in grid/list view
- [ ] Filtering works by type, year, category
- [ ] Search works across document fields
- [ ] Preview modal shows document image + metadata
- [ ] Bulk select and operations work
- [ ] Responsive on all screen sizes
- [ ] Dark mode works correctly
