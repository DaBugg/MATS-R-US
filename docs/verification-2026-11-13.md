# PO and scanner verification — November 13, 2026

## Scanner: passed on a deployed protected preview

Source: City of Berkeley, K-Dock Restroom Renovation permit drawing set (27 pages, 10.4 MB).
https://berkeleyca.gov/sites/default/files/documents/Specification%2025-11743-C%20Plans.pdf

Test drawing ID: `751aba4e-745a-4bff-acfd-d511bb5ea36c`.
Name: `TEST ONLY · Berkeley K-Dock permit plans · Do not approve`.

- Uploaded the original PDF through the Drawings screen into private Blob storage.
- Plan metadata saved in Neon; the library showed 27 pages.
- Opened the takeoff through its signed private download and rendered the PDF.
- Page 21 (P-101) embedded text extraction saved successfully.
- Forced browser OCR on page 21 saved with `extraction_method=ocr`.
- Reloaded the takeoff and returned to page 21; OCR text remained available.
- No takeoff items were created or approved. No inventory balances were changed.
- OCR reads notes, but introduces errors around symbols and labels. This verifies the workflow, not automatic quantity accuracy.

Local processor check also passed: 1,979 embedded-text characters; 2,178 OCR characters on the tested sheet. Found and fixed PDF.js v6 document cleanup: destruction belongs to the loading task rather than PDFDocumentProxy. Later added fit-to-width and zoom controls for large-format sheets; build verified.

## Purchase orders

`npm run test:purchasing` runs the migration in isolated PGlite Postgres and verifies:
- draft orders reject deliveries;
- ordered transition;
- retrying the same receipt ID logs only one receipt;
- reusing a receipt ID with different details fails;
- delivery quantities cannot exceed the remaining balance;
- POs with deliveries cannot be cancelled;
- fully delivered and partially delivered status derivation;
- draft/cancelled orders do not reduce recommendations;
- only outstanding ordered quantities reduce recommendations.

The migration uses a parent PO row lock for both receipt and status changes. Live concurrent-request testing has not been performed. The schema has not yet been applied to Neon. PO UI writes remain disabled if its API cannot load the schema, and CSV export is disabled until outstanding quantities can be checked.

Delivery records track PO progress only. Stock posting remains separate and requires approval of exact material, location, and quantity. Reconcile deliveries with stock before placing another PO.

## Remaining gates

- Apply `supabase/sql/14_purchase_orders.sql` through the existing Neon SQL editor, then test the PO flow against Neon.
- PO production release is pending that migration and verification.
- Current Dot connection and an independent authorized inventory write test remain unverified.
- The held inventory update remains on hold.

An attempted temporary migration endpoint was rejected by automatic approval review as an expanded privileged API outside the scanner test scope. It was not created or deployed. Use the existing database administration path for migration.
