import * as React from "react";
import { TextField } from "@mui/material";
import type { TransactionLineColumn } from "@/components/ui/transaction";
import { SearchableSelect } from "@/components/ui/transaction";
import type { MRLineItem } from "../types/mrTypes";

type WarehouseOption = { value: number; label: string };

type UseMRLineItemsParams = {
	canEdit: boolean;
	handleLineFieldChange: (id: string, field: keyof MRLineItem, value: string | number | null) => void;
	warehouseOptions: WarehouseOption[];
	/** Less (%) from the linked PO; used to compute the read-only Less Weight column. */
	lessPc?: number | null;
};

export function useMRLineItems({
	canEdit,
	handleLineFieldChange,
	warehouseOptions,
	lessPc = null,
}: UseMRLineItemsParams): TransactionLineColumn<MRLineItem>[] {
	return React.useMemo(
		(): TransactionLineColumn<MRLineItem>[] => [
			{
				id: "actualItemName",
				header: "Item",
				width: "1.4fr",
				minWidth: "90px",
				renderCell: ({ item }) => (
					<span className="text-xs">{item.actualItemName || "-"}</span>
				),
				getTooltip: ({ item }) => item.actualItemName || undefined,
			},
			{
				id: "actualQualityName",
				header: "Actual Quality",
				width: "1.2fr",
				minWidth: "130px",
				renderCell: ({ item }) => (
					<span className="text-xs">{item.actualQualityName || "-"}</span>
				),
				getTooltip: ({ item }) => item.actualQualityName || undefined,
			},
			{
				id: "unitConversion",
				header: "UOM",
				width: "0.6fr",
				minWidth: "70px",
				renderCell: ({ item }) => (
					<span className="text-xs">{item.unitConversion || "-"}</span>
				),
				getTooltip: ({ item }) => item.unitConversion || undefined,
			},
			{
				id: "actualQty",
				align: "right",
				header: "Qty(%)",
				width: "0.9fr",
				minWidth: "80px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.actualQty != null ? item.actualQty.toFixed(2) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.actualQty ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"actualQty",
									e.target.value ? parseFloat(e.target.value) : null
								)
							}
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) =>
					item.actualQty != null ? `Qty(%): ${item.actualQty.toFixed(2)}` : undefined,
			},
			{
				id: "actualWeight",
				align: "right",
				header: "Actual Weight",
				width: "1fr",
				minWidth: "120px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.actualWeight != null ? item.actualWeight.toFixed(2) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.actualWeight ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"actualWeight",
									e.target.value ? parseFloat(e.target.value) : null
								)
							}
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) =>
					item.actualWeight != null ? `Actual Weight: ${item.actualWeight.toFixed(2)}` : undefined,
			},
			{
				id: "lessWeight",
				align: "right",
				header: "Less Weight",
				width: "1fr",
				minWidth: "110px",
				renderCell: ({ item }) => {
					const lw =
						item.actualWeight != null && lessPc != null
							? (item.actualWeight * lessPc) / 100
							: null;
					return <span className="text-xs">{lw != null ? lw.toFixed(2) : "-"}</span>;
				},
				getTooltip: ({ item }) => {
					const lw =
						item.actualWeight != null && lessPc != null
							? (item.actualWeight * lessPc) / 100
							: null;
					return lw != null ? `Less Weight: ${lw.toFixed(2)}` : undefined;
				},
			},
			{
				id: "allowableMoisture",
				align: "right",
				header: "Allowable Moisture (%)",
				width: "1.1fr",
				minWidth: "150px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.allowableMoisture != null ? item.allowableMoisture.toFixed(2) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.allowableMoisture ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"allowableMoisture",
									e.target.value ? parseFloat(e.target.value) : null
								)
							}
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) =>
					item.allowableMoisture != null
						? `Allowable Moisture: ${item.allowableMoisture.toFixed(2)}%`
						: undefined,
			},
			{
				id: "actualMoisture",
				align: "right",
				header: "Actual Moisture (%)",
				width: "1.1fr",
				minWidth: "140px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.actualMoisture != null ? item.actualMoisture.toFixed(2) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.actualMoisture ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"actualMoisture",
									e.target.value ? parseFloat(e.target.value) : null
								)
							}
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) =>
					item.actualMoisture != null ? `Actual Moisture: ${item.actualMoisture.toFixed(2)}%` : undefined,
			},
			{
				id: "claimDust",
				align: "right",
				header: "Claim Dust (%)",
				width: "1fr",
				minWidth: "110px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.claimDust != null ? item.claimDust.toFixed(2) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.claimDust ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"claimDust",
									e.target.value ? parseFloat(e.target.value) : null
								)
							}
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) =>
					item.claimDust != null ? `Claim Dust: ${item.claimDust.toFixed(2)}%` : undefined,
			},
			{
				id: "shortageKgs",
				align: "right",
				header: "Shortage (kgs)",
				width: "1fr",
				minWidth: "110px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.shortageKgs != null ? item.shortageKgs.toFixed(2) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.shortageKgs ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"shortageKgs",
									e.target.value ? parseInt(e.target.value, 10) : null
								)
							}
							inputProps={{ min: 0, step: 1 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) =>
					item.shortageKgs != null ? `Shortage: ${item.shortageKgs.toFixed(2)} kgs` : undefined,
			},
			{
				id: "acceptedWeight",
				align: "right",
				header: "Accepted Weight",
				width: "1.1fr",
				minWidth: "130px",
				renderCell: ({ item }) => (
					<span className="text-xs font-semibold">
						{item.acceptedWeight != null ? item.acceptedWeight.toFixed(2) : "-"}
					</span>
				),
				getTooltip: ({ item }) =>
					item.acceptedWeight != null ? `Accepted Weight: ${item.acceptedWeight.toFixed(2)}` : undefined,
			},
			{
				id: "rate",
				align: "right",
				header: "Rate",
				width: "0.9fr",
				minWidth: "90px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.rate != null ? item.rate.toFixed(2) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.rate ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"rate",
									e.target.value ? parseFloat(e.target.value) : null
								)
							}
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) => (item.rate != null ? `Rate: ${item.rate.toFixed(2)}` : undefined),
			},
			{
				id: "claimRate",
				align: "right",
				header: "Claim Rate",
				width: "1fr",
				minWidth: "110px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.claimRate != null ? item.claimRate.toFixed(2) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.claimRate ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"claimRate",
									e.target.value ? parseFloat(e.target.value) : null
								)
							}
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) =>
					item.claimRate != null ? `Claim Rate: ${item.claimRate.toFixed(2)}` : undefined,
			},
			{
				id: "claimQuality",
				header: "Claim Quality",
				width: "1.2fr",
				minWidth: "130px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return <span className="text-xs">{item.claimQuality || "-"}</span>;
					}
					return (
						<TextField
							size="small"
							value={item.claimQuality ?? ""}
							onChange={(e) => handleLineFieldChange(item.id, "claimQuality", e.target.value || null)}
							placeholder="Explanation of claim"
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) => item.claimQuality || undefined,
			},
			{
				id: "waterDamageAmount",
				align: "right",
				header: "Water Damage Amount",
				width: "1.2fr",
				minWidth: "150px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.waterDamageAmount != null ? item.waterDamageAmount.toFixed(2) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.waterDamageAmount ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"waterDamageAmount",
									e.target.value ? parseFloat(e.target.value) : null
								)
							}
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) =>
					item.waterDamageAmount != null
						? `Water Damage Amount: ${item.waterDamageAmount.toFixed(2)}`
						: undefined,
			},
			{
				id: "premiumAmount",
				align: "right",
				header: "Premium Amount",
				width: "1.1fr",
				minWidth: "130px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">
								{item.premiumAmount != null ? item.premiumAmount.toFixed(2) : "-"}
							</span>
						);
					}
					return (
						<TextField
							type="number"
							size="small"
							value={item.premiumAmount ?? ""}
							onChange={(e) =>
								handleLineFieldChange(
									item.id,
									"premiumAmount",
									e.target.value ? parseFloat(e.target.value) : null
								)
							}
							inputProps={{ min: 0, step: 0.01 }}
							sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem", py: 0.5 } }}
							fullWidth
						/>
					);
				},
				getTooltip: ({ item }) =>
					item.premiumAmount != null ? `Premium Amount: ${item.premiumAmount.toFixed(2)}` : undefined,
			},
			{
				id: "warehouse",
				header: "Warehouse",
				width: "1.4fr",
				minWidth: "130px",
				renderCell: ({ item }) => {
					if (!canEdit) {
						return (
							<span className="text-xs">{item.warehousePath || "-"}</span>
						);
					}
					const selectedOption = warehouseOptions.find((opt) => opt.value === item.warehouseId) ?? null;
					return (
						<SearchableSelect
							options={warehouseOptions}
							value={selectedOption}
							onChange={(next) => handleLineFieldChange(item.id, "warehouseId", next?.value ?? null)}
							getOptionLabel={(opt) => opt.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder="Select warehouse"
							textFieldProps={{ size: "small" }}
						/>
					);
				},
				getTooltip: ({ item }) => item.warehousePath || undefined,
			},
		],
		[canEdit, handleLineFieldChange, warehouseOptions, lessPc]
	);
}
