import { CreateSessionForm } from "./components/create-session-form";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "AwardBro - Create Interactive Award Shows",
  description:
    "Create your own award show, nominate candidates, and let people vote for their favorites in real-time. Perfect for friends, team events, and more!",
  keywords: [
    "award show",
    "voting",
    "live voting",
    "interactive",
    "real-time",
    "presentation",
    "awards",
    "ceremony",
  ],
  openGraph: {
    title: "AwardBro - Create Interactive Award Shows",
    description:
      "Create your own award show, nominate candidates, and let people vote for their favorites in real-time. Perfect for friends, team events, and more!",
    type: "website",
    url: "/",
    images: [{ url: "/icon", width: 32, height: 32 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AwardBro - Create Interactive Award Shows",
    description:
      "Create your own award show, nominate candidates, and let people vote for their favorites in real-time. Perfect for friends, team events, and more!",
  },
};

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <div className="text-center space-y-4 flex flex-col items-center justify-center">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl">
            Let&apos;s Get This Party Started! 🎉
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Create your own award show, nominate candidates, and let people vote for their favorites
          </p>
        </div>
        <div className="w-full max-w-md">
          <CreateSessionForm />
        </div>
      </div>
    </main>
  );
}
