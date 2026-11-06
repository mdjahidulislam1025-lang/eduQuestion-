import React, { useState } from 'react';
import { Question } from '../types';
import { MathRenderer } from './MathRenderer';
import { DiagramEditor } from './DiagramEditor';
import {
  Bookmark,
  CheckCircle,
  Edit2,
  Trash2,
  Copy,
  PlusCircle,
  Sparkles,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Award,
  BookOpen,
  Check,
  X,
  FileText
} from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  index?: number;
  onUpdate?: (updated: Question) => void;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onAddToPaper?: (question: Question) => void;
  isInPaper?: boolean;
  readOnly?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  onUpdate,
  onDelete,
  onToggleFavorite,
  onAddToPaper,
  isInPaper = false,
  readOnly = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showDiagramEditor, setShowDiagramEditor] = useState(false);
  const [isSolving, setIsSolving] = useState(false);

  // Edit draft states
  const [editedText, setEditedText] = useState(question.questionText);
  const [editedStimulus, setEditedStimulus] = useState(question.stimulus || '');
  const [editedOptions, setEditedOptions] = useState<string[]>(question.options || ['', '', '', '']);
  const [editedCorrectIndex, setEditedCorrectIndex] = useState<number>(question.correctOptionIndex ?? 0);
  const [editedExplanation, setEditedExplanation] = useState(question.explanation || '');
  const [editedMarks, setEditedMarks] = useState<number>(question.marks);

  // CQ parts draft
  const [partA, setPartA] = useState(question.cqParts?.partA?.question || '');
  const [partB, setPartB] = useState(question.cqParts?.partB?.question || '');
  const [partC, setPartC] = useState(question.cqParts?.partC?.question || '');
  const [partD, setPartD] = useState(question.cqParts?.partD?.question || '');
  const [ansA, setAnsA] = useState(question.cqParts?.partA?.answer || '');
  const [ansB, setAnsB] = useState(question.cqParts?.partB?.answer || '');
  const [ansC, setAnsC] = useState(question.cqParts?.partC?.answer || '');
  const [ansD, setAnsD] = useState(question.cqParts?.partD?.answer || '');

  const handleSaveEdit = () => {
    if (!onUpdate) return;

    const updated: Question = {
      ...question,
      questionText: editedText,
      stimulus: editedStimulus,
      marks: Number(editedMarks),
      explanation: editedExplanation,
      updatedAt: new Date().toISOString(),
    };

    if (question.questionType === 'MCQ') {
      updated.options = editedOptions;
      updated.correctOptionIndex = editedCorrectIndex;
      updated.correctAnswer = editedOptions[editedCorrectIndex] || '';
    } else if (question.questionType === 'CQ') {
      updated.cqParts = {
        partA: { question: partA, marks: 1, answer: ansA },
        partB: { question: partB, marks: 2, answer: ansB },
        partC: { question: partC, marks: 3, answer: ansC },
        partD: { question: partD, marks: 4, answer: ansD },
      };
    }

    onUpdate(updated);
    setIsEditing(false);
  };

  const handleGenerateModelAnswer = async () => {
    setIsSolving(true);
    try {
      const res = await fetch('/api/gemini/solve-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          questionType: question.questionType,
          marks: question.marks,
          language: 'Bangla',
        }),
      });
      const data = await res.json();
      if (data.success && data.solution) {
        if (question.questionType === 'CQ' && question.cqParts) {
          // Update CQ answers
          const updated: Question = {
            ...question,
            explanation: data.solution.modelAnswer,
            cqParts: {
              partA: { ...question.cqParts.partA, answer: question.cqParts.partA.answer || data.solution.keyPoints?.[0] },
              partB: { ...question.cqParts.partB, answer: question.cqParts.partB.answer || data.solution.keyPoints?.[1] },
              partC: { ...question.cqParts.partC, answer: question.cqParts.partC.answer || data.solution.keyPoints?.[2] },
              partD: { ...question.cqParts.partD, answer: question.cqParts.partD.answer || data.solution.modelAnswer },
            },
          };
          onUpdate?.(updated);
        } else {
          onUpdate?.({
            ...question,
            explanation: data.solution.modelAnswer,
          });
        }
        setShowAnswer(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSolving(false);
    }
  };

  const getSourceBadge = () => {
    const verificationBadge = (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
          question.sourceVerificationStatus === 'Verified'
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            : 'bg-slate-100 text-slate-700 border border-slate-200'
        }`}
      >
        {question.sourceVerificationStatus === 'Verified' ? (
          <>
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            <span>যাচাইকৃত উৎস • {question.sourcePage ? `পৃষ্ঠা ${question.sourcePage}` : 'Page reference unavailable'}</span>
          </>
        ) : (
          <span>{question.sourcePage ? `উৎস পৃষ্ঠা: ${question.sourcePage}` : 'Page reference unavailable'}</span>
        )}
      </span>
    );

    let mainBadge;
    switch (question.sourceType) {
      case 'BOARD_EXAM':
        mainBadge = (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <Award className="w-3.5 h-3.5 text-emerald-700" />
            Official SSC Board • {question.boardInfo ? `${question.boardInfo.boardName} '${question.boardInfo.year}` : 'SSC Board Exam'}
          </span>
        );
        break;
      case 'NCTB_TEXTBOOK':
        mainBadge = (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <BookOpen className="w-3.5 h-3.5 text-blue-700" /> Official NCTB
          </span>
        );
        break;
      case 'ORIGINAL_AI':
        mainBadge = (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
            <Sparkles className="w-3.5 h-3.5 text-purple-700" /> AI Generated
          </span>
        );
        break;
      default:
        mainBadge = (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
            {question.reviewStatus === 'APPROVED' ? 'Admin Verified' : 'User Created'}
          </span>
        );
    }

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {mainBadge}
        {question.sourcePdfTitle && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-900 border border-cyan-200">
            <FileText className="w-3 h-3 text-cyan-700" />
            <span className="truncate max-w-[180px]">{question.sourcePdfTitle}</span>
            <span>•</span>
            <span className="font-bold">{question.sourcePage || 'Page reference unavailable'}</span>
          </span>
        )}
        {question.sources && question.sources.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {question.sources.map((s, sIdx) => (
              <span
                key={s.id || sIdx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200"
              >
                <span>📌 {s.sourceName}</span>
                {s.year && <span>({s.year})</span>}
              </span>
            ))}
          </div>
        )}
        {verificationBadge}
        {question.timesUsed !== undefined && question.timesUsed > 0 && (
          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            ব্যবহৃত: {question.timesUsed} বার
          </span>
        )}
        {question.confidenceScore !== undefined && (
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            {Math.round(question.confidenceScore * 100)}% match
          </span>
        )}
      </div>
    );
  };

  const getDifficultyBadge = () => {
    const color =
      question.difficulty === 'Easy'
        ? 'text-emerald-700 bg-emerald-50'
        : question.difficulty === 'Medium'
        ? 'text-amber-700 bg-amber-50'
        : 'text-rose-700 bg-rose-50';
    return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${color}`}>{question.difficulty}</span>;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 relative group">
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
            {index !== undefined ? `Q.${index + 1}` : question.questionType}
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
            {question.subject}
          </span>
          <span className="text-xs text-slate-500 font-bangla">{question.chapter}</span>
          {getSourceBadge()}
          {getDifficultyBadge()}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
            [Marks: {question.marks}]
          </span>

          {!readOnly && (
            <>
              {onToggleFavorite && (
                <button
                  onClick={() => onToggleFavorite(question.id)}
                  title="Favorite Question"
                  className={`p-1.5 rounded-lg transition-colors ${
                    question.isFavorite
                      ? 'text-amber-500 bg-amber-50'
                      : 'text-slate-400 hover:text-amber-500 hover:bg-slate-50'
                  }`}
                >
                  <Bookmark className="w-4 h-4 fill-current" />
                </button>
              )}

              {onAddToPaper && (
                <button
                  onClick={() => onAddToPaper(question)}
                  title={isInPaper ? 'Already in paper' : 'Add to Question Paper'}
                  disabled={isInPaper}
                  className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                    isInPaper
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  }`}
                >
                  {isInPaper ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" /> Added
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" /> Add to Exam
                    </>
                  )}
                </button>
              )}

              {onUpdate && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  title="Edit question text and marks"
                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}

              {onDelete && (
                <button
                  onClick={() => onDelete(question.id)}
                  title="Delete question"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Body */}
      {isEditing ? (
        <div className="space-y-4 pt-2">
          {question.questionType === 'CQ' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                উদ্দীপক (Stimulus / Scenario / Table):
              </label>
              <textarea
                rows={3}
                value={editedStimulus}
                onChange={(e) => setEditedStimulus(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-xl p-2.5 font-bangla focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Question Text / Statement:</label>
            <textarea
              rows={2}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-xl p-2.5 font-bangla focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* CQ Parts Editing */}
          {question.questionType === 'CQ' && (
            <div className="space-y-2 border-l-2 border-indigo-200 pl-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">ক. জ্ঞানমূলক (১ নম্বর):</label>
                <input
                  type="text"
                  value={partA}
                  onChange={(e) => setPartA(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2 font-bangla"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">খ. অনুধাবনমূলক (২ নম্বর):</label>
                <input
                  type="text"
                  value={partB}
                  onChange={(e) => setPartB(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2 font-bangla"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">গ. প্রয়োগমূলক (৩ নম্বর):</label>
                <input
                  type="text"
                  value={partC}
                  onChange={(e) => setPartC(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2 font-bangla"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">ঘ. উচ্চতর দক্ষতামূলক (৪ নম্বর):</label>
                <input
                  type="text"
                  value={partD}
                  onChange={(e) => setPartD(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2 font-bangla"
                />
              </div>
            </div>
          )}

          {/* MCQ Options Editing */}
          {question.questionType === 'MCQ' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Options & Correct Answer:</label>
              {editedOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${question.id}`}
                    checked={editedCorrectIndex === idx}
                    onChange={() => setEditedCorrectIndex(idx)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-xs font-bold w-6 text-slate-600">
                    {['ক', 'খ', 'গ', 'ঘ'][idx] || `(${idx + 1})`}
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...editedOptions];
                      updated[idx] = e.target.value;
                      setEditedOptions(updated);
                    }}
                    className="flex-1 text-sm border border-slate-300 rounded-lg p-2 font-bangla"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">Total Marks:</label>
              <input
                type="number"
                value={editedMarks}
                onChange={(e) => setEditedMarks(Number(e.target.value))}
                className="w-16 text-sm border border-slate-300 rounded-lg p-1.5 text-center font-bold"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 font-bangla">
          {/* Stimulus / Uddipok for CQ */}
          {question.stimulus && (
            <div className="p-3.5 bg-slate-50 border-l-4 border-blue-500 rounded-r-xl text-slate-800 text-sm leading-relaxed">
              <span className="font-bold text-blue-900 block mb-1 text-xs uppercase tracking-wider">
                উদ্দীপক / Stimulus:
              </span>
              <MathRenderer content={question.stimulus} />
            </div>
          )}

          {/* Diagram Display if present */}
          {question.diagramSvg && (
            <div className="my-3 flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl">
              <div
                className="max-w-full max-h-[220px]"
                dangerouslySetInnerHTML={{ __html: question.diagramSvg }}
              />
              {question.diagramCaption && (
                <p className="text-xs text-slate-500 italic mt-2 text-center">{question.diagramCaption}</p>
              )}
            </div>
          )}

          {/* Question Text (For MCQ or SQ) */}
          {question.questionType !== 'CQ' && (
            <div className="text-slate-900 text-base font-medium leading-relaxed">
              <MathRenderer content={question.questionText} />
            </div>
          )}

          {/* CQ 4 Parts Rendering (ক, খ, গ, ঘ) */}
          {question.questionType === 'CQ' && question.cqParts && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-start justify-between text-sm group/part">
                <span className="font-medium text-slate-900">
                  <span className="font-bold mr-1">ক.</span>
                  <MathRenderer content={question.cqParts.partA.question} />
                </span>
                <span className="text-xs font-bold text-slate-500 ml-4 whitespace-nowrap">
                  {question.cqParts.partA.marks}
                </span>
              </div>
              <div className="flex items-start justify-between text-sm group/part">
                <span className="font-medium text-slate-900">
                  <span className="font-bold mr-1">খ.</span>
                  <MathRenderer content={question.cqParts.partB.question} />
                </span>
                <span className="text-xs font-bold text-slate-500 ml-4 whitespace-nowrap">
                  {question.cqParts.partB.marks}
                </span>
              </div>
              <div className="flex items-start justify-between text-sm group/part">
                <span className="font-medium text-slate-900">
                  <span className="font-bold mr-1">গ.</span>
                  <MathRenderer content={question.cqParts.partC.question} />
                </span>
                <span className="text-xs font-bold text-slate-500 ml-4 whitespace-nowrap">
                  {question.cqParts.partC.marks}
                </span>
              </div>
              <div className="flex items-start justify-between text-sm group/part">
                <span className="font-medium text-slate-900">
                  <span className="font-bold mr-1">ঘ.</span>
                  <MathRenderer content={question.cqParts.partD.question} />
                </span>
                <span className="text-xs font-bold text-slate-500 ml-4 whitespace-nowrap">
                  {question.cqParts.partD.marks}
                </span>
              </div>
            </div>
          )}

          {/* MCQ Options Rendering */}
          {question.questionType === 'MCQ' && question.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              {question.options.map((opt, idx) => {
                const isCorrect = showAnswer && question.correctOptionIndex === idx;
                const banglaPrefix = ['ক', 'খ', 'গ', 'ঘ'][idx] || `(${idx + 1})`;
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 p-2.5 rounded-xl border text-sm transition-all ${
                      isCorrect
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                        : 'bg-slate-50/70 border-slate-200 text-slate-800'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                      {banglaPrefix}
                    </span>
                    <span className="flex-1">
                      <MathRenderer content={opt} />
                    </span>
                    {isCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Answer Key / Solution Accordion */}
          {showAnswer && (
            <div className="mt-3 p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-sm text-emerald-950 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-emerald-800 text-xs uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                Model Answer & Pedagogical Explanation (উত্তর ও সমাধান):
              </div>

              {question.questionType === 'MCQ' && question.correctAnswer && (
                <p className="font-semibold">
                  সঠিক উত্তর: <span className="text-emerald-700">{question.correctAnswer}</span>
                </p>
              )}

              {question.explanation && (
                <div className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-emerald-100">
                  <MathRenderer content={question.explanation} />
                </div>
              )}

              {/* CQ Detailed Solution Breakdown */}
              {question.questionType === 'CQ' && question.cqParts && (
                <div className="space-y-1.5 text-xs text-slate-800 pt-1">
                  {question.cqParts.partA.answer && (
                    <p>
                      <strong>ক-এর উত্তর:</strong> <MathRenderer content={question.cqParts.partA.answer} />
                    </p>
                  )}
                  {question.cqParts.partB.answer && (
                    <p>
                      <strong>খ-এর উত্তর:</strong> <MathRenderer content={question.cqParts.partB.answer} />
                    </p>
                  )}
                  {question.cqParts.partC.answer && (
                    <p>
                      <strong>গ-এর উত্তর:</strong> <MathRenderer content={question.cqParts.partC.answer} />
                    </p>
                  )}
                  {question.cqParts.partD.answer && (
                    <p>
                      <strong>ঘ-এর উত্তর:</strong> <MathRenderer content={question.cqParts.partD.answer} />
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAnswer(!showAnswer)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                {showAnswer ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" /> Hide Model Answer
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" /> Show Model Answer & Solution
                  </>
                )}
              </button>

              {!readOnly && (
                <button
                  onClick={() => setShowDiagramEditor(true)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                  {question.diagramSvg ? 'Edit Diagram' : 'Attach Diagram'}
                </button>
              )}
            </div>

            {!readOnly && !question.explanation && (
              <button
                onClick={handleGenerateModelAnswer}
                disabled={isSolving}
                className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-purple-50 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isSolving ? 'Solving...' : 'AI Solve & Marking Guide'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Diagram Editor Modal */}
      {showDiagramEditor && (
        <DiagramEditor
          currentSubject={question.subject}
          currentClass={question.classLevel}
          initialSvg={question.diagramSvg}
          initialCaption={question.diagramCaption}
          onClose={() => setShowDiagramEditor(false)}
          onInsertSvg={(svg, caption) => {
            onUpdate?.({
              ...question,
              diagramSvg: svg,
              diagramCaption: caption,
            });
            setShowDiagramEditor(false);
          }}
        />
      )}
    </div>
  );
};
