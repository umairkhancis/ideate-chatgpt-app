# Generic Domain Model Demo Guide

This guide walks you through demonstrating the generic domain model system with the **Products** demo.

## What You'll Demonstrate

✅ One config file defines an entire CRUD system  
✅ Branded UI widgets in ChatGPT  
✅ Full list/detail views with custom fields  
✅ No code changes needed for new domains  
✅ Works alongside existing Ideas system  

---

## Prerequisites

1. **Python 3.10+** with `uv` package manager
2. **Node.js 18+** with `npm` and `pnpm`
3. **Three terminal windows** (Backend, Widgets, MCP)

---

## Quick Start (5 Minutes)

### Terminal 1: Backend Server

```bash
cd ideate-backend-server

# Set the config for Products domain
export DOMAIN_CONFIG=../config/product.json

# Start the backend
uv run python app.py
```

**Expected Output:**
```
============================================================
GENERIC API MODE
============================================================
Loaded domain config: Products (products)
Generic API endpoints registered:
  GET    /products
  POST   /products
  GET    /products/<id>
  PUT    /products/<id>
  DELETE /products/<id>
  POST   /products/<id>/archive
  POST   /products/<id>/restore
  GET    /products/config
============================================================

Ideate API Server starting...
Listening on: http://localhost:5055
```

### Terminal 2: Widget Server

```bash
cd ideate-app/web

# Widgets are already built - just serve them
pnpm run serve
```

**Expected Output:**
```
Serving assets from ./assets/ on http://localhost:4444
```

### Terminal 3: MCP Server

```bash
cd ideate-app/mcp

# Set the config for Products domain
export DOMAIN_CONFIG=../../config/product.json

# Start MCP server
npm start
```

**Expected Output:**
```
============================================================
GENERIC API MODE ENABLED
============================================================

Registering generic tools for: Products
✓ Registered tools: list, get, create, update, delete, archive, restore
✓ Registered generic resources for Products
============================================================

Ideate MCP Server running on http://localhost:3000/mcp
```

---

## Testing in ChatGPT

Once all three services are running, use these prompts in ChatGPT:

### 1. List Products

```
Show me all products
```

**What to observe:**
- Blue-themed product list widget appears
- Shows 3 sample products (Wireless Mouse, USB-C Hub, Laptop Stand)
- Displays: name, price, stock, priority
- Sort and filter buttons work

### 2. View Product Details

```
Show me details for Wireless Mouse
```

**What to observe:**
- Product detail widget appears
- Shows all fields: name, description, price, stock, priority
- Action buttons: Edit, Archive, Share, Delete
- Clean, professional layout

### 3. Create New Product

```
Create a product called "Mechanical Keyboard" priced at $129.99 with 50 items in stock and priority 5
```

**What to observe:**
- Product is created
- Detail widget shows the new product
- All fields are populated correctly

### 4. Update Product

```
Update the Mechanical Keyboard price to $119.99
```

**What to observe:**
- Price is updated
- Widget refreshes with new data

### 5. Archive Product

```
Archive the Mechanical Keyboard
```

**What to observe:**
- Product is archived
- Success message appears

---

## Demo Flow for Different Industries

To show versatility, you can create and demo other domains:

### E-Commerce (Already Configured: `product.json`)
**Pitch:** "Manage product catalog with inventory tracking"

### CRM (Example Config Below)

Create `/config/customer.json`:
```json
{
  "domain": "customers",
  "label": "Customer",
  "labelPlural": "Customers",
  "icon": "👤",
  "description": "CRM customer management",
  "branding": {
    "primaryColor": "#8B5CF6",
    "secondaryColor": "#EC4899"
  },
  "fields": [
    { "key": "id", "label": "ID", "type": "string", "hidden": true },
    { "key": "name", "label": "Full Name", "type": "string", "required": true, "showInList": true },
    { "key": "email", "label": "Email", "type": "string", "required": true, "showInList": true },
    { "key": "phone", "label": "Phone", "type": "string", "showInList": true },
    { "key": "company", "label": "Company", "type": "string" },
    { "key": "notes", "label": "Notes", "type": "text" },
    { "key": "priority", "label": "Priority", "type": "number", "min": 1, "max": 5, "showInList": true }
  ],
  "features": { "archive": true }
}
```

**Restart all services with:**
```bash
export DOMAIN_CONFIG=../config/customer.json  # (adjust path per service)
```

**Pitch:** "Purple-themed CRM with contact management"

---

## Key Selling Points

### 1. **Zero Code for New Domains**
- Show `product.json`
- Point out: "This 50-line config creates entire CRUD system"
- No programming required

### 2. **Branded Experience**
- Products = Blue theme
- Customers = Purple theme
- Point out: "Each business gets their brand colors"

### 3. **ChatGPT Native**
- Users interact in natural language
- No training on complex UI
- Point out: "Just chat to manage inventory"

### 4. **Flexible Fields**
- Show how adding a field to config auto-appears in UI
- Point out: "Adapts to any business model"

### 5. **Professional UI**
- Responsive design (show mobile mode)
- Dark/light theme support
- Skeleton loaders during fetch

---

## Architecture Overview (For Technical Demos)

```
┌─────────────┐
│   ChatGPT   │  Natural language interface
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         MCP Server (TS)             │  Tool registration
│  • Loads config.json                │  Widget serving
│  • Registers tools dynamically      │  
│  • Serves React widgets             │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│      Backend API (Python)           │  REST endpoints
│  • Generic CRUD endpoints           │  Data persistence
│  • SQLite with JSON storage         │
│  • Config-driven validation         │
└─────────────────────────────────────┘

Configuration Flow:
product.json ──> Backend (Python) ──> SQLite Table
             └──> MCP (TS) ──> Tools + Resources
             └──> Widgets (React) ──> UI Rendering
```

---

## Troubleshooting

### Widgets Not Showing?

1. Check all three services are running
2. Verify manifest.json exists: `ls ideate-app/web/assets/manifest.json`
3. Check console for errors

### Config Not Loading?

1. Verify `DOMAIN_CONFIG` env var is set in **all three terminals**
2. Check config file exists and is valid JSON
3. Look for "GENERIC API MODE" message in logs

### Tools Not Available?

1. Restart MCP server after backend starts
2. Check MCP console for "Registered tools" message
3. Verify `IDEATE_API_URL` points to correct backend

---

## Advanced: Creating New Domains

### 1. Create Config File

```bash
# Copy template
cp config/product.json config/my-domain.json

# Edit with your fields
vim config/my-domain.json
```

### 2. Validate Config

```bash
# Install validator
npm install -g ajv-cli

# Validate against schema
ajv validate -s config/schema.json -d config/my-domain.json
```

### 3. Start Services

```bash
export DOMAIN_CONFIG=../config/my-domain.json
# Restart all three services
```

### 4. Test

```
Show me all [your domain plural]
```

---

## Performance Notes

- **Cold start:** ~3 seconds (widget load)
- **Subsequent renders:** Instant (cached)
- **API response:** <100ms (local SQLite)
- **Build time:** ~5 seconds (all widgets)

---

## Production Checklist

Before deploying to production:

- [ ] Add authentication/authorization
- [ ] Configure CORS properly
- [ ] Use PostgreSQL instead of SQLite
- [ ] Add input sanitization
- [ ] Implement rate limiting
- [ ] Add logging and monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure environment-specific configs
- [ ] Add API documentation (Swagger)
- [ ] Write integration tests

---

## Next Steps

1. **Try different domains** - Create customer.json, task.json, property.json
2. **Customize branding** - Match your client's colors
3. **Add field types** - Extend with enum, tags, file upload
4. **Multi-config support** - Switch between domains without restart
5. **Config UI builder** - Visual config generator

---

## Support & Resources

- **Config Schema:** `config/schema.json`
- **Config Examples:** `config/examples/`
- **Backend API:** http://localhost:5055/apidocs
- **Architecture Docs:** `AGENTS.md`

---

## Success Metrics

After demo, gauge interest by asking:

1. "What domain would you want to manage first?"
2. "What custom fields would you need?"
3. "What's your current workflow for this?"
4. "How many team members would use this?"

**Green flags:**
- ✅ Asks about custom fields
- ✅ Discusses specific use case
- ✅ Wants to see customer/task example
- ✅ Asks about pricing/deployment

**Red flags:**
- ❌ Doesn't see value over existing tools
- ❌ Concerned about ChatGPT dependency
- ❌ Needs complex workflows
- ❌ Requires enterprise features

---

## Demo Script (2-Minute Pitch)

> "Let me show you something cool. This is a ChatGPT app that turns a simple JSON file into a complete business management system.
> 
> [Show product.json on screen]
> 
> This 50-line configuration defines an entire product catalog. Watch what happens when I ask ChatGPT to show me products...
> 
> [Type: 'Show me all products']
> 
> Instantly, we get a branded, professional interface. No coding required. The colors, fields, everything comes from that config file.
> 
> [Click a product]
> 
> Detail views, editing, archiving - all automatic. And here's the magic...
> 
> [Switch to customer.json]
> 
> Change the config, restart, and now it's a CRM. Purple theme, different fields, but same powerful interface. One system, infinite domains.
> 
> Real estate? Tasks? Inventory? Just write a config file."

---

**Ready to start the demo?** Open three terminals and follow the Quick Start section! 🚀

