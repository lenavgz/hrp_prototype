import React, { useState, useRef } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
    const [uiMode, setUiMode] = useState('freeflow');
    const [prompt, setPrompt] = useState('');
    const [output, setOutput] = useState('');
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');
    const [alternatives, setAlternatives] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const outputRef = useRef(null);

    const [hardwareState, setHardwareState] = useState({
        cubes_present: {
            probability: true,
            prompting: true,
            data: true,
            rlhf: true,
        },
        b1_internet: true,
        b2_temp: 0.7,
        b2_mode: 'live',
        b3_alignment: true,
        prompt_style: 'standard',
    });

    const promptStyles = ['standard', 'creative', 'business', 'casual', 'scientific', 'eli5'];
    const colors = {
        prompting: '#6ec7ff',
        data: '#ffa500',
        rlhf: '#ff6b9d',
        probability: '#5eebac',
    };

    // Handlers for Hardware
    const handlePromptStyle = (style) => {
        setHardwareState(prev => ({
            ...prev,
            prompt_style: style,
        }));
    };

    const toggleData = () => {
        setHardwareState(prev => ({
            ...prev,
            cubes_present: {
                ...prev.cubes_present,
                data: !prev.cubes_present.data,
            },
            b1_internet: prev.cubes_present.data ? false : prev.b1_internet,
        }));
    };

    const toggleInternet = () => {
        if (hardwareState.cubes_present.data) {
            setHardwareState(prev => ({
                ...prev,
                b1_internet: !prev.b1_internet,
            }));
        }
    };

    const toggleRLHF = () => {
        setHardwareState(prev => ({
            ...prev,
            cubes_present: {
                ...prev.cubes_present,
                rlhf: !prev.cubes_present.rlhf,
            },
        }));
    };

    const toggleProbability = () => {
        setHardwareState(prev => ({
            ...prev,
            cubes_present: {
                ...prev.cubes_present,
                probability: !prev.cubes_present.probability,
            },
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
            if (uiMode === 'freeflow') {
                await runAutoPlay();
            } else {
                await stepByStep(null);
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
            const response = await fetch(`${API_BASE}/auto-play`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    config: hardwareState,
                    max_tokens: 100,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error);
                setOutput('');
                setWarning('');
                return;
            }

            setOutput(data.final_text);
            setError('');
            setWarning(data.warning || '');
        } catch (error) {
            setError('Verbindungsfehler: ' + error.message);
            setOutput('');
            setWarning('');
            throw error;
        }
    };

    const stepByStep = async(currentTokenSelection) => {
        try {
            const response = await fetch(`${API_BASE}/step-by-step`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    config: hardwareState,
                    user_selected_tokens: currentTokenSelection ? [currentTokenSelection] : null,
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
        setOutput(prev => prev + token);
        await stepByStep(token);
        setLoading(false);
    };

    return ( <
        div className = "appContainer" > { /* HARDWARE CONTROL PANEL - 4 CUBES IN 1 ROW */ } <
        div className = "hardwareGrid" >

        { /* CUBE 1: PROMPTING */ } <
        div className = "cubeBox promptingCube" >
        <
        div className = "cubeTitle" > Prompting < /div> <
        div className = "promptButtonsGrid" > {
            promptStyles.map(style => ( <
                button key = { style }
                className = { `promptSelectButton ${hardwareState.prompt_style === style ? 'active' : ''}` }
                onClick = {
                    () => handlePromptStyle(style)
                }
                style = {
                    {
                        backgroundColor: hardwareState.prompt_style === style ? colors.prompting : 'rgba(110, 199, 255, 0.15)',
                        borderColor: colors.prompting,
                        color: hardwareState.prompt_style === style ? '#fff' : 'var(--color-text-primary)',
                    }
                }
                title = { style } > { style.charAt(0).toUpperCase() + style.slice(1) } <
                /button>
            ))
        } <
        /div> < /
        div >

        { /* CUBE 2: DATA */ } <
        div className = "cubeBox dataCube" >
        <
        div className = "cubeTitle" > Data Layer < /div> <
        button className = { `mainCubeButton ${hardwareState.cubes_present.data ? 'active' : ''}` }
        onClick = { toggleData }
        style = {
            {
                backgroundColor: hardwareState.cubes_present.data ? colors.data : 'rgba(255, 165, 0, 0.15)',
                borderColor: colors.data,
                color: hardwareState.cubes_present.data ? '#000' : 'var(--color-text-primary)',
            }
        } >
        <
        div className = "cubeLabelLarge" > Data Storage < /div> <
        div className = "cubeStatus" > { hardwareState.cubes_present.data ? '✓' : '✗' } < /div> < /
        button >

        <
        button className = { `internetSubButton ${hardwareState.b1_internet ? 'active' : ''} ${!hardwareState.cubes_present.data ? 'disabled' : ''}` }
        onClick = { toggleInternet }
        disabled = {!hardwareState.cubes_present.data }
        style = {
            {
                backgroundColor: hardwareState.b1_internet ? colors.prompting : 'rgba(110, 199, 255, 0.15)',
                borderColor: colors.prompting,
                color: hardwareState.b1_internet ? '#fff' : 'var(--color-text-primary)',
            }
        }
        title = "Internet (only active when Data is on)" >
        <
        div className = "internetLabel" > Web < /div> <
        div className = "internetStatus" > { hardwareState.b1_internet ? 'ON' : 'OFF' } < /div> < /
        button > <
        /div>

        { /* CUBE 3: RLHF */ } <
        div className = "cubeBox rlhfCube" >
        <
        div className = "cubeTitle" > Alignment < /div> <
        button className = { `mainCubeButton ${hardwareState.cubes_present.rlhf ? 'active' : ''}` }
        onClick = { toggleRLHF }
        style = {
            {
                backgroundColor: hardwareState.cubes_present.rlhf ? colors.rlhf : 'rgba(255, 107, 157, 0.15)',
                borderColor: colors.rlhf,
                color: hardwareState.cubes_present.rlhf ? '#fff' : 'var(--color-text-primary)',
            }
        } >
        <
        div className = "cubeLabelLarge" > RLHF Tuning < /div> <
        div className = "cubeStatus" > { hardwareState.cubes_present.rlhf ? '✓' : '✗' } < /div> < /
        button > <
        /div>

        { /* CUBE 4: PROBABILITY */ } <
        div className = "cubeBox probabilityCube" >
        <
        div className = "cubeTitle" > Sampling Engine < /div> <
        button className = { `mainCubeButton ${hardwareState.cubes_present.probability ? 'active' : ''}` }
        onClick = { toggleProbability }
        style = {
            {
                backgroundColor: hardwareState.cubes_present.probability ? colors.probability : 'rgba(94, 235, 172, 0.15)',
                borderColor: colors.probability,
                color: hardwareState.cubes_present.probability ? '#000' : 'var(--color-text-primary)',
            }
        } >
        <
        div className = "cubeLabelLarge" > Probability < /div> <
        div className = "cubeStatus" > { hardwareState.cubes_present.probability ? '✓' : '✗' } < /div> < /
        button > <
        /div> < /
        div >

        { /* MAIN CONTENT AREA */ } <
        div className = "mainContent" > { /* LEFT PANEL */ } <
        div className = "leftPanel" >
        <
        div className = "machineLabel" > User Configuration Input < /div> <
        textarea className = "promptInput"
        value = { prompt }
        onChange = {
            (e) => setPrompt(e.target.value)
        }
        onKeyDown = {
            (e) => {
                if (e.key === 'Enter' && e.ctrlKey) handleSend();
            }
        }
        placeholder = "Enter your prompt here..." /
        >

        <
        div className = "modeToggle" >
        <
        button className = { `modeButton ${uiMode === 'freeflow' ? 'active' : ''}` }
        onClick = {
            () => setUiMode('freeflow')
        } >
        Freeflow <
        /button> <
        button className = { `modeButton ${uiMode === 'wordbyword' ? 'active' : ''}` }
        onClick = {
            () => setUiMode('wordbyword')
        } >
        Word by Word <
        /button> < /
        div >

        <
        button className = "sendButton"
        onClick = { handleSend }
        disabled = { loading || !prompt.trim() } > { loading ? 'Generating...' : 'Send Instruction' } <
        /button> < /
        div >

        { /* RIGHT PANEL */ } <
        div className = "rightPanel" >
        <
        div className = "machineLabel" > System Output Console < /div>

        {
            error && ( <
                div className = "errorBox" >
                <
                span className = "errorIcon" > ⚠️ < /span> <
                span > { error } < /span> < /
                div >
            )
        }

        {
            warning && !error && ( <
                div className = "warningBox" >
                <
                span className = "warningIcon" > ⚠️ < /span> <
                span > { warning } < /span> < /
                div >
            )
        }

        {
            !error && ( <
                >
                <
                div className = "outputBox"
                ref = { outputRef } >
                <
                span className = "outputText" > { output } < /span> {
                isGenerating && < span className = "cursor" > ▌ < /span>} < /
                div >

                {
                    uiMode === 'wordbyword' && alternatives.length > 0 && ( <
                        div className = "alternativesBox" >
                        <
                        div className = "alternativesLabel" > Next Token Probabilities: < /div> <
                        div className = "tokenButtons" > {
                            alternatives.map((alt, idx) => {
                                // 1. Suche flexibel nach dem richtigen Feldnamen vom Backend
                                const rawValue = alt.logprob !== undefined ? alt.logprob :
                                    alt.probability !== undefined ? alt.probability :
                                    alt.prob !== undefined ? alt.prob :
                                    alt.percentage;

                                const numericValue = parseFloat(rawValue);
                                let percentage = 0;

                                if (!isNaN(numericValue)) {
                                    // Falls es ein negativer Log-Wert ist (z.B. -0.15) -> umrechnen mit e^x * 100
                                    if (numericValue <= 0 && alt.logprob !== undefined) {
                                        percentage = Math.exp(numericValue) * 100;
                                    }
                                    // Falls es eine Dezimalwahrscheinlichkeit ist (z.B. 0.85) -> * 100
                                    else if (numericValue > 0 && numericValue <= 1) {
                                        percentage = numericValue * 100;
                                    }
                                    // Falls es bereits ein fertiger Prozentwert ist (z.B. 85.5)
                                    else {
                                        percentage = numericValue;
                                    }
                                }

                                return ( <
                                    button key = { idx }
                                    className = "tokenButton"
                                    onClick = {
                                        () => handleTokenSelect(alt.token)
                                    }
                                    disabled = { loading } >
                                    <
                                    span > { alt.token } < /span> <
                                    span style = {
                                        { opacity: 0.6, fontSize: '11px', marginTop: '4px' }
                                    } > { isNaN(numericValue) ? '0.0' : percentage.toFixed(1) } %
                                    <
                                    /span> < /
                                    button >
                                );
                            })
                        } <
                        /div> < /
                        div >
                    )
                } <
                />
            )
        } <
        /div> < /
        div > <
        /div>
    );
}