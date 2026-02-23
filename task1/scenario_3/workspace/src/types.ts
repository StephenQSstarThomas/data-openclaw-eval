// CLI 配置类型
export interface MarkdownCLIConfig {
  theme: 'default' | 'monokai' | 'github' | 'dracula';
  lineNumbers: boolean;
  wordWrap: boolean;
  maxWidth: number;
  tabSize: number;
  plugins: string[];
  output: {
    format: 'terminal' | 'html' | 'json';
    colorEnabled: boolean;
  };
  watch: {
    debounce: number;     // ms
    ignorePatterns: string[];
  };
  lint: {
    rules: Record<string, 'off' | 'warn' | 'error'>;
  };
}

// Markdown 解析结果
export interface ParseResult {
  tokens: Token[];
  metadata: DocumentMetadata;
  errors: ParseError[];
}

export interface Token {
  type: TokenType;
  raw: string;
  text?: string;
  depth?: number;       // heading depth
  lang?: string;        // code block language
  items?: Token[];      // list items
  rows?: string[][];    // table rows
  checked?: boolean;    // task list
  href?: string;        // link
}

export type TokenType =
  | 'heading' | 'paragraph' | 'code' | 'blockquote'
  | 'list' | 'list_item' | 'table' | 'hr'
  | 'link' | 'image' | 'emphasis' | 'strong'
  | 'task_list_item' | 'footnote' | 'alert'
  | 'html' | 'space';

export interface DocumentMetadata {
  title: string | null;
  wordCount: number;
  charCount: number;
  lineCount: number;
  headings: { depth: number; text: string }[];
  links: { href: string; text: string }[];
  images: { src: string; alt: string }[];
  codeBlocks: { lang: string; lines: number }[];
  frontmatter?: Record<string, unknown>;
}

export interface ParseError {
  line: number;
  column: number;
  message: string;
  severity: 'warning' | 'error';
}

// 插件接口
export interface Plugin {
  name: string;
  version: string;
  hooks: PluginHooks;
}

export interface PluginHooks {
  beforeParse?: (content: string) => string;
  afterParse?: (result: ParseResult) => ParseResult;
  beforeRender?: (tokens: Token[]) => Token[];
  afterRender?: (output: string) => string;
}

// 渲染选项
export interface RenderOptions {
  theme: MarkdownCLIConfig['theme'];
  lineNumbers: boolean;
  maxWidth: number;
  colorEnabled: boolean;
}

// 输出目标
export type OutputTarget = 'stdout' | 'file' | 'clipboard';

export interface OutputOptions {
  target: OutputTarget;
  filePath?: string;
  format: 'terminal' | 'html' | 'json';
}
