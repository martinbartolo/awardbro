import { getImageUrl, isImageUrl } from "~/lib/images";
import { cn } from "~/lib/utils";

export function NominationDescription({
  description,
  className = "",
  imageClassName = "relative mt-2 h-72 sm:h-80 md:h-96 lg:h-112",
}: {
  description: string | null;
  /** Classes for the text */
  className?: string;
  /** Classes for the image's box, such as its height */
  imageClassName?: string;
}) {
  if (!description) return null;

  if (!isImageUrl(description)) {
    return <div className={className}>{description}</div>;
  }

  const imageUrl = getImageUrl(description);
  if (!imageUrl) {
    return <div className={className}>Invalid image URL provided</div>;
  }

  // Using native img tag for user-provided images (fetched client-side, no SSRF risk)
  return (
    <div
      className={cn("flex w-full items-center justify-center", imageClassName)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Nomination"
        className="max-h-full max-w-full rounded-md object-contain"
        loading="lazy"
      />
    </div>
  );
}
