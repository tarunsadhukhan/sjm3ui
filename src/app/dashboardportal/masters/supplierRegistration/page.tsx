"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  CircularProgress,
  Paper,
} from "@mui/material";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import {
  fetchSupplierSetup,
  registerSupplier,
  type SupplierRegistrationSetup,
  type BranchPayload,
  type SupplierRegisterPayload,
} from "@/utils/supplierRegistrationService";

interface SupplierForm {
  supp_name: string;
  party_type: string;
  entity_type_id: string;
  country_id: string;
  phone_no: string;
  cin: string;
  party_pan_no: string;
  msme_certified: string;
  supp_contact_person: string;
  supp_contact_designation: string;
  supp_email_id: string;
}

const EMPTY_SUPPLIER: SupplierForm = {
  supp_name: "",
  party_type: "",
  entity_type_id: "",
  country_id: "",
  phone_no: "",
  cin: "",
  party_pan_no: "",
  msme_certified: "",
  supp_contact_person: "",
  supp_contact_designation: "",
  supp_email_id: "",
};

const EMPTY_BRANCH: BranchPayload = {};

const isBranchEmpty = (b: BranchPayload): boolean =>
  !b.address && !b.address_additional && !b.gst_no && !b.zip_code && !b.state && !b.city &&
  !b.contact_person && !b.contact_no && !b.whatsapp_no && !b.email_id && !b.bank_acc_no &&
  !b.ifsc_code && !b.bank_name && !b.bank_branch && !b.upi_code;

export default function SupplierRegistrationPage() {
  const { coId } = useSelectedCompanyCoId();
  const [setup, setSetup] = useState<SupplierRegistrationSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplier, setSupplier] = useState<SupplierForm>(EMPTY_SUPPLIER);
  const [branch, setBranch] = useState<BranchPayload>({ ...EMPTY_BRANCH });

  useEffect(() => {
    if (!coId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await fetchSupplierSetup(coId);
      if (cancelled) return;
      if (error || !data) {
        Swal.fire({ title: "Error", text: error || "Failed to load setup", icon: "error" });
      } else {
        setSetup(data);
        // Default party type to "Jute Supplier"
        const juteType = data.party_types.find((p) =>
          p.party_types_mst_name?.toLowerCase().includes("jute supplier"),
        );
        if (juteType) {
          setSupplier((prev) => ({ ...prev, party_type: String(juteType.party_types_mst_id) }));
        }
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [coId]);

  const updateSupplier = useCallback(
    (field: keyof SupplierForm, value: string) =>
      setSupplier((prev) => ({ ...prev, [field]: value })),
    [],
  );

  const updateBranch = useCallback(
    (patch: Partial<BranchPayload>) => setBranch((prev) => ({ ...prev, ...patch })),
    [],
  );

  const resetForm = useCallback(() => {
    const juteType = setup?.party_types.find((p) =>
      p.party_types_mst_name?.toLowerCase().includes("jute supplier"),
    );
    setSupplier({ ...EMPTY_SUPPLIER, party_type: juteType ? String(juteType.party_types_mst_id) : "" });
    setBranch({ ...EMPTY_BRANCH });
  }, [setup]);

  // City options for a branch, filtered by its selected state
  const citiesForState = useCallback(
    (stateVal?: string | number) =>
      (setup?.cities ?? []).filter((c) => String(c.state_id) === String(stateVal ?? "")),
    [setup],
  );

  const doRegister = useCallback(
    async (payload: SupplierRegisterPayload) => {
      const { data, error, status } = await registerSupplier(payload);

      if (error) {
        // 409 = duplicate party name (hard block), others = generic error
        Swal.fire({
          title: status === 409 ? "Duplicate Party Name" : "Save Failed",
          text: error,
          icon: status === 409 ? "warning" : "error",
        });
        return;
      }

      // Soft duplicate on branch unique fields — ask to continue
      if (data?.duplicate && data.conflicts?.length) {
        const list = data.conflicts
          .map((c) => `• ${c.label} <b>${c.value}</b> is already entered`)
          .join("<br/>");
        const confirm = await Swal.fire({
          title: "Already Linked",
          html: `${list}<br/><br/>Do you want to continue and save anyway?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes, save",
          cancelButtonText: "No, let me correct",
        });
        if (confirm.isConfirmed) {
          await doRegister({ ...payload, force: true });
        }
        return;
      }

      await Swal.fire({
        title: "Registered",
        text: `Supplier saved successfully${data?.supp_code ? ` (Code: ${data.supp_code})` : ""}`,
        icon: "success",
      });
      resetForm();
    },
    [resetForm],
  );

  const handleSubmit = useCallback(async () => {
    if (!coId) return;
    if (!supplier.supp_name.trim()) {
      Swal.fire({ title: "Required", text: "Party name is required", icon: "warning" });
      return;
    }
    if (!supplier.party_type) {
      Swal.fire({ title: "Required", text: "Please select a party type", icon: "warning" });
      return;
    }
    const cleanBranches = isBranchEmpty(branch) ? [] : [branch];

    setSaving(true);
    try {
      await doRegister({
        co_id: coId,
        ...supplier,
        branches: cleanBranches,
      });
    } finally {
      setSaving(false);
    }
  }, [coId, supplier, branch, doRegister]);

  const partyTypes = setup?.party_types ?? [];
  const entities = setup?.entities ?? [];
  const countries = setup?.countries ?? [];
  const states = setup?.states ?? [];

  const supplierFields = useMemo(
    () => (
      <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TextField
          label="Party Name *"
          size="small"
          value={supplier.supp_name}
          onChange={(e) => updateSupplier("supp_name", e.target.value)}
        />
        <TextField
          label="Party Type *"
          size="small"
          select
          value={supplier.party_type}
          onChange={(e) => updateSupplier("party_type", e.target.value)}
        >
          {partyTypes.map((p) => (
            <MenuItem key={p.party_types_mst_id} value={String(p.party_types_mst_id)}>
              {p.party_types_mst_name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Supplier Code"
          size="small"
          value="Auto-generated on save"
          disabled
        />
        <TextField
          label="Entity Type"
          size="small"
          select
          value={supplier.entity_type_id}
          onChange={(e) => updateSupplier("entity_type_id", e.target.value)}
        >
          <MenuItem value="">Select</MenuItem>
          {entities.map((en) => (
            <MenuItem key={en.entity_type_id} value={String(en.entity_type_id)}>
              {en.entity_type_name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Country"
          size="small"
          select
          value={supplier.country_id}
          onChange={(e) => updateSupplier("country_id", e.target.value)}
        >
          <MenuItem value="">Select</MenuItem>
          {countries.map((c) => (
            <MenuItem key={c.country_id} value={String(c.country_id)}>
              {c.country}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="MSME Certified"
          size="small"
          value={supplier.msme_certified}
          onChange={(e) => updateSupplier("msme_certified", e.target.value)}
        />
        <TextField
          label="Contact Person"
          size="small"
          value={supplier.supp_contact_person}
          onChange={(e) => updateSupplier("supp_contact_person", e.target.value)}
        />
        <TextField
          label="Contact Designation"
          size="small"
          value={supplier.supp_contact_designation}
          onChange={(e) => updateSupplier("supp_contact_designation", e.target.value)}
        />
        <TextField
          label="Contact Email"
          size="small"
          value={supplier.supp_email_id}
          onChange={(e) => updateSupplier("supp_email_id", e.target.value)}
        />
        <TextField
          label="Phone No"
          size="small"
          value={supplier.phone_no}
          onChange={(e) => updateSupplier("phone_no", e.target.value)}
        />
        <TextField
          label="CIN"
          size="small"
          value={supplier.cin}
          onChange={(e) => updateSupplier("cin", e.target.value)}
        />
        <TextField
          label="PAN No"
          size="small"
          value={supplier.party_pan_no}
          onChange={(e) => updateSupplier("party_pan_no", e.target.value)}
        />
      </Box>
    ),
    [supplier, partyTypes, entities, countries, updateSupplier],
  );

  const branchField = useCallback(
    (field: keyof BranchPayload, label: string) => (
      <TextField
        label={label}
        size="small"
        value={(branch[field] as string | number | undefined) ?? ""}
        onChange={(e) => updateBranch({ [field]: e.target.value })}
      />
    ),
    [branch, updateBranch],
  );

  const branchFields = useMemo(
    () => (
      <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {branchField("address", "Address")}
        {branchField("address_additional", "Address Additional")}
        {branchField("gst_no", "GST No")}
        {branchField("zip_code", "Zip Code")}
        <TextField
          label="State"
          size="small"
          select
          value={(branch.state as string | number | undefined) ?? ""}
          onChange={(e) => updateBranch({ state: e.target.value, city: "" })}
        >
          <MenuItem value="">Select</MenuItem>
          {states.map((s) => (
            <MenuItem key={s.state_id} value={String(s.state_id)}>
              {s.state}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="City"
          size="small"
          select
          value={(branch.city as string | number | undefined) ?? ""}
          onChange={(e) => updateBranch({ city: e.target.value })}
          disabled={!branch.state}
        >
          <MenuItem value="">Select</MenuItem>
          {citiesForState(branch.state).map((c) => (
            <MenuItem key={c.city_id} value={String(c.city_id)}>
              {c.city_name}
            </MenuItem>
          ))}
        </TextField>
        {branchField("contact_person", "Contact Person")}
        {branchField("contact_no", "Contact No")}
        {branchField("whatsapp_no", "WhatsApp No")}
        {branchField("email_id", "Email")}
        {branchField("bank_acc_no", "Bank Account No")}
        {branchField("ifsc_code", "IFSC Code")}
        {branchField("bank_name", "Bank Name")}
        {branchField("bank_branch", "Bank Branch")}
        {branchField("upi_code", "UPI Code")}
      </Box>
    ),
    [branch, states, citiesForState, updateBranch, branchField],
  );

  if (loading) {
    return (
      <Box className="flex items-center justify-center py-12">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="flex flex-col gap-6 p-6">
      <Typography variant="h5" fontWeight={600}>
        Supplier Registration
      </Typography>

      {/* Supplier details */}
      <Paper elevation={0} className="rounded-lg border p-5">
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          Supplier Details
        </Typography>
        {supplierFields}
      </Paper>

      {/* Branch details — single branch, same form style as header */}
      <Paper elevation={0} className="rounded-lg border p-5">
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          Branch Details
        </Typography>
        {branchFields}
      </Paper>

      <Box className="flex justify-end">
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : "Submit"}
        </Button>
      </Box>
    </Box>
  );
}
