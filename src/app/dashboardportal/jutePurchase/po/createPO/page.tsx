"use client";

/**
 * @page JutePOCreatePage
 * @description Create/Edit/View page for Jute Purchase Orders.
 * Orchestrates all hooks and components for the Jute PO transaction workflow.
 */

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CircularProgress, Box } from "@mui/material";
import TransactionWrapper, { type TransactionAction } from "@/components/ui/TransactionWrapper";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useBranchOptions } from "@/utils/branchUtils";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

// Types
import type {
  MuiFormMode,
  JutePOFormValues,
  JutePOLineItem,
  JutePOSetupData,
  JutePODetails,
  Option,
} from "./types/jutePOTypes";

// Constants and Utils
import {
  JUTE_PO_STATUS_IDS,
  JUTE_PO_STATUS_LABELS,
  JUTE_PO_STATUS_COLORS,
  EMPTY_MUKAMS,
  EMPTY_VEHICLE_TYPES,
  EMPTY_JUTE_ITEMS,
  EMPTY_OPTIONS,
  CHANNEL_OPTIONS,
  UNIT_OPTIONS,
} from "./utils/jutePOConstants";
import { lineHasAnyData, lineIsComplete } from "./utils/jutePOFactories";
import { calculateTotals } from "./utils/jutePOCalculations";
import {
  mapJutePOSetupResponse,
  mapJutePODetailsResponse,
  mapLineItemsFromAPI,
  mapFormToCreatePayload,
  mapFormToUpdatePayload,
  extractFormValuesFromDetails,
} from "./utils/jutePOMappers";

// Hooks
import { useJutePOFormState } from "./hooks/useJutePOFormState";
import { useJutePOLineItems } from "./hooks/useJutePOLineItems";
import { useJutePOSelectOptions } from "./hooks/useJutePOSelectOptions";
import { useJutePOFormSchemas } from "./hooks/useJutePOFormSchemas";
import { useJutePOApproval } from "./hooks/useJutePOApproval";

// Components
import {
  JutePOHeaderForm,
  useJutePOLineItemColumns,
  JutePOApprovalBar,
  JutePOTotalsDisplay,
  JutePOPreview,
  JutePOLineEntryForm,
} from "./components";

function JutePOCreatePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { coId } = useSelectedCompanyCoId();

  // Derive mode and ID from URL
  const modeParam = searchParams?.get("mode") ?? "create";
  const mode: MuiFormMode = modeParam === "edit" ? "edit" : modeParam === "view" ? "view" : "create";
  const jutePOId = searchParams?.get("id") ?? null;

  // Page-level state
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  // Prevent hydration mismatch by rendering form only after client mount
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Setup data state
  const [setupData, setSetupData] = React.useState<JutePOSetupData | null>(null);
  const [details, setDetails] = React.useState<JutePODetails | null>(null);

  // Cascading dropdown state - parties only (suppliers come from setupData)
  const [parties, setParties] = React.useState<Option[]>([]);
  const [qualitiesByItem, setQualitiesByItem] = React.useState<Record<string, Option[]>>({});

  // Branch options: only show branches selected in the sidebar context
  const sidebarBranchOptions = useBranchOptions();

  // Derived supplier options from setup data
  const supplierOptions = React.useMemo(
    () =>
      (setupData?.suppliers ?? []).map((s) => ({
        label: s.supplier_name,
        value: String(s.supplier_id),
      })),
    [setupData]
  );

  // Derived broker options from setup data (brokers are parties from party_mst)
  const brokerOptions = React.useMemo(
    () =>
      (setupData?.brokers ?? []).map((b) => ({
        label: b.broker_name,
        value: String(b.broker_id),
      })),
    [setupData]
  );

  // Form state hook
  const {
    initialValues,
    setInitialValues,
    formValues,
    setFormValues,
    formKey,
    bumpFormKey,
    formRef,
  } = useJutePOFormState({ mode });

  // In edit/view mode, ensure the saved branch value is always present in the dropdown
  // even if it's no longer selected in the sidebar
  const branchOptions = React.useMemo(() => {
    const branchValue = formValues.branch;
    if (!branchValue) return sidebarBranchOptions;
    const exists = sidebarBranchOptions.some(
      (opt) => String(opt.value) === String(branchValue)
    );
    if (exists) return sidebarBranchOptions;
    // Fallback: look up branch name from setup data so edit/view displays correctly
    const setupBranch = setupData?.branches.find(
      (b) => String(b.branch_id) === String(branchValue)
    );
    const fallbackLabel = setupBranch?.branch_name ?? branchValue;
    return [...sidebarBranchOptions, { label: fallbackLabel, value: branchValue }];
  }, [sidebarBranchOptions, formValues.branch, setupData?.branches]);

  // In create mode, if exactly one branch is selected in the sidebar, default the
  // branch field to that branch automatically (applied once).
  const singleBranchDefaultedRef = React.useRef(false);
  React.useEffect(() => {
    if (mode !== "create") {
      singleBranchDefaultedRef.current = false;
      return;
    }
    if (singleBranchDefaultedRef.current) return;
    if (sidebarBranchOptions.length !== 1) return;

    const onlyBranch = sidebarBranchOptions[0]?.value;
    if (!onlyBranch) return;

    singleBranchDefaultedRef.current = true;
    if (formValues.branch === onlyBranch) return;

    setInitialValues((prev) => ({ ...prev, branch: onlyBranch }));
    setFormValues((prev) => ({ ...prev, branch: onlyBranch }));
    formRef.current?.setValue("branch", onlyBranch);
    bumpFormKey();
  }, [mode, sidebarBranchOptions, formValues.branch, setInitialValues, setFormValues, bumpFormKey, formRef]);

  // Early status-based edit check (before hooks that need mode)
  // This allows us to treat non-editable statuses as "view" mode
  const isStatusEditableEarly = React.useMemo(() => {
    if (mode === "create") return true;
    const editableStatuses = [JUTE_PO_STATUS_IDS.DRAFT, JUTE_PO_STATUS_IDS.OPEN];
    const currentStatusId = details?.status_id;
    if (currentStatusId === undefined || currentStatusId === null) return true; // Default to editable if no status yet
    return editableStatuses.includes(currentStatusId as typeof editableStatuses[number]);
  }, [mode, details]);

  // Effective mode for hooks - treat as view if status is not editable
  const effectiveModeForHooks = React.useMemo(() => {
    if (mode === "create") return "create";
    if (!isStatusEditableEarly) return "view";
    return mode;
  }, [mode, isStatusEditableEarly]);

  // Line items hook
  const {
    lineItems,
    replaceItems: replaceLineItems,
    removeLineItems,
    addLine,
    updateLine,
  } = useJutePOLineItems({
    mode: effectiveModeForHooks,
  });

  // Row currently loaded into the line entry panel (null = adding a new line)
  const [editingLineId, setEditingLineId] = React.useState<string | null>(null);
  const editingLine = React.useMemo(
    () => lineItems.find((line) => line.id === editingLineId) ?? null,
    [lineItems, editingLineId]
  );

  // Select options hook
  const { labelResolvers, getQualityOptions } = useJutePOSelectOptions({
    branches: setupData?.branches ?? [],
    mukams: setupData?.mukams ?? [],
    vehicleTypes: setupData?.vehicle_types ?? [],
    juteItems: setupData?.jute_items ?? [],
    suppliers: setupData?.suppliers ?? [],
    parties,
    brokers: brokerOptions,
    qualitiesByItem,
  });

  // Form schema hook
  const formSchema = useJutePOFormSchemas({
    mode,
    branchOptions,
    mukamOptions: (setupData?.mukams ?? []).map((m) => ({ label: m.mukam_name, value: String(m.mukam_id) })),
    supplierOptions,
    partyOptions: parties,
    brokerOptions,
    payToOptions: brokerOptions,
    vehicleTypeOptions: (setupData?.vehicle_types ?? []).map((v) => ({
      label: `${v.vehicle_type} (${v.capacity_weight} Qtl)`,
      value: String(v.vehicle_type_id),
    })),
    channelOptions: CHANNEL_OPTIONS,
    unitOptions: UNIT_OPTIONS,
    hasSupplierSelected: Boolean(formValues.supplier),
  });

  // Approval hook
  const {
    statusId,
    approvalInfo,
    approvalPermissions,
    approvalLoading,
    handleOpen,
    handleApprove,
    handleReject,
    handleCancelDraft,
    handleReopen,
  } = useJutePOApproval({
    mode,
    jutePOId,
    coId: coId ?? "",
    details,
    setDetails,
  });

  // Calculate totals
  const { totalWeight, totalAmount, validLineCount } = React.useMemo(
    () => calculateTotals(lineItems),
    [lineItems]
  );

  // Check if mandatory header fields are filled (required before line item entry)
  const areMandatoryFieldsFilled = React.useMemo(() => {
    const mandatoryFields: (keyof JutePOFormValues)[] = [
      "branch",
      "poDate",
      "mukam",
      "juteUnit",
      "supplier",
      "vehicleType",
      "vehicleQty",
      "channelType",
      "creditTerm",
      "deliveryTimeline",
    ];
    return mandatoryFields.every((field) => {
      const value = formValues[field];
      return value !== undefined && value !== null && value !== "";
    });
  }, [formValues]);

  // Line items can be edited only if mode is not view AND mandatory fields are filled AND status is editable
  const canEditLineItems = mode !== "view" && areMandatoryFieldsFilled && isStatusEditableEarly;

  // ========== Data Fetching ==========

  // Fetch setup data on mount
  React.useEffect(() => {
    if (!coId) return;

    const fetchSetup = async () => {
      try {
        const response = await fetchWithCookie(
          `${apiRoutesPortalMasters.JUTE_PO_CREATE_SETUP}?co_id=${coId}`,
          "GET"
        );
        if (response?.data) {
          const mapped = mapJutePOSetupResponse(response.data);
          setSetupData(mapped);
        }
      } catch (error) {
        console.error("Error fetching Jute PO setup:", error);
        setPageError("Failed to load setup data");
      }
    };

    void fetchSetup();
  }, [coId]);

  // Fetch PO details for edit/view modes
  React.useEffect(() => {
    if (!coId || !jutePOId || mode === "create") {
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        // Fetch PO details (includes line_items)
        const detailsResponse = await fetchWithCookie(
          `${apiRoutesPortalMasters.JUTE_PO_BY_ID}/${jutePOId}?co_id=${coId}`,
          "GET"
        );
        if (detailsResponse?.data) {
          const mappedDetails = mapJutePODetailsResponse(detailsResponse.data);
          setDetails(mappedDetails);

          // Set form values from details
          const formVals = extractFormValuesFromDetails(mappedDetails);
          setInitialValues(formVals);
          setFormValues(formVals);
          bumpFormKey();

          // Fetch parties for the supplier (suppliers come from setupData now)
          if (formVals.supplier) {
            await handleSupplierChange(formVals.supplier);
          }

          // Map line items from the same response with weight calculation params
          if (mappedDetails.line_items && mappedDetails.line_items.length > 0) {
            const calcParams = {
              vehicleCapacity: mappedDetails.vehicle_capacity ?? 0,
              vehicleQty: mappedDetails.vehicle_qty ?? 1,
              juteUnit: mappedDetails.jute_unit ?? "LOOSE",
            };
            const mappedLines = mapLineItemsFromAPI(mappedDetails.line_items, calcParams);
            replaceLineItems(mappedLines);

            // Fetch qualities for each unique item
            const uniqueItems = [...new Set(mappedLines.map((l) => l.itemId).filter(Boolean))];
            for (const itemId of uniqueItems) {
              await fetchQualitiesForItem(itemId);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching Jute PO details:", error);
        setPageError("Failed to load PO details");
      } finally {
        setLoading(false);
      }
    };

    void fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coId, jutePOId, mode]);

  // ========== Cascading Handlers ==========

  // Suppliers now come from setupData, so no handleMukamChange needed.
  // Only parties are fetched when supplier changes.

  const handleSupplierChange = React.useCallback(
    async (supplierId: string) => {
      // Clear party when supplier changes
      setParties([]);
      setFormValues((prev) => ({ ...prev, partyName: "" }));

      if (!supplierId || !coId) return;

      try {
        const response = await fetchWithCookie(
          `${apiRoutesPortalMasters.JUTE_PO_PARTIES_BY_SUPPLIER}/${supplierId}?co_id=${coId}`,
          "GET"
        );
        if (response?.data?.parties) {
          const mapped = (response.data.parties as Array<{ party_id: number; party_name: string }>).map(
            (p) => ({
              label: p.party_name ?? String(p.party_id),
              value: String(p.party_id),
            })
          );
          setParties(mapped);
        }
      } catch (error) {
        console.error("Error fetching parties:", error);
      }
    },
    [coId, setFormValues]
  );

  // Track previous supplier to detect changes and fetch parties
  const prevSupplierRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    const currentSupplier = formValues.supplier;
    
    // Only call API if supplier actually changed (not on initial mount with empty value)
    if (currentSupplier !== prevSupplierRef.current) {
      prevSupplierRef.current = currentSupplier;
      
      // Fetch parties when supplier changes to a valid value
      if (currentSupplier) {
        void handleSupplierChange(currentSupplier);
      } else {
        // Clear parties if supplier is cleared
        setParties([]);
      }
    }
  }, [formValues.supplier, handleSupplierChange]);

  const fetchQualitiesForItem = React.useCallback(
    async (itemId: string) => {
      if (!itemId || !coId || qualitiesByItem[itemId]) return;

      try {
        const response = await fetchWithCookie(
          `${apiRoutesPortalMasters.JUTE_PO_QUALITIES_BY_ITEM}/${itemId}?co_id=${coId}`,
          "GET"
        );
        if (response?.data) {
          // API returns { qualities: [...] } with quality_id and quality_name
          const qualitiesData = response.data.qualities ?? response.data;
          const mapped = (qualitiesData as Array<{ quality_id: number | string; quality_name: string }>).map(
            (q) => ({
              label: q.quality_name ?? String(q.quality_id),
              value: String(q.quality_id),
            })
          );
          setQualitiesByItem((prev) => ({ ...prev, [itemId]: mapped }));
        }
      } catch (error) {
        console.error("Error fetching qualities:", error);
      }
    },
    [coId, qualitiesByItem]
  );

  // Handle item selection in line items - fetches qualities for the selected item
  const handleItemSelect = React.useCallback(
    (itemId: string) => {
      if (itemId) {
        void fetchQualitiesForItem(itemId);
      }
    },
    [fetchQualitiesForItem]
  );

  // Item options for the line entry panel
  const itemOptions = React.useMemo(
    () =>
      (setupData?.jute_items ?? EMPTY_JUTE_ITEMS).map((i: { item_id: number; item_desc: string }) => ({
        label: i.item_desc,
        value: String(i.item_id),
      })),
    [setupData]
  );

  // ========== Line Entry Panel Handlers ==========

  const handleEditLine = React.useCallback((item: JutePOLineItem) => {
    setEditingLineId(item.id);
  }, []);

  const handleDeleteLine = React.useCallback(
    (id: string) => {
      removeLineItems([id]);
      setEditingLineId((prev) => (prev === id ? null : prev));
    },
    [removeLineItems]
  );

  const handleUpdateLine = React.useCallback(
    (id: string, draft: Partial<Omit<JutePOLineItem, "id">>) => {
      updateLine(id, draft);
      setEditingLineId(null);
    },
    [updateLine]
  );

  const handleCancelEdit = React.useCallback(() => {
    setEditingLineId(null);
  }, []);

  // Column definitions for line items (read-only display + row actions)
  const lineItemColumns = useJutePOLineItemColumns({
    canEdit: canEditLineItems,
    labelResolvers,
    editingLineId,
    onEditLine: handleEditLine,
    onDeleteLine: handleDeleteLine,
  });

  // ========== Form Handlers ==========

  const handleFormSubmit = React.useCallback(
    async (values: Record<string, unknown>) => {
      if (!coId) return;

      setSaving(true);
      setPageError(null);

      try {
        // Validate line items
        const linesWithData = lineItems.filter(lineHasAnyData);
        if (linesWithData.length === 0) {
          setPageError("Please add at least one line item");
          setSaving(false);
          return;
        }

        // Check for invalid line items (weight or rate <= 0)
        const invalidLines = linesWithData.filter((line) => {
          const weight = Number(line.weight);
          const rate = Number(line.rate);
          return !Number.isFinite(weight) || weight <= 0 || !Number.isFinite(rate) || rate <= 0;
        });

        if (invalidLines.length > 0) {
          setPageError("Line items must have Weight and Rate greater than 0");
          setSaving(false);
          return;
        }

        const validLines = lineItems.filter(lineIsComplete);
        if (validLines.length === 0) {
          setPageError("Please complete at least one line item (Item, Weight, Rate required)");
          setSaving(false);
          return;
        }

        if (mode === "create") {
          const payload = mapFormToCreatePayload(values as unknown as JutePOFormValues, validLines, Number(coId));
          const response = await fetchWithCookie(
            `${apiRoutesPortalMasters.JUTE_PO_CREATE}?co_id=${coId}`,
            "POST",
            payload
          );

          if (response?.data && !response?.error && response.data?.jute_po_id) {
            // Redirect to edit mode with new ID
            router.push(
              `/dashboardportal/jutePurchase/po/createPO?mode=edit&id=${response.data.jute_po_id}`
            );
          } else {
            setPageError(response?.error ?? "Failed to create Jute PO");
          }
        } else if (mode === "edit" && jutePOId) {
          const payload = mapFormToUpdatePayload(values as unknown as JutePOFormValues, validLines);
          const response = await fetchWithCookie(
            `${apiRoutesPortalMasters.JUTE_PO_UPDATE}/${jutePOId}?co_id=${coId}`,
            "PUT",
            payload
          );

          if (response?.data && !response?.error) {
            // Refresh details
            bumpFormKey();
          } else {
            setPageError(response?.error ?? "Failed to update Jute PO");
          }
        }
      } catch (error) {
        console.error("Error saving Jute PO:", error);
        setPageError("An error occurred while saving");
      } finally {
        setSaving(false);
      }
    },
    [coId, mode, jutePOId, lineItems, router, bumpFormKey, setupData, totalWeight]
  );

  const handleSave = React.useCallback(async () => {
    if (formRef.current) {
      await formRef.current.submit();
    }
  }, [formRef]);

  // ========== Actions ==========

  const primaryActions = React.useMemo((): TransactionAction[] => {
    const actions: TransactionAction[] = [];

    // Only show Save button if we're in an editable mode (effectiveModeForHooks) and have permission
    if (effectiveModeForHooks !== "view" && approvalPermissions.canSave) {
      actions.push({
        label: "Save",
        onClick: handleSave,
        variant: "default",
        disabled: saving,
      });
    }

    actions.push({
      label: "Preview",
      onClick: () => setPreviewOpen(true),
      variant: "outline",
    });

    return actions;
  }, [effectiveModeForHooks, approvalPermissions, saving, handleSave]);

  // ========== Render ==========

  return (
    <>
      <TransactionWrapper
        title={mode === "create" ? "Create Jute PO" : mode === "edit" ? "Edit Jute PO" : "View Jute PO"}
        subtitle={details?.po_num ? `PO #${details.po_num}` : undefined}
        loading={loading || saving}
        backAction={{
          label: "Back to Jute PO List",
          onClick: () => router.push("/dashboardportal/jutePurchase/po"),
        }}
        alerts={
          <>
            {pageError && <div className="text-red-600 p-2">{pageError}</div>}
            {mode !== "view" && !areMandatoryFieldsFilled && (
              <div className="text-amber-600 bg-amber-50 border border-amber-200 rounded p-2 text-sm">
                Please fill all mandatory header fields before adding line items.
              </div>
            )}
            {mode !== "create" && !isStatusEditableEarly && (
              <div className="text-blue-600 bg-blue-50 border border-blue-200 rounded p-2 text-sm">
                This PO is in <strong>{approvalInfo?.statusLabel || "Approved"}</strong> status and cannot be edited.
              </div>
            )}
          </>
        }
        primaryActions={primaryActions}
        statusChip={
          mode !== "create" && approvalInfo
            ? { label: approvalInfo.statusLabel, color: approvalInfo.statusColor }
            : undefined
        }
        lineItems={{
          items: lineItems as unknown[],
          getItemId: (item: unknown) => (item as JutePOLineItem).id,
          canEdit: canEditLineItems,
          // Rows are removed via the per-row Delete action, not checkbox selection
          selectable: false,
          columns: lineItemColumns as unknown as { id: string; header: React.ReactNode; width?: string; renderCell: (context: { item: unknown; index: number; canEdit: boolean }) => React.ReactNode }[],
        }}
        footer={
          <>
            {mode !== "create" && (
              <JutePOApprovalBar
                approvalInfo={approvalInfo}
                permissions={approvalPermissions}
                loading={approvalLoading}
                onOpen={handleOpen}
                onApprove={handleApprove}
                onReject={handleReject}
                onCancelDraft={handleCancelDraft}
                onReopen={handleReopen}
              />
            )}
            <JutePOTotalsDisplay
              totalWeight={totalWeight}
              totalAmount={totalAmount}
              lineCount={validLineCount}
            />
          </>
        }
      >
        {isMounted ? (
          <>
            <JutePOHeaderForm
              schema={formSchema}
              formKey={formKey}
              initialValues={initialValues}
              mode={effectiveModeForHooks}
              formRef={formRef}
              onSubmit={handleFormSubmit}
              onValuesChange={(values) => setFormValues(values as unknown as JutePOFormValues)}
              onSupplierChange={handleSupplierChange}
            />
            {effectiveModeForHooks !== "view" && (
              <JutePOLineEntryForm
                disabled={!canEditLineItems}
                itemOptions={itemOptions}
                getQualityOptions={getQualityOptions}
                onItemSelect={handleItemSelect}
                editingLine={editingLine}
                onAdd={addLine}
                onUpdate={handleUpdateLine}
                onCancelEdit={handleCancelEdit}
              />
            )}
          </>
        ) : (
          <div className="animate-pulse space-y-4 p-4">
            <div className="h-10 bg-gray-200 rounded w-full" />
            <div className="h-10 bg-gray-200 rounded w-full" />
            <div className="h-10 bg-gray-200 rounded w-full" />
          </div>
        )}
      </TransactionWrapper>

      <JutePOPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        poNumber={details?.po_num}
        statusId={statusId}
        formValues={formValues}
        lineItems={lineItems}
        labelResolvers={labelResolvers}
        totalWeight={totalWeight}
        totalAmount={totalAmount}
      />
    </>
  );
}

export default function JutePOCreatePage() {
  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      }
    >
      <JutePOCreatePageContent />
    </Suspense>
  );
}
