import { PaperSection, Question, QuestionType } from '../types';

export interface SectionTemplate {
  type: QuestionType;
  titleBnPrefix: string;
  titleBnName: string;
  titleEnName: string;
  instructions: string;
}

const SECTION_TEMPLATES: Record<QuestionType, SectionTemplate> = {
  CQ: {
    type: 'CQ',
    titleBnPrefix: 'ক-বিভাগ',
    titleBnName: 'সৃজনশীল প্রশ্ন',
    titleEnName: 'Creative Questions (CQ)',
    instructions: 'যেকোনো ৭টি প্রশ্নের উত্তর দাও। প্রতিটি প্রশ্নের মান ১০।',
  },
  SQ: {
    type: 'SQ',
    titleBnPrefix: 'খ-বিভাগ',
    titleBnName: 'সংক্ষিপ্ত প্রশ্ন',
    titleEnName: 'Short Questions (SQ)',
    instructions: 'সকল সংক্ষিপ্ত প্রশ্নের উত্তর দাও। প্রতিটি প্রশ্নের মান ২।',
  },
  MCQ: {
    type: 'MCQ',
    titleBnPrefix: 'গ-বিভাগ',
    titleBnName: 'বহুনির্বাচনি প্রশ্ন',
    titleEnName: 'Multiple Choice Questions (MCQ)',
    instructions: 'সকল বহুনির্বাচনি প্রশ্নের উত্তর দাও। প্রতিটি প্রশ্নের মান ১। সঠিক উত্তরের বৃত্ত ভরাট করো / খাতায় লেখো।',
  },
};

const BANGLA_SECTION_PREFIXES = ['ক-বিভাগ', 'খ-বিভাগ', 'গ-বিভাগ', 'ঘ-বিভাগ', 'ঙ-বিভাগ'];
const ENGLISH_SECTION_PREFIXES = ['Section A', 'Section B', 'Section C', 'Section D', 'Section E'];

/**
 * Organizes a flat list of questions into distinct sections separated by question type:
 * CQ questions in CQ section (সৃজনশীল)
 * SQ questions in SQ section (সংক্ষিপ্ত)
 * MCQ questions in MCQ section (বহুনির্বাচনি)
 */
export function organizeQuestionsIntoSections(
  questions: Question[],
  customInstructions?: { [key in QuestionType]?: string }
): PaperSection[] {
  if (!questions || questions.length === 0) {
    return [
      {
        id: 'sec-cq',
        titleBn: 'ক-বিভাগ: সৃজনশীল প্রশ্ন',
        titleEn: 'Section A: Creative Questions',
        instructions: 'সকল প্রশ্নের উত্তর দাও।',
        questions: [],
      },
    ];
  }

  // Deduplicate questions by ID
  const seenIds = new Set<string>();
  const uniqueQuestions: Question[] = [];
  for (const q of questions) {
    if (!seenIds.has(q.id)) {
      seenIds.add(q.id);
      uniqueQuestions.push(q);
    }
  }

  // Partition by QuestionType
  const cqList = uniqueQuestions.filter((q) => q.questionType === 'CQ');
  const sqList = uniqueQuestions.filter((q) => q.questionType === 'SQ');
  const mcqList = uniqueQuestions.filter((q) => q.questionType === 'MCQ');
  const otherList = uniqueQuestions.filter(
    (q) => q.questionType !== 'CQ' && q.questionType !== 'SQ' && q.questionType !== 'MCQ'
  );

  const groups: { type: QuestionType | 'OTHER'; questions: Question[] }[] = [];
  if (cqList.length > 0) groups.push({ type: 'CQ', questions: cqList });
  if (sqList.length > 0) groups.push({ type: 'SQ', questions: sqList });
  if (mcqList.length > 0) groups.push({ type: 'MCQ', questions: mcqList });
  if (otherList.length > 0) groups.push({ type: 'OTHER', questions: otherList });

  // If no questions in any group, create default empty CQ section
  if (groups.length === 0) {
    return [
      {
        id: 'sec-1',
        titleBn: 'ক-বিভাগ: সৃজনশীল প্রশ্ন',
        titleEn: 'Section A: Creative Questions',
        instructions: 'সকল প্রশ্নের উত্তর দাও।',
        questions: [],
      },
    ];
  }

  return groups.map((g, index) => {
    const prefixBn = BANGLA_SECTION_PREFIXES[index] || `বিভাগ ${index + 1}`;
    const prefixEn = ENGLISH_SECTION_PREFIXES[index] || `Section ${index + 1}`;

    if (g.type === 'OTHER') {
      return {
        id: `sec-${index + 1}-other`,
        titleBn: `${prefixBn}: অন্যান্য প্রশ্ন`,
        titleEn: `${prefixEn}: General Questions`,
        instructions: 'নির্দেশনা অনুযায়ী উত্তর দাও।',
        questions: g.questions,
      };
    }

    const template = SECTION_TEMPLATES[g.type];
    const userInstruction = customInstructions?.[g.type];

    // Dynamic CQ instruction based on count (e.g. if 11 questions, "যেকোনো ৭টি প্রশ্নের উত্তর দাও")
    let dynamicInstruction = userInstruction || template.instructions;
    if (g.type === 'CQ' && !userInstruction) {
      if (g.questions.length >= 9) {
        dynamicInstruction = 'যেকোনো ৭টি প্রশ্নের উত্তর দাও। প্রতিটি প্রশ্নের মান ১০।';
      } else if (g.questions.length >= 6) {
        dynamicInstruction = `যেকোনো ৪টি প্রশ্নের উত্তর দাও। প্রতিটি প্রশ্নের মান ১০।`;
      } else if (g.questions.length > 0) {
        dynamicInstruction = `সকল সৃজনশীল প্রশ্নের উত্তর দাও। প্রতিটি প্রশ্নের মান ১০।`;
      }
    }

    return {
      id: `sec-${g.type.toLowerCase()}`,
      titleBn: `${prefixBn}: ${template.titleBnName}`,
      titleEn: `${prefixEn}: ${template.titleEnName}`,
      instructions: dynamicInstruction,
      questions: g.questions,
    };
  });
}

/**
 * Adds one or more questions to an existing set of PaperSection[],
 * ensuring each question is placed into its dedicated section (CQ, SQ, MCQ).
 */
export function addQuestionsToPaperSections(
  existingSections: PaperSection[],
  newQuestions: Question[]
): PaperSection[] {
  // Flatten all existing questions
  const allQuestions = (existingSections || []).flatMap((s) => s.questions || []);
  
  // Combine with new questions
  const combined = [...allQuestions, ...newQuestions];
  
  // Re-organize into clean, typed sections
  return organizeQuestionsIntoSections(combined);
}
