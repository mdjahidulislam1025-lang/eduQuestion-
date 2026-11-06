import React, { useState } from 'react';
import { Workspace, QuestionPaper } from '../types';
import {
  Palette,
  Image as ImageIcon,
  Sliders,
  Type,
  Layout,
  Save,
  CheckCircle,
  Eye,
  RefreshCw,
  Sparkles,
  Building
} from 'lucide-react';

interface BrandingStudioViewProps {
  workspace: Workspace;
  onUpdateBranding: (brandingUpdates: Partial<Workspace>) => void;
  isBangla?: boolean;
}

export const BrandingStudioView: React.FC<BrandingStudioViewProps> = ({
  workspace,
  onUpdateBranding,
  isBangla = false,
}) => {
  const [institutionName, setInstitutionName] = useState(workspace.institutionName || 'মতিঝিল আইডিয়াল স্কুল অ্যান্ড কলেজ');
  const [institutionAddress, setInstitutionAddress] = useState(workspace.institutionAddress || 'মতিঝিল, ঢাকা-১০০০');
  const [logoUrl, setLogoUrl] = useState(workspace.logoUrl || '');
  const [watermarkText, setWatermarkText] = useState(workspace.watermarkText || 'IDEAL SCHOOL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(workspace.watermarkOpacity ?? 0.08);
  const [watermarkPosition, setWatermarkPosition] = useState<'center' | 'diagonal'>(workspace.watermarkPosition || 'diagonal');
  const [headerAlignment, setHeaderAlignment] = useState<'center' | 'left' | 'dual'>(workspace.headerAlignment || 'center');
  const [fontChoice, setFontChoice] = useState<'bangla-modern' | 'bangla-serif' | 'english'>(workspace.fontChoice || 'bangla-serif');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    onUpdateBranding({
      institutionName,
      institutionAddress,
      logoUrl,
      watermarkText,
      watermarkOpacity,
      watermarkPosition,
      headerAlignment,
      fontChoice,
      updatedAt: new Date().toISOString(),
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-600" />
            {isBangla ? 'ব্র্যান্ডিং স্টুডিও ও পরীক্ষার টেমপ্লেট' : 'Branding Studio & Examination Templates'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isBangla
              ? 'ব্যক্তিগত লোগো, ওয়াটারমার্ক অপাসিটি, হেডার এলাইনমেন্ট এবং পরীক্ষার অফিশিয়াল A4 প্রিন্ট স্টাইল কনফিগার করুন'
              : 'Customize personal logo, watermark positioning, header alignments, and typography for printed A4 question papers'}
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
        >
          <Save className="w-4 h-4" />
          {savedSuccess
            ? isBangla ? 'সংরক্ষিত হয়েছে!' : 'Branding Saved!'
            : isBangla ? 'ব্র্যান্ডিং সংরক্ষণ করুন' : 'Save Branding Template'}
        </button>
      </div>

      {/* Grid: Editor Controls & Live A4 Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Branding Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Institutional Identifiers */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building className="w-4 h-4 text-blue-600" />
              {isBangla ? 'প্রতিষ্ঠান ও হেডার পরিচিতি' : 'Institutional Identification'}
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'প্রতিষ্ঠানের নাম (বাংলা/ইংরেজি):' : 'Institution Name:'}
              </label>
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="মতিঝিল আইডিয়াল স্কুল অ্যান্ড কলেজ"
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 font-bangla focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'ঠিকানা / শাখা:' : 'Address / Branch:'}
              </label>
              <input
                type="text"
                value={institutionAddress}
                onChange={(e) => setInstitutionAddress(e.target.value)}
                placeholder="মতিঝিল, ঢাকা-১০০০"
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 font-bangla focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'লোগো ইমেজ লিঙ্ক (URL):' : 'Logo Image URL:'}
              </label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Watermark Studio */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
              <Sliders className="w-4 h-4 text-purple-600" />
              {isBangla ? 'ওয়াটারমার্ক কাস্টমাইজেশন' : 'Security Watermark Customization'}
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'ওয়াটারমার্ক টেক্সট:' : 'Watermark Text:'}
              </label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="IDEAL SCHOOL OR CONFIDENTIAL"
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 uppercase font-mono tracking-wider focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>{isBangla ? 'অপাসিটি (ঘনত্ব):' : 'Watermark Opacity:'}</span>
                <span className="text-indigo-600">{Math.round(watermarkOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.25"
                step="0.01"
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Subtle (2%)</span>
                <span>Balanced (8%)</span>
                <span>Prominent (25%)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'ওয়াটারমার্ক অবস্থান:' : 'Watermark Alignment:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWatermarkPosition('diagonal')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold ${
                    watermarkPosition === 'diagonal'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Diagonal (-30°)
                </button>
                <button
                  type="button"
                  onClick={() => setWatermarkPosition('center')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold ${
                    watermarkPosition === 'center'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Horizontal Center
                </button>
              </div>
            </div>
          </div>

          {/* Typography & Header Layout */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
              <Type className="w-4 h-4 text-emerald-600" />
              {isBangla ? 'টাইপোগ্রাফি ও লেআউট' : 'Typography & Header Layout'}
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'ফন্ট স্টাইল:' : 'Font Style:'}
              </label>
              <select
                value={fontChoice}
                onChange={(e) => setFontChoice(e.target.value as any)}
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white font-medium text-slate-800"
              >
                <option value="bangla-serif">Noto Serif Bengali (Academic Board Style)</option>
                <option value="bangla-modern">Hind Siliguri (Modern Clean Sans)</option>
                <option value="english">Inter / English Standard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'হেডার অ্যালাইনমেন্ট:' : 'Header Alignment:'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['center', 'left', 'dual'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setHeaderAlignment(mode)}
                    className={`py-2 rounded-xl border text-xs font-semibold uppercase ${
                      headerAlignment === mode
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live High-Resolution A4 Sheet Preview (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> Live A4 Sheet Preview
            </span>
            <span className="text-[11px] text-slate-400">Scale: 100% Print Simulation</span>
          </div>

          <div
            className={`w-full max-w-[500px] min-h-[660px] bg-white border border-slate-300 rounded-xl shadow-xl p-8 relative overflow-hidden transition-all ${
              fontChoice === 'bangla-serif'
                ? 'font-serif-bangla'
                : fontChoice === 'bangla-modern'
                ? 'font-bangla'
                : 'font-sans'
            }`}
          >
            {/* Watermark Rendering in Preview */}
            {watermarkText && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
                style={{
                  transform: watermarkPosition === 'diagonal' ? 'rotate(-30deg)' : 'none',
                  opacity: watermarkOpacity,
                }}
              >
                <span className="text-4xl font-extrabold uppercase tracking-widest text-slate-900 text-center">
                  {watermarkText}
                </span>
              </div>
            )}

            {/* Paper Header */}
            <div className={`relative z-10 border-b-2 border-slate-900 pb-3 mb-4 ${
              headerAlignment === 'left' ? 'text-left' : 'text-center'
            }`}>
              {logoUrl && (
                <div className={`mb-2 flex ${headerAlignment === 'left' ? 'justify-start' : 'justify-center'}`}>
                  <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
                </div>
              )}
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                {institutionName}
              </h1>
              {institutionAddress && (
                <p className="text-[10px] text-slate-600 mt-0.5">{institutionAddress}</p>
              )}
              <h2 className="text-xs font-bold text-slate-800 mt-1.5">
                নির্বাচনী পরীক্ষা ২০২৬ • পদার্থবিজ্ঞান
              </h2>
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-800 border-t border-slate-200 mt-2 pt-1">
                <span>সময়: ২ ঘণ্টা ৩০ মিনিট</span>
                <span>শ্রেণি: দশম (SSC)</span>
                <span>পূর্ণমান: ৭০</span>
              </div>
            </div>

            {/* Mock Question Content */}
            <div className="relative z-10 space-y-4 text-[11px] text-slate-800 font-bangla">
              <div className="text-center font-bold border-y border-slate-300 py-0.5 text-xs">
                ক-বিভাগ: সৃজনশীল প্রশ্ন
              </div>

              <div className="space-y-1">
                <div className="p-2 bg-slate-50 border-l-2 border-slate-700 text-[10px] leading-relaxed">
                  <strong>উদ্দীপক:</strong> ৫০ কেজি ভরের একজন দৌড়বিদ স্থির অবস্থা থেকে ২ ms⁻² সুষম ত্বরণে ১০ সেকেন্ড দৌড়ালেন। এরপর তিনি একটি ৬০ মিটার উঁচু পাহাড়ে ৫ মিনিটে উঠলেন।
                </div>
                <div className="space-y-0.5 pl-2">
                  <div className="flex justify-between">
                    <span>ক. কর্মদক্ষতা কাকে বলে?</span>
                    <span className="font-bold">১</span>
                  </div>
                  <div className="flex justify-between">
                    <span>খ. চলন্ত বাস হঠাৎ ব্রেক কষলে যাত্রীরা সামনের দিকে ঝুঁকে পড়েন কেন?</span>
                    <span className="font-bold">২</span>
                  </div>
                  <div className="flex justify-between">
                    <span>গ. দৌড় শুরুর ১০ সেকেন্ড পর দৌড়বিদের গতিশক্তি নির্ণয় করো।</span>
                    <span className="font-bold">৩</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ঘ. পাহাড়ে ওঠার ক্ষেত্রে ব্যয়িত ক্ষমতা বিশ্লেষণ করো।</span>
                    <span className="font-bold">৪</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mock Footer */}
            <div className="absolute bottom-4 left-8 right-8 border-t border-slate-200 pt-2 flex justify-between text-[9px] text-slate-400">
              <span>{institutionName}</span>
              <span>পৃষ্ঠা ১</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
