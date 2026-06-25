import React, { useState, useRef } from 'react';
import './App.css';
import PresetPrompts from './PresetPrompts';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
    const [uiMode, setUiMode] = useState('freeflow');
    const [prompt, setPrompt] = useState('');
    const [output, setOutput] = useState('');
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');
    const [alternatives, setAlternatives] = useState([]);
    const [selectedTokens, setSelectedTokens] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const outputRef = useRef(null);

    const [hardwareState, setHardwareState] = useState({
        cubes_present: {
            prompting: true,
            probability: true,
            data: true,
            rlhf: true,
        },
        b1_internet: false,
        b2_temp: 0.7,
        b2_mode: 'live',
        b3_alignment: true,
        prompt_style: 'standard',
    });

    const promptStyles = ['standard', 'creative', 'business', 'casual', 'scientific', 'child'];

    // Handlers for Hardware
    const handlePromptStyle = (style) => {
        setHardwareState(prev => ({
            ...prev,
            prompt_style: style,
        }));
    };

    const toggleInternet = () => {
        setHardwareState(prev => ({
            ...prev,
            b1_internet: !prev.b1_internet,
        }));
    };

    // AI Handlers
    const handleSend = async() => {
        if (!prompt.trim()) return;
        setLoading(true);
        setIsGenerating(true);
        setOutput('');
        setError('');
        setWarning('');
        setAlternatives([]);

        try {
            setSelectedTokens([]);
            if (uiMode === 'freeflow') {
                await runAutoPlay();
            } else {
                await stepByStep([]);
            }
        } catch (error) {
            console.error('Error:', error);
            setError('Fehler: ' + error.message);
            setOutput('');
            setWarning('');
        } finally {
            setLoading(false);
            if (uiMode === 'freeflow') setIsGenerating(false);
        }
    };

    const runAutoPlay = async() => {
        try {
            if (hardwareState.b1_internet) {
                setOutput('Searching the internet...\n\n');
            }

            const response = await fetch(`${API_BASE}/auto-play`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    config: hardwareState,
                    max_tokens: 100,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Serverfehler beim Generieren');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;

            while (!done) {
                const { value, done: streamDone } = await reader.read();
                done = streamDone;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    setOutput(prev => prev + chunk);
                }
            }

            setError('');
            setWarning('');
        } catch (error) {
            setError('Verbindungsfehler: ' + error.message);
            setOutput('');
            setWarning('');
            throw error;
        }
    };

    const stepByStep = async(currentTokens) => {
        try {
            const response = await fetch(`${API_BASE}/step-by-step`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    config: hardwareState,
                    user_selected_tokens: currentTokens,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error);
                setOutput('');
                setWarning('');
                setIsGenerating(false);
                return;
            }

            setAlternatives(data.alternatives || []);
            setError('');
            setWarning(data.warning || '');

            if (data.finished || (data.alternatives && data.alternatives.length === 0)) {
                setIsGenerating(false);
            }
        } catch (error) {
            setError('Verbindungsfehler: ' + error.message);
            setOutput('');
            setWarning('');
            setIsGenerating(false);
            throw error;
        }
    };

    const handleTokenSelect = async(token) => {
        setLoading(true);
        const nextTokens = [...selectedTokens, token];
        setSelectedTokens(nextTokens);
        setOutput(prev => prev + token);
        await stepByStep(nextTokens);
        setLoading(false);
    };

    return (
        <div className="appContainer">
            {/* HARDWARE CONTROL PANEL - 4 CUBES IN 1 ROW */}
            <div className="hardwareGrid">
                {/* CUBE 1: PROMPTING */}
                <div className="cubeBox promptingCube">
                    <div className="cubeTitle">Output tone</div>
                    <div className="promptButtonsGrid">
                        {promptStyles.map(style => (
                            <button
                                key={style}
                                className={`promptSelectButton ${hardwareState.prompt_style === style ? 'active' : ''}`}
                                onClick={() => handlePromptStyle(style)}
                                title={style}
                            >
                                {style.charAt(0).toUpperCase() + style.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* CUBE 2: INTERNET */}
                <div className="cubeBox dataCube">
                    <div className="cubeTitle">Internet Search</div>
                    <button
                        className={`mainCubeButton internet ${hardwareState.b1_internet ? 'active' : ''}`}
                        onClick={toggleInternet}
                    >
                        <div className="cubeLabelLarge">Internet</div>
                        <div className="cubeStatus">{hardwareState.b1_internet ? 'ON' : 'OFF'}</div>
                    </button>
                </div>

            </div>

            {/* MAIN CONTENT AREA */}
            <div className="mainContent">
                <div className="leftPanel">
                    <PresetPrompts prompt={prompt} setPrompt={setPrompt} />

                    <textarea
                        className="promptInput"
                        value={prompt}
                        onChange={(e) => {
                            setPrompt(e.target.value);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) handleSend();
                        }}
                        placeholder="Select a preset from above or enter your prompt here..."
                    />

                    <div className="modeToggle">
                        <button
                            className={`modeButton ${uiMode === 'freeflow' ? 'active' : ''}`}
                            onClick={() => setUiMode('freeflow')}
                        >
                            Freeflow
                        </button>
                        <button
                            className={`modeButton ${uiMode === 'wordbyword' ? 'active' : ''}`}
                            onClick={() => setUiMode('wordbyword')}
                        >
                            Word by Word
                        </button>
                    </div>

                    <button
                        className="sendButton"
                        onClick={handleSend}
                        disabled={loading || !prompt.trim()}
                    >
                        {loading ? 'Generating...' : 'Send Instruction'}
                    </button>
                </div>

                <div className="rightPanel">
                    <div className="machineLabel">System Output Console</div>

                    {error && (
                        <div className="errorBox">
                            <span className="errorIcon">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {warning && !error && (
                        <div className="warningBox">
                            <span className="warningIcon">⚠️</span>
                            <span>{warning}</span>
                        </div>
                    )}

                    {!error && (
                        <>
                            <div className="outputBox" ref={outputRef}>
                                <span className="outputText">{output}</span>
                                {isGenerating && <span className="cursor">▌</span>}
                            </div>

                            {uiMode === 'wordbyword' && alternatives.length > 0 && (
                                <div className="alternativesBox">
                                    <div className="alternativesLabel">
                                        {loading ? 'Generating next token… Bitte warten.' : 'Next Token Probabilities:'}
                                    </div>
                                    <div className="tokenButtons" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {alternatives.map((alt, idx) => {
                                            const rawValue =
                                                alt.logprob !== undefined
                                                    ? alt.logprob
                                                    : alt.probability !== undefined
                                                    ? alt.probability
                                                    : alt.prob !== undefined
                                                    ? alt.prob
                                                    : alt.percentage;

                                            const numericValue = parseFloat(rawValue);
                                            let percentage = 0;

                                            if (!isNaN(numericValue)) {
                                                if (numericValue <= 0 && alt.logprob !== undefined) {
                                                    percentage = Math.exp(numericValue) * 100;
                                                } else if (numericValue > 0 && numericValue <= 1) {
                                                    percentage = numericValue * 100;
                                                } else {
                                                    percentage = numericValue;
                                                }
                                            }

                                            const displayPercent = isNaN(numericValue) ? 0 : percentage;

                                            return (
                                                <button
                                                    key={idx}
                                                    className="tokenButton"
                                                    onClick={() => handleTokenSelect(alt.token)}
                                                    disabled={loading}
                                                    style={{
                                                        background: `linear-gradient(90deg, rgba(110, 199, 255, 0.35) ${displayPercent}%, rgba(255, 255, 255, 0.05) ${displayPercent}%)`,
                                                        cursor: loading ? 'wait' : 'pointer',
                                                        opacity: loading ? 0.65 : 1,
                                                    }}
                                                >
                                                    <span style={{ position: 'relative', zIndex: 2 }}>{alt.token}</span>
                                                    <span className="tokenProb" style={{ position: 'relative', zIndex: 2 }}>
                                                        {displayPercent.toFixed(1)}%
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}