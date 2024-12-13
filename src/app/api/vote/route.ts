import { api } from "~/trpc/server";
import { redirect } from "next/navigation";

export async function POST(req: Request) {
  const formData = await req.formData();
  const nominationId = formData.get("nominationId") as string;
  const sessionId = formData.get("sessionId") as string;

  if (!nominationId || !sessionId) {
    return new Response("Missing required fields", { status: 400 });
  }

  await api.award.addVote({
    nominationId,
  });

  const session = await api.award.getSession({ id: sessionId });
  redirect(`/vote/${session?.slug}`);
} 