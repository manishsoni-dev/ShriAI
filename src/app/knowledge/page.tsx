import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  deleteDocumentAction,
  uploadDocumentAction,
} from "@/app/knowledge/actions";
import { db } from "@/lib/db";
import { listDocuments } from "@/lib/documents";
import { ensureDefaultWorkspace } from "@/lib/workspaces";

type KnowledgePageProps = {
  searchParams: Promise<{
    deleted?: string;
    error?: string;
    uploaded?: string;
  }>;
};

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function getErrorMessage(error?: string) {
  if (error === "missing-file") {
    return "Choose a document before uploading.";
  }

  if (error === "file-too-large") {
    return "Documents must be 20 MB or smaller.";
  }

  if (error === "unsupported-file") {
    return "Upload a PDF, TXT, Markdown, or DOCX file.";
  }

  if (error === "missing-document") {
    return "Document could not be found.";
  }

  if (error === "ingestion-failed") {
    return "Document was stored, but text extraction or embeddings failed. It is marked failed and will not be used in search.";
  }

  return null;
}

function getStatusCopy(status: string, chunks: number) {
  if (status === "ready") {
    return `${chunks} searchable chunks`;
  }

  if (status === "failed") {
    return "Ingestion failed · not searchable";
  }

  if (status === "processing") {
    return "Processing · not searchable yet";
  }

  return "Uploaded · not searchable yet";
}

export default async function KnowledgePage({
  searchParams,
}: KnowledgePageProps) {
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

  const workspace = await ensureDefaultWorkspace(user);
  const documents = await listDocuments({
    userId: user.id,
    workspaceId: workspace.id,
  });
  const params = await searchParams;
  const errorMessage = getErrorMessage(params.error);

  return (
    <main className="min-h-screen bg-[#f5f7f6] px-4 py-6 text-[#171717] md:px-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#08766f]">
              Shri AI
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Knowledge
            </h1>
            <p className="mt-2 text-sm text-[#43514f]">
              Upload workspace documents for future retrieval workflows.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-black/10 bg-white px-4 text-sm font-medium transition hover:bg-[#eef3f1]"
              href="/knowledge/search"
            >
              Search
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-black/10 bg-white px-4 text-sm font-medium transition hover:bg-[#eef3f1]"
              href="/chat"
            >
              Chat
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-black/10 bg-white px-4 text-sm font-medium transition hover:bg-[#eef3f1]"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <form
            action={uploadDocumentAction}
            className="rounded-md border border-black/10 bg-white p-5 shadow-sm shadow-[#0f766e]/5"
          >
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#08766f]">
              Upload
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight">
              Add a document
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#43514f]">
              PDF, TXT, Markdown, and DOCX files are supported. Files are stored
              locally in development.
            </p>

            <label className="mt-5 block">
              <span className="text-sm font-medium text-[#2f3f3d]">
                Document file
              </span>
              <input
                accept=".pdf,.txt,.md,.markdown,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="mt-2 block w-full rounded-md border border-black/10 bg-[#f5f7f6] px-3 py-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#171717] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                name="file"
                required
                type="file"
              />
            </label>

            {errorMessage ? (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            {params.uploaded ? (
              <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Document uploaded, processed, and ready for search.
              </p>
            ) : null}

            <button
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#171717] px-4 text-sm font-medium text-white transition hover:bg-[#2f3f3d]"
              type="submit"
            >
              Upload document
            </button>
          </form>

          <section className="rounded-md border border-black/10 bg-white shadow-sm shadow-[#0f766e]/5">
            <div className="border-b border-black/10 p-5">
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#08766f]">
                {workspace.name}
              </p>
              <h2 className="mt-3 text-xl font-semibold tracking-tight">
                Documents
              </h2>
            </div>

            {documents.length === 0 ? (
              <div className="p-8 text-center">
                <h3 className="text-lg font-semibold tracking-tight">
                  No documents yet
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#43514f]">
                  Upload documents here now; chunking, embeddings, and RAG
                  retrieval can build on this metadata and storage layer next.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-black/10">
                {documents.map((document) => (
                  <article
                    className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                    key={document.id}
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold">
                        {document.filename}
                      </h3>
                      <p className="mt-2 text-sm text-[#43514f]">
                        {formatFileSize(document.size)} · {document.contentType}
                      </p>
                      <p className="mt-1 text-xs text-[#687572]">
                        Uploaded by{" "}
                        {document.uploadedBy.name ?? document.uploadedBy.email}
                        {" · "}
                        {getStatusCopy(document.status, document._count.chunks)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-md border border-black/10 bg-[#f5f7f6] px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-[#08766f]">
                        {document.status}
                      </span>
                      <form action={deleteDocumentAction}>
                        <input
                          name="documentId"
                          type="hidden"
                          value={document.id}
                        />
                        <button
                          className="inline-flex h-10 items-center justify-center rounded-md border border-red-200 bg-white px-4 text-sm font-medium text-red-700 transition hover:bg-red-50"
                          type="submit"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
