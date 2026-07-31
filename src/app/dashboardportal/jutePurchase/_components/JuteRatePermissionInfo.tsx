"use client";

import * as React from "react";
import { Alert, Card, CardContent, Typography } from "@mui/material";
import { useJuteRatePermission, type JuteRateScope } from "@/hooks/useJuteRatePermission";

/**
 * @component JuteRatePermissionInfo
 * @description Informational page body for the permission-only rate menus
 * ("Jute PO Rates" / "Jute MR Rates"). The menu itself is what matters: roles
 * holding it (view or edit) can see/edit Rate fields on the corresponding
 * document. This page just explains that and shows the current user's access.
 */
export function JuteRatePermissionInfo({ scope, documentName }: { scope: JuteRateScope; documentName: string }) {
  const { canViewRates, canEditRates } = useJuteRatePermission(scope);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 2 }}>
          {documentName} Rates Permission
        </Typography>
        <Card>
          <CardContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              This menu controls who can see and edit <strong>Rate</strong> values on the{" "}
              {documentName} pages. It has no data of its own — assign it to roles via Role
              Management:
            </Typography>
            <Typography variant="body2" component="ul" sx={{ pl: 3, mb: 2 }}>
              <li><strong>View</strong> access — rates are visible but read-only.</li>
              <li><strong>Edit</strong> access — rates are visible and editable.</li>
              <li><strong>No access</strong> — rate fields are hidden entirely.</li>
            </Typography>
            <Alert severity={canEditRates ? "success" : canViewRates ? "info" : "warning"}>
              Your current access: {canEditRates ? "can view and edit rates" : canViewRates ? "can view rates (read-only)" : "rates are hidden"}
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default JuteRatePermissionInfo;
