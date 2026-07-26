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
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  fetchJuteQualityCreateSetup,
  fetchJuteQualityEditSetup,
  createJuteQuality,
  updateJuteQuality,
  Branch,
  JuteItemOption,
} from "@/utils/juteQualityEntryService";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  juteQltyId: number | null;
};

type FormData = {
  jute_quality: string;
  shr_name: string;
  branch_id: string;
  item_id: string;
  active: boolean;
};

const INITIAL: FormData = {
  jute_quality: "",
  shr_name: "",
  branch_id: "",
  item_id: "",
  active: true,
};

const CreateJuteQuality: React.FC<Props> = ({ open, onClose, mode, juteQltyId }) => {
  const { coId } = useSelectedCompanyCoId();
  const { selectedBranches } = useSidebarContext();
  const sidebarBranchId =
    selectedBranches && selectedBranches.length === 1 ? String(selectedBranches[0]) : "";
  const [formData, setFormData] = useState<FormData>(INITIAL);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<JuteItemOption[]>([]);
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
        const { data, error } = await fetchJuteQualityCreateSetup(coId);
        if (error) throw new Error(error);
        setBranches(data?.branches || []);
        setItems(data?.items || []);
        if (sidebarBranchId) {
          setFormData((p) => ({ ...p, branch_id: sidebarBranchId }));
        }
      } else if (mode === "edit" && juteQltyId) {
        const { data, error } = await fetchJuteQualityEditSetup(coId, juteQltyId);
        if (error) throw new Error(error);
        setBranches(data?.branches || []);
        setItems(data?.items || []);
        const d = data?.jute_quality_details;
        if (d) {
          setFormData({
            jute_quality: d.jute_quality || "",
            shr_name: d.shr_name || "",
            branch_id: d.branch_id?.toString() || "",
            item_id: d.item_id?.toString() || "",
            active: d.active !== 0,
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
      if (!formData.jute_quality.trim()) return setError("Jute Quality is required");
      if (!formData.branch_id) return setError("Branch is required");

      setSubmitting(true);
      setError(null);

      const payload = {
        co_id: coId,
        branch_id: formData.branch_id,
        jute_quality: formData.jute_quality.trim(),
        shr_name: formData.shr_name.trim() || undefined,
        item_id: formData.item_id,
        active: formData.active ? "1" : "0",
      };

      const { error } =
        mode === "create"
          ? await createJuteQuality(payload)
          : await updateJuteQuality({ ...payload, jute_qlty_id: juteQltyId?.toString() || "" });

      if (error) {
        setError(error);
        return;
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save jute quality");
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
      <DialogTitle>{mode === "create" ? "Create Jute Quality" : "Edit Jute Quality"}</DialogTitle>
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
              label="Jute Quality"
              name="jute_quality"
              value={formData.jute_quality}
              onChange={handleInput}
              margin="normal"
              required
              disabled={submitting}
              inputProps={{ maxLength: 25 }}
            />

            <TextField
              fullWidth
              label="Short Name"
              name="shr_name"
              value={formData.shr_name}
              onChange={handleInput}
              margin="normal"
              disabled={submitting}
              inputProps={{ maxLength: 10 }}
            />

            <Autocomplete
              fullWidth
              options={items}
              getOptionLabel={(o) => `${o.item_code} - ${o.item_name}`}
              value={items.find((i) => i.item_id.toString() === formData.item_id) || null}
              onChange={(_, v) =>
                setFormData((p) => ({ ...p, item_id: v?.item_id?.toString() || "" }))
              }
              disabled={submitting}
              noOptionsText="No items found"
              renderInput={(params) => (
                <TextField {...params} label="Item" margin="normal" />
              )}
            />

            <FormControlLabel
              sx={{ mt: 1 }}
              control={
                <Switch
                  checked={formData.active}
                  onChange={(_, checked) => setFormData((p) => ({ ...p, active: checked }))}
                  disabled={submitting}
                />
              }
              label="Active"
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

export default CreateJuteQuality;
