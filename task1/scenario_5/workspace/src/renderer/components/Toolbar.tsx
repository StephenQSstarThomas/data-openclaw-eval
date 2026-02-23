import React from 'react';

interface ToolbarProps {
  onAction: (action: string, payload?: string) => void;
}

const TOOLBAR_ITEMS = [
  { action: 'heading1', icon: 'H1', title: '标题 1', insert: '# ' },
  { action: 'heading2', icon: 'H2', title: '标题 2', insert: '## ' },
  { action: 'heading3', icon: 'H3', title: '标题 3', insert: '### ' },
  { action: 'divider1' },
  { action: 'bold', icon: 'B', title: '加粗', wrap: '**' },
  { action: 'italic', icon: 'I', title: '斜体', wrap: '*' },
  { action: 'strikethrough', icon: 'S', title: '删除线', wrap: '~~' },
  { action: 'code', icon: '</>', title: '行内代码', wrap: '`' },
  { action: 'divider2' },
  { action: 'codeblock', icon: '{ }', title: '代码块', insert: '