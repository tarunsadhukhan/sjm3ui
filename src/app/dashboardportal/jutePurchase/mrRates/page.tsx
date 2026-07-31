"use client";

import * as React from "react";
import JuteRatePermissionInfo from "../_components/JuteRatePermissionInfo";

/** Permission-only menu page: controls Rate visibility on Jute MRs. */
export default function JuteMRRatesPermissionPage() {
  return <JuteRatePermissionInfo scope="mr" documentName="Jute MR" />;
}
