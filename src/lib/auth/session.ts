import { redirect } from "next/navigation";

import { getAuthenticatedUser as auth } from "@/lib/auth/get-authenticated-user";
import { db } from "@/lib/db";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/sign-in");
  return user;
}
