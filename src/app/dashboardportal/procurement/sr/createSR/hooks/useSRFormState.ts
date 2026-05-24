import * as React from "react";
import type { SRHeader, SRLineItem } from "../types/srTypes";

type UseSRFormStateParams = {
	initialSRDate?: string;
	initialSRRemarks?: string;
};

type UseSRFormStateReturn = {
	srDate: string;
	setSRDate: React.Dispatch<React.SetStateAction<string>>;
	srRemarks: string;
	setSRRemarks: React.Dispatch<React.SetStateAction<string>>;
	resetFormState: (header: SRHeader | null) => void;
};

/**
 * Manages SR form state for date and remarks fields.
 */
export const useSRFormState = ({
	initialSRDate,
	initialSRRemarks,
}: UseSRFormStateParams = {}): UseSRFormStateReturn => {
	const [srDate, setSRDate] = React.useState(
		initialSRDate || new Date().toISOString().slice(0, 10),
	);
	const [srRemarks, setSRRemarks] = React.useState(initialSRRemarks || "");

	const resetFormState = React.useCallback((header: SRHeader | null) => {
		if (header?.sr_date) {
			setSRDate(header.sr_date.slice(0, 10));
		} else {
			setSRDate(new Date().toISOString().slice(0, 10));
		}
		setSRRemarks(header?.sr_remarks || "");
	}, []);

	return {
		srDate,
		setSRDate,
		srRemarks,
		setSRRemarks,
		resetFormState,
	};
};
