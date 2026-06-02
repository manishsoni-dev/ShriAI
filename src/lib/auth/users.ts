import { compare, hash } from "bcryptjs";

import { db } from "@/lib/db";
import { ensureDefaultWorkspace } from "@/lib/workspaces";

const PASSWORD_HASH_ROUNDS = 12;

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}

export async function signInOrCreateUser(input: {
  email: string;
  password: string;
  name?: string;
}) {
  const email = input.email.toLowerCase();
  const existingUser = await db.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    const passwordMatches = await compare(
      input.password,
      existingUser.passwordHash,
    );

    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    await ensureDefaultWorkspace(existingUser);

    return existingUser;
  }

  const passwordHash = await hash(input.password, PASSWORD_HASH_ROUNDS);
  const user = await db.user.create({
    data: {
      email,
      name: input.name?.trim() || null,
      passwordHash,
    },
  });

  await ensureDefaultWorkspace(user);

  return user;
}
