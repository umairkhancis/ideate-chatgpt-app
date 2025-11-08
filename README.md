# Ideate - ChatGPT App

A "second brain" idea management system built as a ChatGPT App using the [ChatGPT Apps SDK](https://openai.com/index/introducing-apps-in-chatgpt/). Ideate lets you capture, organize, and manage ideas directly within ChatGPT conversations through interactive UI widgets powered by the Model Context Protocol (MCP).

## 🚀 NEW: Generic Domain Model System

**Transform any business domain into a ChatGPT app with just a JSON config file!**

The Ideate platform now supports **generic domain models** - a configuration-driven system that creates complete CRUD applications without writing code. Perfect for demoing ChatGPT Apps to different businesses.

### What You Get

✅ **One config file → Complete CRUD system**  
✅ **Branded UI widgets** in ChatGPT (custom colors, icons)  
✅ **Full list/detail views** with custom fields  
✅ **No code changes** needed for new domains  
✅ **Works alongside** existing Ideas system  

### Quick Demo (5 Minutes)

```bash
# Terminal 1: Backend with Products config
cd ideate-backend-server
export DOMAIN_CONFIG=../config/product.json
uv run python app.py

# Terminal 2: Serve widgets
cd ideate-app/web
pnpm run serve

# Terminal 3: MCP server
cd ideate-app/mcp
export DOMAIN_CONFIG=../../config/product.json
npm start
```

Then in ChatGPT: `"Show me all products"`

### Example Domains

- **E-Commerce** (`product.json`) - Product catalog with inventory
- **CRM** (`customer.json`) - Customer management
- **Project Management** (`task.json`) - Task tracking
- **Real Estate** (`property.json`) - Property listings

### Learn More

- **[DEMO_GUIDE.md](./DEMO_GUIDE.md)** - Complete demo instructions
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Technical details
- **[config/README.md](./config/README.md)** - Configuration guide
- **[config/schema.json](./config/schema.json)** - JSON Schema

---

## Quickstart (Original Ideas System)

To run the Ideate app on ChatGPT you need to build and start three separate services:

1. The backend server found in `./ideate-backend-server`
2. The app widgets found in `./ideate-app/web`
3. The MCP server found in `./ideate-app/mcp`

Full instructions on how to build, run, and use each service is described in their respective `README.md` files.

### Start the backend server

1. Navigate to the folder:

```bash
cd ideate-backend-server
```

2. Sync the uv environment to install dependencies

```bash
# Creates .venv and installs runtime + optional dev groups
uv sync
```

3. Run the server

```bash
uv run python app.py
```

Use `CTRL+C` to stop the server at any time.

### Build and run the widgets server

Next, build and run the widgets server. Here you first need to generate the React widgets using the Vite build process, and then make them available using a serve script.

0. Open a new terminal (you'll now have two separate terminals running)

1. Navigate to the folder

```bash
cd ideate-app/web
```

2. Install dependencies using pnpm or npm

```bash
# Install dependencies
npm install
```

3. Build the widgets using the custom Vite build process
Build production-ready component bundles:

```bash
npm run build
```

4. Serve the built assets with CORS enabled:

```bash
npm run serve
```

Use `CTRL+C` to stop the server at any time.

#### Versioning UI Widgets
When testing in ChatGPT, versioning is necessary to cache-bust the chat app. To generate a new version of the app, stop the `serve` process and then run the `bump` process. It updates the version number and re-runs `build` automatically:

```bash
npm run bump
```

Once `bump` is complete, start the `serve` process again to serve the new versioned assets.

### Build and run the MCP server

Finally, set up the MCP server. 

**NOTE:** If you change the version number of your UI widgets, you need to stop, rebuild, and start the MCP server again for the versions to kick in.

0. Open a new terminal (you'll now have three terminals open at the same time)

1. Navigate to the folder

```bash
cd ideate-app/mcp
```

2. Install dependencies:

```bash
npm install
```

3. Build the TypeScript code:

```bash
npm run build
```

4. Set the Ideate API URL (optional):

```bash
export IDEATE_API_URL=http://localhost:5055
```

5. Start the server:

```bash
npm start
```

Use `CTRL+C` to stop the server at any time.
