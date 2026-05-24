/**
 * @file mrService.ts
 * @description API service functions for Jute Material Receipt (MR) module.
 */

import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { ApprovalActionPermissions } from "@/components/ui/transaction";

// =============================================================================
// TYPES
// =============================================================================

export type MRDetails = {
	id: number;
	branchMrNo: number | null;
	mrDate: string;
	branch: string;
	branchId: number;
	supplier: string | null;
	party: string | null;
	partyId: string | null;
	partyBranchId: number | null;
	status?: string;
	statusId?: number;
	approvalLevel?: number | null;
	maxApprovalLevel?: number | null;
	permissions?: ApprovalActionPermissions;
};

export type StatusChangeResponse = {
	success: boolean;
	message: string;
	mr_id: number;
	status_id?: number;
	status_name?: string;
	branch_mr_no?: number;
};

// =============================================================================
// STATUS CHANGE FUNCTIONS
// =============================================================================

/**
 * Open MR - Changes status from Draft (21) to Open (1).
 * Requires party_id and party_branch_id to be filled.
 */
export async function openMR(mrId: string, branchId: string): Promise<StatusChangeResponse> {
	const payload = {
		mr_id: mrId,
		branch_id: branchId,
	};

	const { data, error } = await fetchWithCookie<StatusChangeResponse>(
		apiRoutesPortalMasters.JUTE_MR_OPEN,
		"POST",
		payload
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty response from open API");
	}

	return data;
}

/**
 * Set MR to Pending - Changes status from Open (1) to Pending (13).
 * This is a terminal state on this screen (handled by external system).
 */
export async function pendingMR(mrId: string, branchId: string): Promise<StatusChangeResponse> {
	const payload = {
		mr_id: mrId,
		branch_id: branchId,
	};

	const { data, error } = await fetchWithCookie<StatusChangeResponse>(
		apiRoutesPortalMasters.JUTE_MR_PENDING,
		"POST",
		payload
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty response from pending API");
	}

	return data;
}

/**
 * Approve MR - Changes status to Approved (3) or next approval level.
 * If party_branch_id is provided, it will be saved along with the approval.
 * For final approval, mr_date is MANDATORY and mr_no will be auto-generated.
 */
export async function approveMR(
	mrId: string, 
	branchId: string, 
	partyBranchId?: number | null,
	mrDate?: string | null
): Promise<StatusChangeResponse> {
	const payload: Record<string, unknown> = {
		mr_id: mrId,
		branch_id: branchId,
	};
	
	// Include party_branch_id if provided (handles case where it was selected but not saved)
	if (partyBranchId != null) {
		payload.party_branch_id = partyBranchId;
	}
	
	// Include mr_date if provided (mandatory for final approval)
	if (mrDate) {
		payload.mr_date = mrDate;
	}

	const { data, error } = await fetchWithCookie<StatusChangeResponse>(
		apiRoutesPortalMasters.JUTE_MR_APPROVE,
		"POST",
		payload
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty response from approve API");
	}

	return data;
}

/**
 * Reject MR - Changes status to Rejected (4).
 */
export async function rejectMR(mrId: string, branchId: string, reason: string): Promise<StatusChangeResponse> {
	const payload = {
		mr_id: mrId,
		branch_id: branchId,
		reason,
	};

	const { data, error } = await fetchWithCookie<StatusChangeResponse>(
		apiRoutesPortalMasters.JUTE_MR_REJECT,
		"POST",
		payload
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty response from reject API");
	}

	return data;
}

/**
 * Cancel MR - Changes status from Open to Cancelled (6).
 */
export async function cancelMR(mrId: string, branchId: string): Promise<StatusChangeResponse> {
	const payload = {
		mr_id: mrId,
		branch_id: branchId,
	};

	const { data, error } = await fetchWithCookie<StatusChangeResponse>(
		apiRoutesPortalMasters.JUTE_MR_CANCEL,
		"POST",
		payload
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty response from cancel API");
	}

	return data;
}
