import { type Metadata } from "next";

import { PasswordPage } from "~/app/components/password-verification";
import { RunShow } from "~/app/components/run-show";
import { ShowCodeProvider } from "~/lib/hooks/useShowChange";
import { hasManageAccess } from "~/server/auth/manage";
import { showPageCode } from "~/server/shows";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Run the Show",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Running the show, one category at a time: the host's controls during the show, made for a phone
 * next to the big screen. Setting the show up is on the manage page.
 */
export default async function RunShowPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const code = await showPageCode("run", (await params).code);

  if (!(await hasManageAccess(code))) {
    return <PasswordPage code={code} />;
  }

  const session = await api.award.getSession({ code });
  return (
    <main className="bg-background text-foreground min-h-screen">
      <ShowCodeProvider value={code}>
        <RunShow code={code} initialSession={session} />
      </ShowCodeProvider>
    </main>
  );
}
