"use client";

import { type Control } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { type NominationFieldValues } from "~/lib/schemas";

/**
 * A nomination's name and description, as the add and edit forms ask for them. In an image
 * category they're the caption and the image's link.
 */
export function NominationFields({
  control,
  isImageCategory,
}: {
  control: Control<NominationFieldValues>;
  isImageCategory: boolean;
}) {
  return (
    <>
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {isImageCategory ? "Image Caption" : "Nomination Name"}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={
                  isImageCategory
                    ? "Enter a caption for this image"
                    : "Enter nomination"
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {isImageCategory ? "Image URL" : "Description (Optional)"}
            </FormLabel>
            {isImageCategory && (
              <p className="text-muted-foreground mb-3 max-w-(--breakpoint-md) text-sm">
                Paste a direct image URL (e.g., .jpg, .png, .gif) or a link from
                imgur, Google Drive, Unsplash, etc.
              </p>
            )}
            <FormControl>
              {isImageCategory ? (
                <Input {...field} placeholder="https://example.com/image.jpg" />
              ) : (
                <Textarea
                  {...field}
                  placeholder="Add some details..."
                  rows={2}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
