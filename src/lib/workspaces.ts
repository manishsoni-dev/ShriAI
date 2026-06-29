import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function ensureDefaultWorkspace(
  user: {
    id: string;
    email: string;
    name?: string | null;
  },
  tx?: Prisma.TransactionClient,
) {
  const client = tx ?? db;
  const existingMembership = await client.workspaceMember.findFirst({
    where: {
      userId: user.id,
    },
    include: {
      workspace: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existingMembership) {
    return existingMembership.workspace;
  }

  const label = user.name || user.email.split("@")[0] || "Personal";
  const baseSlug = slugify(label) || "workspace";
  const slug = `${baseSlug}-${user.id.slice(0, 8)}`;

  const workspace = await client.workspace.create({
    data: {
      name: `${label}'s Workspace`,
      slug,
      members: {
        create: {
          role: "OWNER",
          userId: user.id,
        },
      },
    },
  });

  return workspace;
}
