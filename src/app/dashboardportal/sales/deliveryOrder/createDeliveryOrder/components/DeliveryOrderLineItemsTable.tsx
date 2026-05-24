import React from "react";
import { SearchableSelect } from "@/components/ui/transaction";
import { Input } from "@/components/ui/input";
import type { TransactionLineColumn } from "@/components/ui/transaction";
import type { EditableLineItem, Option, UomConversionEntry } from "../types/deliveryOrderTypes";
import { computeConvertedRate } from "@/utils/uomConversion";

type UseDOLineItemColumnsParams = {
	canEdit: boolean;
	getItemOptions: (groupId: string) => Option[];
	getMakeOptions: (groupId: string) => Option[];
	getUomOptions: (groupId: string, itemId: string) => Option[];
	getUomLabel: (groupId: string, itemId: string, uomId: string, fallbackName?: string) => string;
	handleLineFieldChange: (id: string, field: keyof EditableLineItem, value: string | number) => void;
	invoiceTypeId?: string;
	getUomConversions?: (groupId: string, itemId: string) => UomConversionEntry[] | undefined;
};

export const useDOLineItemColumns = ({
	canEdit,
	getItemOptions,
	getMakeOptions,
	getUomOptions,
	getUomLabel,
	handleLineFieldChange,
	invoiceTypeId,
	getUomConversions,
}: UseDOLineItemColumnsParams): TransactionLineColumn<EditableLineItem>[] =>
	React.useMemo(
		() => [
			{
				id: "itemCode",
				header: "Item Code",
				width: "1.5fr",
				minWidth: "140px",
				renderCell: ({ item }) => (
					<span className="block truncate text-sm">{item.itemCode || "-"}</span>
				),
				getTooltip: ({ item }) => item.itemCode || undefined,
			},
			{
				id: "item",
				header: "Item",
				width: "2.25fr",
				minWidth: "225px",
				renderCell: ({ item }) => {
					const options = getItemOptions(item.itemGroup);
					const label = options.find((o) => o.value === item.item)?.label ?? item.itemName ?? "-";
					return <span className="block truncate text-sm">{label}</span>;
				},
				getTooltip: ({ item }) => {
					const options = getItemOptions(item.itemGroup);
					return options.find((o) => o.value === item.item)?.label || item.itemName || undefined;
				},
			},
			{
				id: "itemMake",
				header: "Make",
				width: "1fr",
				minWidth: "130px",
				renderCell: ({ item }) => {
					const options = getMakeOptions(item.itemGroup);
					const label = options.find((o) => o.value === item.itemMake)?.label ?? item.itemMake ?? "-";
					if (!canEdit) {
						return <span className="block truncate text-sm">{label}</span>;
					}
					const value = options.find((o) => o.value === item.itemMake) ?? null;
					return (
						<SearchableSelect<Option>
							options={options}
							value={value}
							onChange={(next) => handleLineFieldChange(item.id, "itemMake", next?.value ?? "")}
							getOptionLabel={(o) => o.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder="Make"
						/>
					);
				},
			},
			{
				id: "quantity",
				header: "Qty",
				width: "0.8fr",
				minWidth: "80px",
				renderCell: ({ item }) =>
					canEdit ? (
						<Input
							type="text"
							value={item.quantity}
							onChange={(e) => handleLineFieldChange(item.id, "quantity", e.target.value)}
							placeholder="0"
							className="h-8 text-sm"
						/>
					) : (
						<span className="block truncate text-sm">{item.quantity || "-"}</span>
					),
				getTooltip: ({ item }) => (item.quantity ? `Quantity: ${item.quantity}` : undefined),
			},
			{
				id: "uom",
				header: "UOM",
				width: "0.6fr",
				minWidth: "80px",
				renderCell: ({ item }) => {
					const options = getUomOptions(item.itemGroup, item.item);
					const label = getUomLabel(item.itemGroup, item.item, item.uom, item.uomName);
					if (!canEdit) {
						return <span className="block truncate text-sm">{label || "-"}</span>;
					}
					let value = options.find((o) => o.value === item.uom) ?? null;
					if (!value && item.uom) {
						value = { value: item.uom, label };
					}
					const resolvedOptions = value && !options.some((o) => o.value === item.uom)
						? [value, ...options]
						: options;
					return (
						<SearchableSelect<Option>
							options={resolvedOptions}
							value={value}
							onChange={(next) => handleLineFieldChange(item.id, "uom", next?.value ?? "")}
							getOptionLabel={(o) => o.label}
							isOptionEqualToValue={(a, b) => a.value === b.value}
							placeholder="UOM"
						/>
					);
				},
				getTooltip: ({ item }) => getUomLabel(item.itemGroup, item.item, item.uom, item.uomName) || undefined,
			},
			{
				id: "rate",
				header: "Rate",
				width: "0.8fr",
				minWidth: "80px",
				renderCell: ({ item }) => {
					const showConversion = invoiceTypeId === "2";
					const conversion = showConversion && getUomConversions
						? computeConvertedRate(item.rate, item.uom, getUomConversions(item.itemGroup, item.item))
						: null;

					if (canEdit) {
						return (
							<div className="flex flex-col gap-0.5">
								<Input
									type="text"
									value={item.rate}
									onChange={(e) => handleLineFieldChange(item.id, "rate", e.target.value)}
									placeholder="0.00"
									className="h-8 text-sm"
								/>
								{conversion ? (
									<span className="text-[11px] text-muted-foreground leading-tight truncate">
										{"\u2248"} {conversion.convertedRate} / {conversion.otherUomName}
									</span>
								) : null}
							</div>
						);
					}

					return (
						<div className="flex flex-col gap-0.5">
							<span className="block truncate text-sm">{item.rate || "-"}</span>
							{conversion ? (
								<span className="text-[11px] text-muted-foreground leading-tight truncate">
									{"\u2248"} {conversion.convertedRate} / {conversion.otherUomName}
								</span>
							) : null}
						</div>
					);
				},
				getTooltip: ({ item }) => {
					if (!item.rate) return undefined;
					const showConversion = invoiceTypeId === "2";
					const conversion = showConversion && getUomConversions
						? computeConvertedRate(item.rate, item.uom, getUomConversions(item.itemGroup, item.item))
						: null;
					if (conversion) {
						return `Rate: ${item.rate} (\u2248 ${conversion.convertedRate} / ${conversion.otherUomName})`;
					}
					return `Rate: ${item.rate}`;
				},
			},
			{
				id: "amount",
				header: "Amount",
				width: "0.8fr",
				minWidth: "90px",
				renderCell: ({ item }) => <span className="block truncate text-sm font-medium">{item.netAmount?.toFixed(2) || "0.00"}</span>,
				getTooltip: ({ item }) => (item.netAmount ? `Amount: ${item.netAmount.toFixed(2)}` : undefined),
			},
			{
				id: "taxAmount",
				header: "GST",
				width: "0.7fr",
				minWidth: "80px",
				renderCell: ({ item }) => {
					const taxAmount = (item.igstAmount ?? 0) + (item.cgstAmount ?? 0) + (item.sgstAmount ?? 0);
					const hasTax = taxAmount > 0;
					if (item.taxPercentage != null && hasTax) {
						return <span className="block truncate text-sm">{item.taxPercentage}% = {taxAmount.toFixed(2)}</span>;
					}
					if (item.taxPercentage != null) {
						return <span className="block truncate text-sm">{item.taxPercentage}%</span>;
					}
					return <span className="block truncate text-sm">{hasTax ? taxAmount.toFixed(2) : "-"}</span>;
				},
				getTooltip: ({ item }) => {
					const taxAmount = (item.igstAmount ?? 0) + (item.cgstAmount ?? 0) + (item.sgstAmount ?? 0);
					const parts: string[] = [];
					if (item.taxPercentage != null) parts.push(`Tax: ${item.taxPercentage}%`);
					if (taxAmount > 0) parts.push(`GST: ${taxAmount.toFixed(2)}`);
					return parts.length ? parts.join("\n") : undefined;
				},
			},
			{
				id: "remarks",
				header: "Remarks",
				width: "1fr",
				minWidth: "100px",
				renderCell: ({ item }) =>
					canEdit ? (
						<Input
							type="text"
							value={item.remarks}
							onChange={(e) => handleLineFieldChange(item.id, "remarks", e.target.value)}
							placeholder=""
							className="h-8 text-sm"
						/>
					) : (
						<span className="block truncate text-sm">{item.remarks || "-"}</span>
					),
				getTooltip: ({ item }) => (item.remarks ? item.remarks : undefined),
			},
		],
		[canEdit, getItemOptions, getMakeOptions, getUomOptions, getUomLabel, handleLineFieldChange, invoiceTypeId, getUomConversions],
	);

export default useDOLineItemColumns;
