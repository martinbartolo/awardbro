import { CreateSessionForm } from "./components/create-session-form";
import { ExistingSessions } from "./components/existing-sessions";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "AwardBro - Create and Host Interactive Award Shows",
  description:
    "Create, manage, and host interactive award shows with real-time voting. Perfect for team events, friend gatherings, and community celebrations. Free, lightweight, and easy to use!",
  keywords: [
    "award show creator",
    "interactive voting",
    "live award show",
    "real-time voting",
    "team awards",
    "event management",
    "online voting system",
    "award ceremony",
    "community awards",
    "virtual awards",
  ],
  openGraph: {
    title: "AwardBro - Create and Host Interactive Award Shows",
    description:
      "Create, manage, and host interactive award shows with real-time voting. Perfect for team events, friend gatherings, and community celebrations. Free and easy to use!",
    type: "website",
    url: "https://awardbro.com",
    siteName: "AwardBro",
    locale: "en_US",
    images: [{ url: "/icon", width: 32, height: 32, alt: "AwardBro Logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Create and Host Interactive Award Shows - AwardBro",
    description:
      "Create, manage, and host interactive award shows with real-time voting. Perfect for team events, friend gatherings, and community celebrations.",
    site: "@awardbro",
    creator: "@awardbro",
  },
  alternates: {
    canonical: "https://awardbro.com",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl">
            Let&apos;s Get This Party Started! 🎉
          </h1>
          <p className="mt-6 text-xl text-muted-foreground">
            Create your own award show, nominate candidates, and watch the votes roll in. Perfect
            for team events and celebrations!
          </p>
        </div>
        <div className="grid w-full max-w-3xl gap-8 sm:grid-cols-2">
          <CreateSessionForm />
          <ExistingSessions />
        </div>
      </div>
    </main>
  );
}
