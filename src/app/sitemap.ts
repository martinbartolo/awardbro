import { type MetadataRoute } from "next";
import { api } from "~/trpc/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Get all public sessions
  const sessions = await api.award.getPublicSessions();

  const sessionUrls = sessions.map((session) => ({
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
    ...sessionUrls,
  ];
}
