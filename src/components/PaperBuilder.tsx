import React, { useState } from 'react';
import { QuestionPaper, PaperSection, Question } from '../types';
import { QuestionCard } from './QuestionCard';
import {
  Save,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Layers,
  Settings,
  Eye,
  CheckCircle,
  AlertCircle,
  FileCheck,
  Building
} from 'lucide-react';

interface PaperBuilderProps {
  paper: QuestionPaper;
  onSavePaper: (paper: QuestionPaper) => Promise<void>;
  onViewPrint: () => void;
  onOpenQuestionSelector: (sectionId: string) => void;
}

export const PaperBuilder: React.FC<PaperBuilderProps> = ({
  paper,
  onSavePaper,
  onViewPrint,
  onOpenQuestionSelector,
}) => {
  const [currentPaper, setCurrentPaper] = useState<QuestionPaper>(paper);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'sections' | 'header'>('sections');

  // Calculate live marks
  const calculatedTotalMarks = currentPaper.sections.reduce((acc, sec) => {
    return acc + sec.questions.reduce((sAcc, q) => sAcc + (Number(q.marks) || 0), 0);
  }, 0);

  const totalQuestionCount = currentPaper.sections.reduce((acc, sec) => acc + sec.questions.length, 0);

  const handleUpdateHeader = (field: keyof QuestionPaper, value: any) => {
    setCurrentPaper((prev) => ({
      ...prev,
      [field]: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAddSection = () => {
    const newSection: PaperSection = {
      id: `sec-${Date.now()}`,
      titleBn: `বিভাগ ${['ক', 'খ', 'গ', 'ঘ', 'ঙ'][currentPaper.sections.length] || currentPaper.sections.length + 1}`,
      titleEn: `Section ${currentPaper.sections.length + 1}`,
      instructions: 'যেকোনো প্রশ্নের উত্তর দাও',
      questions: [],
    };

    setCurrentPaper((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
  };

  const handleRemoveSection = (sectionId: string) => {
    setCurrentPaper((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));
  };

  const handleUpdateSection = (sectionId: string, updates: Partial<PaperSection>) => {
    setCurrentPaper((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)),
    }));
  };

  const handleMoveQuestion = (sectionId: string, qIndex: number, direction: 'up' | 'down') => {
    const sec = currentPaper.sections.find((s) => s.id === sectionId);
    if (!sec) return;

    const newIndex = direction === 'up' ? qIndex - 1 : qIndex + 1;
    if (newIndex < 0 || newIndex >= sec.questions.length) return;

    const updatedQuestions = [...sec.questions];
    const [moved] = updatedQuestions.splice(qIndex, 1);
    updatedQuestions.splice(newIndex, 0, moved);

    handleUpdateSection(sectionId, { questions: updatedQuestions });
  };

  const handleRemoveQuestion = (sectionId: string, questionId: string) => {
    const sec = currentPaper.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    handleUpdateSection(sectionId, {
      questions: sec.questions.filter((q) => q.id !== questionId),
    });
  };

  const handleUpdateQuestion = (sectionId: string, updatedQ: Question) => {
    const sec = currentPaper.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    handleUpdateSection(sectionId, {
      questions: sec.questions.map((q) => (q.id === updatedQ.id ? updatedQ : q)),
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSavePaper({
        ...currentPaper,
        totalMarks: calculatedTotalMarks || currentPaper.totalMarks,
        updatedAt: new Date().toISOString(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save paper:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Stats & Save */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{currentPaper.title}</h2>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              {currentPaper.classLevel}
            </span>
            <span>•</span>
            <span className="font-medium text-slate-700">{currentPaper.subject}</span>
            <span>•</span>
            <span className="text-blue-600 font-bold">
              Total Questions: {totalQuestionCount}
            </span>
            <span>•</span>
            <span className={`font-bold px-2 py-0.5 rounded-md ${
              calculatedTotalMarks === currentPaper.totalMarks
                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                : 'text-amber-700 bg-amber-50 border border-amber-200'
            }`}>
              Marks: {calculatedTotalMarks} / {currentPaper.totalMarks}
            </span>
            {calculatedTotalMarks !== currentPaper.totalMarks && (
              <span className="text-rose-600 font-bold flex items-center gap-1 text-[11px] animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" /> Marks mismatch (Total is {calculatedTotalMarks}, Target is {currentPaper.totalMarks})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle className="w-4 h-4" /> Saved Successfully!
            </span>
          )}

          <button
            onClick={onViewPrint}
            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold text-sm flex items-center gap-2"
          >
            <Eye className="w-4 h-4 text-slate-500" /> A4 Paper Preview
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Paper'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('sections')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'sections'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> Questions & Sections ({currentPaper.sections.length})
        </button>
        <button
          onClick={() => setActiveTab('header')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'header'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" /> Paper Header & Custom Branding
        </button>
      </div>

      {/* Header Customization Tab */}
      {activeTab === 'header' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-base">Examination Header Details</h3>
            <p className="text-xs text-slate-500">
              Customize the school name, exam title, duration, logo, and watermark for the official printed paper.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Institution Name (বাংলা/English):</label>
              <input
                type="text"
                value={currentPaper.institutionName}
                onChange={(e) => handleUpdateHeader('institutionName', e.target.value)}
                placeholder="যেমন: মতিঝিল আইডিয়াল স্কুল অ্যান্ড কলেজ / রাজউক উত্তরা মডেল কলেজ"
                className="w-full text-sm border border-slate-300 rounded-xl p-2.5 font-bangla focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SSC Exam Level / Category:</label>
              <select
                value={currentPaper.classLevel}
                onChange={(e) => handleUpdateHeader('classLevel', e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-xl p-2.5 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="SSC">এসএসসি (SSC Examination - All Boards)</option>
                <option value="Class 10">১০ম শ্রেণি / নির্বাচনী পরীক্ষা (Class 10 - Test Exam)</option>
                <option value="Class 9">৯ম শ্রেণি বার্ষিক (Class 9 - Foundation)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Institution Address / Location:</label>
              <input
                type="text"
                value={currentPaper.institutionAddress || ''}
                onChange={(e) => handleUpdateHeader('institutionAddress', e.target.value)}
                placeholder="মতিঝিল, ঢাকা-১০০০"
                className="w-full text-sm border border-slate-300 rounded-xl p-2.5 font-bangla focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Examination Title (পরীক্ষার নাম):</label>
              <input
                type="text"
                value={currentPaper.title}
                onChange={(e) => handleUpdateHeader('title', e.target.value)}
                placeholder="এসএসসি নির্বাচনী পরীক্ষা ২০২৬ / এসএসসি মডেল টেস্ট"
                className="w-full text-sm border border-slate-300 rounded-xl p-2.5 font-bangla focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Subject Code:</label>
              <input
                type="text"
                value={currentPaper.subjectCode || ''}
                onChange={(e) => handleUpdateHeader('subjectCode', e.target.value)}
                placeholder="136"
                className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Duration (সময়):</label>
              <input
                type="text"
                value={currentPaper.duration}
                onChange={(e) => handleUpdateHeader('duration', e.target.value)}
                placeholder="২ ঘণ্টা ৩০ মিনিট"
                className="w-full text-sm border border-slate-300 rounded-xl p-2.5 font-bangla focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Total Marks (পূর্ণমান):</label>
              <input
                type="number"
                value={currentPaper.totalMarks}
                onChange={(e) => handleUpdateHeader('totalMarks', Number(e.target.value))}
                className="w-full text-sm border border-slate-300 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Exam Date (তারিখ):</label>
              <input
                type="text"
                value={currentPaper.examDate || ''}
                onChange={(e) => handleUpdateHeader('examDate', e.target.value)}
                placeholder="০৫/১১/২০২৬"
                className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Watermark Text:</label>
              <input
                type="text"
                value={currentPaper.watermarkText || ''}
                onChange={(e) => handleUpdateHeader('watermarkText', e.target.value)}
                placeholder="e.g. IDEAL SCHOOL OR CONFIDENTIAL"
                className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Watermark Opacity: {Math.round((currentPaper.watermarkOpacity ?? 0.08) * 100)}%
            </label>
            <input
              type="range"
              min="0.02"
              max="0.25"
              step="0.01"
              value={currentPaper.watermarkOpacity ?? 0.08}
              onChange={(e) => handleUpdateHeader('watermarkOpacity', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              General Examination Instructions:
            </label>
            <textarea
              rows={3}
              value={currentPaper.instructions.join('\n')}
              onChange={(e) =>
                handleUpdateHeader(
                  'instructions',
                  e.target.value.split('\n').filter((l) => l.trim().length > 0)
                )
              }
              placeholder="১. ডান পাশের সংখ্যা প্রশ্নের পূর্ণমান নির্দেশক।&#10;২. প্রতিটি বিভাগ থেকে অন্তত ২টি করে মোট ৭টি প্রশ্নের উত্তর দাও।"
              className="w-full text-sm border border-slate-300 rounded-xl p-2.5 font-bangla focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Sections and Questions Tab */}
      {activeTab === 'sections' && (
        <div className="space-y-6">
          {currentPaper.sections.map((section, sIdx) => {
            const secMarks = section.questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

            return (
              <div
                key={section.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Section Header Controls */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                      {sIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={section.titleBn}
                      onChange={(e) => handleUpdateSection(section.id, { titleBn: e.target.value })}
                      placeholder="ক-বিভাগ: সৃজনশীল প্রশ্ন"
                      className="font-bold text-slate-800 text-base border-b border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent px-1 focus:outline-none font-bangla"
                    />
                    <input
                      type="text"
                      value={section.instructions}
                      onChange={(e) => handleUpdateSection(section.id, { instructions: e.target.value })}
                      placeholder="যেকোনো ৭টি প্রশ্নের উত্তর দাও"
                      className="text-xs text-slate-500 italic border-b border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent px-1 focus:outline-none flex-1 max-w-sm font-bangla"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-lg">
                      Section Marks: {secMarks} ({section.questions.length} Questions)
                    </span>

                    <button
                      onClick={() => onOpenQuestionSelector(section.id)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Pick Questions
                    </button>

                    {currentPaper.sections.length > 1 && (
                      <button
                        onClick={() => handleRemoveSection(section.id)}
                        title="Delete Section"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section Question List */}
                <div className="p-6 space-y-4">
                  {section.questions.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                      <p className="text-sm text-slate-500 mb-3">No questions in this section yet.</p>
                      <button
                        onClick={() => onOpenQuestionSelector(section.id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <Plus className="w-4 h-4" /> Add Questions from Bank / Archive
                      </button>
                    </div>
                  ) : (
                    section.questions.map((q, qIdx) => (
                      <div key={q.id} className="flex items-start gap-3">
                        {/* Reorder Buttons */}
                        <div className="flex flex-col gap-1 pt-3 shrink-0">
                          <button
                            onClick={() => handleMoveQuestion(section.id, qIdx, 'up')}
                            disabled={qIdx === 0}
                            title="Move Up"
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-600"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveQuestion(section.id, qIdx, 'down')}
                            disabled={qIdx === section.questions.length - 1}
                            title="Move Down"
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-600"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Question Card */}
                        <div className="flex-1">
                          <QuestionCard
                            question={q}
                            index={qIdx}
                            onUpdate={(updated) => handleUpdateQuestion(section.id, updated)}
                            onDelete={() => handleRemoveQuestion(section.id, q.id)}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Section Button */}
          <div className="flex justify-center pt-2">
            <button
              onClick={handleAddSection}
              className="px-5 py-2.5 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl text-slate-600 hover:text-blue-600 text-sm font-semibold flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Add New Examination Section
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
