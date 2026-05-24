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
  fetchSpinningQualityCreateSetup,
  fetchSpinningQualityEditSetup,
  createSpinningQuality,
  updateSpinningQuality,
  SpgType,
  Branch,
} from "@/utils/spinningQualityService";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  spgQualityMstId: number | null;
};

type FormData = {
  spg_quality: string;
  branch_id: string;
  spg_type_id: string;
  speed: string;
  tpi: string;
  std_count: string;
  no_of_spindles: string;
  frame_type: string;
  target_eff: string;
};

const INITIAL: FormData = {
  spg_quality: "",
  branch_id: "",
  spg_type_id: "",
  speed: "",
  tpi: "",
  std_count: "",
  no_of_spindles: "",
  frame_type: "",
  target_eff: "",
};

const FRAME_TYPE_OPTIONS = ["2 Leg", "Boxter Flyer"];

const CreateSpinningQuality: React.FC<Props> = ({ open, onClose, mode, spgQualityMstId }) => {
  const { coId } = useSelectedCompanyCoId();
  const { selectedBranches } = useSidebarContext();
  const sidebarBranchId =
    selectedBranches && selectedBranches.length === 1 ? String(selectedBranches[0]) : "";
  const [formData, setFormData] = useState<FormData>(INITIAL);
  const [spgTypes, setSpgTypes] = useState<SpgType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
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
        const { data, error } = await fetchSpinningQualityCreateSetup(coId);
        if (error) throw new Error(error);
        setSpgTypes(data?.spg_types || []);
        setBranches(data?.branches || []);
        if (sidebarBranchId) {
          setFormData((p) => ({ ...p, branch_id: sidebarBranchId }));
        }
      } else if (mode === "edit" && spgQualityMstId) {
        const { data, error } = await fetchSpinningQualityEditSetup(coId, spgQualityMstId);
        if (error) throw new Error(error);
        setSpgTypes(data?.spg_types || []);
        setBranches(data?.branches || []);
        const d = data?.spinning_quality_details;
        if (d) {
          setFormData({
            spg_quality: d.spg_quality || "",
            branch_id: d.branch_id?.toString() || "",
            spg_type_id: d.spg_type_id?.toString() || "",
            speed: d.speed?.toString() || "",
            tpi: d.tpi?.toString() || "",
            std_count: d.std_count?.toString() || "",
            no_of_spindles: d.no_of_spindles?.toString() || "",
            frame_type: d.frame_type || "",
            target_eff: d.target_eff?.toString() || "",
          });
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load setup data");
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
      if (!formData.spg_quality.trim()) return setError("Spg Quality is required");
      if (!formData.branch_id) return setError("Branch is required");
      if (!formData.spg_type_id) return setError("Spinning Group is required");

      setSubmitting(true);
      setError(null);

      const payload = {
        co_id: coId,
        branch_id: formData.branch_id,
        spg_type_id: formData.spg_type_id,
        spg_quality: formData.spg_quality,
        speed: formData.speed || undefined,
        tpi: formData.tpi || undefined,
        std_count: formData.std_count || undefined,
        no_of_spindles: formData.no_of_spindles || undefined,
        frame_type: formData.frame_type || undefined,
        target_eff: formData.target_eff || undefined,
      };

      const { error } =
        mode === "create"
          ? await createSpinningQuality(payload)
          : await updateSpinningQuality({
              ...payload,
              spg_quality_mst_id: spgQualityMstId?.toString() || "",
            });

      if (error) {
        setError(error);
        return;
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save spinning quality");
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
      <DialogTitle>{mode === "create" ? "Create Spinning Quality" : "Edit Spinning Quality"}</DialogTitle>
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
              options={branches}
              getOptionLabel={(o) => o.branch_name}
              value={branches.find((b) => b.branch_id.toString() === formData.branch_id) || null}
              onChange={(_, v) =>
                setFormData((p) => ({ ...p, branch_id: v?.branch_id?.toString() || "" }))
              }
              disabled={submitting || mode === "edit" || !!sidebarBranchId}
              readOnly={!!sidebarBranchId}
              noOptionsText="No branches found"
              renderInput={(params) => (
                <TextField {...params} label="Branch" margin="normal" required />
              )}
            />

            <TextField
              fullWidth
              label="Spg Quality"
              name="spg_quality"
              value={formData.spg_quality}
              onChange={handleInput}
              margin="normal"
              required
              disabled={submitting}
            />

            <Autocomplete
              fullWidth
              options={spgTypes}
              getOptionLabel={(o) => o.spg_type_name}
              value={spgTypes.find((t) => t.spg_type_mst_id.toString() === formData.spg_type_id) || null}
              onChange={(_, v) =>
                setFormData((p) => ({ ...p, spg_type_id: v?.spg_type_mst_id?.toString() || "" }))
              }
              disabled={submitting}
              noOptionsText="No spinning groups found"
              renderInput={(params) => (
                <TextField {...params} label="Spinning Group" margin="normal" required />
              )}
            />

            <TextField
              fullWidth
              label="Speed"
              name="speed"
              type="number"
              value={formData.speed}
              onChange={handleInput}
              margin="normal"
              disabled={submitting}
              inputProps={{ step: "1" }}
            />

            <TextField
              fullWidth
              label="TPI"
              name="tpi"
              type="number"
              value={formData.tpi}
              onChange={handleInput}
              margin="normal"
              disabled={submitting}
              inputProps={{ step: "0.001" }}
            />

            <TextField
              fullWidth
              label="Std Count"
              name="std_count"
              type="number"
              value={formData.std_count}
              onChange={handleInput}
              margin="normal"
              disabled={submitting}
              inputProps={{ step: "0.01" }}
            />

            <TextField
              fullWidth
              label="No. of Spindles"
              name="no_of_spindles"
              type="number"
              value={formData.no_of_spindles}
              onChange={handleInput}
              margin="normal"
              disabled={submitting}
              inputProps={{ step: "1" }}
            />

            <Autocomplete
              fullWidth
              options={FRAME_TYPE_OPTIONS}
              value={formData.frame_type || null}
              onChange={(_, v) => setFormData((p) => ({ ...p, frame_type: v || "" }))}
              disabled={submitting}
              renderInput={(params) => (
                <TextField {...params} label="Frame Type" margin="normal" />
              )}
            />

            <TextField
              fullWidth
              label="Target Efficiency"
              name="target_eff"
              type="number"
              value={formData.target_eff}
              onChange={handleInput}
              margin="normal"
              disabled={submitting}
              inputProps={{ step: "1" }}
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

export default CreateSpinningQuality;
