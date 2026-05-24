"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  fetchMachineSpgDetailsCreateSetup,
  fetchMachineSpgDetailsEditSetup,
  fetchMachinesByBranch,
  createMachineSpgDetails,
  updateMachineSpgDetails,
} from "@/utils/machineSpgDetailsService";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";

type CreateMachineSpgDetailsProps = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  mc_spg_det_id: number | null;
};

type Branch = {
  branch_id: number;
  branch_name: string;
};

type Machine = {
  machine_id: number;
  machine_name: string;
  mech_code: string;
  machine_type_id: number;
};

type FormData = {
  branch_id: string;
  mechine_id: string;
  machine_name: string;
  speed: string;
  no_of_spindle: string;
  weight_per_spindle: string;
  is_active: boolean;
};

const INITIAL_FORM_DATA: FormData = {
  branch_id: "",
  mechine_id: "",
  machine_name: "",
  speed: "",
  no_of_spindle: "",
  weight_per_spindle: "",
  is_active: true,
};

const CreateMachineSpgDetails: React.FC<CreateMachineSpgDetailsProps> = ({ open, onClose, mode, mc_spg_det_id }) => {
  const { coId } = useSelectedCompanyCoId();
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load setup data when dialog opens
  useEffect(() => {
    if (open && coId) {
      loadSetupData();
    }
  }, [open, coId]);

  // Load machines when branch changes
  useEffect(() => {
    if (formData.branch_id && open) {
      loadMachinesByBranch();
    }
  }, [formData.branch_id, open]);

  const loadSetupData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "create") {
        const { data, error } = await fetchMachineSpgDetailsCreateSetup(coId);
        if (error) {
          throw new Error(error);
        }
        setBranches(data?.branches || []);
      } else if (mode === "edit" && mc_spg_det_id) {
        const { data, error } = await fetchMachineSpgDetailsEditSetup(coId, mc_spg_det_id);
        if (error) {
          throw new Error(error);
        }

        setBranches(data?.branches || []);
        if (data?.machine_spg_details) {
          const details = data.machine_spg_details;
          setFormData({
            branch_id: details.branch_id?.toString() || "",
            mechine_id: details.mechine_id?.toString() || "",
            machine_name: details.machine_name || "",
            speed: details.speed?.toString() || "",
            no_of_spindle: details.no_of_spindle?.toString() || "",
            weight_per_spindle: details.weight_per_spindle?.toString() || "",
            is_active: details.is_active === 1,
          });
          // Load machines for the selected branch
          if (details.branch_id) {
            await loadMachinesByBranch(details.branch_id?.toString());
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load setup data");
    } finally {
      setLoading(false);
    }
  };

  const loadMachinesByBranch = async (branchId?: string) => {
    try {
      const bid = branchId || formData.branch_id;
      if (!bid) return;

      const { data, error } = await fetchMachinesByBranch(bid);
      if (error) {
        throw new Error(error);
      }
      setMachines(data?.machines || []);
    } catch (err: any) {
      console.error("Error loading machines:", err.message);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.branch_id) {
        setError("Branch is required");
        return;
      }
      if (!formData.mechine_id) {
        setError("Machine is required");
        return;
      }

      setSubmitting(true);
      setError(null);

      const payload = {
        co_id: coId,
        branch_id: formData.branch_id,
        mechine_id: formData.mechine_id,
        speed: formData.speed || undefined,
        no_of_spindle: formData.no_of_spindle || undefined,
        weight_per_spindle: formData.weight_per_spindle || undefined,
        is_active: formData.is_active ? 1 : 0,
      };

      let response;
      if (mode === "create") {
        response = await createMachineSpgDetails(payload);
      } else {
        response = await updateMachineSpgDetails({
          ...payload,
          mc_spg_det_id: mc_spg_det_id?.toString() || "",
        });
      }

      const { error } = response;
      if (error) {
        setError(error);
        return;
      }

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save machine SPG details");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(INITIAL_FORM_DATA);
    setMachines([]);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === "create" ? "Create Machine SPG Details" : "Edit Machine SPG Details"}</DialogTitle>
      <DialogContent>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
            <CircularProgress />
          </div>
        ) : (
          <>
            {error && <Alert severity="error" style={{ marginBottom: "16px" }}>{error}</Alert>}

            <Autocomplete
              fullWidth
              options={branches}
              getOptionLabel={(option) => option.branch_name}
              value={
                branches.find((branch) => branch.branch_id.toString() === formData.branch_id) || null
              }
              onChange={(event, newValue) => {
                setFormData((prev) => ({
                  ...prev,
                  branch_id: newValue?.branch_id?.toString() || "",
                }));
              }}
              disabled={submitting || mode === "edit"}
              noOptionsText="No branches found"
              loading={loading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Branch"
                  placeholder="Search branch..."
                  margin="normal"
                  required
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            <Autocomplete
              fullWidth
              options={machines}
              getOptionLabel={(option) => option.machine_name}
              value={
                machines.find((machine) => machine.machine_id.toString() === formData.mechine_id) || null
              }
              onChange={(event, newValue) => {
                setFormData((prev) => ({
                  ...prev,
                  mechine_id: newValue?.machine_id?.toString() || "",
                  machine_name: newValue?.machine_name || "",
                }));
              }}
              disabled={submitting || mode === "edit"}
              noOptionsText="No machines found"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Machine Name"
                  placeholder="Search machine..."
                  margin="normal"
                  required
                  InputProps={{
                    ...params.InputProps,
                  }}
                />
              )}
            />

            <TextField
              fullWidth
              label="Speed"
              name="speed"
              type="number"
              value={formData.speed}
              onChange={handleInputChange}
              margin="normal"
              disabled={submitting}
              inputProps={{ step: "0.01" }}
            />

            <TextField
              fullWidth
              label="Number of Spindles"
              name="no_of_spindle"
              type="number"
              value={formData.no_of_spindle}
              onChange={handleInputChange}
              margin="normal"
              disabled={submitting}
              inputProps={{ step: "1" }}
            />

            <TextField
              fullWidth
              label="Weight per Spindle"
              name="weight_per_spindle"
              type="number"
              value={formData.weight_per_spindle}
              onChange={handleInputChange}
              margin="normal"
              disabled={submitting}
              inputProps={{ step: "0.001" }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleCheckboxChange}
                  disabled={submitting}
                />
              }
              label="Active"
              style={{ marginTop: "16px" }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading || submitting}>
          {submitting ? <CircularProgress size={24} /> : mode === "create" ? "Create" : "Update"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateMachineSpgDetails;
