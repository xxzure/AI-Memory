# AI-Memory

[![CI](https://github.com/xxzure/AI-Memory/actions/workflows/ci.yml/badge.svg)](https://github.com/xxzure/AI-Memory/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/ai-memory)](https://www.npmjs.com/package/ai-memory)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org/)

Portable AI memory — a unified conversation store across LLM platforms.

When switching between ChatGPT, Claude, Gemini, and Ollama, each new model starts with zero context. AI-Memory solves this by importing, compacting, and searching your conversation history from any platform, then generating token-budgeted context bundles you can paste into any LLM.

## Why

- **Portability** — One memory store across all LLM platforms
- **Cost control** — Compact conversations into summaries, generate context bundles within token budgets
- **Self-awareness** — LLM-generated portrait of who you are based on your chat history (当局者迷，旁观者清)

## Quick Start

```bash
npm install
npm run build

# Import a ChatGPT export
ai-memory import chatgpt conversations.json

# Search your conversations
ai-memory search "typescript generics"

# Summarize conversations into compact memories (requires an LLM provider)
ai-memory compact

# Generate a context bundle for another LLM
ai-memory context "React architecture" --tokens 4000

# Generate your self-portrait
ai-memory portrait

# Launch web dashboard
ai-memory serve
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `import <source> <file>` | Import from `chatgpt`, `claude`, `gemini`, `ollama`, or `generic` |
| `search <query>` | Keyword search across messages (`-m` for memories) |
| `compact` | Summarize unprocessed conversations into memories |
| `context <topic> --tokens N` | Generate a token-budgeted context bundle |
| `portrait` | Generate a self-portrait from your conversation history |
| `serve` | Start the web dashboard (default port 3377) |

## Supported Platforms

| Platform | Export Format |
|----------|-------------|
| ChatGPT | `conversations.json` from Settings → Data Controls → Export |
| Claude | JSON export from claude.ai |
| Gemini | Google Takeout JSON |
| Ollama / Open WebUI | JSON chat exports |
| Generic | Any JSON with `{ messages: [{ role, content }] }` or markdown with `## User` / `## Assistant` sections |

Duplicate conversations are automatically detected and skipped on re-import.

## Architecture

```
SQLite DB (~/.ai-memory/memory.db)
  ├── conversations    Raw imported chats
  ├── messages         Individual messages with token counts
  ├── memories         Compacted summaries with topics & key points
  ├── embeddings       Vector embeddings for semantic search
  └── portraits        LLM-generated user profiles
```

**Compaction** breaks large conversations into ~2000-token chunks, summarizes each, then combines into a single memory with topics, key points, and an embedding.

**Context generation** embeds your query, finds the most relevant memories via cosine similarity, and greedily packs them into your token budget.

## Configuration

Config lives at `~/.ai-memory/config.json` (auto-created on first run):

```json
{
  "dbPath": "~/.ai-memory/memory.db",
  "llm": {
    "provider": "ollama",
    "model": "llama3.2",
    "baseUrl": "http://localhost:11434"
  },
  "embeddings": {
    "provider": "huggingface",
    "model": "Xenova/all-MiniLM-L6-v2",
    "baseUrl": "http://localhost:11434"
  },
  "web": { "port": 3377 }
}
```

LLM providers: `ollama` (default, local, free), `openai`, `anthropic` (set `apiKey` in config).

## Tech Stack

- **Runtime**: TypeScript / Node.js
- **Storage**: SQLite via `better-sqlite3`
- **CLI**: `commander`
- **Web**: `hono` + plain HTML/JS/CSS
- **LLM**: Ollama (default, local, free); optional OpenAI/Anthropic API
- **Embeddings**: `@huggingface/transformers` (default, runs locally); optional Ollama
- **Token counting**: `tiktoken`
- **Testing**: `vitest`
- **Bundler**: `tsup`

## Development

```bash
npm install
npm run dev -- --help    # Run without building
npm run build            # Build to dist/
npm test                 # Run tests
npm run lint             # Type check
```

## License

MIT
