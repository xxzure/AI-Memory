# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2025-05-01

### Added

- CLI with `import`, `search`, `compact`, `context`, `portrait`, and `serve` commands
- Import support for ChatGPT, Claude, Gemini, Ollama, and generic formats
- Conversation compaction into memories with topic extraction
- Semantic search via embeddings (HuggingFace or Ollama)
- Token-budgeted context bundle generation
- LLM-generated user portrait from conversation history
- Web dashboard for browsing conversations, memories, and portrait
- SQLite storage with `better-sqlite3`
- LLM provider support: Ollama (default), OpenAI, Anthropic
