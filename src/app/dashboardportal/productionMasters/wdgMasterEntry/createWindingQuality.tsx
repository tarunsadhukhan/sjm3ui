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
  fetchWindingQualityEditSetup,
  createWindingQuality,
  updateWindingQuality,
} from "@/utils/windingQualityService";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  wngQualityMstId: number | null;
};

type FormData = {
  wng_quality: string;
  target_prod: string;
  spool_cop: string;
};

const INITIAL: FormData = {
  wng_quality: "",
  target_prod: "",
  spool_cop: "",
};

const SPOOL_COP_OPTIONS = [
  { value: "S", label: "Spool" },
  { value: "C", label: "Cop" },
];

const CreateWindingQuality: React.FC<Props> = ({ open, onClose, mode, wngQualityMstId }) => {
  const [formData, setFormData] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && mode === "edit" && wngQualityMstId) loadDetails();
    if (!open) {
      setFormData(INITIAL);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, wngQualityMstId]);

  const loadDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await fetchWindingQualityEditSetup(wngQualityMstId as number);
      if (error) throw new Error(error);
      const d = data?.winding_quality_details;
      if (d) {
        setFormData({
          wng_quality: d.wng_quality || "",
          target_prod: d.target_prod?.toString() || "",
          spool_cop: d.spool_cop || "",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load winding quality");
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
      if (!formData.wng_quality.trim()) return setError("Wdg Quality is required");

      setSubmitting(true);
      setError(null);

      const payload = {
        wng_quality: formData.wng_quality,
        target_prod: formData.target_prod || undefined,
        spool_cop: formData.spool_cop || undefined,
      };

      const { error } =
        mode === "create"
          ? await createWindingQuality(payload)
          : await updateWindingQuality({
              ...payload,
              wng_quality_mst_id: wngQualityMstId?.toString() || "",
            });

      if (error) {
        setError(error);
        return;
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save winding quality");
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
      <DialogTitle>{mode === "create" ? "Create Winding Quality" : "Edit Winding Quality"}</DialogTitle>
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

            <TextField
              fullWidth
              label="Wdg Quality"
              name="wng_quality"
              value={formData.wng_quality}
              onChange={handleInput}
              margin="normal"
              required
              disabled={submitting}
            />

            <TextField
              fullWidth
              label="Target Production"
              name="target_prod"
              type="number"
              value={formData.target_prod}
              onChange={handleInput}
              margin="normal"
              disabled={submitting}
              inputProps={{ step: "1" }}
            />

            <Autocomplete
              fullWidth
              options={SPOOL_COP_OPTIONS}
              getOptionLabel={(o) => o.label}
              value={SPOOL_COP_OPTIONS.find((o) => o.value === formData.spool_cop) || null}
              onChange={(_, v) => setFormData((p) => ({ ...p, spool_cop: v?.value || "" }))}
              disabled={submitting}
              renderInput={(params) => (
                <TextField {...params} label="Spool / Cop" margin="normal" />
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

export default CreateWindingQuality;
