import Image from "next/image";

export function NominationDescription({
  description,
  className = "",
}: {
  description: string | null;
  className?: string;
}) {
  const isImageUrl = (url: string) => {
    // Only allow specific image extensions and Google Drive URLs
    return (
      /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url) ||
      (url.includes("drive.google.com") && url.includes("/file/d/"))
    );
  };

  const getImageUrl = (url: string) => {
    if (url.includes("drive.google.com")) {
      // Only handle the secure /file/d/ format for Google Drive
      const matches = /\/file\/d\/([a-zA-Z0-9_-]+)/.exec(url);
      const fileId = matches?.[1];

      if (!fileId) return "";

      // Use the secure direct access URL
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    return url;
  };

  if (!description) return null;

  if (!isImageUrl(description)) {
    return <div className={className}>{description}</div>;
  }

  const imageUrl = getImageUrl(description);
  if (!imageUrl) {
    return <div className={className}>Invalid image URL provided</div>;
  }

  return (
    <div className="relative mt-2 h-72 w-full sm:h-80 md:h-96 lg:h-112">
      <Image
        src={imageUrl}
        alt="Nomination image"
        fill
        className="rounded-md object-contain"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
}
