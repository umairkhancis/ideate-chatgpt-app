# AGENTS.md

This file provides guidance to AGENTS like Claude Code, Gemini, Codex when working with code in this repository.

## Project Overview

Ideate is a ChatGPT App built with the OpenAI Apps SDK. It's an idea management system ("second brain") that runs as three concurrent services: a Flask backend API, React UI widgets, and an MCP server that bridges ChatGPT with the backend while serving interactive widgets.

## Architecture

**Three-Service Architecture** (must run simultaneously):

1. **Backend** (`ideate-backend-server/`) - Flask + SQLite REST API
2. **Web Widgets** (`ideate-app/web/`) - React components compiled to standalone bundles
3. **MCP Server** (`ideate-app/mcp/`) - Model Context Protocol server that:
   - Exposes backend API as MCP tools/resources
   - Serves UI widget bundles to ChatGPT
   - Bridges conversation context with backend state

**Data Flow**: ChatGPT → MCP tool call → Backend API → Response with `_meta.openai/outputTemplate` → Widget renders in ChatGPT UI

## Development Commands

### Backend Server (Python/uv)
```bash
cd ideate-backend-server
uv sync                      # Install dependencies (one-time)
uv run python app.py         # Start server (http://localhost:5055)
PORT=7000 uv run python app.py  # Custom port
uv run python test_api.py    # Demo API test script
uv add <package>             # Add runtime dependency
```

### Web Widgets (React/Vite/pnpm)
```bash
cd ideate-app/web
pnpm install                 # Install dependencies
pnpm run dev                 # Dev server (http://localhost:5173)
pnpm run build               # Build production bundles → assets/
pnpm run serve               # Serve built assets (http://localhost:4444)
pnpm run bump                # Increment version + rebuild (for cache-busting)
```

### MCP Server (TypeScript/npm)
```bash
cd ideate-app/mcp
npm install                  # Install dependencies
npm run build                # Compile TypeScript
npm start                    # Start server (http://localhost:3000/mcp)
export IDEATE_API_URL=http://localhost:5055  # Configure backend URL
```

## Critical Workflow: Widget Updates

When modifying React components for ChatGPT:

1. Edit files in `ideate-app/web/src/`
2. Stop serve process (Ctrl+C)
3. **Run `pnpm run bump`** - increments version in package.json, rebuilds assets, updates manifest.json
4. Restart `pnpm run serve`
5. **Rebuild and restart MCP server** - MCP reads manifest.json at startup to get versioned URIs

**Why**: ChatGPT caches widgets by URI. Versioned URIs like `ui://widget/v1.1.10/ideas-list.html` bust the cache.

## Key Architecture Patterns

### OpenAI Apps SDK Integration

Widgets communicate with ChatGPT via global interface:
- `window.openai.toolOutput` - receives structured data from MCP tool responses
- `window.openai.callTool()` - triggers MCP tools from UI (e.g., user clicks "Archive")
- `window.openai.widgetState` - persists component state across renders
- `window.openai.sendFollowUpMessage()` - sends chat messages from UI

### MCP Tool Response Pattern

Tools return this structure to render widgets:
```typescript
{
  content: [{ type: "text", text: "..." }],     // Conversation text
  structuredContent: { idea: {...}, count: 5 }, // Data for widget
  _meta: {
    "openai/outputTemplate": "ui://widget/v1.1.10/idea-detail.html",
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true
  }
}
```

The `outputTemplate` URI maps to an MCP resource (server.ts:748-808) that returns HTML with inline JS/CSS.

### Widget Build System

`ideate-app/web/build-all.mts` custom build script:
1. Builds each component as separate Vite entry point
2. Generates content-hashed files in `assets/`
3. Creates `manifest.json` with component metadata:
   ```json
   {
     "version": "1.1.10",
     "components": {
       "ideas-list": { "js": "ideas-list-abc123.js", "css": "...", "resourceUri": "..." }
     }
   }
   ```
4. MCP server reads manifest at startup and registers versioned resource URIs

### Backend Data Model

Ideas structure (append-only notes):
```typescript
{
  id: string;
  title: string;
  description: string;
  notes: Array<{ text: string; timestamp: string }>;  // Append-only
  urgency: number;  // 1-5 scale
  archived: boolean;
  created_date: string;
  updated_date: string;
}
```

Backend uses raw SQLite (no ORM) in `models.py`. Notes are append-only - PUT requests with `notes` array append, never overwrite.

## MCP Tools & Resources

**Tools** (server.ts:118-630):
- `list_ideas` → renders `ideas-list` widget
- `get_idea` / `create_idea` / `update_idea` / `add_note` → render `idea-detail` widget
- `archive_idea` / `restore_idea` / `delete_idea` → return success messages

**Resources** (server.ts:632-808):
- `ideate://ideas` - all active ideas (JSON)
- `ideate://ideas/archived` - archived ideas (JSON)
- `ideate://ideas/{idea_id}` - single idea (JSON)
- `ui://widget/v{version}/ideas-list.html` - ideas list widget bundle
- `ui://widget/v{version}/idea-detail.html` - idea detail widget bundle

## Environment Variables

| Variable | Service | Default | Purpose |
|----------|---------|---------|---------|
| `PORT` | Backend | `5055` | API port (avoids macOS AirPlay on 5000) |
| `HOST` | Backend | `0.0.0.0` | Backend bind address |
| `IDEATE_DB` | Backend | `ideate.db` | SQLite file path |
| `IDEATE_API_URL` | MCP | `http://localhost:5055` | Backend API URL |
| `PORT` | MCP | `3000` | MCP server port |

## Backend API

Endpoints (app.py):
- `GET /ideas?includeArchived=true&archivedOnly=true` - list ideas
- `POST /ideas` - create (body: `{title, description, urgency}`)
- `GET /ideas/<id>` - get single
- `PUT /ideas/<id>` - update (append notes)
- `POST /ideas/<id>/archive` - archive
- `POST /ideas/<id>/restore` - restore
- `DELETE /ideas/<id>` - delete permanently
- `GET /apidocs` - Swagger UI

## Tech Stack

- Backend: Python, Flask, SQLite, uv
- Web: React 19, TypeScript, Vite 7, Tailwind CSS 4, pnpm
- MCP: TypeScript, Express, @modelcontextprotocol/sdk, Zod

## Important Implementation Details

- **Three terminals required** for full development (backend, widgets serve, MCP)
- **Port dependencies**: MCP server expects backend on 5055 and widget assets on 4444
- **Version bumping is manual** via `pnpm run bump` script (scripts/bump-version.mts)
- **No authentication** - designed for local development only
- **CORS enabled** on all services for cross-origin development
- **Notes are append-only** - PUT with notes array appends, preserves history
- **Widgets load synchronously** - MCP server reads entire widget JS/CSS into memory at startup from `../web/assets/manifest.json`