"use client";

import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Alert } from "@mui/material";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import CreateMachineSpgDetailsPage from "./CreateMachineSpgDetailsPage";

interface Props {
  open?: boolean;
  onClose?: (saved?: boolean) => void;
  mc_spg_det_id?: string | number;
  existingRows?: any[];
}

export default function EditMachineSpgDetailsPage({ open = false, onClose, mc_spg_det_id, existingRows = [] }: Props) {
  const [loading, setLoading] = useState(true);
  const [initialValues, setInitialValues] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !mc_spg_det_id) return;

    setLoading(true);
    (async () => {
      try {
        const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
        const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";

        const params = new URLSearchParams({ co_id, mc_spg_det_id: String(mc_spg_det_id) });
        const url = `${apiRoutesPortalMasters.MACHINE_SPG_DETAILS_EDIT_SETUP}?${params}`;
        const { data, error } = await fetchWithCookie(url, "GET") as any;

        if (error || !data) throw new Error(error || "Failed to load details");

        const candidate = data?.data ?? data;
        const details = candidate?.machine_spg_details || candidate;

        setInitialValues({
          branch_id: details.branch_id,
          mechine_id: details.mechine_id,
          machine_name: details.machine_name,
          speed: details.speed,
          no_of_spindle: details.no_of_spindle,
          weight_per_spindle: details.weight_per_spindle,
          is_active: details.is_active,
        });
      } catch (err: any) {
        setError(err?.message || "Failed to load details");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, mc_spg_det_id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <CreateMachineSpgDetailsPage
      open={open}
      onClose={onClose}
      isEdit={true}
      mc_spg_det_id={mc_spg_det_id}
      initialValues={initialValues}
      existingRows={existingRows}
    />
  );
}
