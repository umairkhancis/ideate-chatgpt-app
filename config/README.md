# Domain Model Configuration

This directory contains configuration files that define business domain models for the Ideate platform. Each configuration enables a complete CRUD system with branded UI widgets accessible via ChatGPT.

## Quick Start

1. **Choose or create a config file** (e.g., `product.json`)
2. **Start the backend** with the config:
   ```bash
   cd ideate-backend-server
   DOMAIN_CONFIG=../config/product.json uv run python app.py
   ```
3. **Build and serve widgets**:
   ```bash
   cd ideate-app/web
   pnpm run bump && pnpm run serve
   ```
4. **Start MCP server**:
   ```bash
   cd ideate-app/mcp
   DOMAIN_CONFIG=../../config/product.json npm run build && npm start
   ```

## Configuration Schema

### Required Fields

- **`domain`**: Unique identifier (lowercase, hyphenated). Example: `"products"`, `"customers"`
- **`label`**: Singular display name. Example: `"Product"`
- **`labelPlural`**: Plural display name. Example: `"Products"`
- **`fields`**: Array of field definitions (see below)

### Optional Fields

- **`icon`**: Emoji or icon. Example: `"🏷️"`
- **`description`**: Brief description of the domain
- **`branding`**: Visual customization
  - `primaryColor`: Hex color (default: `#3B82F6`)
  - `secondaryColor`: Hex color (default: `#10B981`)
  - `logo`: URL to logo image
- **`features`**: Feature flags
  - `create`: Enable create (default: `true`)
  - `update`: Enable update (default: `true`)
  - `delete`: Enable delete (default: `true`)
  - `archive`: Enable archive/restore (default: `false`)
  - `search`: Enable search (default: `false`)

## Field Definition

Each field in the `fields` array:

```json
{
  "key": "name",           // Unique identifier (camelCase)
  "label": "Product Name", // Display label
  "type": "string",        // Data type: string, text, number, boolean, date, datetime
  "required": true,        // Is field required?
  "showInList": true,      // Show in list view?
  "showInDetail": true,    // Show in detail view?
  "hidden": false,         // Hide from UI?
  "placeholder": "...",    // Placeholder text
  "helpText": "...",       // Helper text
  "min": 0,               // Min value (number fields)
  "max": 100,             // Max value (number fields)
  "default": null         // Default value
}
```

### Field Types

- **`string`**: Short text input (single line)
- **`text`**: Long text area (multi-line)
- **`number`**: Numeric input with optional min/max
- **`boolean`**: Checkbox/toggle
- **`date`**: Date picker (YYYY-MM-DD)
- **`datetime`**: Date and time picker (ISO 8601)

### Reserved Field Keys

The system automatically handles these fields:
- `id`: Unique identifier (auto-generated UUID)
- `archived`: Archive status (if `features.archive` is enabled)
- `created_date`: Creation timestamp (auto-generated)
- `updated_date`: Update timestamp (auto-updated)

## Example Configurations

### E-Commerce Product

```json
{
  "domain": "products",
  "label": "Product",
  "labelPlural": "Products",
  "icon": "🏷️",
  "branding": {
    "primaryColor": "#3B82F6",
    "secondaryColor": "#10B981"
  },
  "fields": [
    { "key": "id", "label": "ID", "type": "string", "hidden": true },
    { "key": "name", "label": "Product Name", "type": "string", "required": true, "showInList": true },
    { "key": "description", "label": "Description", "type": "text" },
    { "key": "price", "label": "Price", "type": "number", "min": 0, "showInList": true },
    { "key": "priority", "label": "Priority", "type": "number", "min": 1, "max": 5, "showInList": true }
  ],
  "features": { "archive": true }
}
```

### CRM Customer

```json
{
  "domain": "customers",
  "label": "Customer",
  "labelPlural": "Customers",
  "icon": "👤",
  "branding": {
    "primaryColor": "#8B5CF6",
    "secondaryColor": "#EC4899"
  },
  "fields": [
    { "key": "id", "label": "ID", "type": "string", "hidden": true },
    { "key": "name", "label": "Full Name", "type": "string", "required": true, "showInList": true },
    { "key": "email", "label": "Email", "type": "string", "required": true, "showInList": true },
    { "key": "phone", "label": "Phone", "type": "string", "showInList": true },
    { "key": "notes", "label": "Notes", "type": "text" }
  ]
}
```

## Directory Structure

```
config/
├── schema.json          # JSON Schema definition
├── product.json         # Active product configuration
├── README.md           # This file
└── examples/
    ├── idea.json       # Idea management (original)
    ├── customer.json   # CRM customer example
    └── task.json       # Task management example
```

## Implementation Notes

### Backend (Python)

The backend reads the config and:
1. Creates a generic SQLite table with JSON storage for flexibility
2. Exposes REST endpoints: `GET /{domain}`, `POST /{domain}`, etc.
3. Validates required fields and types

### Frontend (React)

Widgets read config from `window.openai.toolOutput._config` and:
1. Dynamically render fields based on `showInList`/`showInDetail`
2. Apply branding colors via CSS custom properties
3. Generate appropriate input components per field type

### MCP Server (TypeScript)

The MCP server reads config and:
1. Registers tools: `list_{domain}`, `get_{domain}`, `create_{domain}`, etc.
2. Returns versioned widget URIs in `_meta.openai/outputTemplate`
3. Passes config to widgets via `structuredContent._config`

## Validation

Validate your config against the schema:

```bash
npm install -g ajv-cli
ajv validate -s config/schema.json -d config/product.json
```

## Best Practices

1. **Keep it simple**: Start with 3-5 essential fields
2. **Use showInList wisely**: Only show 2-4 fields in list view
3. **Provide help text**: Guide users with placeholders and help text
4. **Test thoroughly**: Validate CRUD operations work correctly
5. **Brand appropriately**: Choose colors that match business identity

## Troubleshooting

**Config not loading?**
- Check JSON syntax (use a validator)
- Ensure `DOMAIN_CONFIG` env var points to correct file
- Verify all required fields are present

**Fields not showing?**
- Check `hidden`, `showInList`, `showInDetail` flags
- Ensure field `key` is unique and follows camelCase

**Colors not applying?**
- Verify hex color format (`#RRGGBB`)
- Check browser console for CSS errors
- Rebuild widgets with `pnpm run bump`

