"use client";

import React, { useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import HandsReportMatrix from "./HandsReportMatrix";
import ActualVsStdMatrix from "./ActualVsStdMatrix";

export default function DailyManMachinePage() {
	const [tab, setTab] = useState(0);
	return (
		<Box sx={{ p: 2 }}>
			<Tabs
				value={tab}
				onChange={(_, v) => setTab(v)}
				className="hands-report-noprint"
				sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
			>
				<Tab label="Hands Report" />
				<Tab label="Actual Vs Std Hands" />
			</Tabs>
			{/* Mount only the active tab so each fetches once and print shows a single report. */}
			{tab === 0 ? <HandsReportMatrix /> : <ActualVsStdMatrix />}
		</Box>
	);
}
