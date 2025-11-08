/**
 * Configuration loader for domain models in MCP server
 * 
 * Loads and parses domain configuration JSON files for generic MCP tools.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

export interface FieldConfig {
  key: string;
  label: string;
  type: "string" | "text" | "number" | "boolean" | "date" | "datetime";
  required?: boolean;
  hidden?: boolean;
  showInList?: boolean;
  showInDetail?: boolean;
  placeholder?: string;
  helpText?: string;
  min?: number;
  max?: number;
  default?: any;
}

export interface BrandingConfig {
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string;
}

export interface FeaturesConfig {
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  archive?: boolean;
  search?: boolean;
}

export interface DomainConfig {
  domain: string;
  label: string;
  labelPlural: string;
  icon?: string;
  description?: string;
  branding?: BrandingConfig;
  features?: FeaturesConfig;
  fields: FieldConfig[];
}

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: DomainConfig | null = null;

  private constructor() { }

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  /**
   * Load domain configuration from file
   * @param configPath Path to config file (defaults to DOMAIN_CONFIG env var)
   * @returns DomainConfig or null if not found
   */
  load(configPath?: string): DomainConfig | null {
    if (this.config) {
      return this.config;
    }

    // Get config path from parameter or environment
    const path = configPath || process.env.DOMAIN_CONFIG;

    if (!path) {
      console.log("No DOMAIN_CONFIG specified, generic API disabled");
      return null;
    }

    const resolvedPath = resolve(path);

    if (!existsSync(resolvedPath)) {
      console.warn(`Domain config file not found: ${resolvedPath}`);
      return null;
    }

    try {
      const content = readFileSync(resolvedPath, "utf-8");
      const data = JSON.parse(content);

      // Basic validation
      if (!data.domain || !data.label || !data.labelPlural || !data.fields) {
        throw new Error("Invalid config: missing required fields");
      }

      this.config = data as DomainConfig;
      console.log(`✓ Loaded domain config: ${this.config.labelPlural} (${this.config.domain})`);
      return this.config;
    } catch (error) {
      console.error(`Failed to load domain config: ${error}`);
      return null;
    }
  }

  /**
   * Get cached config
   */
  get(): DomainConfig | null {
    return this.config;
  }

  /**
   * Reload configuration
   */
  reload(configPath?: string): DomainConfig | null {
    this.config = null;
    return this.load(configPath);
  }

  /**
   * Get required fields from config
   */
  getRequiredFields(): FieldConfig[] {
    if (!this.config) return [];
    return this.config.fields.filter((f) => f.required && !f.hidden);
  }

  /**
   * Get list view fields from config
   */
  getListFields(): FieldConfig[] {
    if (!this.config) return [];
    return this.config.fields.filter((f) => f.showInList && !f.hidden);
  }

  /**
   * Get detail view fields from config
   */
  getDetailFields(): FieldConfig[] {
    if (!this.config) return [];
    return this.config.fields.filter(
      (f) => f.showInDetail !== false && !f.hidden
    );
  }
}

/**
 * Convenience function to load config
 */
export function loadDomainConfig(configPath?: string): DomainConfig | null {
  const loader = ConfigLoader.getInstance();
  return loader.load(configPath);
}

/**
 * Get cached config
 */
export function getDomainConfig(): DomainConfig | null {
  const loader = ConfigLoader.getInstance();
  return loader.get();
}

