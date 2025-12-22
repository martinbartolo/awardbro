import { type Metadata } from "next";

import ogImage from "../opengraph-image.png";
import { JoinPageContent } from "./join-page-content";

export const metadata: Metadata = {
  title: "Join Award Show",
  description:
    "Access an existing award show to vote or manage. Enter the show URL to participate in live voting.",
  openGraph: {
    title: "Join Award Show | AwardBro",
    description:
      "Access an existing award show to vote or manage. Enter the show URL to participate in live voting.",
    type: "website",
    url: "/join",
    images: [
      {
        url: ogImage.src,
        width: ogImage.width,
        height: ogImage.height,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Join Award Show | AwardBro",
    description:
      "Access an existing award show to vote or manage. Enter the show URL to participate in live voting.",
    images: [
      {
        url: ogImage.src,
        width: ogImage.width,
        height: ogImage.height,
      },
    ],
  },
};

export default function JoinPage() {
  return <JoinPageContent />;
}
