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
  fetchFrameCreateSetup,
  fetchFrameEditSetup,
  createFrame,
  updateFrame,
  FrameMachine,
} from "@/utils/frameService";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  frameDetailsMstId: number | null;
};

type FormData = {
  mc_id: string;
  speed: string;
  frame_type: string;
  bobbin_weight: string;
  no_of_spindle: string;
};

const INITIAL: FormData = {
  mc_id: "",
  speed: "",
  frame_type: "",
  bobbin_weight: "",
  no_of_spindle: "",
};

const CreateFrame: React.FC<Props> = ({ open, onClose, mode, frameDetailsMstId }) => {
  const [formData, setFormData] = useState<FormData>(INITIAL);
  const [machines, setMachines] = useState<FrameMachine[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) loadSetup();
    if (!open) {
      setFormData(INITIAL);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "create") {
        const { data, error } = await fetchFrameCreateSetup();
        if (error) throw new Error(error);
        setMachines(data?.machines || []);
      } else if (mode === "edit" && frameDetailsMstId) {
        const { data, error } = await fetchFrameEditSetup(frameDetailsMstId);
        if (error) throw new Error(error);
        setMachines(data?.machines || []);
        const d = data?.frame_details;
        if (d) {
          setFormData({
            mc_id: d.mc_id?.toString() || "",
            speed: d.speed?.toString() || "",
            frame_type: d.frame_type || "",
            bobbin_weight: d.bobbin_weight?.toString() || "",
            no_of_spindle: d.no_of_spindle?.toString() || "",
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
      if (!formData.mc_id) return setError("Frame No is required");

      setSubmitting(true);
      setError(null);

      const payload = {
        mc_id: formData.mc_id,
        speed: formData.speed || undefined,
        frame_type: formData.frame_type || undefined,
        bobbin_weight: formData.bobbin_weight || undefined,
        no_of_spindle: formData.no_of_spindle || undefined,
      };

      const { error } =
        mode === "create"
          ? await createFrame(payload)
          : await updateFrame({
              ...payload,
              frame_details_mst_id: frameDetailsMstId?.toString() || "",
            });

      if (error) {
        setError(error);
        return;
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save frame details");
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
      <DialogTitle>{mode === "create" ? "Create Frame" : "Edit Frame"}</DialogTitle>
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
              noOptionsText="No frames found"
              renderInput={(params) => (
                <TextField {...params} label="Frame No" margin="normal" required />
              )}
            />

            <TextField
              fullWidth
              label="Frame Type"
              name="frame_type"
              value={formData.frame_type}
              onChange={handleInput}
              margin="normal"
              disabled={submitting}
            />

            <TextField
              fullWidth
              label="Speed (RPM)"
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
              label="Bobbin Weight"
              name="bobbin_weight"
              type="number"
              value={formData.bobbin_weight}
              onChange={handleInput}
              margin="normal"
              disabled={submitting}
              inputProps={{ step: "1" }}
            />

            <TextField
              fullWidth
              label="No. of Spindles"
              name="no_of_spindle"
              type="number"
              value={formData.no_of_spindle}
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

export default CreateFrame;
