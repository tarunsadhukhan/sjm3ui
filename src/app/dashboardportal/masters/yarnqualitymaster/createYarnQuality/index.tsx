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
  fetchYarnQualityCreateSetup,
  fetchYarnQualityEditSetup,
  createYarnQuality,
  updateYarnQuality,
} from "@/utils/yarnQualityService";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";

type CreateYarnQualityProps = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  yarnQualityId: number | null;
};

type YarnType = {
  item_grp_id: number;
  item_grp_name: string;
};

type Branch = {
  branch_id: number;
  branch_name: string;
};

type FormData = {
  quality_code: string;
  branch_id: string;
  item_grp_id: string;
  twist_per_inch: string;
  std_count: string;
  std_doff: string;
  std_wt_doff: string;
  target_eff: string;
  is_active: boolean;
};

const INITIAL_FORM_DATA: FormData = {
  quality_code: "",
  branch_id: "",
  item_grp_id: "",
  twist_per_inch: "",
  std_count: "",
  std_doff: "",
  std_wt_doff: "",
  target_eff: "",
  is_active: true,
};

const CreateYarnQuality: React.FC<CreateYarnQualityProps> = ({ open, onClose, mode, yarnQualityId }) => {
  const { coId } = useSelectedCompanyCoId();
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [yarnTypes, setYarnTypes] = useState<YarnType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load setup data when dialog opens
  useEffect(() => {
    if (open && coId) {
      loadSetupData();
    }
  }, [open, coId]);

  const loadSetupData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "create") {
        const { data, error } = await fetchYarnQualityCreateSetup(coId);
        if (error) {
          throw new Error(error);
        }
        setYarnTypes(data?.yarn_types || []);
        setBranches(data?.branches || []);
      } else if (mode === "edit" && yarnQualityId) {
        const { data, error } = await fetchYarnQualityEditSetup(coId, yarnQualityId);
        if (error) {
          throw new Error(error);
        }

        setYarnTypes(data?.yarn_types || []);
        setBranches(data?.branches || []);
        if (data?.yarn_quality_details) {
          const details = data.yarn_quality_details;
          setFormData({
            quality_code: details.quality_code || "",
            branch_id: details.branch_id?.toString() || "",
            item_grp_id: details.item_grp_id?.toString() || "",
            twist_per_inch: details.twist_per_inch?.toString() || "",
            std_count: details.std_count?.toString() || "",
            std_doff: details.std_doff?.toString() || "",
            std_wt_doff: details.std_wt_doff?.toString() || "",
            target_eff: details.target_eff?.toString() || "",
            is_active: details.is_active === 1,
          });
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load setup data");
    } finally {
      setLoading(false);
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
      if (!formData.quality_code.trim()) {
        setError("Quality code is required");
        return;
      }
      if (!formData.branch_id) {
        setError("Branch is required");
        return;
      }
      if (!formData.item_grp_id) {
        setError("Yarn type is required");
        return;
      }

      setSubmitting(true);
      setError(null);

      const payload = {
        co_id: coId,
        quality_code: formData.quality_code,
        branch_id: formData.branch_id,
        item_grp_id: formData.item_grp_id,
        twist_per_inch: formData.twist_per_inch || undefined,
        std_count: formData.std_count || undefined,
        std_doff: formData.std_doff || undefined,
        std_wt_doff: formData.std_wt_doff || undefined,
        target_eff: formData.target_eff || undefined,
        is_active: formData.is_active ? 1 : 0,
      };

      let response;
      if (mode === "create") {
        response = await createYarnQuality(payload);
      } else {
        response = await updateYarnQuality({
          ...payload,
          yarn_quality_id: yarnQualityId?.toString() || "",
        });
      }

      const { error } = response;
      if (error) {
        setError(error);
        return;
      }

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save yarn quality");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(INITIAL_FORM_DATA);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === "create" ? "Create Yarn Quality" : "Edit Yarn Quality"}</DialogTitle>
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

            <TextField
              fullWidth
              label="Quality Code"
              name="quality_code"
              value={formData.quality_code}
              onChange={handleInputChange}
              margin="normal"
              required
              disabled={submitting || mode === "edit"}
            />

            <Autocomplete
              fullWidth
              options={yarnTypes}
              getOptionLabel={(option) => option.item_grp_name}
              value={
                yarnTypes.find((type) => type.item_grp_id.toString() === formData.item_grp_id) || null
              }
              onChange={(event, newValue) => {
                setFormData((prev) => ({
                  ...prev,
                  item_grp_id: newValue?.item_grp_id?.toString() || "",
                }));
              }}
              disabled={submitting}
              noOptionsText="No yarn types found"
              loading={loading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Yarn Type"
                  placeholder="Search yarn type..."
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

            <TextField
              fullWidth
              label="Twist per Inch"
              name="twist_per_inch"
              type="number"
              value={formData.twist_per_inch}
              onChange={handleInputChange}
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
              onChange={handleInputChange}
              margin="normal"
              disabled={submitting}
              inputProps={{ step: "0.01" }}
            />

            <TextField
              fullWidth
              label="Std Doff"
              name="std_doff"
              type="number"
              value={formData.std_doff}
              onChange={handleInputChange}
              margin="normal"
              disabled={submitting}
              inputProps={{ step: "1" }}
            />

            <TextField
              fullWidth
              label="Std Wt Doff"
              name="std_wt_doff"
              type="number"
              value={formData.std_wt_doff}
              onChange={handleInputChange}
              margin="normal"
              disabled={submitting}
              inputProps={{ step: "0.001" }}
            />

            <TextField
              fullWidth
              label="Target Efficiency"
              name="target_eff"
              type="number"
              value={formData.target_eff}
              onChange={handleInputChange}
              margin="normal"
              disabled={submitting}
              inputProps={{ step: "0.01" }}
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

export default CreateYarnQuality;
