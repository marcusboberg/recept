'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  prompt: string;
}

export function ChatPromptCard({ prompt }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showMessage = (text: string, error = false) => {
    setMessage(text);
    setIsError(error);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setMessage(null);
      setIsError(false);
    }, 2500);
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      showMessage('Prompt kopierad!');
    } catch (error) {
      showMessage('Kunde inte kopiera prompten. Kopiera manuellt.', true);
    }
  };

  return (
    <div className="card space-y-3">
      <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        <div>
          <h3 className="card-title" style={{ marginBottom: 0 }}>ChatGPT prompt</h3>
          <p className="card-subtitle" style={{ marginBottom: 0 }}>Kopiera prompten för att konvertera fritext till JSON.</p>
        </div>
        <button type="button" className="button-ghost" onClick={() => setIsOpen((prev) => !prev)}>
          {isOpen ? 'Fäll ihop' : 'Visa prompt'}
        </button>
      </div>
      {isOpen && (
        <>
          <pre className="code-block" style={{ whiteSpace: 'pre-wrap', maxHeight: '220px' }}>{prompt}</pre>
          <div className="flex" style={{ gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="button-primary" onClick={copyPrompt}>
              Kopiera prompt
            </button>
            {message && (
              <span className="text-sm" style={{ color: isError ? '#b91c1c' : 'inherit' }}>
                {message}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
