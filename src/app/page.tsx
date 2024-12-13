import { CreateSessionForm } from "./components/create-session-form";

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <div className="text-center space-y-4 flex flex-col items-center justify-center">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl">
            Let&apos;s Get This Party Started! 🎉
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Create your own award show, nominate candidates, and vote for your favorites
          </p>
        </div>
        <div className="w-full max-w-md">
          <CreateSessionForm />
        </div>
      </div>
    </main>
  );
}
