'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef } from 'react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface Props {
  value: string;
  onChange: (value: string) => void;
  errors?: string[];
}

export function JsonEditor({ value, onChange, errors = [] }: Props) {
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);

  const markers = useMemo(
    () =>
      errors.map((message, index) => ({
        message,
        startLineNumber: index + 1,
        startColumn: 1,
        endLineNumber: index + 1,
        endColumn: 120,
        severity: monacoRef.current?.MarkerSeverity.Error ?? 8,
      })),
    [errors],
  );

  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      monacoRef.current.editor.setModelMarkers(editorRef.current.getModel()!, 'owner', markers);
    }
  }, [markers]);

  return (
    <div className="card json-editor-card" style={{ padding: '0', overflow: 'hidden', height: '100%', minHeight: 0 }}>
      <MonacoEditor
        height="100%"
        defaultLanguage="json"
        value={value}
        onChange={(next) => onChange(next ?? '')}
        theme="vs-dark"
        options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false }}
        onMount={(editor, monaco) => {
          editorRef.current = editor;
          monacoRef.current = monaco;
          monaco.editor.setModelMarkers(editor.getModel()!, 'owner', markers);
        }}
        onValidate={() => {
          // markers updated via useMemo in onChange
        }}
      />
      {errors.length > 0 && (
        <div className="alert error" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          <strong>Validation failed:</strong>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
