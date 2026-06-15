"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  CircularProgress,
  Paper,
  InputAdornment,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { MapPin, RefreshCw, Camera, X } from "lucide-react";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import {
  fetchMukamRecvSetup,
  fetchMukamRecvByNo,
  createMukamRecv,
  updateMukamRecv,
  reverseGeocode,
  type MukamRecvSetup,
  type MukamRecvPayload,
} from "@/utils/juteMukamRecvService";

interface MukamForm {
  recvd_date: string;
  party_id: string;
  mukam_id: string;
  quality_id: string;
  gross_weight: string;
  tare_weight: string;
  geo_location: string;
  geo_place: string;
  remarks: string;
  /** Captured photo as an HTML <img> snippet (base64 data URI). */
  mukam_photo: string;
}

const NEW = "new";

interface Opt {
  id: string;
  label: string;
}

/** Searchable single-select with a labeled outlined input (matches the form fields). */
function SearchSelect({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: Opt[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const selected = options.find((o) => o.id === value) ?? null;
  return (
    <Autocomplete<Opt>
      options={options}
      value={selected}
      onChange={(_, next) => onChange(next?.id ?? "")}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      disabled={disabled}
      size="small"
      openOnFocus
      renderInput={(params) => <TextField {...params} label={label} size="small" />}
    />
  );
}

/**
 * Live-camera photo capture. Opens the device camera in a dialog, captures a
 * downscaled JPEG frame, and emits an HTML `<img>` snippet (base64 data URI)
 * stored in the form. Read-only entries render the saved photo only.
 */
function CameraCapture({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (html: string) => void;
  readOnly: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hasStream, setHasStream] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setHasStream(false);
  }, []);

  const closeDialog = useCallback(() => {
    stopStream();
    setOpen(false);
    setError("");
  }, [stopStream]);

  // Make sure the camera is released if the component unmounts while open.
  useEffect(() => () => stopStream(), [stopStream]);

  // Attach the stream once the dialog's <video> is actually mounted.
  useEffect(() => {
    if (hasStream && open && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [hasStream, open]);

  const openCamera = useCallback(async () => {
    // getUserMedia, like geolocation, only works on a secure origin.
    if (typeof window !== "undefined" && !window.isSecureContext) {
      Swal.fire({
        title: "Camera needs HTTPS",
        html: "The browser only allows the camera on <b>https://</b> or <b>localhost</b>.",
        icon: "info",
      });
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      Swal.fire({ title: "Unavailable", text: "Camera is not supported by this browser.", icon: "warning" });
      return;
    }
    setOpen(true);
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      // The effect below attaches the stream once the <video> is mounted.
      setHasStream(true);
    } catch {
      setError("Could not access the camera. Allow camera permission for this site in the browser's settings.");
    }
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    // Downscale to a max edge of 1280px to keep the stored base64 small.
    const maxEdge = 1280;
    const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    onChange(`<img src="${dataUrl}" alt="mukam photo" style="max-width:100%;height:auto;" />`);
    closeDialog();
  }, [onChange, closeDialog]);

  return (
    <Box className="flex flex-col gap-2">
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Photo
      </Typography>

      {value ? (
        <Box
          className="overflow-hidden rounded-md border"
          sx={{ maxWidth: 320, "& img": { display: "block", width: "100%", height: "auto" } }}
          dangerouslySetInnerHTML={{ __html: value }}
        />
      ) : (
        <Typography variant="body2" sx={{ color: "text.disabled" }}>
          No photo
        </Typography>
      )}

      {!readOnly && (
        <Box className="flex items-center gap-3">
          <Button variant="ghost" onClick={openCamera}>
            <Camera size={16} className="mr-1" />
            {value ? "Retake" : "Take Photo"}
          </Button>
          {value && (
            <Button variant="ghost" onClick={() => onChange("")}>
              <X size={16} className="mr-1" />
              Remove
            </Button>
          )}
        </Box>
      )}

      <Dialog open={open} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Take Photo</DialogTitle>
        <DialogContent>
          {error ? (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          ) : (
            <Box
              component="video"
              ref={videoRef}
              playsInline
              muted
              sx={{ width: "100%", borderRadius: 1, backgroundColor: "black" }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="ghost" onClick={closeDialog}>
            Cancel
          </Button>
          <Button onClick={capture} disabled={!!error}>
            Capture
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): MukamForm => ({
  recvd_date: todayStr(),
  party_id: "",
  mukam_id: "",
  quality_id: "",
  gross_weight: "",
  tare_weight: "",
  geo_location: "",
  geo_place: "",
  remarks: "",
  mukam_photo: "",
});

export default function JuteMukamRecvPage() {
  const { coId } = useSelectedCompanyCoId();
  const [setup, setSetup] = useState<MukamRecvSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [selectedNo, setSelectedNo] = useState<string>(NEW);
  const [editable, setEditable] = useState(true);
  const [form, setForm] = useState<MukamForm>(emptyForm());

  const isNew = selectedNo === NEW;
  const readOnly = !isNew && !editable;

  const netWeight = useMemo(() => {
    const g = parseFloat(form.gross_weight);
    const t = parseFloat(form.tare_weight);
    if (Number.isNaN(g) && Number.isNaN(t)) return "";
    return ((g || 0) - (t || 0)).toFixed(3);
  }, [form.gross_weight, form.tare_weight]);

  const update = useCallback(
    (field: keyof MukamForm, value: string) => setForm((p) => ({ ...p, [field]: value })),
    [],
  );

  // silent = don't surface errors (used for the automatic attempt on load)
  const captureLocation = useCallback((silent = false) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      if (!silent) Swal.fire({ title: "Unavailable", text: "Geolocation is not supported by this browser.", icon: "warning" });
      return;
    }
    // Geolocation only works on secure origins (HTTPS or localhost). On a plain
    // http:// LAN address the browser blocks it even when device location is on.
    if (typeof window !== "undefined" && !window.isSecureContext) {
      if (!silent) {
        Swal.fire({
          title: "Location needs HTTPS",
          html: "The browser only allows location on <b>https://</b> or <b>localhost</b>.<br/>You can type the coordinates (lat,lng) in the Geo Location field instead.",
          icon: "info",
        });
      }
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const place = await reverseGeocode(lat, lng);
        setForm((p) => ({ ...p, geo_location: `${lat.toFixed(6)},${lng.toFixed(6)}`, geo_place: place }));
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        if (silent) return;
        const reason =
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied for this site. Allow it in the browser's site settings (the lock/➖ icon in the address bar)."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Position is currently unavailable. Try again, or enter the coordinates manually."
              : "Getting the location timed out. Try again, or enter the coordinates manually.";
        Swal.fire({ title: "Couldn't get location", text: reason, icon: "warning" });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // Initial setup load
  useEffect(() => {
    if (!coId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await fetchMukamRecvSetup(coId);
      if (cancelled) return;
      if (error || !data) {
        Swal.fire({ title: "Error", text: error || "Failed to load setup", icon: "error" });
      } else {
        setSetup(data);
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [coId]);

  // Capture location automatically when starting a new entry (silent on failure)
  useEffect(() => {
    if (!loading && isNew) captureLocation(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isNew]);

  const refreshSetup = useCallback(async () => {
    if (!coId) return;
    const { data } = await fetchMukamRecvSetup(coId);
    if (data) setSetup(data);
  }, [coId]);

  const handleSelectNo = useCallback(async (value: string) => {
    setSelectedNo(value);
    if (value === NEW) {
      setForm(emptyForm());
      setEditable(true);
      return;
    }
    const { data, error } = await fetchMukamRecvByNo(Number(value));
    if (error || !data) {
      Swal.fire({ title: "Error", text: error || "Failed to load entry", icon: "error" });
      return;
    }
    const d = data.data;
    setForm({
      recvd_date: d.recvd_date ?? "",
      party_id: d.party_id != null ? String(d.party_id) : "",
      mukam_id: d.mukam_id != null ? String(d.mukam_id) : "",
      quality_id: d.quality_id != null ? String(d.quality_id) : "",
      gross_weight: d.gross_weight != null ? String(d.gross_weight) : "",
      tare_weight: d.tare_weight != null ? String(d.tare_weight) : "",
      geo_location: d.geo_location ?? "",
      geo_place: d.geo_place ?? "",
      remarks: d.remarks ?? "",
      mukam_photo: d.mukam_photo ?? "",
    });
    setEditable(data.editable);
    if (!data.editable) {
      Swal.fire({
        title: "View only",
        text: "This entry is older than 30 minutes and can no longer be edited.",
        icon: "info",
      });
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!coId) return;
    if (!form.party_id) {
      Swal.fire({ title: "Required", text: "Please select a party", icon: "warning" });
      return;
    }
    const payload: MukamRecvPayload = {
      co_id: coId,
      recvd_date: form.recvd_date || undefined,
      party_id: form.party_id,
      mukam_id: form.mukam_id,
      quality_id: form.quality_id,
      gross_weight: form.gross_weight,
      tare_weight: form.tare_weight,
      geo_location: form.geo_location,
      geo_place: form.geo_place,
      remarks: form.remarks,
      mukam_photo: form.mukam_photo,
    };

    setSaving(true);
    try {
      if (isNew) {
        const { data, error } = await createMukamRecv(payload);
        if (error || !data) {
          Swal.fire({ title: "Save Failed", text: error || "Could not save", icon: "error" });
          return;
        }
        await Swal.fire({ title: "Saved", text: `Saved as Recvd No ${data.jute_mukam_recvd_no}`, icon: "success" });
        await refreshSetup();
        setForm(emptyForm());
        setSelectedNo(NEW);
      } else {
        const { data, error, status } = await updateMukamRecv({ ...payload, jute_mukam_recvd_no: Number(selectedNo) });
        if (error || !data) {
          Swal.fire({ title: status === 403 ? "Edit window closed" : "Update Failed", text: error || "Could not update", icon: status === 403 ? "warning" : "error" });
          if (status === 403) setEditable(false);
          return;
        }
        await Swal.fire({ title: "Updated", text: "Entry updated", icon: "success" });
        await refreshSetup();
        setForm(emptyForm());
        setSelectedNo(NEW);
        setEditable(true);
      }
    } finally {
      setSaving(false);
    }
  }, [coId, form, isNew, selectedNo, refreshSetup]);

  const recvdNoOpts: Opt[] = useMemo(
    () => [
      { id: NEW, label: "New" },
      ...(setup?.recvd_list ?? []).map((r) => ({
        id: String(r.jute_mukam_recvd_no),
        label: `${r.jute_mukam_recvd_no}${r.recvd_date ? ` — ${r.recvd_date}` : ""}`,
      })),
    ],
    [setup],
  );
  const partyOpts: Opt[] = useMemo(
    () => (setup?.parties ?? []).map((p) => ({ id: String(p.party_id), label: p.party_name })),
    [setup],
  );
  const mukamOpts: Opt[] = useMemo(
    () => (setup?.mukams ?? []).map((m) => ({ id: String(m.mukam_id), label: m.mukam_name })),
    [setup],
  );
  const qualityOpts: Opt[] = useMemo(
    () => (setup?.qualities ?? []).map((q) => ({ id: String(q.jute_qlty_id), label: q.jute_quality })),
    [setup],
  );

  if (loading) {
    return (
      <Box className="flex items-center justify-center py-12">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="flex flex-col gap-6 p-6">
      <Box className="flex items-center justify-between">
        <Typography variant="h5" fontWeight={600}>
          Jute Mukam Received
        </Typography>
        <Box sx={{ minWidth: 240 }}>
          <SearchSelect
            label="Jute Mukam Recvd No"
            options={recvdNoOpts}
            value={selectedNo}
            onChange={(v) => handleSelectNo(v || NEW)}
          />
        </Box>
      </Box>

      <Paper elevation={0} className="rounded-lg border p-5">
        <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            label="Received Date"
            type="date"
            size="small"
            value={form.recvd_date}
            onChange={(e) => update("recvd_date", e.target.value)}
            InputLabelProps={{ shrink: true }}
            disabled={readOnly}
          />
          <SearchSelect label="Party *" options={partyOpts} value={form.party_id} onChange={(v) => update("party_id", v)} disabled={readOnly} />
          <SearchSelect label="Mukam" options={mukamOpts} value={form.mukam_id} onChange={(v) => update("mukam_id", v)} disabled={readOnly} />
          <SearchSelect label="Quality" options={qualityOpts} value={form.quality_id} onChange={(v) => update("quality_id", v)} disabled={readOnly} />
          <TextField
            label="Gross Weight"
            type="number"
            size="small"
            value={form.gross_weight}
            onChange={(e) => update("gross_weight", e.target.value)}
            disabled={readOnly}
          />
          <TextField
            label="Tare Weight"
            type="number"
            size="small"
            value={form.tare_weight}
            onChange={(e) => update("tare_weight", e.target.value)}
            disabled={readOnly}
          />
          <TextField
            label="Net Weight"
            size="small"
            value={netWeight}
            disabled
            helperText="Auto (Gross − Tare)"
          />
          <TextField
            label="Geo Location (lat,lng)"
            size="small"
            value={form.geo_location}
            disabled
            placeholder="auto-captured"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {geoLoading ? <CircularProgress size={16} /> : <MapPin size={16} />}
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Place"
            size="small"
            value={form.geo_place}
            disabled
          />
          <TextField
            label="Remarks"
            size="small"
            value={form.remarks}
            onChange={(e) => update("remarks", e.target.value)}
            disabled={readOnly}
            className="sm:col-span-2 lg:col-span-3"
          />
        </Box>

        <Box className="mt-5">
          <CameraCapture
            value={form.mukam_photo}
            onChange={(html) => update("mukam_photo", html)}
            readOnly={readOnly}
          />
        </Box>

        {!readOnly && (
          <Box className="mt-4 flex items-center gap-3">
            <Button variant="ghost" onClick={() => captureLocation(false)} disabled={geoLoading}>
              <RefreshCw size={16} className="mr-1" />
              {geoLoading ? "Getting location..." : "Refresh location"}
            </Button>
          </Box>
        )}
      </Paper>

      {!readOnly && (
        <Box className="flex justify-end">
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : isNew ? "Save" : "Update"}
          </Button>
        </Box>
      )}
    </Box>
  );
}
