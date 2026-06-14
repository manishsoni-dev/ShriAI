import "dotenv/config";

import { retrieveScriptureContext } from "../src/lib/rag/scripture-retrieval";
import { type PersonaId } from "../src/lib/personas";

const TEST_QUERIES = [
  { query: "What is my dharma?", expectedFound: true },
  { query: "How do I deal with grief?", expectedFound: true },
  {
    query: "What does the Gita say about artificial intelligence?",
    expectedFound: false,
  },
  { query: "Explain the concept of karma yoga.", expectedFound: true },
];

async function main() {
  console.log("Starting Retrieval Evaluation...");

  let passed = 0;
  let failed = 0;

  for (const { query, expectedFound } of TEST_QUERIES) {
    console.log(`\nEvaluating Query: "${query}"`);

    // Using Krishna's persona ID (shri-krishna is the default ID used in ingestion usually, or "1" for the db).
    // The retrieveScriptureContext uses 'personaId' to filter sources in the future, but currently it works universally if no filtering is strictly enforced, or we can use "p1-krishna".
    const result = await retrieveScriptureContext({
      query,
      personaId: "krishna" as PersonaId,
      limit: 5,
      debugMode: true,
      threshold: 0.5, // Typical threshold
    });

    const isFound = !result.insufficientContext && result.chunks.length > 0;

    console.log(`- Retrieved Chunks: ${result.chunks.length}`);
    console.log(`- Insufficient Context: ${result.insufficientContext}`);

    if (result.chunks.length > 0) {
      console.log(`- Top Score: ${result.chunks[0].score.toFixed(4)}`);
    }

    if (isFound === expectedFound) {
      console.log("✅ PASS");
      passed++;
    } else {
      console.log(
        `❌ FAIL (Expected found: ${expectedFound}, Got: ${isFound})`,
      );
      failed++;
    }
  }

  console.log(`\nEvaluation Complete: ${passed} Passed, ${failed} Failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("Evaluation Failed:", error);
  process.exit(1);
});
