# Supplier Registration — Design Spec

**Date:** 2026-06-14
**Status:** Approved (design Q&A)

## Goal

A create-only master page at `dashboardportal/masters/supplierRegistration` to register a
supplier (`party_mst`) together with its branch details (`party_branch_mst`) and a jute-supplier
mapping (`jute_supp_party_map`), in a single submit. Spreadsheet ("Google sheet") style entry.
No list / modify / delete after submit.

## Tables

- **party_mst** (supplier header) — one record per submission.
- **party_branch_mst** (branch details) — many rows per party.
- **jute_supp_party_map** — link row: `jute_supplier_id = 2397` (fixed), `party_id` (new).

## UI (single full page)

Two sections, both visible:

1. **Supplier** (`party_mst`): supp_name*, party_type (single select → drives code), supp_code
   (auto, read-only), entity_type, country, contact person/designation/email, phone_no, cin,
   party_pan_no, msme_certified.
2. **Branch Details** (`party_branch_mst`): MUI table with trailing blank row — address,
   address_additional, gst_no, zip_code, state (select), city (select, dependent on state,
   optional — `city_mst` may be empty), contact_person, contact_no, whatsapp_no, email_id,
   bank_acc_no, ifsc_code, bank_name, bank_branch, upi_code.

One **Submit** button. After success: SweetAlert success, form resets for a new entry. No edit/delete UI.

## Submit flow (single transaction, in order)

1. Insert `party_mst`: co_id (selected company), updated_by (token), auto `supp_code`,
   `party_type_id` stored as `'{id}'`, plus the supplier fields.
2. Insert `jute_supp_party_map`: co_id, updated_by, `jute_supplier_id = 2397`, `party_id`.
3. Insert `party_branch_mst` rows (one per non-empty branch), linked to `party_id`.

## supp_code generation

Leading letter = first letter of the selected party type's prefix, uppercased (Jute Supplier
`jutesupp` → `J`). Number = max existing numeric suffix among `party_mst.supp_code` for that
company sharing the same leading letter, + 1, zero-padded to 4 → continues `J0008` → `J0009`.
Generated server-side at save time.

## Validations

- **supp_name unique** (per company) — hard block. Duplicate → error, no save.
- **Branch soft-duplicate** — on submit (when `force` is not set), check each branch's
  `whatsapp_no`, `bank_acc_no`, `upi_code` against existing `party_branch_mst` (active).
  If any value already belongs to another supplier, return the conflicts WITHOUT saving.
  Frontend shows a SweetAlert confirm listing them: *"WhatsApp No 98xxxx is already linked to
  another supplier. Do you want to continue?"* → Yes ⇒ re-submit with `force=true` (saves anyway);
  No ⇒ dialog closes so the user can correct.

## Backend (added to `src/masters/party.py`, router `/api/partyMaster`)

- `GET /supplier_registration_setup` — lookups: party_types (with prefix), entities, countries,
  states, cities.
- `POST /supplier_register` — payload: supplier fields + party_type (single id) + branches[] +
  `force` + co_id. Does uniqueness + soft-dup checks, supp_code gen, and the 3-table transaction.
  Returns `{duplicate, conflicts}` (no save) or `{party_id, supp_code}` (saved).
- Model: extend `PartyBranchMst` with city_id, email_id, bank_acc_no, ifsc_code, bank_name,
  bank_branch, whatsapp_no, upi_code (columns already exist in DB).
- Query helpers: `get_party_types_with_prefix()`, `get_city_list()`.

## Frontend

- `src/utils/api.ts` — add SUPPLIER_REGISTRATION_SETUP, SUPPLIER_REGISTER.
- `src/utils/supplierRegistrationService.ts` — `fetchSupplierSetup`, `registerSupplier`.
- `src/app/dashboardportal/masters/supplierRegistration/page.tsx` — the page (MuiForm header +
  MUI branch table), submit + SweetAlert flow.

## Out of scope

- Sidebar menu / permission entry (DB-driven, added separately via Menu Management).
- Editing or deleting submitted suppliers.

## Open notes

- `city_mst` is empty (0 rows): city select shows nothing until cities exist; city is optional.
- supp_name uniqueness scoped to `co_id` (company), matching how parties are listed.
