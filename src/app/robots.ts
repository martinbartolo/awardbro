import { type MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/trpc/", "/manage/", "/present/", "/vote/"],
    },
    sitemap: "https://awardbro.com/sitemap.xml",
  };
}
