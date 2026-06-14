#!/usr/bin/env tsx
import "dotenv/config";
import { db } from "../src/lib/db";
import { writeFileSync } from "fs";

async function main() {
  const feedbacks = await db.userFeedback.findMany({
    where: {
      labels: {
        hasSome: ["helpful"]
      }
    },
    include: {
      message: {
        include: {
          conversation: {
            include: {
              messages: {
                orderBy: { createdAt: 'asc' }
              }
            }
          }
        }
      }
    }
  });

  console.log(`Found ${feedbacks.length} feedback items for fine-tuning...`);

  const jsonlLines = [];

  for (const feedback of feedbacks) {
    const conversation = feedback.message.conversation;
    // For simplicity, just construct the immediate context:
    // system prompt, user query, assistant response
    
    // Find the message just before this assistant message
    const msgs = conversation.messages;
    const asstIndex = msgs.findIndex(m => m.id === feedback.message.id);
    
    if (asstIndex <= 0) continue;
    
    const userMsg = msgs[asstIndex - 1];
    if (userMsg.role !== "user") continue;

    const asstMsg = msgs[asstIndex];
    
    // Construct system instructions
    const systemInstruction = `You are Shri AI, answering questions based on grounded scripture context. Focus on direct answers using only the provided context.`;

    const fineTuningExample = {
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userMsg.content },
        { role: "assistant", content: asstMsg.content }
      ]
    };

    jsonlLines.push(JSON.stringify(fineTuningExample));
  }

  writeFileSync("data/fine-tuning-export.jsonl", jsonlLines.join("\n"));
  console.log(`Exported ${jsonlLines.length} examples to data/fine-tuning-export.jsonl`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
