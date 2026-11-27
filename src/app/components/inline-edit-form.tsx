"use client";

import { useEffect, useRef } from "react";

import { type FieldValues, type UseFormReturn } from "react-hook-form";

import { Button } from "~/components/ui/button";
import { Form } from "~/components/ui/form";

/**
 * A form that edits or adds something in place on the manage page: focus moves into it when it
 * opens (unless `takeFocus` is false), Escape or Cancel closes it, and its submit button (Save,
 * unless `submitLabel` says otherwise) submits.
 */
export function InlineEditForm<T extends FieldValues>({
  form,
  onSubmit,
  onCancel,
  isSaving,
  submitLabel = "Save",
  savingLabel = "Saving...",
  cancelLabel = "Cancel",
  takeFocus = true,
  children,
}: {
  form: UseFormReturn<T>;
  onSubmit: (values: T) => void;
  onCancel: () => void;
  isSaving: boolean;
  submitLabel?: string;
  /** The submit button's label while saving */
  savingLabel?: string;
  cancelLabel?: string;
  /** False for a form that opens without the host asking, so it doesn't take focus */
  takeFocus?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  // Move focus into the form the host just opened
  useEffect(() => {
    if (takeFocus) {
      ref.current?.querySelector<HTMLElement>("input, textarea")?.focus();
    }
    // Only when it opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Form {...form}>
      <form
        ref={ref}
        onSubmit={form.handleSubmit(onSubmit)}
        onKeyDown={e => {
          // Not while saving: a failed save keeps the form open with the host's changes
          if (e.key === "Escape" && !isSaving) onCancel();
        }}
        className="space-y-4"
      >
        {children}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isSaving}>
            {isSaving ? savingLabel : submitLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onCancel}
            disabled={isSaving}
          >
            {cancelLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
