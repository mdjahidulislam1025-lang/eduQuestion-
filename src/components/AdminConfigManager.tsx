import React, { useState } from 'react';
import {
  DynamicClassItem,
  DynamicSubjectItem,
  ExamPresetItem,
} from '../types';
import { Plus, Trash2, Edit3, Check, X, Layers, BookOpen, Award } from 'lucide-react';

interface AdminConfigManagerProps {
  dynamicClasses: DynamicClassItem[];
  dynamicSubjects: DynamicSubjectItem[];
  examPresets: ExamPresetItem[];
  onSaveClass: (item: DynamicClassItem) => Promise<void>;
  onDeleteClass: (id: string) => Promise<void>;
  onSaveSubject: (item: DynamicSubjectItem) => Promise<void>;
  onDeleteSubject: (id: string) => Promise<void>;
  onSaveExamPreset: (item: ExamPresetItem) => Promise<void>;
  onDeleteExamPreset: (id: string) => Promise<void>;
}

export const AdminConfigManager: React.FC<AdminConfigManagerProps> = ({
  dynamicClasses,
  dynamicSubjects,
  examPresets,
  onSaveClass,
  onDeleteClass,
  onSaveSubject,
  onDeleteSubject,
  onSaveExamPreset,
  onDeleteExamPreset,
}) => {
  // Class state
  const [newClassName, setNewClassName] = useState('');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState('');

  // Subject state
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubClass, setNewSubClass] = useState('SSC');
  const [newSubGroup, setNewSubGroup] = useState('');
  const [subError, setSubError] = useState('');

  // Exam Preset state
  const [newExamName, setNewExamName] = useState('');

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newClassName.trim();
    if (!trimmed) return;
    if (dynamicClasses.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return;
    await onSaveClass({
      id: `cls_${Date.now()}`,
      name: trimmed,
      createdAt: new Date().toISOString(),
    });
    setNewClassName('');
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSubName.trim();
    if (!trimmed) return;
    const isDup = dynamicSubjects.some(
      (s) =>
        s.name.toLowerCase() === trimmed.toLowerCase() &&
        (s.classLevel || 'SSC').toLowerCase() === newSubClass.toLowerCase()
    );
    if (isDup) {
      setSubError(`"${trimmed}" already exists in "${newSubClass}".`);
      return;
    }
    setSubError('');
    await onSaveSubject({
      id: `sub_${Date.now()}`,
      name: trimmed,
      code: newSubCode.trim() || undefined,
      classLevel: newSubClass,
      group: newSubGroup.trim() || undefined,
      isCustom: true,
      createdAt: new Date().toISOString(),
    });
    setNewSubName('');
    setNewSubCode('');
    setNewSubGroup('');
  };

  const handleAddExamPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newExamName.trim();
    if (!trimmed) return;
    if (examPresets.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return;
    await onSaveExamPreset({
      id: `exam_${Date.now()}`,
      name: trimmed,
      isCustom: true,
      createdAt: new Date().toISOString(),
    });
    setNewExamName('');
  };

  return (
    <div className="space-y-6">
      {/* 1. Dynamic Classes Management */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Layers className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-800">
            শ্রেণি ব্যবস্থাপনা (Manage Classes)
          </h3>
        </div>

        <form onSubmit={handleAddClass} className="flex gap-2">
          <input
            type="text"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="নতুন শ্রেণির নাম (যেমন: Class 11 / Dakhil)..."
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Class
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {dynamicClasses.map((cls) => (
            <div
              key={cls.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700"
            >
              {editingClassId === cls.id ? (
                <>
                  <input
                    type="text"
                    value={editClassName}
                    onChange={(e) => setEditClassName(e.target.value)}
                    className="w-24 px-1.5 py-0.5 rounded border border-slate-300 text-xs"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (editClassName.trim()) {
                        await onSaveClass({ ...cls, name: editClassName.trim() });
                      }
                      setEditingClassId(null);
                    }}
                    className="text-emerald-600"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingClassId(null)}
                    className="text-slate-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span>{cls.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingClassId(cls.id);
                      setEditClassName(cls.name);
                    }}
                    className="text-slate-400 hover:text-blue-600 ml-1"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteClass(cls.id)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Dynamic & Custom Subjects Management */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <BookOpen className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">
            বিষয় ও কাস্টম বিষয় ব্যবস্থাপনা (Manage Subjects & Custom Subjects)
          </h3>
        </div>

        {subError && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {subError}
          </div>
        )}

        <form onSubmit={handleAddSubject} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <input
            type="text"
            required
            value={newSubName}
            onChange={(e) => setNewSubName(e.target.value)}
            placeholder="বিষয়ের নাম *"
            className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm"
          />
          <input
            type="text"
            value={newSubCode}
            onChange={(e) => setNewSubCode(e.target.value)}
            placeholder="কোড (ঐচ্ছিক)"
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm"
          />
          <select
            value={newSubClass}
            onChange={(e) => setNewSubClass(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold"
          >
            {dynamicClasses.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Subject
          </button>
        </form>

        <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-1">
          {dynamicSubjects.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
            >
              <span className="font-bold text-slate-800">{sub.name}</span>
              {sub.code && <span className="text-slate-500">({sub.code})</span>}
              {sub.classLevel && (
                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                  {sub.classLevel}
                </span>
              )}
              <button
                type="button"
                onClick={() => onDeleteSubject(sub.id)}
                className="text-slate-400 hover:text-rose-600 ml-1"
                title="Remove subject (questions are preserved)"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Exam Name Presets Management */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Award className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold text-slate-800">
            পরীক্ষার নাম প্রিসেট (Exam Name Presets)
          </h3>
        </div>

        <form onSubmit={handleAddExamPreset} className="flex gap-2">
          <input
            type="text"
            value={newExamName}
            onChange={(e) => setNewExamName(e.target.value)}
            placeholder="নতুন পরীক্ষার নাম (যেমন: Special Model Test)..."
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Preset
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {examPresets.map((ex) => (
            <div
              key={ex.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700"
            >
              <span>{ex.name}</span>
              <button
                type="button"
                onClick={() => onDeleteExamPreset(ex.id)}
                className="text-slate-400 hover:text-rose-600 ml-1"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
