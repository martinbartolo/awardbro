"use client";

import { Checkbox } from "~/components/ui/checkbox";
import { FormControl } from "~/components/ui/form";

/**
 * The categories an aggregate adds up, as checkboxes: used when creating and editing one. Use it
 * inside a FormItem, whose label and error message it's linked to.
 */
export function SourceCategoryCheckboxes({
  options,
  value,
  onChange,
}: {
  options: { id: string; name: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <FormControl>
      <div role="group" className="space-y-2">
        {options.map(option => (
          <label
            key={option.id}
            className="flex items-center gap-2 text-sm font-medium"
          >
            <Checkbox
              checked={value.includes(option.id)}
              onCheckedChange={checked =>
                onChange(
                  checked
                    ? [...value, option.id]
                    : value.filter(id => id !== option.id),
                )
              }
            />
            {option.name}
          </label>
        ))}
      </div>
    </FormControl>
  );
}
