"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { createDocument, deleteDocument } from "@/lib/documents";
import { db } from "@/lib/db";
import { ingestDocument } from "@/lib/ingestion/ingest-document";
import { ensureDefaultWorkspace } from "@/lib/workspaces";

const ACCEPTED_CONTENT_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ACCEPTED_EXTENSIONS = [".pdf", ".txt", ".md", ".markdown", ".docx"];
const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;

async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

function isAcceptedFile(file: File) {
  const lowerName = file.name.toLowerCase();
  const hasAcceptedExtension = ACCEPTED_EXTENSIONS.some((extension) =>
    lowerName.endsWith(extension),
  );

  return ACCEPTED_CONTENT_TYPES.has(file.type) || hasAcceptedExtension;
}

export async function uploadDocumentAction(formData: FormData) {
  const user = await getCurrentUser();
  const workspace = await ensureDefaultWorkspace(user);
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirect("/knowledge?error=missing-file");
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    redirect("/knowledge?error=file-too-large");
  }

  if (!isAcceptedFile(file)) {
    redirect("/knowledge?error=unsupported-file");
  }

  const document = await createDocument({
    userId: user.id,
    workspaceId: workspace.id,
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    bytes: new Uint8Array(await file.arrayBuffer()),
  });

  const ingestedDocument = await ingestDocument({
    userId: user.id,
    documentId: document.id,
  });

  revalidatePath("/knowledge");

  if (!ingestedDocument || ingestedDocument.status !== "ready") {
    redirect("/knowledge?error=ingestion-failed");
  }

  redirect("/knowledge?uploaded=1");
}

export async function deleteDocumentAction(formData: FormData) {
  const user = await getCurrentUser();
  const documentId = String(formData.get("documentId") ?? "");

  if (!documentId) {
    redirect("/knowledge?error=missing-document");
  }

  await deleteDocument({
    userId: user.id,
    documentId,
  });

  revalidatePath("/knowledge");
  redirect("/knowledge?deleted=1");
}
