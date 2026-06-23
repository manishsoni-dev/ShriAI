import "dotenv/config";
import type { FeedbackLabel } from "@prisma/client";
import { db } from "../src/lib/db";
import * as crypto from "node:crypto";

async function main() {
  console.log("Simulating Staging Traffic & Feedback Loop...");

  // Find a user and workspace to associate with feedback
  let user = await db.user.findFirst();
  if (!user) {
    user = await db.user.create({
      data: {
        email: "staging-tester@shri-ai.com",
        name: "Staging Tester",
        passwordHash: "dummy",
      },
    });
  }

  let workspace = await db.workspace.findFirst({
    where: { members: { some: { userId: user.id } } },
  });

  if (!workspace) {
    workspace = await db.workspace.create({
      data: {
        name: "Staging Workspace",
        slug: `staging-${Date.now()}`,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
    });
  }

  // Create a staging conversation
  const conversation = await db.conversation.create({
    data: {
      userId: user.id,
      workspaceId: workspace.id,
      title: "Staging Test - Isha Upanishad",
    },
  });

  // Create a message that represents the user's question
  await db.message.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: "What does the first verse of Isha Upanishad teach?",
    },
  });

  // Create a message that represents the assistant's answer
  const assistantMessage = await db.message.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content:
        "The Isha Upanishad teaches that everything is covered by the Lord. By renouncing attachment to wealth, one protects the Self.",
    },
  });

  // Insert multiple feedback records as if from various staging sessions
  const feedbackEntries = [
    {
      userId: user.id,
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      personaId: "shiva",
      traceId: `trace-staging-${crypto.randomUUID().substring(0, 8)}`,
      modelConfiguration: "qwen3-8b-local",
      retrievalConfiguration: "hybrid-default",
      labels: ["helpful"] satisfies FeedbackLabel[],
      notes: "Great synthesis of the first verse of Isha Upanishad.",
    },
    {
      userId: user.id,
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      personaId: "krishna",
      traceId: `trace-staging-${crypto.randomUUID().substring(0, 8)}`,
      modelConfiguration: "qwen3-8b-local",
      retrievalConfiguration: "hybrid-default",
      labels: ["helpful"] satisfies FeedbackLabel[],
      notes: "The persona tone was exactly right for staging.",
    },
    {
      userId: user.id,
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      personaId: "rama",
      traceId: `trace-staging-${crypto.randomUUID().substring(0, 8)}`,
      modelConfiguration: "qwen3-8b-local",
      retrievalConfiguration: "hybrid-default",
      labels: ["too_long"] satisfies FeedbackLabel[],
      notes: "A bit verbose, but accurate.",
    },
  ];

  for (const entry of feedbackEntries) {
    await db.userFeedback.create({
      data: {
        ...entry,
      },
    });
  }

  console.log(
    `Successfully injected ${feedbackEntries.length} staging feedback records into UserFeedback.`,
  );
}

main()
  .catch((e) => {
    console.error("Error simulating traffic:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
