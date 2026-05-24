"use client";

import React, { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogContent, DialogTitle, MenuItem, TextField, FormControlLabel, Switch, CircularProgress, Alert, Autocomplete } from "@mui/material";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

interface Props {
  open?: boolean;
  onClose?: (saved?: boolean) => void;
  existingRows?: any[];
  readOnly?: boolean;
  initialValues?: any;
  isEdit?: boolean;
  mc_spg_det_id?: string | number;
}

export default function CreateMachineSpgDetailsPage({
  open = false,
  onClose,
  existingRows = [],
  readOnly = false,
  initialValues = null,
  isEdit = false,
  mc_spg_det_id,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [branchOptions, setBranchOptions] = useState<any[]>([]);
  const [machineOptions, setMachineOptions] = useState<any[]>([]);
  const [form, setForm] = useState({
    branch_id: "",
    mechine_id: "",
    machine_name: "",
    speed: "",
    no_of_spindle: "",
    weight_per_spindle: "",
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load setup data
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
        const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";

        const params = new URLSearchParams({ co_id });
        const url = `${apiRoutesPortalMasters.MACHINE_SPG_DETAILS_CREATE_SETUP}?${params}`;
        const { data, error } = await fetchWithCookie(url, "GET") as any;

        if (error || !data) throw new Error(error || "Failed to load setup");

        const candidate = data?.data ?? data;
        const branches = candidate?.branches || [];

        const rawBranches = Array.isArray(branches) ? branches : [branches];
        const normalizedBranches = rawBranches
          .map((b: any) => ({
            id: String(b.branch_id ?? b.id ?? ""),
            label: b.branch_name ?? b.name ?? "",
            raw: b,
          }))
          .filter((x: any) => x.id);

        setBranchOptions(normalizedBranches);

        // Set default branch if available
        if (!initialValues && normalizedBranches.length > 0) {
          setForm((f) => ({ ...f, branch_id: normalizedBranches[0]?.id ?? "" }));
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load setup");
        setBranchOptions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, initialValues]);

  // Load machines when branch changes
  useEffect(() => {
    if (!form.branch_id || !open) return;

    (async () => {
      try {
        const params = new URLSearchParams({ branch_id: form.branch_id });
        const url = `${apiRoutesPortalMasters.MACHINE_SPG_DETAILS_MACHINES_BY_BRANCH}?${params}`;
        const { data, error } = await fetchWithCookie(url, "GET") as any;

        if (error || !data) throw new Error(error || "Failed to load machines");

        const candidate = data?.data ?? data;
        const machines = candidate?.machines || [];

        const rawMachines = Array.isArray(machines) ? machines : [machines];
        const normalizedMachines = rawMachines
          .map((m: any) => ({
            id: String(m.machine_id ?? m.id ?? ""),
            label: m.machine_name ?? m.name ?? "",
            raw: m,
          }))
          .filter((x: any) => x.id);

        setMachineOptions(normalizedMachines);
      } catch (err: any) {
        console.error("Failed to load machines:", err.message);
        setMachineOptions([]);
      }
    })();
  }, [form.branch_id, open]);

  // Apply initial values when provided
  useEffect(() => {
    if (!initialValues) return;
    setForm({
      branch_id: String(initialValues.branch_id ?? ""),
      mechine_id: String(initialValues.mechine_id ?? ""),
      machine_name: initialValues.machine_name ?? "",
      speed: String(initialValues.speed ?? ""),
      no_of_spindle: String(initialValues.no_of_spindle ?? ""),
      weight_per_spindle: String(initialValues.weight_per_spindle ?? ""),
      is_active: initialValues.is_active === 1 || initialValues.is_active === true,
    });
  }, [initialValues]);

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      if (!form.branch_id) {
        setError("Branch is required");
        return;
      }
      if (!form.mechine_id) {
        setError("Machine is required");
        return;
      }

      setSubmitting(true);
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";

      const payload = {
        co_id,
        branch_id: form.branch_id,
        mechine_id: form.mechine_id,
        speed: form.speed ? parseFloat(form.speed) : null,
        no_of_spindle: form.no_of_spindle ? parseInt(form.no_of_spindle) : null,
        weight_per_spindle: form.weight_per_spindle ? parseFloat(form.weight_per_spindle) : null,
        is_active: form.is_active ? 1 : 0,
        ...(isEdit && { mc_spg_det_id }),
      };

      const url = isEdit
        ? apiRoutesPortalMasters.MACHINE_SPG_DETAILS_EDIT
        : apiRoutesPortalMasters.MACHINE_SPG_DETAILS_CREATE;
      const method = isEdit ? "PUT" : "POST";

      const { data, error } = await fetchWithCookie(url, method, payload) as any;
      if (error) throw new Error(error);

      onClose?.(true);
    } catch (err: any) {
      setError(err?.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm({
      branch_id: "",
      mechine_id: "",
      machine_name: "",
      speed: "",
      no_of_spindle: "",
      weight_per_spindle: "",
      is_active: true,
    });
    onClose?.(false);
  };

  return (
    <Dialog open={open ?? false} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Edit Machine SPG Details" : "Create Machine SPG Details"}</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              select
              label="Branch"
              value={form.branch_id}
              onChange={(e) => handleChange("branch_id", e.target.value)}
              disabled={submitting || isEdit || readOnly}
              required
              fullWidth
            >
              {branchOptions.map((opt) => (
                <MenuItem key={opt.id} value={opt.id}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>

            <Autocomplete
              options={machineOptions}
              getOptionLabel={(option) => option.label}
              value={machineOptions.find((m) => m.id === form.mechine_id) || null}
              onChange={(event, newValue) => {
                if (newValue) {
                  handleChange("mechine_id", newValue.id);
                  handleChange("machine_name", newValue.label);
                } else {
                  handleChange("mechine_id", "");
                  handleChange("machine_name", "");
                }
              }}
              disabled={submitting || (isEdit && readOnly) || !form.branch_id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Machine Name"
                  required
                  placeholder="Search and select machine"
                />
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText="No machines available"
            />

            <TextField
              label="Speed"
              type="number"
              value={form.speed}
              onChange={(e) => handleChange("speed", e.target.value)}
              disabled={submitting || readOnly}
              inputProps={{ step: "0.01" }}
              fullWidth
            />

            <TextField
              label="Number of Spindles"
              type="number"
              value={form.no_of_spindle}
              onChange={(e) => handleChange("no_of_spindle", e.target.value)}
              disabled={submitting || readOnly}
              inputProps={{ step: "1" }}
              fullWidth
            />

            <TextField
              label="Weight per Spindle"
              type="number"
              value={form.weight_per_spindle}
              onChange={(e) => handleChange("weight_per_spindle", e.target.value)}
              disabled={submitting || readOnly}
              inputProps={{ step: "0.001" }}
              fullWidth
            />

            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(e) => handleChange("is_active", e.target.checked)}
                  disabled={submitting || readOnly}
                />
              }
              label="Active"
            />
          </Box>
        )}
      </DialogContent>
      {!readOnly && (
        <Box sx={{ p: 2, display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading || submitting}>
            {submitting ? <CircularProgress size={24} /> : isEdit ? "Update" : "Create"}
          </Button>
        </Box>
      )}
    </Dialog>
  );
}
