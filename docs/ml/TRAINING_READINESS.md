# Shri AI: Training Readiness Report

## Objective

This document outlines the state of our evaluation pipeline, ML optimization loop, and overall readiness for fine-tuning our embedding representations or answer generation models (e.g. LoRA adapters).

**Current Status:** **NOT READY FOR FINE-TUNING**

## State of the Evaluation Pipeline

We have successfully established a reproducible learning loop that measures evidence. The pipeline consists of the following implemented capabilities:

1. **Frozen Dataset Splits:**
   We have partitioned our evaluation dataset into `retrieval_dev.json`, `retrieval_val.json`, and `retrieval_test.json`. This provides stable targets for optimizing retrieval and generation without cross-contamination.

2. **Full-Pipeline Evaluation script (`scripts/evaluate-scripture-retrieval.ts`):**
   The script has been expanded from a pure retrieval evaluator to a full production-path pipeline evaluator. It accurately executes:
   - Text retrieval vs Voice retrieval modes
   - Fallback behaviors when insufficient context is found
   - Streaming answer generation using the true application LLM prompt
   - Full end-to-end trace tracking (Git SHA, Experiment Configs)

3. **Stage Profiling (Latency):**
   The evaluator successfully records multi-stage latencies, identifying where time is spent. It measures p50/p95 times for:
   - Embedding inference
   - Vector Search (pgvector)
   - Keyword Search (FTS)
   - First-token latency (generation stream start)
   - Total Turn Latency

4. **LLM-as-a-Judge (`eval-judge.ts`):**
   We have implemented automated quality checks on the answers using a zero-shot LLM evaluator. It scores answers on:
   - **Groundedness Score:** Ensures no hallucinatory additions.
   - **Citation Precision:** Verifies generated citations map to chunks retrieved.
   - **Persona Fit:** Verifies that tone aligns with the expected archetype (e.g., Krishna vs Shiva).
   - **Fallback Accuracy:** Tests if the model responsibly declines to answer when context is insufficient.

## State of the Feedback Loop

1. **Privacy-Safe Feedback (Implemented):**
   We added `submitMessageFeedback` as a server action. It strictly enforces:
   - Authentication mapping (`user.id` validation)
   - Message ownership checking
   - Cross-user denial
   - No raw sensitive data duplication in the feedback tables (stores metadata and flags only).

## Remaining Blockers Before Fine-Tuning

While the evaluation and feedback architecture is now sound, we cannot advance to ML Fine-Tuning or custom embedding space updates yet. The following conditions must be met:

1. **Production Human Data Accumulation:**
   We need thousands of authentic user interactions categorized via our new privacy-safe feedback loops. Synthetic evaluation sets (dev/val/test) are excellent for preventing regression but insufficient for fine-tuning a model to specific human stylistic nuances.

2. **Genuine Voice QA & Scripture Approvals:**
   The release check gating currently correctly fails when real devices and real human reviewers haven't approved the underlying scripture chunks. A fine-tuned model trained on unapproved content would entrench unsafe or unauthorized religious guidance into the weights, violating our core product tenets.

3. **Baseline Establishment:**
   We must establish a 30-day moving average of our pipeline performance (Retrieval Recall, Groundedness, Persona Fit) in the production logs. This baseline will serve as the "control" to prove that any proposed fine-tuning actually yields a statistically significant improvement.

## Conclusion

The ML optimization loop is operational. Our measurement architecture is truthful.
**Next Step:** Deploy the evaluation loop, collect organic feedback, and establish the 30-day baseline. Do not proceed to model fine-tuning.
