import { type Metadata } from "next";

import ogImage from "../opengraph-image.png";
import { CreatePageContent } from "./create-page-content";

export const metadata: Metadata = {
  title: "Create Award Show",
  description:
    "Create your own interactive award show with live voting. Set up categories, add nominations, and present winners in real-time.",
  openGraph: {
    title: "Create Award Show | AwardBro",
    description:
      "Create your own interactive award show with live voting. Set up categories, add nominations, and present winners in real-time.",
    type: "website",
    url: "/create",
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
    title: "Create Award Show | AwardBro",
    description:
      "Create your own interactive award show with live voting. Set up categories, add nominations, and present winners in real-time.",
    images: [
      {
        url: ogImage.src,
        width: ogImage.width,
        height: ogImage.height,
      },
    ],
  },
};

export default function CreatePage() {
  return <CreatePageContent />;
}
