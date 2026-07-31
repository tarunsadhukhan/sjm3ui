"use client";

/**
 * @component JutePOHeaderForm
 * @description Renders the header form section for Jute PO with cascading dropdowns.
 * Handles: branch, date, mukam, unit, supplier, party (conditional), vehicle, channel, credit, etc.
 */

import * as React from "react";
import { MuiForm } from "@/components/ui/muiform";
import type { MuiFormMode, JutePOFormValues, Schema } from "../types/jutePOTypes";

type JutePOHeaderFormProps = {
  schema: Schema;
  formKey: number;
  initialValues: JutePOFormValues;
  mode: MuiFormMode;
  formRef: React.RefObject<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  onValuesChange: (values: Record<string, unknown>) => void;
};

export function JutePOHeaderForm({
  schema,
  formKey,
  initialValues,
  mode,
  formRef,
  onSubmit,
  onValuesChange,
}: JutePOHeaderFormProps) {
  return (
    <MuiForm
      key={formKey}
      ref={formRef}
      schema={schema}
      initialValues={initialValues as Record<string, unknown>}
      mode={mode}
      onSubmit={onSubmit}
      onValuesChange={onValuesChange}
      hideModeToggle
      hideSubmit
    />
  );
}

export default JutePOHeaderForm;
