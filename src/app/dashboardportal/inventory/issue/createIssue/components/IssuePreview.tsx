"use client";

import React from "react";
import type { IssueDetails, IssueLabelResolvers } from "../types/issueTypes";

type IssuePreviewProps = {
	details: IssueDetails | null;
	labelResolvers: IssueLabelResolvers;
};

/**
 * @component IssuePreview
 * @description Renders a printable preview of the Issue transaction.
 */
export const IssuePreview: React.FC<IssuePreviewProps> = ({
	details,
	labelResolvers,
}) => {
	if (!details) {
		return (
			<div className="p-4 text-center text-slate-500">
				No issue data available for preview.
			</div>
		);
	}

	return (
		<div className="p-4 print:p-0 space-y-4">
			{/* Header */}
			<div className="border-b pb-3">
				<h2 className="text-xl font-bold text-slate-800">
					Issue Pass: {details.issuePassNo || "Draft"}
				</h2>
				<p className="text-sm text-slate-600">
					Date: {details.date ? new Date(details.date).toLocaleDateString() : "-"}
				</p>
			</div>

			{/* Details Grid */}
			<div className="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span className="font-medium text-slate-600">Branch:</span>
					<span className="ml-2">{details.branchName || "-"}</span>
				</div>
				<div>
					<span className="font-medium text-slate-600">Department:</span>
					<span className="ml-2">
						{labelResolvers.department(String(details.deptId ?? ""))}
					</span>
				</div>
				<div>
					<span className="font-medium text-slate-600">Project:</span>
					<span className="ml-2">
						{details.projectId
							? labelResolvers.project(String(details.projectId))
							: "-"}
					</span>
				</div>
				<div>
					<span className="font-medium text-slate-600">Issued To:</span>
					<span className="ml-2">{details.issuedTo || "-"}</span>
				</div>
				<div>
					<span className="font-medium text-slate-600">Requested By:</span>
					<span className="ml-2">{details.reqBy || "-"}</span>
				</div>
				<div>
					<span className="font-medium text-slate-600">Status:</span>
					<span className="ml-2">{details.status || "-"}</span>
				</div>
			</div>

			{/* Internal Note */}
			{details.internalNote && (
				<div className="text-sm">
					<span className="font-medium text-slate-600">Internal Note:</span>
					<p className="mt-1 text-slate-700">{details.internalNote}</p>
				</div>
			)}

			{/* Line Items */}
			{details.lineItems && details.lineItems.length > 0 && (
				<div className="mt-4">
					<h3 className="text-sm font-semibold text-slate-700 mb-2">
						Line Items
					</h3>
					<table className="w-full text-sm border border-slate-300">
						<thead className="bg-slate-100">
							<tr>
								<th className="border-b px-2 py-1 text-left">#</th>
								<th className="border-b px-2 py-1 text-left">Item</th>
								<th className="border-b px-2 py-1 text-left">SR No</th>
								<th className="border-b px-2 py-1 text-right">Qty</th>
								<th className="border-b px-2 py-1 text-left">UOM</th>
								<th className="border-b px-2 py-1 text-right">Rate</th>
								<th className="border-b px-2 py-1 text-left">Expense</th>
							</tr>
						</thead>
						<tbody>
							{details.lineItems.map((line, index) => (
								<tr key={line.id || index} className="border-b">
									<td className="px-2 py-1">{index + 1}</td>
									<td className="px-2 py-1">{line.itemName || "-"}</td>
									<td className="px-2 py-1">{line.srNo || "-"}</td>
									<td className="px-2 py-1 text-right">{line.qty}</td>
									<td className="px-2 py-1">{line.uomName || "-"}</td>
									<td className="px-2 py-1 text-right">
										{line.rate ? parseFloat(String(line.rate)).toFixed(2) : "-"}
									</td>
									<td className="px-2 py-1">{line.expenseTypeName || "-"}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};
