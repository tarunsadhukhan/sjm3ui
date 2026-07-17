# Menu Paths

All page routes in the app, grouped by dashboard, keyed by `menu_path` (the URL route).
**Sub-routes** (create/edit/view/detail pages) are reached from their parent list page — they are not sidebar menu entries themselves.

Generated from `src/app/**/page.tsx` on 2026-07-17.

---

## Dashboard 1: VOW Admin (Control Desk) — `/dashboardctrldesk`

| menu_path | Sub-routes |
|-----------|-----------|
| `/dashboardctrldesk` | — (dashboard home) |
| `/dashboardctrldesk/menuManagementAdmin` | `/createMenuAdmin` |
| `/dashboardctrldesk/orgModuleMapManagement` | `/editOrgModuleMapAdmin` |
| `/dashboardctrldesk/roleManagementAdmin` | `/createRoleAdmin` |
| `/dashboardctrldesk/settings/organisationsetup` | `/createOrg` |
| `/dashboardctrldesk/tenantAdminUserMgmt` | `/createPortalUser` |
| `/dashboardctrldesk/userManagementAdmin` | `/createUserAdmin` |

## Dashboard 2: Tenant Admin — `/dashboardadmin`

| menu_path | Sub-routes |
|-----------|-----------|
| `/dashboardadmin` | — (dashboard home) |
| `/dashboardadmin/approvalHierarchy` | — |
| `/dashboardadmin/branchManagement` | `/createBranch` |
| `/dashboardadmin/coInvoiceTypeMap` | — |
| `/dashboardadmin/companyManagement` | `/createCompany` |
| `/dashboardadmin/CompanyConfiguration` | `/editConfiguration` |
| `/dashboardadmin/deptManagement` | `/createDept` |
| `/dashboardadmin/mechineTypeMasterAdmin` | — |
| `/dashboardadmin/paySchemeCreation` | `/create` |
| `/dashboardadmin/paySchemeParameters` | `/create` |
| `/dashboardadmin/roleAppManagement` | `/createRoleApp` |
| `/dashboardadmin/roleManagement` | `/createRole` |
| `/dashboardadmin/roleManagementAdmin` | `/createRoleAdmin` |
| `/dashboardadmin/subDeptManagement` | `/createSubDept` |
| `/dashboardadmin/userManagement` | `/CreateUser` |
| `/dashboardadmin/userManagementAdmin` | `/createUserAdmin` |

## Dashboard 3: Tenant Portal — `/dashboardportal`

`/dashboardportal` — dashboard home.

### Masters — `/dashboardportal/masters`

| menu_path | Sub-routes |
|-----------|-----------|
| `/dashboardportal/masters` | — (module landing) |
| `/dashboardportal/masters/bankDetailsMaster` | — |
| `/dashboardportal/masters/categoryMaster` | — |
| `/dashboardportal/masters/contractorMaster` | — |
| `/dashboardportal/masters/costFactor` | — |
| `/dashboardportal/masters/departmentMaster` | — |
| `/dashboardportal/masters/designationMaster` | — |
| `/dashboardportal/masters/itemGroupMaster` | — |
| `/dashboardportal/masters/itemMake` | — |
| `/dashboardportal/masters/itemMaster` | — |
| `/dashboardportal/masters/juteAgentMap` | — |
| `/dashboardportal/masters/juteMukamMaster` | — |
| `/dashboardportal/masters/juteQualityMaster` | — |
| `/dashboardportal/masters/juteSupplierMap` | — |
| `/dashboardportal/masters/juteSupplierMaster` | — |
| `/dashboardportal/masters/machinespgdetails` | — |
| `/dashboardportal/masters/machineTypeMaster` | — |
| `/dashboardportal/masters/mechineMaster` | — |
| `/dashboardportal/masters/partyMaster` | — |
| `/dashboardportal/masters/projectMaster` | — |
| `/dashboardportal/masters/shiftMaster` | — |
| `/dashboardportal/masters/spellMaster` | — |
| `/dashboardportal/masters/stdRateCard` | — |
| `/dashboardportal/masters/subDepartmentMaster` | — |
| `/dashboardportal/masters/supplierRegistration` | — |
| `/dashboardportal/masters/warehouseMaster` | — |
| `/dashboardportal/masters/yarnMaster` | — |
| `/dashboardportal/masters/yarnqualitymaster` | — |
| `/dashboardportal/masters/YarnTypeMaster` | — |

### HRMS Masters — `/dashboardportal/hrmsmasters`

| menu_path | Sub-routes |
|-----------|-----------|
| `/dashboardportal/hrmsmasters/BioAtt_updation` | — |
| `/dashboardportal/hrmsmasters/bioempmstlink` | — |
| `/dashboardportal/hrmsmasters/desigNormsSet` | — |
| `/dashboardportal/hrmsmasters/EmpRateEntry` | — |
| `/dashboardportal/hrmsmasters/LeaveMaster` | — |
| `/dashboardportal/hrmsmasters/manmachinemst` | — |

### HRMS — `/dashboardportal/hrms`

| menu_path | Sub-routes |
|-----------|-----------|
| `/dashboardportal/hrms/bioAttendance` | — |
| `/dashboardportal/hrms/dailyMachineentry` | — |
| `/dashboardportal/hrms/dailyManMachine` | — |
| `/dashboardportal/hrms/employeeDatabase` | `/addEmployee` |
| `/dashboardportal/hrms/payParam` | `/createPayParam` |
| `/dashboardportal/hrms/payRegister` | `/createPayRegister`, `/viewPayRegister` |
| `/dashboardportal/hrms/payScheme` | `/createPayScheme` |

### HRMS Reports — `/dashboardportal/hrmsreports`

| menu_path | Sub-routes |
|-----------|-----------|
| `/dashboardportal/hrmsreports/empAttendanceReport` | — |
| `/dashboardportal/hrmsreports/empWagesReport` | — |

### Procurement — `/dashboardportal/procurement`

| menu_path | Sub-routes |
|-----------|-----------|
| `/dashboardportal/procurement` | — (module landing) |
| `/dashboardportal/procurement/billPass` | `/[id]`, `/edit` |
| `/dashboardportal/procurement/drcrNote` | `/view` |
| `/dashboardportal/procurement/indent` | `/createIndent` |
| `/dashboardportal/procurement/inward` | `/createInward` |
| `/dashboardportal/procurement/materialInspection` | `/inspect` |
| `/dashboardportal/procurement/purchaseOrder` | `/createPO` |
| `/dashboardportal/procurement/sr` | `/createSR` |

### Inventory — `/dashboardportal/inventory`

| menu_path | Sub-routes |
|-----------|-----------|
| `/dashboardportal/inventory` | — (module landing) |
| `/dashboardportal/inventory/issue` | `/createIssue` |

### Jute Purchase — `/dashboardportal/jutePurchase`

| menu_path | Sub-routes |
|-----------|-----------|
| `/dashboardportal/jutePurchase` | — (module landing) |
| `/dashboardportal/jutePurchase/batchPlan` | `/edit` |
| `/dashboardportal/jutePurchase/batchPlanMst` | — |
| `/dashboardportal/jutePurchase/billPass` | `/edit`, `/view` |
| `/dashboardportal/jutePurchase/gateEntry` | `/createGateEntry` |
| `/dashboardportal/jutePurchase/juteIssue` | `/edit` |
| `/dashboardportal/jutePurchase/juteMukamRecv` | — |
| `/dashboardportal/jutePurchase/materialInspection` | `/createMaterialInspection` |
| `/dashboardportal/jutePurchase/mr` | `/edit` |
| `/dashboardportal/jutePurchase/po` | `/createPO` |
| `/dashboardportal/jutePurchase/poapp` | `/createPO` |
| `/dashboardportal/jutePurchase/reports` | — |

### Jute SQC — `/dashboardportal/juteSQC`

| menu_path | Sub-routes |
|-----------|-----------|
| `/dashboardportal/juteSQC` | — (module landing) |
| `/dashboardportal/juteSQC/r-08-01` | — |

### Sales — `/dashboardportal/sales`

| menu_path | Sub-routes |
|-----------|-----------|
| `/dashboardportal/sales` | — (module landing) |
| `/dashboardportal/sales/custMaster` | — |
| `/dashboardportal/sales/deliveryOrder` | `/createDeliveryOrder` |
| `/dashboardportal/sales/quotation` | `/createQuotation` |
| `/dashboardportal/sales/salesInvoice` | `/createSalesInvoice` |
| `/dashboardportal/sales/salesOrder` | `/createSalesOrder` |

### Accounting — `/dashboardportal/accounting`

| menu_path | Sub-routes |
|-----------|-----------|
| `/dashboardportal/accounting/accountDeterminations` | — |
| `/dashboardportal/accounting/financialYears` | — |
| `/dashboardportal/accounting/ledgerGroups` | — |
| `/dashboardportal/accounting/ledgers` | — |
| `/dashboardportal/accounting/voucherTypes` | — |
| `/dashboardportal/accounting/vouchers` | `/createVoucher` |
| `/dashboardportal/accounting/reports/ageingAnalysis` | — |
| `/dashboardportal/accounting/reports/balanceSheet` | — |
| `/dashboardportal/accounting/reports/cashBook` | — |
| `/dashboardportal/accounting/reports/dayBook` | — |
| `/dashboardportal/accounting/reports/ledgerReport` | — |
| `/dashboardportal/accounting/reports/partyOutstanding` | — |
| `/dashboardportal/accounting/reports/profitLoss` | — |
| `/dashboardportal/accounting/reports/trialBalance` | — |

### BOM / Costing — `/dashboardportal/BomCosting`

| menu_path | Sub-routes |
|-----------|-----------|
| `/dashboardportal/BomCosting/bomCosting` | `/costSheet` |
| `/dashboardportal/BomCosting/costElementMaster` | — |
| `/dashboardportal/BomCosting/itemBomMaster` | — |

### MIS — `/dashboardportal/misentries`, `/dashboardportal/misreports`

| menu_path | Sub-routes |
|-----------|-----------|
| `/dashboardportal/misentries/electricityDG` | — |
| `/dashboardportal/misentries/yarnPurchase` | — |
| `/dashboardportal/misreports/misReports` | — |

### Production — `/dashboardportal/production*`

| menu_path | Sub-routes |
|-----------|-----------|
| `/dashboardportal/productionEntry/mcStoppage` | — |
| `/dashboardportal/productionMasters/spgMasterEntry` | — |
| `/dashboardportal/productionMasters/trollyMasterEntry` | — |
| `/dashboardportal/productionMasters/wdgMasterEntry` | — (uncommitted, in progress) |
| `/dashboardportal/productionReports/balesReports` | — |
| `/dashboardportal/productionReports/drawingReports` | — |
| `/dashboardportal/productionReports/juteSummaryReports` | — |
| `/dashboardportal/productionReports/otherReports` | — |
| `/dashboardportal/productionReports/spinningReports` | — |
| `/dashboardportal/productionReports/spinningempbrkReports` | — |
| `/dashboardportal/productionReports/spreaderReports` | — |
| `/dashboardportal/productionReports/windingReports` | — |

---

## Comparison with `sjm.menu_mst` (checked 2026-07-17)

`menu_mst` stores portal menu paths **relative** (no `/dashboardportal` prefix). Control Desk / Tenant Admin menus live in `vowconsole3`, not here.

### Frontend pages that WERE missing — inserted 2026-07-17 (menu_id 806–825)

| menu_id | Frontend page | Note |
|---------|---------------|------|
| 806 | `masters/stdRateCard` | |
| 807 | `masters/supplierRegistration` | |
| 808 | `hrmsmasters/bioempmstlink` | page from commit 97b7442 |
| 809 | `hrms/bioAttendance` | |
| 810 | `hrms/payParam` | |
| 811 | `hrms/payScheme` | |
| 812 | `jutePurchase/juteMukamRecv` | |
| 813 | `jutePurchase/poapp` | |
| 814, 815 | `juteSQC` (group) + `juteSQC/r-08-01` | |
| 816 | `productionEntry/mcStoppage` | parented under `Production` (777) |
| 817 | `productionMasters/wdgMasterEntry` | page still uncommitted |
| 818–825 | `accounting/reports/*` (ageingAnalysis, balanceSheet, cashBook, dayBook, ledgerReport, partyOutstanding, profitLoss, trialBalance) | children of `Reports` (756) |

All 132 active menus were also granted to role `superadmin` (15) with access types 1–4 (view/print/create/edit), and portal user `njmadmin@vowerp.co.in` (user_id 22) was mapped to that role for every active company/branch.

### Browser verification (2026-07-17, sjm.localhost:3000, logged in as njmadmin)

All 132 active menu paths were visited automatically. **Every path with a page loads with HTTP 200 and no runtime errors** — including all 20 newly inserted menus. The only 404s are the stale rows and page-less group headers below.

Group headers with no landing `page.tsx` (sidebar label links 404; children work): `accounting`, `accounting/reports`, `BomCosting`, `hrms`, `hrmsmasters`, `hrmsreports`, `MISEntries`, `MISReports`, `production`, `productionMasters`, `productionReports`.

---

## Tenant Admin comparison with `vowconsole3.con_menu_master` (checked 2026-07-17)

Tenant Admin menus store **absolute** paths (`/dashboardadmin/...`). njmadmin (con_user_id 21) → role `superadmin` org 41 (con_role_id 23), which has every menu mapped.

**Inserted 2026-07-17:** con_menu_id 36 `Role & Menu Mapping` → `/dashboardadmin/roleAppManagement` (parent: User Management Portal), mapped to role 23. This was the only frontend page missing a menu row.

**Browser verification:** all 29 menu paths visited as njmadmin (Admin Login). All 16 real pages load with HTTP 200, no errors. The 13 stale rows below 404 (no page exists):

| con_menu_id | con_menu_path | Note |
|-------------|---------------|------|
| 9 | `/dashboardadmin/dataAllowable` | |
| 10 | `/dashbaordadmin/purchaseSetting` | typo: `dashbaord` |
| 11 | `/dashboardadmin/salesSetting` | |
| 13 | `/dashboardadmin/leaveType` | |
| 16 | `/dashbaordadmin/payschemePolicies` | typo: `dashbaord` |
| 18 | `/dashboardadmin/taxMaster` | |
| 19 | `/dashboardadmin/bankAccountMaster` | |
| 20 | `/dashboardadmin/supplierTypes` | |
| 21 | `/dashboardadmin/selectModules` | |
| 25 | `/dashboardadmin/plans` | |
| 26 | `/dashboardadmin/supbscriptions` | typo: `supbscriptions` |
| 27 | `/dashboardadmin/payment` | |
| 34 | `masters/mechineMaster` | portal-style path, junk in this table |

**Dev-mode caveat:** the backend runs with `BYPASS_AUTH=1`, which impersonates con_user_id 1 → role 1 `Vow Super User` (only ~7 menus), so the `/dashboardadmin` sidebar shows a reduced menu set in dev regardless of who logged in. njmadmin's real role (23) is complete; with real auth the full sidebar appears. To see the full sidebar under bypass, run:

```sql
INSERT INTO vowconsole3.con_role_menu_map (con_role_id, con_menu_id)
SELECT 1, con_menu_id FROM vowconsole3.con_menu_master cmm
WHERE cmm.active = 1
  AND NOT EXISTS (SELECT 1 FROM vowconsole3.con_role_menu_map m
                  WHERE m.con_role_id = 1 AND m.con_menu_id = cmm.con_menu_id);
```

### `menu_mst` rows with NO frontend page (stale/orphan)

| menu_id | menu_path |
|---------|-----------|
| 805 | `hrms/handsReport` |
| 776 | `hrms/leaveEntry` |
| 775 | `hrmsreports/empAbsentReport` |
| 774 | `hrmsreports/empProdEffReport` |
| 739 | `inventory/reports` |
| 11 | `jute_procurement/reports/jut01` |
| 7 | `procurement/quotation` |
| 738 | `procurement/reports` |
| 757 | `accounting/types` |
| 783 | `production/dailyDoffEntry` |
| 778 | `production/spreaderEntry` |
| 781 | `productionMasters/frameMasterEntry` |
| 799 | `misentries/dustBoiler` |
| 801 | `misentries/wipEntry` |
| 787 | `sales/Orders` |

### Path anomalies in `menu_mst`

- menu_id 700 `/masters/projectMaster` — only row with a leading slash.
- menu_id 765 `hrmsmasters/BioAtt_updation` is parented under HRMS (741) instead of HRMS Master (762).
- Group rows `MISEntries` / `MISReports` use different casing than their children (`misentries/`, `misreports/`).
