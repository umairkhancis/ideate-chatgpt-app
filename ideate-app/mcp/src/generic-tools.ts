/**
 * Generic tool factory for domain models
 * 
 * Creates MCP tools dynamically based on domain configuration.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DomainConfig, FieldConfig } from "./config-loader.js";

// Base URL for the backend API
const IDEATE_API_BASE =
  process.env.IDEATE_API_URL || "http://localhost:5055";

// Shared widget metadata
const WIDGET_META_FLAGS = {
  "openai/widgetAccessible": true,
  "openai/resultCanProduceWidget": true,
} as const;

/**
 * Helper to make API requests
 */
async function makeApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${IDEATE_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Convert field config to Zod schema
 */
function fieldToZodSchema(field: FieldConfig): any {
  let schema: any;

  switch (field.type) {
    case "string":
    case "text":
      schema = z.string();
      break;
    case "number":
      schema = z.number();
      if (field.min !== undefined) schema = schema.min(field.min);
      if (field.max !== undefined) schema = schema.max(field.max);
      break;
    case "boolean":
      schema = z.boolean();
      break;
    case "date":
    case "datetime":
      schema = z.string();
      break;
    default:
      schema = z.any();
  }

  // Make optional if not required
  if (!field.required) {
    schema = schema.optional();
  }

  // Add description
  const description = field.helpText || field.label;
  schema = schema.describe(description);

  return schema;
}

/**
 * Register generic tools for a domain model
 */
export function registerGenericTools(
  server: McpServer,
  config: DomainConfig,
  manifest: any
) {
  const domain = config.domain;
  const listUri = `ui://widget/v${manifest.version}/generic-list.html`;
  const detailUri = `ui://widget/v${manifest.version}/generic-detail.html`;

  console.log(`\nRegistering generic tools for: ${config.labelPlural}`);

  // Build input/output schemas from config
  const entitySchema: Record<string, any> = {
    // System fields are always present and required in API responses
    id: z.string(),
    archived: z.boolean(),
    created_date: z.string(),
    updated_date: z.string(),
  };
  const createSchema: Record<string, any> = {};
  const systemFields = ["id", "created_date", "updated_date", "archived"];

  config.fields.forEach((field) => {
    // Add user-defined fields to entitySchema (may override system field definitions from config)
    if (!systemFields.includes(field.key)) {
      entitySchema[field.key] = fieldToZodSchema(field);
      // Also add to createSchema for input (exclude system fields)
      createSchema[field.key] = fieldToZodSchema(field);
    }
  });

  // LIST TOOL
  server.registerTool(
    `list_${domain}`,
    {
      title: `List ${config.labelPlural}`,
      description: `List all ${config.labelPlural.toLowerCase()} with optional filtering`,
      inputSchema: {
        includeArchived: z
          .boolean()
          .optional()
          .describe(`Include archived ${config.labelPlural.toLowerCase()}`),
        archivedOnly: z
          .boolean()
          .optional()
          .describe(`Return only archived ${config.labelPlural.toLowerCase()}`),
      },
      outputSchema: {
        items: z.array(z.object(entitySchema)),
        count: z.number(),
      },
      _meta: {
        ...WIDGET_META_FLAGS,
        "openai/outputTemplate": listUri,
        "openai/toolInvocation/invoking": `Loading ${config.labelPlural.toLowerCase()}...`,
        "openai/toolInvocation/invoked": `${config.labelPlural} loaded`,
      },
    },
    async ({ includeArchived = false, archivedOnly = false }) => {
      const queryParams = new URLSearchParams();
      if (includeArchived) queryParams.set("includeArchived", "true");
      if (archivedOnly) queryParams.set("archivedOnly", "true");

      const endpoint = `/${domain}${queryParams.toString() ? `?${queryParams.toString()}` : ""
        }`;
      const items = await makeApiRequest<any[]>(endpoint);

      return {
        content: [
          {
            type: "text",
            text: `Found ${items.length} ${archivedOnly ? "archived " : ""
              }${config.labelPlural.toLowerCase()}`,
          },
        ],
        structuredContent: {
          items,
          count: items.length,
        },
        _meta: {
          config,
          filters: {
            includeArchived,
            archivedOnly,
          },
          lastSyncedAt: new Date().toISOString(),
        },
      };
    }
  );

  // GET TOOL
  server.registerTool(
    `get_${domain}`,
    {
      title: `Get ${config.label}`,
      description: `Get a specific ${config.label.toLowerCase()} by ID`,
      inputSchema: {
        id: z.string().describe(`The ID of the ${config.label.toLowerCase()} to retrieve`),
      },
      outputSchema: {
        item: z.object(entitySchema),
      },
      _meta: {
        ...WIDGET_META_FLAGS,
        "openai/outputTemplate": detailUri,
        "openai/toolInvocation/invoking": `Loading ${config.label.toLowerCase()} details...`,
        "openai/toolInvocation/invoked": `${config.label} details loaded`,
      },
    },
    async ({ id }) => {
      const item = await makeApiRequest<any>(`/${domain}/${id}`);

      return {
        content: [
          {
            type: "text",
            text: `Loaded ${config.label.toLowerCase()}: ${id}`,
          },
        ],
        structuredContent: {
          item,
        },
        _meta: {
          config,
          loadedAt: new Date().toISOString(),
          itemId: id,
        },
      };
    }
  );

  // CREATE TOOL (if enabled)
  if (config.features?.create !== false) {
    server.registerTool(
      `create_${domain}`,
      {
        title: `Create ${config.label}`,
        description: `Create a new ${config.label.toLowerCase()}`,
        inputSchema: createSchema,
        outputSchema: {
          item: z.object(entitySchema),
        },
        _meta: {
          ...WIDGET_META_FLAGS,
          "openai/outputTemplate": detailUri,
          "openai/toolInvocation/invoking": `Creating ${config.label.toLowerCase()}...`,
          "openai/toolInvocation/invoked": `${config.label} created`,
        },
      },
      async (input) => {
        const item = await makeApiRequest<any>(`/${domain}`, {
          method: "POST",
          body: JSON.stringify(input),
        });

        return {
          content: [
            {
              type: "text",
              text: `Created new ${config.label.toLowerCase()}`,
            },
          ],
          structuredContent: {
            item,
          },
          _meta: {
            config,
            operation: "create",
            createdAt: new Date().toISOString(),
            itemId: item.id,
          },
        };
      }
    );
  }

  // UPDATE TOOL (if enabled)
  if (config.features?.update !== false) {
    server.registerTool(
      `update_${domain}`,
      {
        title: `Update ${config.label}`,
        description: `Update an existing ${config.label.toLowerCase()}`,
        inputSchema: {
          id: z.string().describe(`The ID of the ${config.label.toLowerCase()} to update`),
          ...Object.fromEntries(
            Object.entries(createSchema).map(([k, v]) => [k, (v as any).optional()])
          ),
        },
        outputSchema: {
          item: z.object(entitySchema),
        },
        _meta: {
          ...WIDGET_META_FLAGS,
          "openai/outputTemplate": detailUri,
          "openai/toolInvocation/invoking": `Updating ${config.label.toLowerCase()}...`,
          "openai/toolInvocation/invoked": `${config.label} updated`,
        },
      },
      async ({ id, ...updates }) => {
        const item = await makeApiRequest<any>(`/${domain}/${id}`, {
          method: "PUT",
          body: JSON.stringify(updates),
        });

        return {
          content: [
            {
              type: "text",
              text: `Updated ${config.label.toLowerCase()}`,
            },
          ],
          structuredContent: {
            item,
          },
          _meta: {
            config,
            operation: "update",
            updatedAt: new Date().toISOString(),
            itemId: item.id,
          },
        };
      }
    );
  }

  // DELETE TOOL (if enabled)
  if (config.features?.delete !== false) {
    server.registerTool(
      `delete_${domain}`,
      {
        title: `Delete ${config.label}`,
        description: `Delete a ${config.label.toLowerCase()} permanently`,
        inputSchema: {
          id: z.string().describe(`The ID of the ${config.label.toLowerCase()} to delete`),
        },
        outputSchema: {
          success: z.boolean(),
          message: z.string(),
        },
      },
      async ({ id }) => {
        await makeApiRequest(`/${domain}/${id}`, {
          method: "DELETE",
        });

        return {
          content: [
            {
              type: "text",
              text: `${config.label} ${id} has been deleted`,
            },
          ],
          structuredContent: {
            success: true,
            message: `${config.label} ${id} has been deleted`,
          },
          _meta: {
            operation: "delete",
            deletedAt: new Date().toISOString(),
            itemId: id,
          },
        };
      }
    );
  }

  // ARCHIVE/RESTORE TOOLS (if enabled)
  if (config.features?.archive) {
    server.registerTool(
      `archive_${domain}`,
      {
        title: `Archive ${config.label}`,
        description: `Archive a ${config.label.toLowerCase()}`,
        inputSchema: {
          id: z.string().describe(`The ID of the ${config.label.toLowerCase()} to archive`),
        },
        outputSchema: {
          success: z.boolean(),
          message: z.string(),
        },
      },
      async ({ id }) => {
        await makeApiRequest(`/${domain}/${id}/archive`, {
          method: "POST",
        });

        return {
          content: [
            {
              type: "text",
              text: `${config.label} ${id} has been archived`,
            },
          ],
          structuredContent: {
            success: true,
            message: `${config.label} ${id} has been archived`,
          },
          _meta: {
            operation: "archive",
            archivedAt: new Date().toISOString(),
            itemId: id,
          },
        };
      }
    );

    server.registerTool(
      `restore_${domain}`,
      {
        title: `Restore ${config.label}`,
        description: `Restore (unarchive) a ${config.label.toLowerCase()}`,
        inputSchema: {
          id: z.string().describe(`The ID of the ${config.label.toLowerCase()} to restore`),
        },
        outputSchema: {
          success: z.boolean(),
          message: z.string(),
        },
      },
      async ({ id }) => {
        await makeApiRequest(`/${domain}/${id}/restore`, {
          method: "POST",
        });

        return {
          content: [
            {
              type: "text",
              text: `${config.label} ${id} has been restored`,
            },
          ],
          structuredContent: {
            success: true,
            message: `${config.label} ${id} has been restored`,
          },
          _meta: {
            operation: "restore",
            restoredAt: new Date().toISOString(),
            itemId: id,
          },
        };
      }
    );
  }

  console.log(`✓ Registered tools: list, get, ${config.features?.create !== false ? 'create, ' : ''}${config.features?.update !== false ? 'update, ' : ''}${config.features?.delete !== false ? 'delete, ' : ''}${config.features?.archive ? 'archive, restore' : ''}`);
}

