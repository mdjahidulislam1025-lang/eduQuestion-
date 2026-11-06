import React, { useState } from 'react';
import { Sparkles, Eye, Code, Image as ImageIcon, Check, Loader2 } from 'lucide-react';

interface DiagramEditorProps {
  onInsertSvg: (svg: string, caption?: string) => void;
  onClose: () => void;
  initialSvg?: string;
  initialCaption?: string;
  currentSubject?: string;
  currentClass?: string;
}

const PRESET_DIAGRAMS: { name: string; category: string; svg: string }[] = [
  {
    name: 'Electric Circuit (Series & Parallel)',
    category: 'Physics',
    svg: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#ffffff" />
  <!-- Battery -->
  <line x1="50" y1="110" x2="100" y2="110" stroke="#1e293b" stroke-width="2.5" />
  <line x1="100" y1="90" x2="100" y2="130" stroke="#1e293b" stroke-width="3" />
  <line x1="110" y1="100" x2="110" y2="120" stroke="#1e293b" stroke-width="4" />
  <text x="100" y="80" font-size="12" font-family="sans-serif" text-anchor="middle" fill="#0f172a">V = 12V</text>
  <!-- Wire Top -->
  <line x1="110" y1="110" x2="180" y2="110" stroke="#1e293b" stroke-width="2.5" />
  <!-- Resistor 1 Parallel -->
  <line x1="180" y1="60" x2="180" y2="160" stroke="#1e293b" stroke-width="2.5" />
  <line x1="180" y1="60" x2="220" y2="60" stroke="#1e293b" stroke-width="2.5" />
  <rect x="220" y="50" width="60" height="20" fill="#f1f5f9" stroke="#1e293b" stroke-width="2" />
  <text x="250" y="64" font-size="11" font-family="sans-serif" text-anchor="middle" fill="#0f172a">R₁ = 6Ω</text>
  <line x1="280" y1="60" x2="320" y2="60" stroke="#1e293b" stroke-width="2.5" />
  <!-- Resistor 2 Parallel -->
  <line x1="180" y1="160" x2="220" y2="160" stroke="#1e293b" stroke-width="2.5" />
  <rect x="220" y="150" width="60" height="20" fill="#f1f5f9" stroke="#1e293b" stroke-width="2" />
  <text x="250" y="164" font-size="11" font-family="sans-serif" text-anchor="middle" fill="#0f172a">R₂ = 3Ω</text>
  <line x1="280" y1="160" x2="320" y2="160" stroke="#1e293b" stroke-width="2.5" />
  <!-- Right Junction -->
  <line x1="320" y1="60" x2="320" y2="160" stroke="#1e293b" stroke-width="2.5" />
  <line x1="320" y1="110" x2="360" y2="110" stroke="#1e293b" stroke-width="2.5" />
  <line x1="360" y1="110" x2="360" y2="190" stroke="#1e293b" stroke-width="2.5" />
  <line x1="360" y1="190" x2="50" y2="190" stroke="#1e293b" stroke-width="2.5" />
  <line x1="50" y1="190" x2="50" y2="110" stroke="#1e293b" stroke-width="2.5" />
  <!-- Ammeter Symbol -->
  <circle cx="340" cy="110" r="12" fill="#ffffff" stroke="#1e293b" stroke-width="2" />
  <text x="340" y="114" font-size="12" font-weight="bold" font-family="sans-serif" text-anchor="middle" fill="#0f172a">A</text>
</svg>`,
  },
  {
    name: 'Right Angle Triangle with Altitude',
    category: 'Math',
    svg: `<svg viewBox="0 0 350 250" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#ffffff" />
  <!-- Triangle ABC -->
  <polygon points="50,200 300,200 50,50" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
  <!-- Right angle mark at A (50, 200) -->
  <rect x="50" y="180" width="20" height="20" fill="none" stroke="#1e293b" stroke-width="1.5" />
  <!-- Altitude AD to hypotenuse BC -->
  <!-- Projected foot is approx (112, 163) -->
  <line x1="50" y1="200" x2="115" y2="161" stroke="#2563eb" stroke-dasharray="4,4" stroke-width="2" />
  <!-- Labels -->
  <text x="35" y="215" font-size="14" font-weight="bold" font-family="sans-serif" fill="#0f172a">B</text>
  <text x="310" y="210" font-size="14" font-weight="bold" font-family="sans-serif" fill="#0f172a">C</text>
  <text x="40" y="45" font-size="14" font-weight="bold" font-family="sans-serif" fill="#0f172a">A</text>
  <text x="120" y="150" font-size="13" font-weight="bold" font-family="sans-serif" fill="#2563eb">D</text>
  <text x="170" y="220" font-size="12" font-family="sans-serif" fill="#64748b">BC = a</text>
  <text x="25" y="130" font-size="12" font-family="sans-serif" fill="#64748b">AB = c</text>
  <text x="180" y="115" font-size="12" font-family="sans-serif" fill="#64748b">AC = b</text>
</svg>`,
  },
  {
    name: 'Cartesian Coordinate Plane (x, y axes)',
    category: 'Higher Math',
    svg: `<svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#ffffff" />
  <!-- Grid -->
  <defs>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="320" height="320" fill="url(#grid)" />
  <!-- Axes -->
  <line x1="20" y1="160" x2="300" y2="160" stroke="#0f172a" stroke-width="2" marker-end="url(#arrow)" />
  <line x1="160" y1="300" x2="160" y2="20" stroke="#0f172a" stroke-width="2" />
  <!-- Arrow heads -->
  <polygon points="300,160 290,155 290,165" fill="#0f172a" />
  <polygon points="160,20 155,30 165,30" fill="#0f172a" />
  <!-- Labels -->
  <text x="305" y="165" font-size="13" font-weight="bold" font-family="sans-serif">X</text>
  <text x="10" y="165" font-size="13" font-weight="bold" font-family="sans-serif">X'</text>
  <text x="165" y="15" font-size="13" font-weight="bold" font-family="sans-serif">Y</text>
  <text x="165" y="315" font-size="13" font-weight="bold" font-family="sans-serif">Y'</text>
  <text x="148" y="175" font-size="12" font-family="sans-serif" fill="#64748b">O</text>
  <!-- Line AB: y = 0.5x + 20 -->
  <line x1="60" y1="210" x2="260" y2="110" stroke="#2563eb" stroke-width="2.5" />
  <circle cx="100" cy="190" r="4" fill="#ef4444" />
  <text x="105" y="185" font-size="11" font-weight="bold" fill="#ef4444">A(-3, -1)</text>
  <circle cx="220" cy="130" r="4" fill="#ef4444" />
  <text x="225" y="125" font-size="11" font-weight="bold" fill="#ef4444">B(3, 2)</text>
</svg>`,
  },
  {
    name: 'Bohr Model of Carbon Atom (C-12)',
    category: 'Chemistry',
    svg: `<svg viewBox="0 0 320 280" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#ffffff" />
  <!-- Nucleus -->
  <circle cx="160" cy="140" r="28" fill="#fef2f2" stroke="#dc2626" stroke-width="2" />
  <text x="160" y="137" font-size="11" font-weight="bold" font-family="sans-serif" text-anchor="middle" fill="#991b1b">6p⁺</text>
  <text x="160" y="150" font-size="11" font-weight="bold" font-family="sans-serif" text-anchor="middle" fill="#475569">6n⁰</text>
  <!-- K shell (r=55) -->
  <circle cx="160" cy="140" r="60" fill="none" stroke="#94a3b8" stroke-dasharray="3,3" stroke-width="1.5" />
  <!-- K shell electrons (2) -->
  <circle cx="160" cy="80" r="5" fill="#2563eb" />
  <circle cx="160" cy="200" r="5" fill="#2563eb" />
  <!-- L shell (r=105) -->
  <circle cx="160" cy="140" r="105" fill="none" stroke="#64748b" stroke-dasharray="4,4" stroke-width="1.5" />
  <!-- L shell electrons (4) -->
  <circle cx="160" cy="35" r="5" fill="#2563eb" />
  <circle cx="265" cy="140" r="5" fill="#2563eb" />
  <circle cx="160" cy="245" r="5" fill="#2563eb" />
  <circle cx="55" cy="140" r="5" fill="#2563eb" />
  <text x="160" y="270" font-size="12" font-family="sans-serif" text-anchor="middle" fill="#1e293b">কার্বন ($^{12}_6C$) এর ইলেকট্রন বিন্যাস (২, ৪)</text>
</svg>`,
  },
];

export const DiagramEditor: React.FC<DiagramEditorProps> = ({
  onInsertSvg,
  onClose,
  initialSvg = '',
  initialCaption = '',
  currentSubject = 'Physics',
  currentClass = 'Class 10',
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'ai' | 'code'>('presets');
  const [svgContent, setSvgContent] = useState<string>(initialSvg || PRESET_DIAGRAMS[0].svg);
  const [caption, setCaption] = useState<string>(initialCaption);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleGenerateAiDiagram = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const response = await fetch('/api/gemini/generate-diagram-svg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          subject: currentSubject,
          classLevel: currentClass,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate diagram');
      }

      setSvgContent(data.svg);
      if (!caption) {
        setCaption(aiPrompt);
      }
      setActiveTab('code');
    } catch (err: any) {
      setGenerationError(err.message || 'Error occurred while generating SVG');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsert = () => {
    if (!svgContent.trim()) return;
    onInsertSvg(svgContent, caption);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Educational Diagram & Visual System</h3>
              <p className="text-xs text-slate-500">Insert scalable SVG diagrams into question stimulus or solution</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-4">
          <button
            onClick={() => setActiveTab('presets')}
            className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'presets'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye className="w-4 h-4" /> Academic Presets
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'ai'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" /> AI Diagram Generator
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'code'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code className="w-4 h-4" /> SVG Code Editor
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Controls */}
          <div className="space-y-4">
            {activeTab === 'presets' && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Secondary School Presets (NCTB)
                </p>
                <div className="grid grid-cols-1 gap-2.5 max-h-80 overflow-y-auto pr-1">
                  {PRESET_DIAGRAMS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSvgContent(item.svg);
                        setCaption(item.name);
                      }}
                      className="p-3 text-left border rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center justify-between text-slate-700 bg-white"
                    >
                      <div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 mr-2">
                          {item.category}
                        </span>
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <span className="text-xs text-blue-600">Select</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Describe the scientific/mathematical diagram:
                  </label>
                  <textarea
                    rows={4}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. A ray diagram of an object placed between focus and center of curvature in front of a concave mirror, showing real inverted magnified image."
                    className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2 text-xs text-slate-500">
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md">Subject: {currentSubject}</span>
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md">{currentClass}</span>
                </div>

                {generationError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
                    {generationError}
                  </div>
                )}

                <button
                  onClick={handleGenerateAiDiagram}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Generating SVG Diagram...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Generate Clean Vector SVG
                    </>
                  )}
                </button>
              </div>
            )}

            {activeTab === 'code' && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">SVG Code (Vector)</label>
                <textarea
                  rows={10}
                  value={svgContent}
                  onChange={(e) => setSvgContent(e.target.value)}
                  className="w-full font-mono text-xs border border-slate-300 rounded-xl p-3 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="<svg viewBox='0 0 400 300'>...</svg>"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Diagram Caption (চিত্র পরিচিতি / Caption)
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="চিত্র ১: চল তড়িৎ বর্তনী (Circuit diagram)"
                className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Right Column: Live High-Resolution Preview */}
          <div className="flex flex-col">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Print-Ready Preview (A4 Paper Rendering)
            </p>
            <div className="flex-1 min-h-[260px] bg-white border border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
              {svgContent ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div
                    className="max-w-full max-h-[220px] flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                  />
                  {caption && (
                    <p className="text-xs text-slate-600 font-medium mt-3 italic text-center font-bangla">
                      {caption}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No diagram selected or generated yet</p>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Note: SVG vectors scale crisply without pixelation at 300 DPI for printed exam papers.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={!svgContent.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm"
          >
            <Check className="w-4 h-4" /> Insert into Question
          </button>
        </div>
      </div>
    </div>
  );
};
