'use client';

import { api, type RouterOutputs } from "~/trpc/react";
import { WinnerAnimation } from "./winner-animation";
import { LiveVoting } from "./live-voting";



type Session = RouterOutputs["award"]["getSessionBySlug"];

interface LivePresentationProps {
  initialSession: Session;
  slug: string;
}

export function LivePresentation({ initialSession, slug }: LivePresentationProps) {
  const { data: session } = api.award.getSessionBySlug.useQuery(
    { slug, activeOnly: true },
    {
      refetchInterval: 5000,
      initialData: initialSession,
    }
  );

  if (session.categories.length === 0) {
    return (
      <div className="container mx-auto px-4 text-center">
        <h1 className="mb-12 text-6xl font-bold">{session.name}</h1>
        <p className="text-2xl">Waiting for the next award.</p>
      </div>
    );
  }

  return (
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
                  .sort((a, b) => b._count.votes - a._count.votes)
                  .map((nomination, index) => (
                    <WinnerAnimation
                      key={nomination.id}
                      nomination={nomination}
                      index={index}
                    />
                  ))}
              </div>
            ) : (
              <LiveVoting
                categoryId={category.id}
                initialVoteCount={category.nominations.reduce(
                  (sum, nom) => sum + nom._count.votes,
                  0
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 