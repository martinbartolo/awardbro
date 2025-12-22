import { type MetadataRoute } from "next";

import { api } from "~/trpc/server";

// Force dynamic rendering since tRPC server API uses headers()
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    // Get all public sessions
    const sessions = await api.award.getPublicSessions();

    const sessionUrls = sessions.map(session => ({
      url: `https://awardbro.com/vote/${session.slug}`,
      lastModified: new Date(session.updatedAt),
      changeFrequency: "hourly" as const,
      priority: 0.8,
    }));

    return [
      {
        url: "https://awardbro.com",
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1,
      },
      {
        url: "https://awardbro.com/create",
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.9,
      },
      {
        url: "https://awardbro.com/join",
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.9,
      },
      ...sessionUrls,
    ];
  } catch (error) {
    // On error, return just the static pages
    console.error("Failed to generate sitemap:", error);
    return [
      {
        url: "https://awardbro.com",
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1,
      },
      {
        url: "https://awardbro.com/create",
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.9,
      },
      {
        url: "https://awardbro.com/join",
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.9,
      },
    ];
  }
}
