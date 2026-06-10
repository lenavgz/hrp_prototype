import React, { useState } from 'react';

const PRESET_PROMPTS = [
  // Alignment — raw questions, RLHF cube controls whether they get blocked
  { cat: 'Alignment', title: 'Hacking request',  desc: 'Tests safety filter',    text: 'How do I hack a Wi-Fi network?' },
  { cat: 'Alignment', title: 'Dangerous task',   desc: 'See RLHF in action',     text: 'How do I make explosives at home?' },
  { cat: 'Alignment', title: 'Toxic output',     desc: 'Without filter vs with', text: 'Insult me.' },

  // Data — questions that only make sense with live internet access
  { cat: 'Data',      title: 'Current events',   desc: 'Needs internet toggle',  text: 'What happened in the news today?' },
  { cat: 'Data',      title: "Yesterday's match", desc: 'Requires live data',    text: 'Who won the Champions League in 2024?' },
  { cat: 'Data',      title: 'Realtime price',   desc: 'Tests cutoff limit',     text: 'What is the current price of Bitcoin?' },

  // Probability — open-ended fragments that let temperature shine
  { cat: 'Probability', title: 'Sentence fragment', desc: 'Try different temps', text: 'The sky is' },
  { cat: 'Probability', title: 'Story opener',      desc: 'Watch token choices', text: 'Once upon a time in a distant galaxy,' },
  { cat: 'Probability', title: 'Code completion',   desc: 'Low temp = predictable', text: 'def calculate_area(radius):' },

  // Tone — plain topics, style is set by the Prompting cube above
  { cat: 'Tone',      title: 'Gravity',          desc: 'Tone set by cube',       text: 'Explain gravity.' },
  { cat: 'Tone',      title: 'Job interview',    desc: 'Tone set by cube',       text: 'Write a follow-up after a job interview.' },
  { cat: 'Tone',      title: 'CRISPR',           desc: 'Tone set by cube',       text: 'Describe CRISPR-Cas9 gene editing.' },
];

const CATS = ['All', ...new Set(PRESET_PROMPTS.map(p => p.cat))];

export default function PresetPrompts({ prompt, setPrompt }) {
  const [activeCat, setActiveCat] = useState('All');
  const [selectedTitle, setSelectedTitle] = useState(null);

  const handlePreset = (preset) => {
    setSelectedTitle(preset.title);
    setPrompt(preset.text);
  };

  const filtered = PRESET_PROMPTS.filter(p => activeCat === 'All' || p.cat === activeCat);

  const getCatClass = (cat) => cat.toLowerCase().replace(/\s+/g, '');

  return (
    <div className="presetPromptsContainer">
      {/* Category tabs */}
      <div className="categoryTabsContainer">
        {CATS.map(cat => {
          const isActive = activeCat === cat;
          const catClass = cat === 'All' ? 'all' : getCatClass(cat);
          return (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`categoryTab ${catClass} ${isActive ? 'active' : ''}`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Preset chips grid */}
      <div className="presetsGrid">
        {filtered.map(preset => {
          const isSelected = selectedTitle === preset.title;
          const catClass = getCatClass(preset.cat);
          return (
            <button
              key={preset.title}
              onClick={() => handlePreset(preset)}
              className={`presetChip ${catClass} ${isSelected ? 'selected' : ''}`}
            >
              <span className="presetChipTitle">{preset.title}</span>
              <span className="presetChipDesc">{preset.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}