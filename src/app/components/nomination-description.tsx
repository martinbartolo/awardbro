// Helper to check if a URL looks like an image
const isImageUrl = (url: string) => {
  // Check for common image extensions
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(url)) return true;
  // Google Drive share links
  if (url.includes("drive.google.com") && url.includes("/file/d/")) return true;
  return false;
};

// Helper to transform URLs to direct image URLs where needed
const getImageUrl = (url: string) => {
  // Transform Google Drive share links to thumbnail URLs (bypasses hotlink blocking)
  if (url.includes("drive.google.com") && url.includes("/file/d/")) {
    const matches = /\/file\/d\/([a-zA-Z0-9_-]+)/.exec(url);
    const fileId = matches?.[1];
    if (!fileId) return "";
    // Use thumbnail endpoint with large size - works for cross-origin embedding
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
  }
  return url;
};

export function NominationDescription({
  description,
  className = "",
}: {
  description: string | null;
  className?: string;
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
    <div className="relative mt-2 flex h-72 w-full items-center justify-center sm:h-80 md:h-96 lg:h-112">
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
