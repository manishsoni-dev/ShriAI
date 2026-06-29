"use server";

import { unifiedLogout } from "@/app/actions/logout";

export async function signOutAction() {
  await unifiedLogout();
}
