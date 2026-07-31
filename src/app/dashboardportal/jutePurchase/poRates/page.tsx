"use client";

import * as React from "react";
import JuteRatePermissionInfo from "../_components/JuteRatePermissionInfo";

/** Permission-only menu page: controls Rate visibility on Jute Purchase Orders. */
export default function JutePORatesPermissionPage() {
  return <JuteRatePermissionInfo scope="po" documentName="Jute Purchase Order" />;
}
