"use client";

import * as React from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";
import type { JuteMRHeader, MRLineItem } from "../types/mrTypes";

// ── Helpers ──

const formatDate = (value?: string | null): string => {
	if (!value) return "";
	try {
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return value;
		return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
	} catch {
		return value;
	}
};

const fmt = (v?: number | null, dec = 0): string => {
	if (v === undefined || v === null) return "";
	return new Intl.NumberFormat("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
};

/**
 * Concatenate claim details into a single string.
 * Parts present are joined with " + ": claimQuality, Rs {rate} Claim, Dust Shortage {dust}%.
 */
const formatClaimQuality = (
	quality?: string | null,
	rate?: number | null,
	dust?: number | null,
): string => {
	const parts: string[] = [];
	if (quality) parts.push(quality);
	if (rate && rate > 0) parts.push(`Rs ${fmt(rate, 2)} Claim`);
	if (dust && dust > 0) parts.push(`Dust Shortage ${dust}%`);
	return parts.join("  ");
};

/**
 * Format moisture condition column: "actualMoisture%(allowableMoisture%)"
 * e.g. "19.5%(18%)" — only when actual moisture exists.
 */
const formatMoistureCondition = (actual?: number | null, allowable?: number | null): string => {
	if (!actual || actual === 0) return "";
	const actualStr = `${fmt(actual, 1)}%`;
	if (allowable && allowable > 0) return `${actualStr}(${fmt(allowable, 0)}%)`;
	return actualStr;
};

// ── Inline styles (print-friendly HTML table) ──
const thStyle: React.CSSProperties = {
	border: "1px solid #333",
	padding: "6px 8px",
	fontWeight: 600,
	fontSize: "11px",
	textAlign: "center",
	verticalAlign: "bottom",
	backgroundColor: "#f5f5f5",
};
const tdStyle: React.CSSProperties = { border: "1px solid #333", padding: "5px 8px", fontSize: "11px" };
const tdRight: React.CSSProperties = { ...tdStyle, textAlign: "right" };
const tdCenter: React.CSSProperties = { ...tdStyle, textAlign: "center" };
const thRight: React.CSSProperties = { ...thStyle, textAlign: "right" };

// ── Component ──

type MRPreviewProps = {
	header: JuteMRHeader | null;
	lineItems: MRLineItem[];
	totalAcceptedWeight: number;
};

/**
 * Printable preview component for Jute Material Receipt.
 * Matches the legacy print format layout: header fields, single table with
 * Bales/Marks/Advised Wt/Mill Wt/Claim Kgs/Approved Wt/Rate/Claim columns.
 */
export const MRPreview: React.FC<MRPreviewProps> = ({ header, lineItems, totalAcceptedWeight }) => {
	const previewRef = React.useRef<HTMLDivElement>(null);

	const handlePrint = () => {
		const content = previewRef.current?.innerHTML ?? "";
		const win = window.open("", "_blank");
		if (!win) {
			alert("Please allow popups to print.");
			return;
		}

		const title = `Material Receipt - MR #${header?.mr_num ?? header?.branch_mr_no ?? header?.jute_mr_id ?? ""}`;
		win.document.open();
		win.document.write(`<!DOCTYPE html><html><head><title>${title}</title></head><body><div id="root"></div></body></html>`);
		win.document.close();

		document.querySelectorAll("style, link[rel=\"stylesheet\"]").forEach((n) => {
			win.document.head.appendChild(n.cloneNode(true));
		});

		const s = win.document.createElement("style");
		s.textContent = `
			@media print { @page { size: A4; margin: 8mm; } }
			body { margin: 0; padding: 16px; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
			table { width: 100%; border-collapse: collapse; }
			th, td { border: 1px solid #333; padding: 5px 8px; font-size: 11px; }
			th { background-color: #f5f5f5; font-weight: 600; }
			.text-right { text-align: right; }
			.text-center { text-align: center; }
			.print-hidden { display: none !important; }
			.co-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
			.co-left, .co-right { min-width: 200px; max-width: 25%; }
			.co-center { flex: 1; text-align: center; }
			.co-logo { max-height: 56px; max-width: 180px; object-fit: contain; margin-bottom: 4px; }
		`;
		win.document.head.appendChild(s);

		const root = win.document.getElementById("root");
		if (root) root.innerHTML = content;
		win.focus();
		setTimeout(() => { win.print(); win.close(); }, 300);
	};

	// ── Totals ──
	const totals = React.useMemo(() => {
		let qty = 0, challan = 0, mill = 0, claimKgs = 0, approved = 0;
		for (const li of lineItems) {
			qty += li.actualQty ?? 0;
			challan += li.challanWeight ?? 0;
			mill += li.actualWeight ?? 0;
			claimKgs += li.shortageKgs ?? 0;
			approved += li.acceptedWeight ?? 0;
		}
		return { qty, challan, mill, claimKgs, approved };
	}, [lineItems]);

	if (!header) return null;

	return (
		<Box>
			{/* Print button */}
			<Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }} className="print-hidden">
				<Button variant="outline" size="sm" onClick={handlePrint}>
					Print Preview
				</Button>
			</Stack>

			<Box ref={previewRef} sx={{ p: 2, fontFamily: "Arial, sans-serif", fontSize: "12px" }}>
				{/* ── Header: Company Logo & Details + Title + Spacer ── */}
				<Stack direction="row" justifyContent="space-between" alignItems="center" className="co-header" sx={{ mb: 2 }}>
					{/* Left: Company Details */}
					<Box className="co-left" sx={{ textAlign: "left" }}>
						{header.co_logo && (
							<Box
								component="img"
								src={header.co_logo}
								alt="Company Logo"
								className="co-logo"
								sx={{ maxHeight: 56, maxWidth: 180, objectFit: "contain", mb: 0.5 }}
							/>
						)}
						{header.co_name && (
							<Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
								{header.co_name}
							</Typography>
						)}
						{header.co_address1 && (
							<Typography variant="caption" display="block" sx={{ mb: 0.25 }}>
								{header.co_address1}
							</Typography>
						)}
						{header.co_address2 && (
							<Typography variant="caption" display="block" sx={{ mb: 0.25 }}>
								{header.co_address2}
							</Typography>
						)}
						{header.co_zipcode && (
							<Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
								{String(header.co_zipcode)}
							</Typography>
						)}
						{header.branch_name && (
							<Typography
								variant="caption"
								display="block"
								sx={{ fontStyle: "italic", color: "text.secondary", mt: 0.5 }}
							>
								{header.branch_name}
							</Typography>
						)}
					</Box>

					{/* Center: Title */}
					<Box className="co-center" sx={{ flex: 1 }}>
						<Typography variant="h5" fontWeight={700} textAlign="center">
							Material Receipt
						</Typography>
					</Box>

					{/* Right: Spacer */}
					<Box className="co-right" />
				</Stack>

				{/* ── Header Fields (two-column key:value pairs) ── */}
				<Box
					component="table"
					sx={{
						width: "100%",
						borderCollapse: "collapse",
						mb: 2,
						"& td": { padding: "3px 6px", fontSize: "12px", border: "none" },
					}}
				>
					<tbody>
						<tr>
							<td style={{ width: "15%", fontWeight: 600 }}>MR NO</td>
							<td style={{ width: "3%" }}>:</td>
							<td style={{ width: "32%" }}>{header.mr_num ?? header.branch_mr_no ?? "Draft"}</td>
							<td style={{ width: "18%", fontWeight: 600, textAlign: "right" }}>MR DATE :</td>
							<td style={{ width: "32%" }}>{formatDate(header.jute_mr_date)}</td>
						</tr>
						<tr>
							<td style={{ fontWeight: 600 }}>M/S</td>
							<td>:</td>
							<td colSpan={3}>{header.party_name ?? header.supplier_name ?? "-"}</td>
						</tr>
						{header.party_address && (
							<tr>
								<td style={{ fontWeight: 600 }}>PARTY ADDRESS</td>
								<td>:</td>
								<td colSpan={3}>{header.party_address}</td>
							</tr>
						)}
						{header.party_gst_no && (
							<tr>
								<td style={{ fontWeight: 600 }}>PARTY GST NO</td>
								<td>:</td>
								<td colSpan={3}>{header.party_gst_no}</td>
							</tr>
						)}
						<tr>
							<td style={{ fontWeight: 600 }}>PO NO</td>
							<td>:</td>
							<td>{header.po_no != null ? String(header.po_no) : "-"}</td>
							<td style={{ fontWeight: 600, textAlign: "right" }}>PO DATE :</td>
							<td>{formatDate(header.po_date)}</td>
						</tr>
						<tr>
							<td style={{ fontWeight: 600 }}>CHALLAN NO</td>
							<td>:</td>
							<td>{header.challan_no ?? "-"}</td>
							<td style={{ fontWeight: 600, textAlign: "right" }}>CHALLAN DATE :</td>
							<td>{formatDate(header.challan_date)}</td>
						</tr>
						<tr>
							<td style={{ fontWeight: 600 }}>LORRY NO</td>
							<td>:</td>
							<td colSpan={3}>{header.vehicle_no ?? "-"}</td>
						</tr>
					</tbody>
				</Box>

				{/* Mukam */}
				{header.mukam && (
					<Typography variant="body2" textAlign="center" sx={{ mb: 1 }}>
						<strong>Mukam :</strong> {header.mukam}
					</Typography>
				)}

				<Divider sx={{ my: 1 }} />

				<Typography variant="body2" sx={{ mb: 1 }}>
					Against the above we have received the consignment as follow:
				</Typography>

				{/* ── Line Items Table ── */}
				<Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
					<thead>
						<tr>
							<th style={thStyle} rowSpan={2}>Bales/<br/>drums</th>
							<th style={thStyle} rowSpan={2}>Marks &amp;<br/>Quality</th>
							<th style={thRight} rowSpan={2}>Advised<br/>weight in<br/>Kgs</th>
							<th style={thRight} rowSpan={2}>Mill<br/>weight in<br/>Kgs</th>
							<th style={thRight} rowSpan={2}>Claim in<br/>Kgs</th>
							<th style={thRight} rowSpan={2}>Approved<br/>Weight</th>
							<th style={thRight} rowSpan={2}>Rate per<br/>Qtls Rs</th>
							<th style={{ ...thStyle, textAlign: "center" }} colSpan={2}>CLAIM FOR</th>
						</tr>
						<tr>
							<th style={thStyle}>QUALITY</th>
							<th style={thStyle}>CONDITION</th>
						</tr>
					</thead>
					<tbody>
						{lineItems.map((li) => (
							<tr key={li.id}>
								<td style={tdCenter}>{li.actualQty != null ? fmt(li.actualQty) : ""}</td>
								<td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
									{li.actualItemName}
									{li.actualQualityName && li.actualQualityName !== "-" && (
										<span> {li.actualQualityName}</span>
									)}
								</td>
								<td style={tdRight}>{fmt(li.challanWeight, 2)}</td>
								<td style={tdRight}>{fmt(li.actualWeight, 2)}</td>
								<td style={tdRight}>{li.shortageKgs ? fmt(li.shortageKgs) : ""}</td>
								<td style={tdRight}>{fmt(li.acceptedWeight, 2)}</td>
								<td style={tdRight}>{fmt(li.rate, 2)}</td>
								<td style={tdStyle}>{formatClaimQuality(li.claimQuality, li.claimRate, li.claimDust)}</td>
								<td style={tdStyle}>
									{formatMoistureCondition(li.actualMoisture, li.allowableMoisture)}
								</td>
							</tr>
						))}
						{/* Totals row */}
						<tr style={{ fontWeight: 700 }}>
							<td style={tdCenter}><strong>{fmt(totals.qty, 2)}</strong></td>
							<td style={tdStyle} />
							<td style={tdRight}><strong>{fmt(totals.challan, 2)}</strong></td>
							<td style={tdRight}><strong>{fmt(totals.mill, 2)}</strong></td>
							<td style={tdRight}><strong>{totals.claimKgs ? fmt(totals.claimKgs) : ""}</strong></td>
							<td style={tdRight}><strong>{fmt(totals.approved, 2)}</strong></td>
							<td style={tdRight} />
							<td style={tdStyle} />
							<td style={tdStyle} />
						</tr>
					</tbody>
				</Box>

				{/* ── Remarks ── */}
				{header.remarks && (
					<Box sx={{ mt: 2 }}>
						<Typography variant="body2" fontSize="12px">
							<strong>Remarks:</strong> {header.remarks}
						</Typography>
					</Box>
				)}

				{/* ── Status ── */}
				{header.status && (
					<Box sx={{ mt: 1 }}>
						<Typography variant="caption" color="text.secondary">
							Status: <strong>{header.status}</strong>
						</Typography>
					</Box>
				)}

				{/* ── Footer ── */}
				<Typography
					variant="caption"
					display="block"
					textAlign="center"
					color="text.secondary"
					sx={{ mt: 4 }}
				>
					Note*: This is a computer generated print, Signature is not required.
				</Typography>
			</Box>
		</Box>
	);
};
