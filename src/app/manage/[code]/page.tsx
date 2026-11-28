import { type Metadata } from "next";

import { ManageShow } from "~/app/components/manage-show";
import { PasswordPage } from "~/app/components/password-verification";
import { DEVICE_THEME_SCRIPT } from "~/lib/device-theme-script";
import { ShowCodeProvider } from "~/lib/hooks/useShowChange";
import { hasManageAccess } from "~/server/auth/manage";
import { showPage } from "~/server/shows";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Manage Award Show",
  description: "Manage your award show settings and categories",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function ManagePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code, name } = await showPage("manage", (await params).code);

  const session = await api.award.getSession({
    code,
  });

  return (
    <>
      {/* Host views follow the device's light or dark setting, before the first paint (a fixed
          script, see device-theme-script.ts) */}
      <script dangerouslySetInnerHTML={{ __html: DEVICE_THEME_SCRIPT }} />
      {(await hasManageAccess(code)) ? (
        <ShowCodeProvider value={code}>
          <ManageShow code={code} initialSession={session} />
        </ShowCodeProvider>
      ) : (
        <PasswordPage code={code} name={name} />
      )}
    </>
  );
}
