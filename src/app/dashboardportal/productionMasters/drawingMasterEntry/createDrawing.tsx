"use client";

import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import {
  fetchDrawingCreateSetup,
  fetchDrawingEditSetup,
  createDrawing,
  updateDrawing,
  DrawingMachine,
  DrawingBranch,
} from "@/utils/drawingMasterService";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  drgMstId: number | null;
};

type FormData = {
  mc_id: string;
  short_name: string;
  shed_type: string;
  drg_type: string;
  const_meter: string;
  meter_type: string;
  branch_id: string;
};

const INITIAL: FormData = {
  mc_id: "",
  short_name: "",
  shed_type: "",
  drg_type: "",
  const_meter: "",
  meter_type: "1",
  branch_id: "",
};

export const METER_TYPES = [
  { value: 0, label: "No Meter" },
  { value: 1, label: "Hours" },
  { value: 2, label: "Seconds" },
] as const;

export const DRG_TYPES = [
  { value: 1, label: "1st Drawing" },
  { value: 2, label: "2nd Drawing" },
  { value: 3, label: "3rd Drawing" },
] as const;

export const SHED_TYPES = [
  { value: "New Shed", label: "New Shed" },
  { value: "Old Shed", label: "Old Shed" },
] as const;

const CreateDrawing: React.FC<Props> = ({ open, onClose, mode, drgMstId }) => {
  const { coId } = useSelectedCompanyCoId();
  const { selectedBranches } = useSidebarContext();
  const sidebarBranchId =
    selectedBranches && selectedBranches.length === 1 ? String(selectedBranches[0]) : "";
  const [formData, setFormData] = useState<FormData>(INITIAL);
  const [machines, setMachines] = useState<DrawingMachine[]>([]);
  const [branches, setBranches] = useState<DrawingBranch[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && coId) loadSetup();
    if (!open) {
      setFormData(INITIAL);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, coId]);

  const loadSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "create") {
        const { data, error } = await fetchDrawingCreateSetup(coId);
        if (error) throw new Error(error);
        setMachines(data?.machines || []);
        setBranches(data?.branches || []);
        if (sidebarBranchId) {
          setFormData((p) => ({ ...p, branch_id: sidebarBranchId }));
        }
      } else if (mode === "edit" && drgMstId) {
        const { data, error } = await fetchDrawingEditSetup(coId, drgMstId);
        if (error) throw new Error(error);
        setMachines(data?.machines || []);
        setBranches(data?.branches || []);
        const d = data?.drawing_details;
        if (d) {
          setFormData({
            mc_id: d.mc_id?.toString() || "",
            short_name: d.short_name || "",
            shed_type: d.shed_type || "",
            drg_type: d.drg_type?.toString() || "",
            const_meter: d.const_meter?.toString() || "",
            meter_type: d.meter_type?.toString() ?? "1",
            branch_id: d.branch_id?.toString() || "",
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load setup data");
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.mc_id) return setError("Machine is required");

      setSubmitting(true);
      setError(null);

      const payload = {
        mc_id: formData.mc_id,
        short_name: formData.short_name || undefined,
        shed_type: formData.shed_type || undefined,
        drg_type: formData.drg_type || undefined,
        const_meter: formData.const_meter || undefined,
        meter_type: formData.meter_type,
        branch_id: formData.branch_id || undefined,
      };

      const { error } =
        mode === "create"
          ? await createDrawing(payload)
          : await updateDrawing({
              ...payload,
              drg_mst_id: drgMstId?.toString() || "",
            });

      if (error) {
        setError(error);
        return;
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save drawing master");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(INITIAL);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === "create" ? "Create Drawing Master" : "Edit Drawing Master"}</DialogTitle>
      <DialogContent>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
            <CircularProgress />
          </div>
        ) : (
          <>
            {error && (
              <Alert severity="error" style={{ marginBottom: 16 }}>
                {error}
              </Alert>
            )}

            <Autocomplete
              fullWidth
              options={machines}
              getOptionLabel={(o) => o.machine_name}
              value={machines.find((m) => m.machine_id.toString() === formData.mc_id) || null}
              onChange={(_, v) =>
                setFormData((p) => ({ ...p, mc_id: v?.machine_id?.toString() || "" }))
              }
              disabled={submitting || mode === "edit"}
              noOptionsText="No machines found"
              renderInput={(params) => (
                <TextField {...params} label="Machine" margin="normal" required />
              )}
            />

            <TextField
              fullWidth
              label="Short Name"
              name="short_name"
              value={formData.short_name}
              onChange={handleInput}
              margin="normal"
              disabled={submitting}
              inputProps={{ maxLength: 10 }}
            />

            <Autocomplete
              fullWidth
              options={SHED_TYPES}
              getOptionLabel={(o) => o.label}
              value={SHED_TYPES.find((s) => s.value === formData.shed_type) || null}
              onChange={(_, v) =>
                setFormData((p) => ({ ...p, shed_type: v?.value || "" }))
              }
              disabled={submitting}
              renderInput={(params) => (
                <TextField {...params} label="Shed Type" margin="normal" />
              )}
            />

            <Autocomplete
              fullWidth
              options={DRG_TYPES}
              getOptionLabel={(o) => o.label}
              value={DRG_TYPES.find((d) => d.value.toString() === formData.drg_type) || null}
              onChange={(_, v) =>
                setFormData((p) => ({ ...p, drg_type: v?.value?.toString() || "" }))
              }
              disabled={submitting}
              renderInput={(params) => (
                <TextField {...params} label="Drawing Type" margin="normal" />
              )}
            />

            <TextField
              fullWidth
              label="Const Meter"
              name="const_meter"
              type="number"
              value={formData.const_meter}
              onChange={handleInput}
              margin="normal"
              disabled={submitting}
              inputProps={{ step: "1" }}
            />

            <Autocomplete
              fullWidth
              options={METER_TYPES}
              getOptionLabel={(o) => o.label}
              value={METER_TYPES.find((m) => m.value.toString() === formData.meter_type) || null}
              onChange={(_, v) =>
                setFormData((p) => ({ ...p, meter_type: v?.value?.toString() ?? "1" }))
              }
              disabled={submitting}
              renderInput={(params) => (
                <TextField {...params} label="Meter Type" margin="normal" required />
              )}
            />

            <Autocomplete
              fullWidth
              options={branches}
              getOptionLabel={(o) => o.branch_name}
              value={branches.find((b) => b.branch_id.toString() === formData.branch_id) || null}
              onChange={(_, v) =>
                setFormData((p) => ({ ...p, branch_id: v?.branch_id?.toString() || "" }))
              }
              disabled={submitting || !!sidebarBranchId}
              readOnly={!!sidebarBranchId}
              noOptionsText="No branches found"
              renderInput={(params) => (
                <TextField {...params} label="Branch" margin="normal" />
              )}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting || loading}>
          {submitting ? <CircularProgress size={20} /> : mode === "create" ? "Create" : "Update"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateDrawing;
