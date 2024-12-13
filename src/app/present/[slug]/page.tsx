import { api } from "~/trpc/server";
import { notFound } from "next/navigation";

export default async function PresentPage({
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container mx-auto px-4">
        <h1 className="mb-12 text-center text-6xl font-bold">{session.name}</h1>

        <div className="space-y-8">
          {session.categories.map((category) => (
            <div
              key={category.id}
              className={`rounded-lg bg-white/5 p-8 transition-all duration-500 ${
                !category.revealed && "opacity-50"
              }`}
            >
              <h2 className="mb-6 text-center text-4xl font-semibold">
                {category.name}
              </h2>
              {category.description && (
                <p className="mb-8 text-center text-xl text-gray-400">
                  {category.description}
                </p>
              )}

              {category.revealed ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {category.nominations
                    .sort(
                      (a, b) => b._count.votes - a._count.votes,
                    )
                    .map((nomination, index) => (
                      <div
                        key={nomination.id}
                        className={`rounded-lg p-6 ${
                          index === 0
                            ? "bg-yellow-500/20"
                            : index === 1
                            ? "bg-gray-400/20"
                            : index === 2
                            ? "bg-orange-700/20"
                            : "bg-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-semibold">
                            {nomination.name}
                          </h3>
                          <span className="text-xl font-bold">
                            {nomination._count.votes} votes
                          </span>
                        </div>
                        {nomination.description && (
                          <p className="mt-2 text-gray-400">
                            {nomination.description}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center text-2xl">
                  Waiting for category to be revealed...
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
} 