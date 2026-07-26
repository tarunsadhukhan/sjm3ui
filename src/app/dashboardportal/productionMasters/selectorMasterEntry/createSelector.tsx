"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  fetchSelectorCreateSetup,
  fetchSelectorEditSetup,
  createSelector,
  updateSelector,
  Branch,
  SelectorOption,
} from "@/utils/selectorService";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  selectorId: number | null;
};

type FormData = {
  selector_name: string;
  selector_shr_name: string;
  branch_id: string;
  under_selector: string;
  active: boolean;
};

const INITIAL: FormData = {
  selector_name: "",
  selector_shr_name: "",
  branch_id: "",
  under_selector: "",
  active: true,
};

const CreateSelector: React.FC<Props> = ({ open, onClose, mode, selectorId }) => {
  const { coId } = useSelectedCompanyCoId();
  const { selectedBranches } = useSidebarContext();
  const sidebarBranchId =
    selectedBranches && selectedBranches.length === 1 ? String(selectedBranches[0]) : "";
  const [formData, setFormData] = useState<FormData>(INITIAL);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectors, setSelectors] = useState<SelectorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A selector cannot be its own parent
  const parentOptions = useMemo(
    () => selectors.filter((s) => s.tbl_selector_mst_id !== selectorId),
    [selectors, selectorId]
  );

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
        const { data, error } = await fetchSelectorCreateSetup(coId);
        if (error) throw new Error(error);
        setBranches(data?.branches || []);
        setSelectors(data?.selectors || []);
        if (sidebarBranchId) {
          setFormData((p) => ({ ...p, branch_id: sidebarBranchId }));
        }
      } else if (mode === "edit" && selectorId) {
        const { data, error } = await fetchSelectorEditSetup(coId, selectorId);
        if (error) throw new Error(error);
        setBranches(data?.branches || []);
        setSelectors(data?.selectors || []);
        const d = data?.selector_details;
        if (d) {
          setFormData({
            selector_name: d.selector_name || "",
            selector_shr_name: d.selector_shr_name || "",
            branch_id: d.branch_id?.toString() || "",
            under_selector: d.under_selectror_master?.toString() || "",
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
      if (!formData.selector_name.trim()) return setError("Selector Name is required");
      if (!formData.branch_id) return setError("Branch is required");

      setSubmitting(true);
      setError(null);

      const payload = {
        co_id: coId,
        branch_id: formData.branch_id,
        selector_name: formData.selector_name.trim(),
        selector_shr_name: formData.selector_shr_name.trim() || undefined,
        under_selector: formData.under_selector,
        active: formData.active ? "1" : "0",
      };

      const { error } =
        mode === "create"
          ? await createSelector(payload)
          : await updateSelector({ ...payload, selector_id: selectorId?.toString() || "" });

      if (error) {
        setError(error);
        return;
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save selector");
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
      <DialogTitle>{mode === "create" ? "Create Selector" : "Edit Selector"}</DialogTitle>
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
              label="Selector Name"
              name="selector_name"
              value={formData.selector_name}
              onChange={handleInput}
              margin="normal"
              required
              disabled={submitting}
              inputProps={{ maxLength: 100 }}
            />

            <TextField
              fullWidth
              label="Short Name"
              name="selector_shr_name"
              value={formData.selector_shr_name}
              onChange={handleInput}
              margin="normal"
              disabled={submitting}
              inputProps={{ maxLength: 10 }}
            />

            <Autocomplete
              fullWidth
              options={parentOptions}
              getOptionLabel={(o) => o.selector_name}
              value={
                parentOptions.find(
                  (s) => s.tbl_selector_mst_id.toString() === formData.under_selector
                ) || null
              }
              onChange={(_, v) =>
                setFormData((p) => ({
                  ...p,
                  under_selector: v?.tbl_selector_mst_id?.toString() || "",
                }))
              }
              disabled={submitting}
              noOptionsText="No selectors found"
              renderInput={(params) => (
                <TextField {...params} label="Under Selector" margin="normal" />
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

export default CreateSelector;
