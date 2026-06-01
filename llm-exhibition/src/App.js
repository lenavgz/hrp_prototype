import React, { useState, useRef } from 'react';
import './App.css';

export default function LLMExhibition() {
    // Modes
    const [uiMode, setUiMode] = useState('freeflow');
    const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);

    // Input/Output
    const [prompt, setPrompt] = useState('');
    const [output, setOutput] = useState('');
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');
    const [alternatives, setAlternatives] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedToken, setSelectedToken] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Hardware State
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

    const outputRef = useRef(null);
    const API_BASE = 'http://localhost:5000/api';

    // ============= HARDWARE CONTROL =============
    const toggleCube = (cubeName) => {
        setHardwareState(prev => ({
            ...prev,
            cubes_present: {
                ...prev.cubes_present,
                [cubeName]: !prev.cubes_present[cubeName],
            },
        }));
    };

    const handleTemperatureChange = (value) => {
        setHardwareState(prev => ({
            ...prev,
            b2_temp: parseFloat(value),
        }));
    };

    const handlePromptStyleChange = (style) => {
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

    const toggleAlignment = () => {
        setHardwareState(prev => ({
            ...prev,
            b3_alignment: !prev.b3_alignment,
        }));
    };

    // ============= AI HANDLERS =============
    const handleSend = async() => {
        if (!prompt.trim()) return;
        setLoading(true);
        setOutput('');
        setError('');
        setWarning('');
        setSelectedToken('');
        setAlternatives([]);

        try {
            if (uiMode === 'freeflow') {
                await runAutoPlay();
            } else {
                await stepByStep();
            }
        } catch (error) {
            console.error('Error:', error);
            setError('Fehler: ' + error.message);
            setOutput('');
            setWarning('');
        } finally {
            setLoading(false);
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
            //Wenn Warning vorhanden, zeige sie
            if (data.warning) {
                setWarning(data.warning);
            } else {
                setWarning('');
            }
        } catch (error) {
            setError('Verbindungsfehler: ' + error.message);
            setOutput('');
            setWarning('');
            throw error;
        }
    };

    const stepByStep = async() => {
        try {
            const response = await fetch(`${API_BASE}/step-by-step`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    config: hardwareState,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error);
                setOutput('');
                return;
            }

            setAlternatives(data.alternatives || []);
            setError('');
        } catch (error) {
            setError('Verbindungsfehler: ' + error.message);
            setOutput('');
            throw error;
        }
    };

    const selectToken = async(token) => {
        setSelectedToken(token);
        setOutput(output + token + ' ');

        try {
            const response = await fetch(`${API_BASE}/step-by-step`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    user_selected_tokens: [token],
                    hardware_config: hardwareState,
                }),
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

    return ( <
            div className = "container" > { /* Hardware Control Panel */ } <
            div className = "controlPanel" >
            <
            button onClick = {
                () => setIsControlPanelOpen(!isControlPanelOpen)
            }
            className = "controlToggleButton" >
            <
            span className = "controlToggleIcon" > { isControlPanelOpen ? '⊕' : '⊖' } < /span> { ' ' }
            Hardware Controls <
            /button>

            {
                isControlPanelOpen && ( <
                    div className = "controlContent" > { /* Cubes Section */ } <
                    div className = "controlSection" >
                    <
                    h3 className = "controlSectionTitle" > 🎲Physical Cubes < /h3> <
                    div className = "cubesGrid" > {
                        [
                            { key: 'probability', label: 'Probability Dice', color: '#5eebac' },
                            { key: 'prompting', label: 'Prompting Dice', color: '#6ec7ff' },
                            { key: 'data', label: 'Data Dice', color: '#ffa500' },
                            { key: 'rlhf', label: 'RLHF Dice', color: '#ff6b9d' },
                        ].map(cube => ( <
                            div key = { cube.key }
                            className = "cubeControl" >
                            <
                            button onClick = {
                                () => toggleCube(cube.key)
                            }
                            className = "cubeButton"
                            style = {
                                {
                                    backgroundColor: hardwareState.cubes_present[cube.key] ?
                                        cube.color : '#333',
                                    borderColor: cube.color,
                                }
                            } > { hardwareState.cubes_present[cube.key] ? '✓ PLACED' : '✗ REMOVED' } <
                            /button> <
                            label className = "cubeLabel" > { cube.label } < /label> < /
                            div >
                        ))
                    } <
                    /div> < /
                    div >

                    { /* Temperature Control */ } <
                    div className = "controlSection" >
                    <
                    h3 className = "controlSectionTitle" > 🌡️Temperature(Creativity) < /h3> <
                    div className = "sliderContainer" >
                    <
                    input type = "range"
                    min = "0"
                    max = "2"
                    step = "0.1"
                    value = { hardwareState.b2_temp }
                    onChange = {
                        (e) => handleTemperatureChange(e.target.value)
                    }
                    className = "slider" /
                    >
                    <
                    div className = "sliderValue" > { hardwareState.b2_temp.toFixed(1) } <
                    span className = "sliderLabel" > {
                        hardwareState.b2_temp < 0.5 ?
                        ' (Deterministic)' : hardwareState.b2_temp < 1.5 ?
                            ' (Balanced)' : ' (Creative)'
                    } <
                    /span> < /
                    div > <
                    /div> < /
                    div >

                    { /* Prompt Style */ } <
                    div className = "controlSection" >
                    <
                    h3 className = "controlSectionTitle" > 📝System Prompt Style < /h3> <
                    div className = "promptStyleGrid" > {
                        ['standard', 'creative', 'business', 'casual', 'scientific', 'eli5'].map(
                            style => ( <
                                button key = { style }
                                onClick = {
                                    () => handlePromptStyleChange(style)
                                }
                                className = "promptStyleButton"
                                style = {
                                    {
                                        backgroundColor: hardwareState.prompt_style === style ?
                                            '#5eebac' : 'rgba(94, 235, 172, 0.1)',
                                        color: hardwareState.prompt_style === style ? '#000' : '#5eebac',
                                        borderColor: hardwareState.prompt_style === style ?
                                            '#5eebac' : 'rgba(94, 235, 172, 0.2)',
                                    }
                                } > { style.toUpperCase() } <
                                /button>
                            )
                        )
                    } <
                    /div> < /
                    div >

                    { /* Toggles */ } <
                    div className = "controlSection" >
                    <
                    h3 className = "controlSectionTitle" > ⚙️Switches < /h3>

                    <
                    label className = "toggleControl" >
                    <
                    input type = "checkbox"
                    checked = { hardwareState.b1_internet }
                    onChange = { toggleInternet }
                    className = "checkbox" /
                    >
                    <
                    span className = "toggleLabel" > 🌐Internet(Data Dice): { ' ' } <
                    strong > { hardwareState.b1_internet ? 'ON' : 'OFF' } < /strong> < /
                    span > <
                    /label>

                    <
                    label className = "toggleControl" >
                    <
                    input type = "checkbox"
                    checked = { hardwareState.b3_alignment }
                    onChange = { toggleAlignment }
                    className = "checkbox" /
                    >
                    <
                    span className = "toggleLabel" > 🔒Alignment(RLHF Dice): { ' ' } <
                    strong > { hardwareState.b3_alignment ? 'ON' : 'OFF' } < /strong> < /
                    span > <
                    /label> < /
                    div >

                    { /* Current State Display */ } <
                    div className = "stateDisplay" >
                    <
                    h4 className = "stateTitle" > Current Hardware State(JSON) < /h4> <
                    pre className = "statePre" > { JSON.stringify(hardwareState, null, 2) } < /pre> < /
                    div > <
                    /div>
                )
            } <
            /div>

            { /* Main UI - Left Panel */ } <
            div className = "leftPanel" >
            <
            div className = "header" > WORD· BY· WORD < /div>

            <
            textarea value = { prompt }
            onChange = {
                (e) => setPrompt(e.target.value)
            }
            placeholder = "Enter your prompt here..."
            className = "input"
            onKeyDown = {
                (e) => {
                    if (e.key === 'Enter' && e.ctrlKey) handleSend();
                }
            }
            />

            <
            button onClick = { handleSend }
            disabled = { loading || !prompt.trim() }
            className = "sendButton"
            style = {
                { opacity: loading ? 0.5 : 1 }
            } > { loading ? 'Generating...' : 'Send' } <
            /button>

            { /* Toggle Switch */ } <
            div className = "toggleContainer" >
            <
            label className = "toggleLabel" >
            <
            input type = "checkbox"
            checked = { uiMode === 'wordbyword' }
            onChange = {
                (e) => setUiMode(e.target.checked ? 'wordbyword' : 'freeflow')
            }
            className = "checkbox" /
            >
            <
            span className = "toggleText" > { uiMode === 'wordbyword' ? 'WORD BY WORD' : 'FREE FLOW' } <
            /span> < /
            label > <
            /div> < /
            div >

            { /* Main UI - Right Panel */ } <
            div className = "rightPanel" >
            <
            div className = "machineLabel" > machine < /div>

            { /* Error Message */ } {
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

            { /* Output Text */ } {
                !error && ( <
                        >
                        <
                        div className = "outputBox"
                        ref = { outputRef } >
                        <
                        span className = "outputText" > { output } < /span> {
                        isGenerating && < span className = "cursor" > ▌ < /span>} < /
                        div >

                        { /* Probability Bars */ } {
                            uiMode === 'wordbyword' && alternatives.length > 0 && ( <
                                    div className = "alternativesContainer" >
                                    <
                                    h3 className = "alternativesTitle" > 5 POSSIBLE NEXT WORDS < /h3> {
                                    alternatives.map((alt, idx) => {
                                        const maxProb = getMaxProbability();
                                        const width = (alt.probability / maxProb) * 100;
                                        return ( <
                                            div key = { idx }
                                            className = "barWrapper" >
                                            <
                                            div className = "bar"
                                            style = {
                                                {
                                                    width: `${width}%`,
                                                }
                                            }
                                            /> <
                                            button onClick = {
                                                () => selectToken(alt.token)
                                            }
                                            className = "tokenButton" >
                                            <
                                            span className = "tokenText" > { alt.token } < /span> <
                                            span className = "probability" > { Math.round(alt.probability) } % < /span> < /
                                            button > <
                                            /div>
                                        );
                                    })
                                } <
                                /div>
                        )
                    } <
                    />
            )
        } <
        /div> < /
    div >
);
}