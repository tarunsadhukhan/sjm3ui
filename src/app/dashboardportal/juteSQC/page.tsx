"use client";

import * as React from "react";
import Link from "next/link";
import { Box, Card, CardActionArea, CardContent, Typography } from "@mui/material";
import {
	FlaskConical,
	Disc3,
	Columns3,
	Scissors,
	Ruler,
	Shirt,
	Layers,
	Droplets,
	ThermometerSun,
	Package,
	PackageCheck,
	Weight,
	Gauge,
	SplinePointer,
	Grid3x3,
	TriangleAlert,
	Wind,
	Slice,
	Combine,
	SquareStack,
	Spool,
	Waves,
} from "lucide-react";

type Tile = {
	href: string;
	title: string;
	subtitle: string;
	icon: React.ReactNode;
};

const TILES: Tile[] = [
	{
		href: "/dashboardportal/juteSQC/r-08-01",
		title: "Morrah Weight (R-08-01)",
		subtitle: "Daily morrah weight sampling & standard check",
		icon: <FlaskConical size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/spinning",
		title: "Spinning SQC",
		subtitle: "Yarn parameter, actual speed/TPI, RHMR, QR & CV %",
		icon: <Disc3 size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/beaming",
		title: "Beaming SQC",
		subtitle: "Beaming quality checks & parameter sampling",
		icon: <Columns3 size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/weaving",
		title: "Weaving SQC",
		subtitle: "Loom picks sampling & actuals",
		icon: <Grid3x3 size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/finishing",
		title: "Finishing SQC",
		subtitle: "Process-wise finishing actuals grid",
		icon: <Layers size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/spreader",
		title: "Spreader SQC",
		subtitle: "Roll & sliver weight sampling",
		icon: <SquareStack size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/breakerCard",
		title: "Breaker Card SQC",
		subtitle: "Breaker card sliver weight checks",
		icon: <Combine size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/interCard",
		title: "Inter Card SQC",
		subtitle: "Inter card sliver weight checks",
		icon: <SplinePointer size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/finDraw",
		title: "Finisher Drawing SQC",
		subtitle: "Finisher drawing sliver weight checks",
		icon: <Spool size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/beamMr",
		title: "Beam MR% SQC",
		subtitle: "Beam moisture regain sampling",
		icon: <Droplets size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/drawhead",
		title: "Drawhead SQC",
		subtitle: "Drawhead sliver weight checks",
		icon: <Gauge size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/fabricConstruction",
		title: "Fabric Construction SQC",
		subtitle: "Cloth construction parameter checks",
		icon: <Shirt size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/yarnTpi",
		title: "Yarn TPI SQC",
		subtitle: "Twist per inch & TPI CV% studies (R-08-17)",
		icon: <Waves size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/cuttingLength",
		title: "Cutting Length SQC",
		subtitle: "Cut piece length sampling",
		icon: <Slice size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/qrCv15a",
		title: "Yarn QR-CV Special SQC",
		subtitle: "Special purpose QR% & CV% tests (R-08-15A)",
		icon: <Scissors size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/widthPicks",
		title: "Width & Picks SQC",
		subtitle: "Cloth width & picks sampling",
		icon: <Ruler size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/stitch",
		title: "Stitch SQC",
		subtitle: "Stitch per bag sampling",
		icon: <FlaskConical size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/bagWeight",
		title: "Bag Weight SQC",
		subtitle: "Bag weight sampling & MR correction",
		icon: <Weight size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/bagCheck",
		title: "Bag Checking SQC",
		subtitle: "Bag inspection & defect recording",
		icon: <PackageCheck size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/packingMr",
		title: "Packing MR% SQC",
		subtitle: "Packing moisture regain sampling",
		icon: <Package size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/fabricFault",
		title: "Fabric Fault SQC",
		subtitle: "Cloth fault inspection & recording",
		icon: <TriangleAlert size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/emulsion",
		title: "Emulsion SQC",
		subtitle: "Emulsion application checks by spreader",
		icon: <Wind size={32} className="text-blue-600" />,
	},
	{
		href: "/dashboardportal/juteSQC/humidity",
		title: "Humidity Recording SQC",
		subtitle: "Department temperature & RH% log",
		icon: <ThermometerSun size={32} className="text-blue-600" />,
	},
];

export default function JuteSQCLandingPage() {
	return (
		<Box sx={{ p: { xs: 2, md: 3 } }}>
			<Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
				Jute SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
				Statistical quality control — sampling, parameter checks & reports.
			</Typography>
			<Box
				sx={{
					display: "grid",
					gap: 2,
					gridTemplateColumns: {
						xs: "1fr",
						sm: "repeat(2, minmax(0, 1fr))",
						md: "repeat(3, minmax(0, 1fr))",
						lg: "repeat(4, minmax(0, 1fr))",
					},
				}}
			>
				{TILES.map((tile) => (
					<Card key={tile.href} variant="outlined">
						<CardActionArea component={Link} href={tile.href} sx={{ p: 2, minHeight: 120 }}>
							<CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
								{tile.icon}
								<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
									{tile.title}
								</Typography>
								<Typography variant="body2" color="text.secondary">
									{tile.subtitle}
								</Typography>
							</CardContent>
						</CardActionArea>
					</Card>
				))}
			</Box>
		</Box>
	);
}
