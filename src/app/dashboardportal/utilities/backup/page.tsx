"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import { Download } from "lucide-react";
import { apiRoutesPortalMasters } from "@/utils/api";

/** Fallback filename: tenant subdomain (= database name) + local datetime. */
const fallbackFilename = () => {
  const db = window.location.hostname.split(".")[0];
  const ts = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14)
    .replace(/^(\d{8})/, "$1_");
  return `${db}_${ts}.sql`;
};

const parseFilename = (contentDisposition: string | null) =>
  contentDisposition?.match(/filename="?([^";]+)"?/)?.[1] || fallbackFilename();

export default function DatabaseBackupPage() {
  const [downloading, setDownloading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(apiRoutesPortalMasters.DB_BACKUP_DOWNLOAD, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Backup failed (${res.status})`);

      const blob = await res.blob();
      const filename = parseFilename(res.headers.get("content-disposition"));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSnackbar({ open: true, message: `Backup downloaded: ${filename}`, severity: "success" });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Backup download failed",
        severity: "error",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex justify-center p-6">
      <Card sx={{ maxWidth: 480, width: "100%" }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Database Backup
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Take a full backup of the company database and download it as a SQL
            file. Depending on database size this may take a few minutes.
          </Typography>
          <Button
            variant="contained"
            startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <Download size={18} />}
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? "Preparing Backup..." : "Backup & Download"}
          </Button>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
