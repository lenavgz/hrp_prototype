import React, { useState, useRef, useEffect } from 'react';

export default function LLMExhibition() {
  const [mode, setMode] = useState('freeflow'); // 'freeflow' or 'wordbyword'
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [alternatives, setAlternatives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const outputRef = useRef(null);

  const API_BASE = 'http://localhost:5000/api';

  const handleSend = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setOutput('');
    setSelectedToken('');
    setAlternatives([]);

    try {
      if (mode === 'freeflow') {
        await runAutoPlay();
      } else {
        await stepByStep();
      }
    } catch (error) {
      console.error('Error:', error);
      setOutput('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const runAutoPlay = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`${API_BASE}/auto-play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, max_tokens: 100 }),
      });
      const data = await response.json();
      setOutput(data.final_text || 'No output');
    } finally {
      setIsGenerating(false);
    }
  };

  const stepByStep = async () => {
    try {
      const response = await fetch(`${API_BASE}/step-by-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, user_selected_tokens: [] }),
      });
      const data = await response.json();
      
      if (data.alternatives && data.alternatives.length > 0) {
        setAlternatives(data.alternatives.slice(0, 5));
        setSelectedToken('');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const selectToken = async (token) => {
    setSelectedToken(token);
    setOutput(output + token + ' ');
    
    // Get next token
    try {
      const response = await fetch(`${API_BASE}/step-by-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, user_selected_tokens: [token] }),
      });
      const data = await response.json();
      
      if (data.alternatives && data.alternatives.length > 0) {
        setAlternatives(data.alternatives.slice(0, 5));
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getMaxProbability = () => {
    return Math.max(...alternatives.map(a => a.probability || 0), 1);
  };

  return (
    <div style={styles.container}>
      {/* Left Panel - Input */}
      <div style={styles.leftPanel}>
        <div style={styles.header}>
          <span style={styles.title}>WORD · BY · WORD</span>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          style={styles.input}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) handleSend();
          }}
        />

        <button
          onClick={handleSend}
          disabled={loading || !prompt.trim()}
          style={{ ...styles.sendButton, opacity: loading ? 0.5 : 1 }}
        >
          {loading ? 'Generating...' : 'Send'}
        </button>

        {/* Toggle Switch */}
        <div style={styles.toggleContainer}>
          <label style={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={mode === 'wordbyword'}
              onChange={(e) => setMode(e.target.checked ? 'wordbyword' : 'freeflow')}
              style={styles.checkbox}
            />
            <span style={styles.toggleText}>
              {mode === 'wordbyword' ? 'WORD BY WORD' : 'FREE FLOW'}
            </span>
          </label>
        </div>
      </div>

      {/* Right Panel - Output */}
      <div style={styles.rightPanel}>
        <div style={styles.machineLabel}>machine</div>

        {/* Output Text */}
        <div style={styles.outputBox} ref={outputRef}>
          <span style={styles.outputText}>{output}</span>
          {isGenerating && <span style={styles.cursor}>▌</span>}
        </div>

        {/* Probability Bars */}
        {mode === 'wordbyword' && alternatives.length > 0 && (
          <div style={styles.alternativesContainer}>
            <h3 style={styles.alternativesTitle}>5 POSSIBLE NEXT WORDS</h3>
            {alternatives.map((alt, idx) => {
              const maxProb = getMaxProbability();
              const width = (alt.probability / maxProb) * 100;
              return (
                <div key={idx} style={styles.barWrapper}>
                  <div
                    style={{
                      ...styles.bar,
                      width: `${width}%`,
                      backgroundColor: `rgb(94, 235, 172)`,
                    }}
                  />
                  <button
                    onClick={() => selectToken(alt.token)}
                    style={styles.tokenButton}
                  >
                    <span style={styles.tokenText}>{alt.token}</span>
                    <span style={styles.probability}>
                      {Math.round(alt.probability)}%
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    padding: '24px',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0e1e 0%, #1a1832 100%)',
    color: '#fff',
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    fontSize: '14px',
    fontWeight: '600',
    letterSpacing: '2px',
    color: '#5eebac',
    marginBottom: '8px',
  },
  title: {
    display: 'inline-block',
  },
  input: {
    flex: 1,
    padding: '16px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontFamily: 'inherit',
    minHeight: '200px',
    resize: 'none',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  sendButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #5eebac 0%, #4dd9a0 100%)',
    color: '#0f0e1e',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
    letterSpacing: '0.5px',
  },
  toggleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '8px',
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: '#aaa',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#5eebac',
  },
  toggleText: {
    letterSpacing: '1px',
  },
  machineLabel: {
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '2px',
    color: '#888',
    marginBottom: '8px',
  },
  outputBox: {
    flex: 1,
    padding: '20px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    minHeight: '200px',
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#fff',
    wordWrap: 'break-word',
    overflow: 'auto',
  },
  outputText: {
    display: 'inline',
  },
  cursor: {
    animation: 'blink 1s infinite',
    marginLeft: '2px',
    color: '#5eebac',
  },
  alternativesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '16px',
  },
  alternativesTitle: {
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '1px',
    color: '#888',
    margin: '0 0 12px 0',
  },
  barWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  bar: {
    height: '4px',
    borderRadius: '2px',
    background: 'rgba(94, 235, 172, 0.3)',
    minWidth: '40px',
    transition: 'width 0.2s ease',
  },
  tokenButton: {
    flex: 1,
    padding: '8px 12px',
    background: 'rgba(94, 235, 172, 0.1)',
    border: '1px solid rgba(94, 235, 172, 0.2)',
    borderRadius: '4px',
    color: '#5eebac',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenText: {
    flex: 1,
    textAlign: 'left',
  },
  probability: {
    fontSize: '12px',
    color: '#888',
    marginLeft: '8px',
  },
};

// Add blinking cursor animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes blink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
`;
document.head.appendChild(styleSheet);