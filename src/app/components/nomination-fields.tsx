"use client";

import { useEffect, useState } from "react";

import { type Control, type UseFormReturn, useWatch } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { COPY_IMAGE_ADDRESS, parseImageLink } from "~/lib/images";
import { type NominationFieldValues } from "~/lib/schemas";

/** An image category's picture as its form sees it (see usePicture) */
type Picture = NonNullable<ReturnType<typeof usePicture>["picture"]>;

/**
 * A nomination's name and description, as the add and edit forms ask for them. In an image
 * category (when `picture` is given) they're the caption and the picture's link, with a live
 * preview of the picture.
 */
export function NominationFields({
  control,
  picture,
}: {
  control: Control<NominationFieldValues>;
  picture?: Picture;
}) {
  const isImageCategory = !!picture;
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
              {isImageCategory ? "Picture Link" : "Description (Optional)"}
            </FormLabel>
            <FormControl>
              {isImageCategory ? (
                <Input {...field} placeholder="https://…" inputMode="url" />
              ) : (
                <Textarea
                  {...field}
                  placeholder="Add some details..."
                  rows={2}
                />
              )}
            </FormControl>
            {isImageCategory && (
              <FormDescription className="max-w-(--breakpoint-md)">
                Right-click the picture and choose &quot;Copy image
                address&quot;. Share links from Google Drive, Dropbox and imgur
                work too.
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
      {picture?.src && (
        <div aria-live="polite">
          <div
            className={
              picture.status === "loaded"
                ? "flex h-48 items-center justify-center"
                : "hidden"
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={picture.src}
              src={picture.src}
              alt="Preview"
              className="max-h-full max-w-full rounded-md object-contain"
              referrerPolicy="no-referrer"
              onLoad={picture.onLoad}
              onError={picture.onError}
            />
          </div>
          {picture.status === "loading" && (
            <p className="text-muted-foreground text-sm">
              Loading the picture…
            </p>
          )}
        </div>
      )}
    </>
  );
}

/**
 * An image category's picture link, previewed in the host's browser as voters' phones will load
 * it: only the browser can tell whether a link opens as a picture, as the server never fetches it.
 * What's wrong with the link shows as the field's error. `canSave` says whether the form may save
 * (only once the picture has loaded), and otherwise points the host at the link.
 */
export function usePicture(
  form: UseFormReturn<NominationFieldValues>,
  isImageCategory: boolean,
  /** The link already saved, when editing: kept unchanged, it may be saved even if it no
   * longer loads, so a caption can still be fixed */
  savedLink?: string | null,
) {
  const link = useWatch({ control: form.control, name: "description" }) ?? "";
  const parsed = isImageCategory && link.trim() ? parseImageLink(link) : null;
  const src = parsed && "url" in parsed ? parsed.url : null;
  const unchanged = !!savedLink && link.trim() === savedLink.trim();
  // The address whose picture loaded or failed; any other address is still loading
  const [result, setResult] = useState<{ src: string; ok: boolean } | null>(
    null,
  );
  const status = !parsed
    ? "empty"
    : !src
      ? "invalid"
      : result?.src !== src
        ? "loading"
        : result.ok
          ? "loaded"
          : "failed";

  // What's wrong with the link, shown (and announced) as the field's error
  const problem =
    parsed && "error" in parsed
      ? parsed.error
      : status === "failed" && !unchanged
        ? `That link doesn't open as a picture. ${COPY_IMAGE_ADDRESS}`
        : null;
  // The form's own validation (on save, and on every change after a save) replaces the field's
  // errors, so the picture's is set again whenever it's missing. It has its own type, so clearing
  // it never removes the form's own errors, such as a link that's too long.
  const { setError, clearErrors, setFocus } = form;
  const fieldError = form.formState.errors.description;
  useEffect(() => {
    if (!isImageCategory) return;
    if (problem) {
      if (fieldError?.message !== problem) {
        setError("description", { type: "picture", message: problem });
      }
    } else if (fieldError?.type === "picture") {
      clearErrors("description");
    }
  }, [isImageCategory, problem, fieldError, setError, clearErrors]);

  const canSave = () => {
    if (!isImageCategory || status === "loaded") return true;
    if (unchanged && status !== "invalid") return true;
    const message =
      status === "empty"
        ? "Paste a link to the picture"
        : status === "loading"
          ? "Wait for the picture to load"
          : problem;
    if (message) setError("description", { type: "picture", message });
    setFocus("description");
    return false;
  };

  const picture = isImageCategory
    ? {
        src,
        status,
        onLoad: () => {
          if (src) setResult({ src, ok: true });
        },
        onError: () => {
          if (src) setResult({ src, ok: false });
        },
      }
    : undefined;
  return { picture, canSave };
}
