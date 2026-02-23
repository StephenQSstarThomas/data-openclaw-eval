import { Plugin, PluginHooks, ParseResult, Token } from '../types';

export abstract class BasePlugin implements Plugin {
  abstract name: string;
  abstract version: string;
  hooks: PluginHooks = {};
}

export function definePlugin(config: {
  name: string;
  version: string;
  hooks: PluginHooks;
}): Plugin {
  return {
    name: config.name,
    version: config.version,
    hooks: config.hooks,
  };
}

// 插件验证
export function validatePlugin(plugin: any): plugin is Plugin {
  if (!plugin || typeof plugin !== 'object') return false;
  if (typeof plugin.name !== 'string' || !plugin.name) return false;
  if (typeof plugin.version !== 'string') return false;
  if (!plugin.hooks || typeof plugin.hooks !== 'object') return false;
  const validHooks = ['beforeParse', 'afterParse', 'beforeRender', 'afterRender'];
  for (const key of Object.keys(plugin.hooks)) {
    if (!validHooks.includes(key)) return false;
    if (typeof plugin.hooks[key] !== 'function') return false;
  }
  return true;
}
