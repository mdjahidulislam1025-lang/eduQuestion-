import React, { useState } from 'react';
import { UserProfile, Question, QuestionPaper, TextbookKnowledgeItem, BoardExamQuestionRecord } from '../types';
import {
  Settings,
  Shield,
  Download,
  Upload,
  Save,
  CheckCircle,
  Copy,
  Server,
  Cloud,
  Key,
  ExternalLink,
  Building,
  Image as ImageIcon
} from 'lucide-react';

interface SettingsViewProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  allQuestions: Question[];
  allPapers: QuestionPaper[];
  allTextbooks: TextbookKnowledgeItem[];
  allBoardQuestions: BoardExamQuestionRecord[];
  onRestoreBackup: (data: {
    questions?: Question[];
    papers?: QuestionPaper[];
    textbooks?: TextbookKnowledgeItem[];
    boardQuestions?: BoardExamQuestionRecord[];
  }) => void;
  onSignOut?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userProfile,
  onUpdateProfile,
  allQuestions,
  allPapers,
  allTextbooks,
  allBoardQuestions,
  onRestoreBackup,
  onSignOut,
}) => {
  const [profileDraft, setProfileDraft] = useState<UserProfile>(userProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setProfileDraft(userProfile);
  }, [userProfile]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await Promise.resolve(onUpdateProfile(profileDraft));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadFullBackup = () => {
    const backupPackage = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userProfile: profileDraft,
      questions: allQuestions,
      papers: allPapers,
      textbooks: allTextbooks,
      boardQuestions: allBoardQuestions,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupPackage, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `EduQuestionAI_Complete_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.questions || parsed.papers || parsed.textbooks || parsed.boardQuestions) {
          onRestoreBackup(parsed);
          setRestoreMessage(`Successfully restored ${parsed.questions?.length || 0} questions and ${parsed.papers?.length || 0} examination papers!`);
          setTimeout(() => setRestoreMessage(null), 5000);
        } else {
          setRestoreMessage('Invalid backup JSON format. Please verify file structure.');
        }
      } catch (err) {
        setRestoreMessage('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Account, Branding & System Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure examination paper defaults, institutional watermark, Vercel deployment, and cloud backup
          </p>
        </div>

        {onSignOut && (
          <button
            onClick={onSignOut}
            className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors"
          >
            Sign Out of Account
          </button>
        )}
      </div>

      {/* Institutional Branding Settings */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" /> Default Institutional Header & Watermark Branding
            </h3>
            <p className="text-xs text-slate-500">
              These details will automatically populate all new examination papers generated in the app
            </p>
          </div>

          {isSaved && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-xl">
              <CheckCircle className="w-4 h-4" /> Preferences Saved!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Default Institution Name (প্রতিষ্ঠানের নাম):
            </label>
            <input
              type="text"
              value={profileDraft.institutionName || ''}
              onChange={(e) => setProfileDraft({ ...profileDraft, institutionName: e.target.value })}
              placeholder="e.g. মতিঝিল আইডিয়াল স্কুল অ্যান্ড কলেজ / Ideal School & College"
              className="w-full text-sm border border-slate-300 rounded-xl p-2.5 font-bangla focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Institution Address / City:
            </label>
            <input
              type="text"
              value={profileDraft.institutionAddress || ''}
              onChange={(e) => setProfileDraft({ ...profileDraft, institutionAddress: e.target.value })}
              placeholder="e.g. মতিঝিল, ঢাকা-১০০০"
              className="w-full text-sm border border-slate-300 rounded-xl p-2.5 font-bangla focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Institution Logo Image URL:
            </label>
            <input
              type="text"
              value={profileDraft.logoUrl || ''}
              onChange={(e) => setProfileDraft({ ...profileDraft, logoUrl: e.target.value })}
              placeholder="https://example.com/school-crest-logo.png"
              className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Default Watermark Text:
            </label>
            <input
              type="text"
              value={profileDraft.watermarkText || ''}
              onChange={(e) => setProfileDraft({ ...profileDraft, watermarkText: e.target.value })}
              placeholder="e.g. IDEAL SCHOOL OR CONFIDENTIAL"
              className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Default Watermark Opacity ({Math.round((profileDraft.watermarkOpacity ?? 0.08) * 100)}%):
          </label>
          <input
            type="range"
            min="0.02"
            max="0.25"
            step="0.01"
            value={profileDraft.watermarkOpacity ?? 0.08}
            onChange={(e) => setProfileDraft({ ...profileDraft, watermarkOpacity: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" /> {isSaving ? 'Saving to Cloud & Device...' : 'Save Branding Preferences'}
          </button>
        </div>
      </div>

      {/* Cloud Backup & Data Portability */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <Cloud className="w-4 h-4 text-emerald-600" /> Backup, Export & Restore
          </h3>
          <p className="text-xs text-slate-500">
            Export a complete JSON backup of all questions, exam papers, textbooks, and board archives for offline safety.
          </p>
        </div>

        {restoreMessage && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{restoreMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="font-bold text-xs text-slate-700 uppercase tracking-wider">
              Download Full Backup Package
            </div>
            <p className="text-xs text-slate-500">
              Contains {allQuestions.length} questions, {allPapers.length} papers, and {allTextbooks.length} textbook records.
            </p>
            <button
              onClick={handleDownloadFullBackup}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" /> Download Complete JSON Archive
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="font-bold text-xs text-slate-700 uppercase tracking-wider">
              Restore from Backup File
            </div>
            <p className="text-xs text-slate-500">
              Select an EduQuestion AI JSON backup file to restore your entire database.
            </p>
            <label className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors">
              <Upload className="w-4 h-4 text-blue-600" /> Choose Backup File to Restore
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Vercel Deployment & Production Architecture Guide */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-600" /> Vercel Deployment & Environment Configuration Guide
          </h3>
          <p className="text-xs text-slate-500">
            Everything needed to deploy this application to Vercel or any cloud hosting provider
          </p>
        </div>

        <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
          <p>
            This application is engineered with a modular full-stack architecture. For <strong>Vercel deployment</strong>:
          </p>

          <div className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono space-y-2 overflow-x-auto text-[11px]">
            <p className="text-cyan-400 font-bold"># Required Environment Variables in Vercel Project Settings:</p>
            <p>GEMINI_API_KEY="your-google-gemini-api-key"</p>
            <p>APP_URL="https://your-vercel-domain.vercel.app"</p>
            <p>NODE_ENV="production"</p>
          </div>

          <div className="space-y-1.5 pt-2">
            <p className="font-bold text-slate-800">Deployment Steps on Vercel:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Push the codebase to your GitHub/GitLab repository.</li>
              <li>Import repository into Vercel dashboard.</li>
              <li>Add <code>GEMINI_API_KEY</code> in Vercel Settings &gt; Environment Variables.</li>
              <li>Build command: <code>npm run build</code>, Output directory: <code>dist</code>.</li>
              <li>API proxy routes at <code>/api/*</code> run server-side ensuring total API key security.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
