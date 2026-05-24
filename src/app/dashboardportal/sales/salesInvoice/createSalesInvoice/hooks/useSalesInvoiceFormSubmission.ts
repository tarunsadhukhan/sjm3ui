import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { createInvoice, updateInvoice, type SaveInvoiceRequest } from "@/utils/salesInvoiceService";
import type { EditableLineItem } from "../types/salesInvoiceTypes";
import { isRawJuteInvoice, isHessianInvoice, isGovtSkgInvoice } from "../utils/salesInvoiceConstants";

type ApprovalPermissions = {
	canSave?: boolean;
	[key: string]: unknown;
};

type AdditionalChargePayload = {
	additional_charges_id: string;
	qty: number;
	rate: number;
	net_amount: number;
	remarks?: string;
	gst?: {
		igst_amount?: number;
		igst_percent?: number;
		cgst_amount?: number;
		cgst_percent?: number;
		sgst_amount?: number;
		sgst_percent?: number;
		gst_total?: number;
	};
};

type Params = {
	mode: "create" | "edit" | "view";
	pageError: string | null;
	setupError: string | null;
	filledLineItems: ReadonlyArray<EditableLineItem>;
	isLineItemsReady: boolean;
	requestedId: string;
	formValues: Record<string, unknown>;
	approvalPermissions?: ApprovalPermissions;
	additionalCharges?: ReadonlyArray<{
		additionalChargesId: string;
		qty: string;
		rate: string;
		netAmount: string;
		remarks: string;
		gst?: {
			igstAmount?: number;
			igstPercent?: number;
			cgstAmount?: number;
			cgstPercent?: number;
			sgstAmount?: number;
			sgstPercent?: number;
			gstTotal?: number;
		};
	}>;
};

export const useSalesInvoiceFormSubmission = ({
	mode, pageError, setupError, filledLineItems, isLineItemsReady, requestedId, formValues, approvalPermissions, additionalCharges,
}: Params) => {
	const [saving, setSaving] = React.useState(false);
	const router = useRouter();

	const handleFormSubmit = React.useCallback(
		async (values: Record<string, unknown>) => {
			if (mode === "view" || pageError || setupError) return;
			if (approvalPermissions?.canSave === false) {
				toast({ variant: "destructive", title: "Cannot save", description: "This invoice cannot be edited." });
				return;
			}

			if (!isLineItemsReady) {
				toast({ variant: "destructive", title: "Line items incomplete", description: "Add at least one item with valid quantity." });
				return;
			}

			const invoiceTypeId = String(values.invoice_type ?? formValues.invoice_type ?? "");
			const rawJute = isRawJuteInvoice(invoiceTypeId);
			const hessian = isHessianInvoice(invoiceTypeId);
			const govtSkg = isGovtSkgInvoice(invoiceTypeId);

			const itemsPayload = filledLineItems.map((item) => ({
				item: item.item || "",
				item_make: item.itemMake || undefined,
				delivery_order_dtl_id: item.deliveryOrderDtlId,
				sales_order_dtl_id: item.salesOrderDtlId,
				hsn_code: item.hsnCode || undefined,
				quantity: item.quantity || "0",
				uom: item.uom || "",
				rate: item.rate || undefined,
				discount_type: item.discountType,
				discounted_rate: item.discountedRate,
				discount_amount: item.discountAmount,
				net_amount: item.netAmount,
				total_amount: item.totalAmount,
				remarks: item.remarks || undefined,
				gst: {
					igst_amount: item.igstAmount || 0,
					igst_percent: item.igstPercent || 0,
					cgst_amount: item.cgstAmount || 0,
					cgst_percent: item.cgstPercent || 0,
					sgst_amount: item.sgstAmount || 0,
					sgst_percent: item.sgstPercent || 0,
					gst_total: item.gstTotal || 0,
					tax_percentage: item.taxPercentage || 0,
					tax_amount: item.gstTotal || 0,
				},
				...(rawJute ? {
					jute_dtl: {
						claim_amount_dtl: Number(item.juteClaimAmountDtl) || undefined,
						claim_desc: item.juteClaimDesc || undefined,
						claim_rate: Number(item.juteClaimRate) || undefined,
						unit_conversion: item.juteUnitConversion || undefined,
						qty_untit_conversion: Number(item.juteQtyUnitConversion) || undefined,
					},
				} : {}),
				...(hessian ? {
					hessian_dtl: {
						qty_bales: Number(item.hessianQtyBales) || undefined,
						rate_per_bale: Number(item.hessianRatePerBale) || undefined,
						billing_rate_mt: Number(item.hessianBillingRateMt) || undefined,
						billing_rate_bale: Number(item.hessianBillingRateBale) || undefined,
					},
				} : {}),
				...(govtSkg ? {
					govtskg_dtl: {
						pack_sheet: Number(item.govtskgPackSheet) || undefined,
						net_weight: Number(item.govtskgNetWeight) || undefined,
						total_weight: Number(item.govtskgTotalWeight) || undefined,
					},
				} : {}),
			}));

			const freightCharges = Number(values.freight_charges ?? formValues.freight_charges) || 0;
			const roundOff = Number(values.round_off ?? formValues.round_off) || 0;
			const grossAmount = filledLineItems.reduce((sum, l) => sum + (l.netAmount || 0), 0);
			const totalGST = filledLineItems.reduce((sum, l) => sum + (l.gstTotal || 0), 0);
			const addlChargesTotal = (additionalCharges ?? []).reduce(
				(sum, c) => sum + (parseFloat(c.netAmount) || 0) + (c.gst?.gstTotal ?? 0), 0,
			);
			const netAmount = grossAmount + totalGST + freightCharges + roundOff + addlChargesTotal;

			const payload: SaveInvoiceRequest = {
				branch: String(values.branch ?? formValues.branch ?? ""),
				date: String(values.date ?? formValues.date ?? ""),
				party: String(values.party ?? formValues.party ?? ""),
				party_branch: String(values.party_branch ?? formValues.party_branch ?? "") || undefined,
				delivery_order: String(values.delivery_order ?? formValues.delivery_order ?? "") || undefined,
				billing_to: String(values.billing_to ?? formValues.billing_to ?? "") || undefined,
				shipping_to: String(values.shipping_to ?? formValues.shipping_to ?? "") || undefined,
				transporter: String(values.transporter ?? formValues.transporter ?? "") || undefined,
				vehicle_no: String(values.vehicle_no ?? formValues.vehicle_no ?? "") || undefined,
				eway_bill_no: String(values.eway_bill_no ?? formValues.eway_bill_no ?? "") || undefined,
				eway_bill_date: String(values.eway_bill_date ?? formValues.eway_bill_date ?? "") || undefined,
				challan_no: String(values.challan_no ?? formValues.challan_no ?? "") || undefined,
				challan_date: String(values.challan_date ?? formValues.challan_date ?? "") || undefined,
				invoice_type: String(values.invoice_type ?? formValues.invoice_type ?? "") || undefined,
				footer_note: String(values.footer_note ?? formValues.footer_note ?? "") || undefined,
				internal_note: String(values.internal_note ?? formValues.internal_note ?? "") || undefined,
				terms_conditions: String(values.terms_conditions ?? formValues.terms_conditions ?? "") || undefined,
				gross_amount: grossAmount,
				net_amount: netAmount,
				freight_charges: freightCharges || undefined,
				round_off: roundOff || undefined,
				due_date: String(values.due_date ?? formValues.due_date ?? "") || undefined,
				type_of_sale: String(values.type_of_sale ?? formValues.type_of_sale ?? "") || undefined,
				tax_id: String(values.tax_id ?? formValues.tax_id ?? "") || undefined,
				transporter_address: String(values.transporter_address ?? formValues.transporter_address ?? "") || undefined,
				transporter_state_code: String(values.transporter_state_code ?? formValues.transporter_state_code ?? "") || undefined,
				transporter_state_name: String(values.transporter_state_name ?? formValues.transporter_state_name ?? "") || undefined,
				container_no: String(values.container_no ?? formValues.container_no ?? "") || undefined,
				contract_no: String(values.contract_no ?? formValues.contract_no ?? "") || undefined,
				contract_date: String(values.contract_date ?? formValues.contract_date ?? "") || undefined,
				consignment_no: String(values.consignment_no ?? formValues.consignment_no ?? "") || undefined,
				consignment_date: String(values.consignment_date ?? formValues.consignment_date ?? "") || undefined,
				shipping_state_code: String(values.shipping_state_code ?? formValues.shipping_state_code ?? "") || undefined,
				intra_inter_state: String(values.intra_inter_state ?? formValues.intra_inter_state ?? "") || undefined,
				payment_terms: Number(values.payment_terms ?? formValues.payment_terms) || undefined,
				sales_order_id: Number(values.sales_order_id ?? formValues.sales_order_id) || undefined,
				billing_state_code: Number(values.billing_state_code ?? formValues.billing_state_code) || undefined,
				bank_detail_id: Number(values.bank_detail_id ?? formValues.bank_detail_id) || undefined,
				items: itemsPayload,
			};

			if (rawJute) {
				payload.jute = {
					mr_no: String(values.jute_mr_no ?? formValues.jute_mr_no ?? "") || undefined,
					mukam_id: Number(values.jute_mukam_id ?? formValues.jute_mukam_id) || undefined,
					claim_amount: Number(values.jute_claim_amount ?? formValues.jute_claim_amount) || undefined,
					claim_description: String(values.jute_claim_description ?? formValues.jute_claim_description ?? "") || undefined,
				};
			}

			if (govtSkg) {
				payload.govtskg = {
					pcso_no: String(values.govtskg_pcso_no ?? formValues.govtskg_pcso_no ?? "") || undefined,
					pcso_date: String(values.govtskg_pcso_date ?? formValues.govtskg_pcso_date ?? "") || undefined,
					administrative_office_address: String(values.govtskg_admin_office_address ?? formValues.govtskg_admin_office_address ?? "") || undefined,
					destination_rail_head: String(values.govtskg_destination_rail_head ?? formValues.govtskg_destination_rail_head ?? "") || undefined,
					loading_point: String(values.govtskg_loading_point ?? formValues.govtskg_loading_point ?? "") || undefined,
					mode_of_transport: String(values.govtskg_mode_of_transport ?? formValues.govtskg_mode_of_transport ?? "") || undefined,
					pack_sheet: Number(values.govtskg_pack_sheet ?? formValues.govtskg_pack_sheet) || undefined,
					net_weight: Number(values.govtskg_net_weight ?? formValues.govtskg_net_weight) || undefined,
					total_weight: Number(values.govtskg_total_weight ?? formValues.govtskg_total_weight) || undefined,
				};
			}

			// Add additional charges to payload
			if (additionalCharges && additionalCharges.length > 0) {
				payload.additional_charges = additionalCharges
					.filter((c) => c.additionalChargesId && (parseFloat(c.netAmount) || 0) > 0)
					.map((c) => ({
						additional_charges_id: c.additionalChargesId,
						qty: parseFloat(c.qty) || 0,
						rate: parseFloat(c.rate) || 0,
						net_amount: parseFloat(c.netAmount) || 0,
						remarks: c.remarks || undefined,
						gst: c.gst ? {
							igst_amount: c.gst.igstAmount,
							igst_percent: c.gst.igstPercent,
							cgst_amount: c.gst.cgstAmount,
							cgst_percent: c.gst.cgstPercent,
							sgst_amount: c.gst.sgstAmount,
							sgst_percent: c.gst.sgstPercent,
							gst_total: c.gst.gstTotal,
						} : undefined,
					}));
			}

			setSaving(true);
			try {
				if (mode === "edit" && requestedId) payload.id = requestedId;
				const fn = mode === "edit" && requestedId ? updateInvoice : createInvoice;
				const result = await fn(payload);
				const invoiceId = result?.invoice_id ?? requestedId;
				toast({ title: result?.message ?? (mode === "edit" ? "Sales invoice updated" : "Sales invoice created") });
				if (invoiceId) {
					router.replace(`/dashboardportal/sales/salesInvoice/createSalesInvoice?mode=view&id=${encodeURIComponent(String(invoiceId))}`);
				}
			} catch (error) {
				toast({ variant: "destructive", title: "Unable to save sales invoice", description: error instanceof Error ? error.message : "Please try again." });
			} finally {
				setSaving(false);
			}
		},
		[mode, pageError, setupError, filledLineItems, isLineItemsReady, requestedId, router, formValues],
	);

	return { saving, handleFormSubmit };
};
