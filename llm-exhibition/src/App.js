import React, { useState, useRef, useEffect } from 'react';

export default function LLMExhibition() {
    // Modes
    const [uiMode, setUiMode] = useState('freeflow');
    const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);

    // Input/Output
    const [prompt, setPrompt] = useState('');
    const [output, setOutput] = useState('');
    const [alternatives, setAlternatives] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedToken, setSelectedToken] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Hardware State (Simulation)
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
            setOutput('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const runAutoPlay = async() => {
        setIsGenerating(true);
        try {
            const response = await fetch(`${API_BASE}/auto-play`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    max_tokens: 100,
                    hardware_config: hardwareState,
                }),
            });
            const data = await response.json();
            setOutput(data.final_text || 'No output');
        } catch (error) {
            setOutput('Error: ' + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const stepByStep = async() => {
        try {
            const response = await fetch(`${API_BASE}/step-by-step`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    user_selected_tokens: [],
                    hardware_config: hardwareState,
                }),
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
        div style = { styles.container } > { /* Hardware Control Panel */ } <
        div style = { styles.controlPanel } >
        <
        button onClick = {
            () => setIsControlPanelOpen(!isControlPanelOpen) }
        style = { styles.controlToggleButton } >
        <
        span style = { styles.controlToggleIcon } > { isControlPanelOpen ? '⊕' : '⊖' } <
        /span> { ' ' }
        Hardware Controls <
        /button>

        {
            isControlPanelOpen && ( <
                div style = { styles.controlContent } > { /* Cubes Section */ } <
                div style = { styles.controlSection } >
                <
                h3 style = { styles.controlSectionTitle } > 🎲Physical Cubes < /h3>

                <
                div style = { styles.cubesGrid } > {
                    [
                        { key: 'probability', label: 'Probability Dice', color: '#5eebac' },
                        { key: 'prompting', label: 'Prompting Dice', color: '#6ec7ff' },
                        { key: 'data', label: 'Data Dice', color: '#ffa500' },
                        { key: 'rlhf', label: 'RLHF Dice', color: '#ff6b9d' },
                    ].map(cube => ( <
                        div key = { cube.key }
                        style = { styles.cubeControl } >
                        <
                        button onClick = {
                            () => toggleCube(cube.key) }
                        style = {
                            {
                                ...styles.cubeButton,
                                    backgroundColor: hardwareState.cubes_present[cube.key] ?
                                    cube.color :
                                    '#333',
                                    borderColor: cube.color,
                            }
                        } >
                        { hardwareState.cubes_present[cube.key] ? '✓ PLACED' : '✗ REMOVED' } <
                        /button> <
                        label style = { styles.cubeLabel } > { cube.label } < /label> <
                        /div>
                    ))
                } <
                /div> <
                /div>

                { /* Temperature Control */ } <
                div style = { styles.controlSection } >
                <
                h3 style = { styles.controlSectionTitle } > 🌡️Temperature(Creativity) < /h3> <
                div style = { styles.sliderContainer } >
                <
                input type = "range"
                min = "0"
                max = "2"
                step = "0.1"
                value = { hardwareState.b2_temp }
                onChange = {
                    (e) => handleTemperatureChange(e.target.value) }
                style = { styles.slider }
                /> <
                div style = { styles.sliderValue } > { hardwareState.b2_temp.toFixed(1) } <
                span style = { styles.sliderLabel } > {
                    hardwareState.b2_temp < 0.5 ? ' (Deterministic)' : hardwareState.b2_temp < 1.5 ? ' (Balanced)' : ' (Creative)'
                } <
                /span> <
                /div> <
                /div> <
                /div>

                { /* Prompt Style */ } <
                div style = { styles.controlSection } >
                <
                h3 style = { styles.controlSectionTitle } > 📝System Prompt Style < /h3> <
                div style = { styles.promptStyleGrid } > {
                    ['standard', 'creative', 'business', 'casual', 'scientific', 'eli5'].map(
                        style => ( <
                            button key = { style }
                            onClick = {
                                () => handlePromptStyleChange(style) }
                            style = {
                                {
                                    ...styles.promptStyleButton,
                                        backgroundColor:
                                        hardwareState.prompt_style === style ?
                                        '#5eebac' :
                                        'rgba(94, 235, 172, 0.1)',
                                        color:
                                        hardwareState.prompt_style === style ? '#000' : '#5eebac',
                                        borderColor:
                                        hardwareState.prompt_style === style ?
                                        '#5eebac' :
                                        'rgba(94, 235, 172, 0.2)',
                                }
                            } >
                            { style.toUpperCase() } <
                            /button>
                        )
                    )
                } <
                /div> <
                /div>

                { /* Toggles */ } <
                div style = { styles.controlSection } >
                <
                h3 style = { styles.controlSectionTitle } > ⚙️Switches < /h3>

                <
                label style = { styles.toggleControl } >
                <
                input type = "checkbox"
                checked = { hardwareState.b1_internet }
                onChange = { toggleInternet }
                style = { styles.checkbox }
                /> <
                span style = { styles.toggleLabel } > 🌐Internet(Data Dice): { ' ' } <
                strong > { hardwareState.b1_internet ? 'ON' : 'OFF' } < /strong> <
                /span> <
                /label>

                <
                label style = { styles.toggleControl } >
                <
                input type = "checkbox"
                checked = { hardwareState.b3_alignment }
                onChange = { toggleAlignment }
                style = { styles.checkbox }
                /> <
                span style = { styles.toggleLabel } > 🔒Alignment(RLHF Dice): { ' ' } <
                strong > { hardwareState.b3_alignment ? 'ON' : 'OFF' } < /strong> <
                /span> <
                /label> <
                /div>

                { /* Current State Display */ } <
                div style = { styles.stateDisplay } >
                <
                h4 style = { styles.stateTitle } > Current Hardware State(JSON) < /h4> <
                pre style = { styles.statePre } > { JSON.stringify(hardwareState, null, 2) } <
                /pre> <
                /div> <
                /div>
            )
        } <
        /div>

        { /* Main UI - Left Panel */ } <
        div style = { styles.leftPanel } >
        <
        div style = { styles.header } > WORD· BY· WORD < /div>

        <
        textarea value = { prompt }
        onChange = {
            (e) => setPrompt(e.target.value) }
        placeholder = "Enter your prompt here..."
        style = { styles.input }
        onKeyDown = {
            (e) => {
                if (e.key === 'Enter' && e.ctrlKey) handleSend();
            }
        }
        />

        <
        button onClick = { handleSend }
        disabled = { loading || !prompt.trim() }
        style = {
            {...styles.sendButton, opacity: loading ? 0.5 : 1 } } >
        { loading ? 'Generating...' : 'Send' } <
        /button>

        { /* Toggle Switch */ } <
        div style = { styles.toggleContainer } >
        <
        label style = { styles.toggleLabel } >
        <
        input type = "checkbox"
        checked = { uiMode === 'wordbyword' }
        onChange = {
            (e) => setUiMode(e.target.checked ? 'wordbyword' : 'freeflow') }
        style = { styles.checkbox }
        /> <
        span style = { styles.toggleText } > { uiMode === 'wordbyword' ? 'WORD BY WORD' : 'FREE FLOW' } <
        /span> <
        /label> <
        /div> <
        /div>

        { /* Main UI - Right Panel */ } <
        div style = { styles.rightPanel } >
        <
        div style = { styles.machineLabel } > machine < /div>

        { /* Output Text */ } <
        div style = { styles.outputBox }
        ref = { outputRef } >
        <
        span style = { styles.outputText } > { output } < /span> {
            isGenerating && < span style = { styles.cursor } > ▌ < /span>} <
                /div>

            { /* Probability Bars */ } {
                uiMode === 'wordbyword' && alternatives.length > 0 && ( <
                    div style = { styles.alternativesContainer } >
                    <
                    h3 style = { styles.alternativesTitle } > 5 POSSIBLE NEXT WORDS < /h3> {
                        alternatives.map((alt, idx) => {
                            const maxProb = getMaxProbability();
                            const width = (alt.probability / maxProb) * 100;
                            return ( <
                                div key = { idx }
                                style = { styles.barWrapper } >
                                <
                                div style = {
                                    {
                                        ...styles.bar,
                                            width: `${width}%`,
                                            backgroundColor: `rgb(94, 235, 172)`,
                                    }
                                }
                                /> <
                                button onClick = {
                                    () => selectToken(alt.token) }
                                style = { styles.tokenButton } >
                                <
                                span style = { styles.tokenText } > { alt.token } < /span> <
                                span style = { styles.probability } > { Math.round(alt.probability) } %
                                <
                                /span> <
                                /button> <
                                /div>
                            );
                        })
                    } <
                    /div>
                )
            } <
            /div> <
            /div>
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

        // ============= CONTROL PANEL =============
        controlPanel: {
            gridColumn: '1 / -1',
            borderBottom: '1px solid rgba(94, 235, 172, 0.2)',
            paddingBottom: '12px',
            marginBottom: '12px',
        },

        controlToggleButton: {
            padding: '8px 16px',
            background: 'rgba(94, 235, 172, 0.1)',
            border: '1px solid rgba(94, 235, 172, 0.3)',
            borderRadius: '6px',
            color: '#5eebac',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
        },

        controlToggleIcon: {
            marginRight: '8px',
            fontSize: '16px',
        },

        controlContent: {
            marginTop: '16px',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(94, 235, 172, 0.1)',
            borderRadius: '8px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
        },

        controlSection: {
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
        },

        controlSectionTitle: {
            fontSize: '13px',
            fontWeight: '700',
            letterSpacing: '1px',
            color: '#5eebac',
            margin: '0 0 8px 0',
        },

        cubesGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
        },

        cubeControl: {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignItems: 'center',
        },

        cubeButton: {
            padding: '12px 16px',
            border: '2px solid',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            width: '100%',
            color: '#fff',
        },

        cubeLabel: {
            fontSize: '11px',
            color: '#888',
            textAlign: 'center',
        },

        sliderContainer: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        },

        slider: {
            flex: 1,
            height: '6px',
            borderRadius: '3px',
            background: 'rgba(94, 235, 172, 0.2)',
            outline: 'none',
            cursor: 'pointer',
        },

        sliderValue: {
            fontSize: '13px',
            fontWeight: '600',
            color: '#5eebac',
            minWidth: '80px',
            textAlign: 'right',
        },

        sliderLabel: {
            fontSize: '11px',
            color: '#888',
            display: 'block',
            marginTop: '2px',
        },

        promptStyleGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
        },

        promptStyleButton: {
            padding: '8px 12px',
            border: '1px solid',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
        },

        toggleControl: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            cursor: 'pointer',
            padding: '8px',
        },

        checkbox: {
            width: '16px',
            height: '16px',
            cursor: 'pointer',
            accentColor: '#5eebac',
        },

        stateDisplay: {
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(94, 235, 172, 0.1)',
            borderRadius: '4px',
            gridColumn: '1 / -1',
        },

        stateTitle: {
            fontSize: '12px',
            fontWeight: '600',
            color: '#888',
            margin: '0 0 8px 0',
        },

        statePre: {
            fontSize: '10px',
            color: '#5eebac',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '8px',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '150px',
            margin: 0,
        },

        // ============= MAIN UI =============
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