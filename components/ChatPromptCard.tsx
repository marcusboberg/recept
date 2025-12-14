'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  prompt: string;
}

export function ChatPromptCard({ prompt }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [customText, setCustomText] = useState('');
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
      const trimmed = customText.trim();
      const fullPrompt = trimmed.length > 0 ? `${prompt}\n\nText att konvertera:\n${trimmed}` : prompt;
      await navigator.clipboard.writeText(fullPrompt);
      showMessage(trimmed.length > 0 ? 'Prompt + text kopierad!' : 'Prompt kopierad!');
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
          <label className="space-y-1" style={{ display: 'block' }}>
            <span className="text-sm text-muted">Valfri fritext att skicka med</span>
            <textarea
              rows={5}
              value={customText}
              onChange={(event) => setCustomText(event.target.value)}
              placeholder="Klistra in recepttext som du vill att ChatGPT ska konvertera."
            />
          </label>
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
