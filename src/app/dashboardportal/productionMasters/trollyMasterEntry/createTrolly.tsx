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
} from "@mui/material";
import {
  fetchTrollyCreateSetup,
  fetchTrollyEditSetup,
  createTrolly,
  updateTrolly,
  Branch,
  Department,
} from "@/utils/trollyService";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  trollyId: number | null;
};

type FormData = {
  trolly_name: string;
  branch_id: string;
  dept_id: string;
  trolly_weight: string;
  busket_weight: string;
};

const INITIAL: FormData = {
  trolly_name: "",
  branch_id: "",
  dept_id: "",
  trolly_weight: "",
  busket_weight: "",
};

const CreateTrolly: React.FC<Props> = ({ open, onClose, mode, trollyId }) => {
  const { coId } = useSelectedCompanyCoId();
  const { selectedBranches } = useSidebarContext();
  const sidebarBranchId =
    selectedBranches && selectedBranches.length === 1 ? String(selectedBranches[0]) : "";
  const [formData, setFormData] = useState<FormData>(INITIAL);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Departments are filtered by selected branch when possible
  const filteredDepartments = useMemo(() => {
    if (!formData.branch_id) return departments;
    const branchIdNum = Number(formData.branch_id);
    const matched = departments.filter(
      (d) => d.branch_id === undefined || d.branch_id === null || Number(d.branch_id) === branchIdNum
    );
    // If filtering yields nothing (e.g., dept lacks branch_id), fall back to all
    return matched.length > 0 ? matched : departments;
  }, [departments, formData.branch_id]);

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
        const { data, error } = await fetchTrollyCreateSetup(coId);
        if (error) throw new Error(error);
        setBranches(data?.branches || []);
        setDepartments(data?.departments || []);
        if (sidebarBranchId) {
          setFormData((p) => ({ ...p, branch_id: sidebarBranchId }));
        }
      } else if (mode === "edit" && trollyId) {
        const { data, error } = await fetchTrollyEditSetup(coId, trollyId);
        if (error) throw new Error(error);
        setBranches(data?.branches || []);
        setDepartments(data?.departments || []);
        const d = data?.trolly_details;
        if (d) {
          setFormData({
            trolly_name: d.trolly_name || "",
            branch_id: d.branch_id?.toString() || "",
            dept_id: d.dept_id?.toString() || "",
            trolly_weight: d.trolly_weight?.toString() || "",
            busket_weight: d.busket_weight?.toString() || "",
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
      if (!formData.trolly_name.trim()) return setError("Trolly Name is required");
      if (!formData.branch_id) return setError("Branch is required");
      if (!formData.dept_id) return setError("Department is required");

      setSubmitting(true);
      setError(null);

      const payload = {
        co_id: coId,
        branch_id: formData.branch_id,
        dept_id: formData.dept_id,
        trolly_name: formData.trolly_name,
        trolly_weight: formData.trolly_weight || undefined,
        busket_weight: formData.busket_weight || undefined,
      };

      const { error } =
        mode === "create"
          ? await createTrolly(payload)
          : await updateTrolly({ ...payload, trolly_id: trollyId?.toString() || "" });

      if (error) {
        setError(error);
        return;
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save trolly");
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
      <DialogTitle>{mode === "create" ? "Create Trolly" : "Edit Trolly"}</DialogTitle>
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
                setFormData((p) => ({
                  ...p,
                  branch_id: v?.branch_id?.toString() || "",
                  dept_id: "",
                }))
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
              label="Trolly Name"
              name="trolly_name"
              value={formData.trolly_name}
              onChange={handleInput}
              margin="normal"
              required
              disabled={submitting}
            />

            <Autocomplete
              fullWidth
              options={filteredDepartments}
              getOptionLabel={(o) => o.dept_name}
              value={
                filteredDepartments.find((d) => d.dept_id.toString() === formData.dept_id) || null
              }
              onChange={(_, v) =>
                setFormData((p) => ({ ...p, dept_id: v?.dept_id?.toString() || "" }))
              }
              disabled={submitting || !formData.branch_id}
              noOptionsText="No departments found"
              renderInput={(params) => (
                <TextField {...params} label="Department" margin="normal" required />
              )}
            />

            <TextField
              fullWidth
              label="Trolly Weight"
              name="trolly_weight"
              type="number"
              value={formData.trolly_weight}
              onChange={handleInput}
              margin="normal"
              disabled={submitting}
              inputProps={{ step: "0.01" }}
            />

            <TextField
              fullWidth
              label="Basket Weight"
              name="busket_weight"
              type="number"
              value={formData.busket_weight}
              onChange={handleInput}
              margin="normal"
              disabled={submitting}
              inputProps={{ step: "0.01" }}
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

export default CreateTrolly;
