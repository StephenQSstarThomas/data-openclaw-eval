import React, { useEffect, useRef, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  theme?: 'light' | 'dark';
  readOnly?: boolean;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ content, onChange, theme = 'light', readOnly = false }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const handleChange = useCallback(
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    }),
    [onChange]
  );

  useEffect(() => {
    if (!editorRef.current) return;

    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown({ base: markdownLanguage }),
      syntaxHighlighting(defaultHighlightStyle),
      handleChange,
      EditorView.lineWrapping,
      EditorState.readOnly.of(readOnly),
    ];

    if (theme === 'dark') {
      extensions.push(oneDark);
    }

    const state = EditorState.create({
      doc: content,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [theme, readOnly]);

  // 外部 content 变更时同步
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentContent = view.state.doc.toString();
    if (currentContent !== content) {
      view.dispatch({
        changes: { from: 0, to: currentContent.length, insert: content },
      });
    }
  }, [content]);

  return (
    <div className="note-editor" style={{ flex: 1, overflow: 'hidden' }}>
      <div ref={editorRef} style={{ height: '100%' }} />
    </div>
  );
};

export default NoteEditor;
