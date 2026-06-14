# Scripture Corpus — Data Directory

This directory contains structured scripture JSON files that power the Shri AI
scripture-grounded RAG engine.

## ⚠️ Copyright Warning

**Do NOT add copyrighted translations without a license.**

Safe to use:

- Public domain translations with source metadata
- Texts you have commissioned or written yourself
- Translations explicitly licensed for commercial/app use

**Currently included:**
| File | Source | Translation | Copyright Status |
|------|--------|-------------|-----------------|
| `bhagavad-gita/bhagavad-gita-besant-v1.json` | Wikisource, Annie Besant 4th edition, 1922 | Annie Wood Besant | Public domain source text |

Do not use SanskritDocuments as a source for Shri AI corpus files; its site
restricts copying/reposting for promotion or commercial use.

## Adding New Scriptures

### File naming

```
data/scriptures/{scripture-slug}/{corpus-file}.json
```

Examples: `bhagavad-gita/bhagavad-gita-besant-v1.json`,
`valmiki-ramayana/key-kandas-v1.json`, `hanuman-chalisa/public-domain-v1.json`

### JSON schema

Each file is an array of verse objects:

```json
[
  {
    "canonicalRef": "2.47",
    "chapter": 2,
    "verse": 47,
    "language": "sanskrit",
    "originalText": "कर्मण्येवाधिकारस्ते...",
    "transliteration": "karmaṇyevādhikāraste...",
    "translation": "English translation (required)",
    "commentary": "Original project-authored commentary",
    "practicalNote": "How to use this in a voice answer",
    "personaTags": ["krishna"],
    "themeTags": ["karma", "duty"],
    "emotionTags": ["confusion", "fear of failure"],
    "answerUseCases": ["career confusion", "decision making"],
    "sourcePriority": 10,
    "sourceUrl": "https://en.wikisource.org/wiki/Bhagavad-Gita_(Besant_4th)/Discourse_2",
    "sourceEdition": "Annie Besant 4th edition, 1922",
    "translator": "Annie Wood Besant",
    "license": "Public domain source text via Wikisource",
    "copyrightStatus": "public_domain"
  }
]
```

### Field reference

| Field             | Required | Notes                                                                   |
| ----------------- | -------- | ----------------------------------------------------------------------- |
| `canonicalRef`    | ✅       | Unique within the source. e.g. "2.47", "Kanda 5.1"                      |
| `chapter`         | ✅       | Positive integer for verse-structured sources                           |
| `verse`           | ✅       | Positive integer for verse-structured sources                           |
| `language`        | ✅       | Language of `originalText`. e.g. "sanskrit", "hindi", "tamil"           |
| `originalText`    | ✅       | Devanagari or original script                                           |
| `transliteration` | ✅       | Deterministic local IAST / ISO 15919 transliteration                    |
| `translation`     | ✅       | English. Must be public domain or original.                             |
| `commentary`      | ✅       | Project-authored explanation; do not copy modern commentary             |
| `practicalNote`   | ✅       | How this verse answers real-life questions. Used in answer planning.    |
| `personaTags`     | ✅       | Persona IDs: `krishna`, `rama`, `shiva`, `hanuman`, `sita`, `radha`     |
| `themeTags`       | ✅       | Keywords: `karma`, `duty`, `grief`, `love`, `surrender`, etc.           |
| `emotionTags`     | ✅       | User emotional states: `confusion`, `grief`, `fear`, `loneliness`, etc. |
| `answerUseCases`  | ✅       | Plain English use cases: `"career confusion"`, `"dealing with loss"`    |
| `sourcePriority`  | ✅       | 1–10 (10 = highest). Boosts retrieval ranking.                          |
| `sourceUrl`       | ✅       | URL of the public-domain or licensed source page                        |
| `sourceEdition`   | ✅       | Edition/version used for this corpus                                    |
| `translator`      | ✅       | Translator or project-owned translation label                           |
| `license`         | ✅       | Human-readable license/source statement                                 |
| `copyrightStatus` | ✅       | `"public_domain"`, `"licensed"`, `"fair_use"`                           |

## Corpus roadmap

```
Phase 1 (now):    Bhagavad Gita ✓
Phase 2:          Valmiki Ramayana (key kandas) + Ramcharitmanas (selected dohas)
Phase 3:          Shiva Purana (selected sections) + Hanuman Chalisa
Phase 4:          Sita Upanishad + Garga Samhita (Radha-Krishna)
Phase 5:          Selected Upanishads
Phase 6:          Vedic hymns (careful curation)
```

## Running ingestion

```bash
# 1. Regenerate the public-domain Bhagavad Gita v1 corpus
npm run scripture:build-corpus

# 2. Validate source metadata, required fields, and duplicate refs
npm run scripture:validate

# 3. Ingest scripture metadata and text into the database
npm run scripture:ingest

# 4. Generate and store missing embeddings
npm run scripture:embed

# 5. Run the hard retrieval quality gate
npm run scripture:eval
```

## Architecture note

Scripture chunks are **global** — shared across all users. They are not scoped to
a workspace. User-uploaded documents remain workspace-scoped via `DocumentChunk`.

The retrieval pipeline:

1. Embed the user query
2. Vector search `ScriptureChunk` WHERE `personaTags @> ARRAY[personaId]`
3. Keyword search using PostgreSQL `tsvector` / `plainto_tsquery`
4. Merge scores with vector similarity, keyword rank, source priority, and theme boost
5. Return top 6 chunks with source citations
6. LLM answers ONLY from retrieved context

The retrieval system must not be described as accurate until
`npm run scripture:eval` passes the 50-question gate.
