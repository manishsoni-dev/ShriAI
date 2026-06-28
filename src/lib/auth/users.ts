import { compare, hash } from "bcryptjs";

import { env } from "@/env";
import { db } from "@/lib/db";
import { ensureDefaultWorkspace } from "@/lib/workspaces";
import { validateBetaInvite, acceptBetaInvite } from "@/lib/auth/invites";
import { getFeatureFlag } from "@/lib/feature-flags";

const PASSWORD_HASH_ROUNDS = 12;

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("Unable to create account.");
    this.name = "DuplicateEmailError";
  }
}

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

function normalizeName(name: string | undefined) {
  return name ? name.trim().slice(0, 100) || null : null;
}

export class BetaAccessDeniedError extends Error {
  constructor() {
    super("This email is not on the beta allowlist. Please request an invite.");
    this.name = "BetaAccessDeniedError";
  }
}

async function verifyBetaAccess(email: string) {
  const betaEnabled = await getFeatureFlag("beta_invites");
  if (betaEnabled || env.RELEASE_ENVIRONMENT === "staging") {
    // Legacy static allowlist fallback
    if (env.STAGING_ALLOWLIST) {
      const allowlist = env.STAGING_ALLOWLIST.split(",").map((e) =>
        e.trim().toLowerCase(),
      );
      if (allowlist.includes(email.toLowerCase())) {
        return;
      }
    }

    // Dynamic Beta Invite checking
    const validInvite = await validateBetaInvite(email);
    if (!validInvite) {
      throw new BetaAccessDeniedError();
    }
  }
}

export async function verifyCredentials(input: {
  email: string;
  password: string;
}) {
  const email = normalizeEmail(input.email);
  await verifyBetaAccess(email);
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

  throw new InvalidCredentialsError();
}

export async function createCredentialsUser(input: {
  email: string;
  password: string;
  name?: string;
}) {
  const email = normalizeEmail(input.email);
  await verifyBetaAccess(email);
  const existingUser = await db.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new DuplicateEmailError();
  }

  const passwordHash = await hash(input.password, PASSWORD_HASH_ROUNDS);
  const user = await db.user.create({
    data: {
      email,
      name: normalizeName(input.name),
      passwordHash,
    },
  });

  await ensureDefaultWorkspace(user);

  const betaEnabled = await getFeatureFlag("beta_invites");
  if (betaEnabled || env.RELEASE_ENVIRONMENT === "staging") {
    await acceptBetaInvite(email, user.id);
  }

  return user;
}
