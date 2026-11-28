import { type Metadata } from "next";

import { ManageShow } from "~/app/components/manage-show";
import { PasswordPage } from "~/app/components/password-verification";
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
  const { code } = await showPage("manage", (await params).code);

  const session = await api.award.getSession({
    code,
  });

  if (!(await hasManageAccess(code))) {
    return <PasswordPage code={code} />;
  }

  return (
    <ShowCodeProvider value={code}>
      <ManageShow code={code} initialSession={session} />
    </ShowCodeProvider>
  );
}
