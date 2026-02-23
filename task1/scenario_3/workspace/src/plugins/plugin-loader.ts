import path from 'path';
import fs from 'fs';
import { MarkdownCLIConfig, Plugin, ParseResult, Token } from '../types';
import { validatePlugin } from './plugin-api';

export class PluginLoader {
  private config: MarkdownCLIConfig;
  private plugins: Plugin[] = [];
  private builtinDir = path.join(__dirname, 'builtin');

  constructor(config: MarkdownCLIConfig) {
    this.config = config;
  }

  async loadAll(): Promise<void> {
    for (const pluginName of this.config.plugins) {
      try {
        const plugin = await this.loadPlugin(pluginName);
        if (plugin) {
          this.plugins.push(plugin);
          console.log(`[plugin] Loaded: ${plugin.name}@${plugin.version}`);
        }
      } catch (err: any) {
        console.warn(`[plugin] Failed to load "${pluginName}": ${err.message}`);
      }
    }
  }

  private async loadPlugin(name: string): Promise<Plugin | null> {
    // 1. 内置插件
    const builtinPath = path.join(this.builtinDir, `${name}.js`);
    if (fs.existsSync(builtinPath)) {
      const mod = require(builtinPath);
      const plugin = mod.default || mod;
      if (validatePlugin(plugin)) return plugin;
    }

    // 2. node_modules 中的插件（约定前缀 markdowncli-plugin-）
    try {
      const mod = require(`markdowncli-plugin-${name}`);
      const plugin = mod.default || mod;
      if (validatePlugin(plugin)) return plugin;
    } catch {}

    // 3. 本地路径
    if (name.startsWith('./') || name.startsWith('/')) {
      const absPath = path.isAbsolute(name) ? name : path.resolve(process.cwd(), name);
      if (fs.existsSync(absPath)) {
        const mod = require(absPath);
        const plugin = mod.default || mod;
        if (validatePlugin(plugin)) return plugin;
      }
    }

    throw new Error(`Plugin not found: ${name}`);
  }

  getPlugins(): Plugin[] { return [...this.plugins]; }

  runBeforeParse(content: string): string {
    let result = content;
    for (const plugin of this.plugins) {
      if (plugin.hooks.beforeParse) result = plugin.hooks.beforeParse(result);
    }
    return result;
  }

  runAfterParse(parseResult: ParseResult): ParseResult {
    let result = parseResult;
    for (const plugin of this.plugins) {
      if (plugin.hooks.afterParse) result = plugin.hooks.afterParse(result);
    }
    return result;
  }

  runBeforeRender(tokens: Token[]): Token[] {
    let result = tokens;
    for (const plugin of this.plugins) {
      if (plugin.hooks.beforeRender) result = plugin.hooks.beforeRender(result);
    }
    return result;
  }

  runAfterRender(output: string): string {
    let result = output;
    for (const plugin of this.plugins) {
      if (plugin.hooks.afterRender) result = plugin.hooks.afterRender(result);
    }
    return result;
  }
}
