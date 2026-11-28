import { type Metadata } from "next";

import { PasswordPage } from "~/app/components/password-verification";
import { RunShow } from "~/app/components/run-show";
import { DEVICE_THEME_SCRIPT } from "~/lib/device-theme-script";
import { ShowCodeProvider } from "~/lib/hooks/useShowChange";
import { hasManageAccess } from "~/server/auth/manage";
import { showPage } from "~/server/shows";
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
  const { code, name } = await showPage("run", (await params).code);

  const theme = (
    // Host views follow the device's light or dark setting, before the first paint (a fixed
    // script, see device-theme-script.ts)
    <script dangerouslySetInnerHTML={{ __html: DEVICE_THEME_SCRIPT }} />
  );
  if (!(await hasManageAccess(code))) {
    return (
      <>
        {theme}
        <PasswordPage code={code} name={name} />
      </>
    );
  }

  const session = await api.award.getSession({ code });
  return (
    <main className="bg-background text-foreground min-h-screen">
      {theme}
      <ShowCodeProvider value={code}>
        <RunShow code={code} initialSession={session} />
      </ShowCodeProvider>
    </main>
  );
}
