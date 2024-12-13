import { api } from "~/trpc/server";
import { notFound } from "next/navigation";

export default async function VotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await api.award.getSessionBySlug({ slug });

  if (!session) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-4xl font-bold">{session.name}</h1>

        <div className="space-y-8">
          {session.categories
            .filter((category) => !category.revealed)
            .map((category) => (
              <div key={category.id} className="rounded-lg bg-white/5 p-6">
                <div className="mb-4">
                  <h2 className="text-2xl font-semibold">{category.name}</h2>
                  {category.description && (
                    <p className="text-gray-400">{category.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {category.nominations.map((nomination) => (
                    <div
                      key={nomination.id}
                      className="rounded-lg bg-white/10 p-4"
                    >
                      <h3 className="mb-2 font-semibold">{nomination.name}</h3>
                      {nomination.description && (
                        <p className="mb-4 text-sm text-gray-400">
                          {nomination.description}
                        </p>
                      )}
                      <form action="/api/vote" method="POST">
                        <input type="hidden" name="sessionId" value={session.id} />
                        <input
                          type="hidden"
                          name="nominationId"
                          value={nomination.id}
                        />
                        <button
                          type="submit"
                          className="w-full rounded-md bg-white/20 px-4 py-2 hover:bg-white/30"
                        >
                          Vote
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>

        {session.categories.filter((category) => !category.revealed).length ===
          0 && (
          <div className="rounded-lg bg-white/5 p-6 text-center">
            <h2 className="text-2xl font-semibold">Voting Completed</h2>
            <p className="text-gray-400">
              All categories have been revealed. Thank you for participating!
            </p>
          </div>
        )}
      </div>
    </main>
  );
} 