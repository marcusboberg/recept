'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  prompt: string;
  className?: string;
  title?: string;
  subtitle?: string;
  defaultOpen?: boolean;
}

export function ChatPromptCard({ prompt, className, title, subtitle, defaultOpen = false }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [customText, setCustomText] = useState('');
  const [showHint, setShowHint] = useState(false);
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
    <div className={`card space-y-3 studio-card ${className ?? ''}`}>
      <div className="wizard-row">
        <div className="wizard-step-content" style={{ gridColumn: '1 / -1' }}>
          <textarea
            rows={7}
            value={customText}
            onChange={(event) => setCustomText(event.target.value)}
            placeholder="Klistra in hela receptet här. När du kopierar prompten följer texten med."
            style={{ minHeight: '200px', fontSize: '1rem' }}
          />
        </div>
      </div>

      <div className="wizard-row wizard-row--prompt">
        <div className="wizard-step-content" style={{ gridColumn: '1 / -1' }}>
          {isOpen && (
            <pre
              className="code-block"
              style={{
                whiteSpace: 'pre-wrap',
                maxHeight: '260px',
                fontSize: '0.9rem',
                borderRadius: '16px',
                marginTop: '0.75rem',
              }}
            >
              {prompt}
            </pre>
          )}

          <div
            className="flex"
            style={{
              gap: '0.5rem',
              flexWrap: 'wrap',
              alignItems: 'center',
              marginTop: '0.75rem',
              justifyContent: 'space-between',
            }}
          >
            <div className="flex" style={{ gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" className="button-primary" onClick={copyPrompt}>
                Kopiera prompt
              </button>
              <button
                type="button"
                className="button-ghost"
                onClick={() => {
                  setShowHint(true);
                  try {
                    window.open('https://chatgpt.com', '_blank');
                  } catch {
                    // ignore if blocked
                  }
                }}
              >
                Öppna ChatGPT
              </button>
            </div>
            <div className="flex" style={{ gap: '0.5rem', alignItems: 'center' }}>
              <button type="button" className="button-ghost" onClick={() => setIsOpen((prev) => !prev)}>
                {isOpen ? 'Dölj prompt' : 'Visa prompt'}
              </button>
              {message && (
                <span className="text-sm" style={{ color: isError ? '#b91c1c' : 'inherit' }}>
                  {message}
                </span>
              )}
            </div>
          </div>

          {showHint && (
            <div
              className="chatgpt-hint"
              style={{
                marginTop: '0.75rem',
                padding: '0.8rem 1rem',
                borderRadius: '12px',
                border: '1px solid rgba(148, 163, 184, 0.35)',
                background: '#f8fafc',
                color: '#0f172a',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '0.75rem',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span className="text-sm">Klistra in prompt + text i ChatGPT.</span>
              <button type="button" className="button-ghost" onClick={() => setShowHint(false)}>
                Stäng
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
