import { redirect } from "next/navigation";

import { auth } from "@/auth";

export async function getViewerSession() {
  return auth();
}

export async function requireViewerSession() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session;
}
