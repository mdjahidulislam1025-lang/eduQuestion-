import {
  Question,
  NCTBBook,
  AdminPdfDocument,
  BoardExamQuestionRecord,
  ExamPaperImportRecord,
  RepositoryContentItem,
  UnifiedContentType,
  QuestionSourceRef,
  ClassLevel,
  QuestionType,
  TextbookKnowledgeItem
} from '../types';

/**
 * Builds RepositoryContentItem entries from an NCTB Book
 */
export function buildItemsFromNctbBook(book: NCTBBook): RepositoryContentItem[] {
  const items: RepositoryContentItem[] = [];
  const createdAt = book.uploadedAt || new Date().toISOString();

  // Root textbook content item
  items.push({
    id: `rep-nctb-${book.id}`,
    kind: 'KNOWLEDGE_CONTENT',
    contentType: 'NCTB_TEXTBOOK_CONTENT',
    title: `${book.bookName} (${book.classLevel})`,
    classLevel: book.classLevel,
    subject: book.subject,
    content: book.notes || `${book.bookName} - জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড (NCTB) অনুমোদিত মূল পাঠ্যবই।`,
    summary: `${book.chapters?.length || 0}টি অধ্যায় • সংস্করণ: ${book.curriculumEdition || 'চলতি'}`,
    curriculumEdition: book.curriculumEdition,
    sourceDocumentId: book.id,
    sourceDocumentTitle: book.bookName,
    sourceDocumentType: 'NCTB_BOOK',
    institutionOrBoard: 'NCTB Bangladesh',
    verificationStatus: book.verificationStatus === 'Verified' ? 'Verified' : 'Needs Review',
    isVerified: book.verificationStatus === 'Verified',
    uploadedBy: book.uploadedBy || 'Admin',
    tags: ['NCTB', book.subject, book.classLevel, book.curriculumEdition].filter(Boolean) as string[],
    createdAt,
    updatedAt: book.updatedAt || createdAt,
  });

  // Decompose chapters & topics
  if (book.chapters && book.chapters.length > 0) {
    book.chapters.forEach((ch) => {
      const chapterId = `rep-nctb-ch-${book.id}-${ch.id}`;
      items.push({
        id: chapterId,
        kind: 'KNOWLEDGE_CONTENT',
        contentType: 'CHAPTER_INFO',
        title: `${ch.chapterNumber}: ${ch.titleBn} (${book.subject})`,
        classLevel: book.classLevel,
        subject: book.subject,
        chapter: ch.titleBn,
        chapterNumber: ch.chapterNumber,
        content: ch.summary || `${ch.chapterNumber}: ${ch.titleBn} - মূল অধ্যায় ও বিষয়বস্তু।`,
        summary: `পৃষ্ঠা ${ch.startPage}-${ch.endPage} • বিষয়: ${ch.topics?.length || 0}টি মূল টপিক`,
        pageRange: `পৃষ্ঠা ${ch.startPage}-${ch.endPage}`,
        curriculumEdition: book.curriculumEdition,
        sourceDocumentId: book.id,
        sourceDocumentTitle: book.bookName,
        sourceDocumentType: 'NCTB_BOOK',
        institutionOrBoard: 'NCTB Bangladesh',
        verificationStatus: book.verificationStatus === 'Verified' ? 'Verified' : 'Needs Review',
        isVerified: book.verificationStatus === 'Verified',
        uploadedBy: book.uploadedBy || 'Admin',
        tags: ['Chapter', book.subject, ch.titleBn, book.classLevel],
        createdAt,
      });

      // Topics and subtopics
      if (ch.topics) {
        ch.topics.forEach((topicName, tIdx) => {
          items.push({
            id: `rep-nctb-top-${book.id}-${ch.id}-${tIdx}`,
            kind: 'KNOWLEDGE_CONTENT',
            contentType: 'TOPIC_INFO',
            title: `${topicName} [${ch.chapterNumber}]`,
            classLevel: book.classLevel,
            subject: book.subject,
            chapter: ch.titleBn,
            chapterNumber: ch.chapterNumber,
            topic: topicName,
            content: `${ch.titleBn} অধ্যায়ের অন্তর্গত গুরুত্বপূর্ণ শিক্ষাক্রম পরিচ্ছেদ: ${topicName}।`,
            pageRange: `পৃষ্ঠা ${ch.startPage}-${ch.endPage}`,
            curriculumEdition: book.curriculumEdition,
            sourceDocumentId: book.id,
            sourceDocumentTitle: book.bookName,
            sourceDocumentType: 'NCTB_BOOK',
            institutionOrBoard: 'NCTB Bangladesh',
            verificationStatus: 'Verified',
            isVerified: true,
            uploadedBy: book.uploadedBy || 'Admin',
            tags: ['Topic', topicName, book.subject, ch.titleBn],
            createdAt,
          });
        });
      }
    });
  }

  return items;
}

/**
 * Builds RepositoryContentItem entries from an Admin Uploaded PDF
 */
export function buildItemsFromAdminPdf(pdf: AdminPdfDocument): RepositoryContentItem[] {
  const items: RepositoryContentItem[] = [];
  const createdAt = pdf.createdAt || new Date().toISOString();

  const isRefBook = pdf.category === 'Reference Book' || pdf.category === 'Guide Book';
  const rootType: UnifiedContentType = isRefBook ? 'REFERENCE_BOOK_CONTENT' : 'ADMIN_PDF_CONTENT';

  // Root PDF document item
  items.push({
    id: `rep-pdf-${pdf.id}`,
    kind: 'KNOWLEDGE_CONTENT',
    contentType: rootType,
    title: pdf.title,
    classLevel: pdf.classLevel,
    subject: pdf.subject,
    chapter: pdf.chapter,
    topic: pdf.topic,
    content: pdf.description || `${pdf.title} (${pdf.category}) - মোট পৃষ্ঠা: ${pdf.pageCount || 1}`,
    summary: `ক্যাটাগরি: ${pdf.category} • প্রতিষ্ঠান: ${pdf.institutionName || 'N/A'} • শিক্ষাবর্ষ: ${pdf.academicYear || 'চলতি'}`,
    pageRange: pdf.pageCount ? `১-${pdf.pageCount}` : undefined,
    academicYear: pdf.academicYear,
    institutionOrBoard: pdf.institutionName,
    sourceDocumentId: pdf.id,
    sourceDocumentTitle: pdf.title,
    sourceDocumentType: 'ADMIN_PDF',
    verificationStatus: pdf.status === 'PROCESSED' ? 'Verified' : 'Processing',
    isVerified: pdf.status === 'PROCESSED',
    uploadedBy: pdf.uploadedBy || 'Admin',
    uploadedByEmail: pdf.uploadedByEmail,
    tags: pdf.tags || [pdf.category, pdf.subject],
    createdAt,
    updatedAt: pdf.updatedAt || createdAt,
  });

  // Chunks extracted from PDF
  if (pdf.extractedChunks && pdf.extractedChunks.length > 0) {
    pdf.extractedChunks.forEach((chunk) => {
      items.push({
        id: `rep-chunk-${pdf.id}-${chunk.id}`,
        kind: 'KNOWLEDGE_CONTENT',
        contentType: 'ADMIN_PDF_CONTENT',
        title: chunk.heading || `${pdf.title} (পৃষ্ঠা ${chunk.pageNumber})`,
        classLevel: pdf.classLevel,
        subject: pdf.subject,
        chapter: chunk.chapterName || pdf.chapter,
        topic: chunk.topicName || pdf.topic,
        content: chunk.content,
        pageNumber: chunk.pageNumber,
        pageRange: `পৃষ্ঠা ${chunk.pageNumber}`,
        sourceDocumentId: pdf.id,
        sourceDocumentTitle: pdf.title,
        sourceDocumentType: 'ADMIN_PDF',
        institutionOrBoard: pdf.institutionName,
        academicYear: pdf.academicYear,
        verificationStatus: 'Verified',
        isVerified: true,
        uploadedBy: pdf.uploadedBy || 'Admin',
        uploadedByEmail: pdf.uploadedByEmail,
        tags: [pdf.subject, chunk.chapterName || pdf.chapter || 'Note', `Page ${chunk.pageNumber}`].filter(Boolean) as string[],
        createdAt,
      });
    });
  }

  // Detected chapters in PDF
  if (pdf.detectedChapters && pdf.detectedChapters.length > 0) {
    pdf.detectedChapters.forEach((ch, idx) => {
      items.push({
        id: `rep-pdf-ch-${pdf.id}-${idx}`,
        kind: 'KNOWLEDGE_CONTENT',
        contentType: 'CHAPTER_INFO',
        title: `${ch.chapterNumber}: ${ch.title} [${pdf.title}]`,
        classLevel: pdf.classLevel,
        subject: pdf.subject,
        chapter: ch.title,
        chapterNumber: ch.chapterNumber,
        content: `নথি থেকে শনাক্তকৃত অধ্যায়: ${ch.title} (${ch.chapterNumber})। পৃষ্ঠা ব্যাপ্তি: ${ch.pageRange}`,
        pageRange: ch.pageRange,
        sourceDocumentId: pdf.id,
        sourceDocumentTitle: pdf.title,
        sourceDocumentType: 'ADMIN_PDF',
        institutionOrBoard: pdf.institutionName,
        verificationStatus: 'Verified',
        isVerified: true,
        uploadedBy: pdf.uploadedBy || 'Admin',
        tags: ['Chapter', pdf.subject, ch.title],
        createdAt,
      });
    });
  }

  return items;
}

/**
 * Maps Question entity into unified RepositoryContentItem
 */
export function buildItemFromQuestion(q: Question): RepositoryContentItem {
  let contentType: UnifiedContentType = 'MCQ';

  if (q.questionType === 'CQ') {
    contentType = 'CQ';
  } else if (q.questionType === 'SQ') {
    contentType = 'SQ';
  } else if (q.questionType === 'MCQ') {
    contentType = 'MCQ';
  }

  // Refine contentType by origin
  if (q.isAiGenerated || q.sourceType === 'ORIGINAL_AI') {
    contentType = 'AI_GENERATED';
  } else if (q.boardInfo || q.sourceType === 'BOARD_EXAM') {
    contentType = 'BOARD_QUESTION';
  } else if (q.sourceType === 'NCTB_BOARD_PATTERN' || q.sources?.some(s => s.examType === 'Model Test')) {
    contentType = 'MODEL_TEST_QUESTION';
  } else if (q.sources?.some(s => s.sourceType === 'EXAM_PAPER')) {
    contentType = 'ORIGINAL_EXAM_QUESTION';
  }

  const primarySource = q.sources && q.sources.length > 0 ? q.sources[0] : undefined;
  const createdAt = q.createdAt || new Date().toISOString();

  // Combine full text for comprehensive search
  let fullBody = q.questionText || '';
  if (q.stimulus) {
    fullBody = `${q.stimulus}\n${fullBody}`;
  }
  if (q.cqParts) {
    fullBody += `\nক. ${q.cqParts.partA.question}\nখ. ${q.cqParts.partB.question}\nগ. ${q.cqParts.partC.question}\nঘ. ${q.cqParts.partD.question}`;
  }
  if (q.options) {
    fullBody += `\n${q.options.map((opt, i) => `${['i', 'ii', 'iii', 'iv'][i] || i + 1}) ${opt}`).join('  ')}`;
  }

  const isVerified = q.sourceVerificationStatus === 'Verified' || q.reviewStatus === 'APPROVED' || q.boardInfo?.isVerified === true;

  return {
    id: `rep-q-${q.id}`,
    kind: 'QUESTION',
    contentType,
    title: q.questionText ? (q.questionText.length > 80 ? q.questionText.substring(0, 80) + '...' : q.questionText) : (q.stimulus ? q.stimulus.substring(0, 80) + '...' : `${q.subject} ${q.questionType}`),
    classLevel: q.classLevel,
    subject: q.subject,
    chapter: q.chapter,
    topic: q.topic,
    content: fullBody,
    summary: `${q.questionType} • পূর্ণমান: ${q.marks} • বিষয়: ${q.subject} (${q.chapter || 'সাধারণ'})`,
    pageRange: q.sourcePage,
    questionRef: q,
    diagramSvg: q.diagramSvg,
    diagramUrl: q.diagramUrl,
    diagramCaption: q.diagramCaption,
    sourceDocumentId: q.sourceDocumentId || q.sourcePdfId,
    sourceDocumentTitle: q.sourcePdfTitle || q.bookName || primarySource?.sourceName,
    sourceDocumentType: q.sourcePdfId ? 'ADMIN_PDF' : q.bookName ? 'NCTB_BOOK' : primarySource?.sourceType === 'EXAM_PAPER' ? 'EXAM_PAPER' : 'BOARD_ARCHIVE',
    institutionOrBoard: q.boardInfo?.boardName || primarySource?.institutionOrBoard,
    examType: q.boardInfo?.examType || primarySource?.examType,
    examYear: q.boardInfo?.year || primarySource?.year,
    verificationStatus: isVerified ? 'Verified' : (q.reviewStatus === 'NEEDS_REVIEW' ? 'Needs Review' : 'Verified'),
    isVerified,
    uploadedBy: 'EduQuestion System',
    timesUsed: q.timesUsed || 0,
    lastUsedAt: q.lastUsedAt,
    collectionFolder: q.collectionFolder,
    tags: [q.subject, q.questionType, q.chapter || '', q.classLevel, q.difficulty].filter(Boolean) as string[],
    createdAt,
    updatedAt: q.updatedAt || createdAt,
  };
}

/**
 * Builds RepositoryContentItem from BoardExamQuestionRecord
 */
export function buildItemFromBoardRecord(bq: BoardExamQuestionRecord): RepositoryContentItem {
  const item = buildItemFromQuestion({
    id: bq.id,
    classLevel: bq.classLevel,
    subject: bq.subject,
    chapter: bq.chapter,
    questionType: bq.questionType,
    questionText: bq.questionText,
    stimulus: bq.stimulus,
    cqParts: bq.cqParts,
    options: bq.options,
    correctOptionIndex: bq.correctOptionIndex,
    correctAnswer: bq.correctAnswer,
    explanation: bq.explanation,
    marks: bq.marks,
    difficulty: bq.difficulty,
    sourceType: 'BOARD_EXAM',
    sourcePage: bq.sourcePage,
    boardInfo: {
      boardName: bq.boardName,
      year: bq.examYear,
      examType: bq.examType,
      isVerified: bq.isVerified,
      pageNumber: bq.sourcePage,
    },
    sources: [
      {
        id: `src-${bq.id}`,
        sourceName: `${bq.boardName} ${bq.examYear}`,
        sourceType: 'BOARD_ARCHIVE',
        institutionOrBoard: bq.boardName,
        year: bq.examYear,
        examType: bq.examType,
        pageNumber: bq.sourcePage,
        addedAt: bq.createdAt,
      },
    ],
    createdAt: bq.createdAt,
  });

  item.contentType = 'BOARD_QUESTION';
  item.institutionOrBoard = bq.boardName;
  item.examYear = bq.examYear;
  item.examType = bq.examType;
  item.isVerified = Boolean(bq.isVerified);
  item.verificationStatus = bq.isVerified ? 'Verified' : 'Needs Review';
  return item;
}

/**
 * Builds RepositoryContentItems from TextbookKnowledgeItem
 */
export function buildItemsFromTextbookKnowledge(tb: TextbookKnowledgeItem): RepositoryContentItem[] {
  const items: RepositoryContentItem[] = [];
  const createdAt = tb.createdAt || new Date().toISOString();

  items.push({
    id: `rep-tb-${tb.id}`,
    kind: 'KNOWLEDGE_CONTENT',
    contentType: 'NCTB_TEXTBOOK_CONTENT',
    title: tb.title,
    classLevel: tb.classLevel,
    subject: tb.subject,
    content: `${tb.title} (${tb.classLevel}) - সংস্করণ: ${tb.editionYear}। মোট অধ্যায়: ${tb.chapters.length}টি`,
    curriculumEdition: tb.editionYear,
    sourceDocumentId: tb.id,
    sourceDocumentTitle: tb.title,
    sourceDocumentType: 'NCTB_BOOK',
    institutionOrBoard: 'NCTB Bangladesh',
    verificationStatus: tb.isVerified ? 'Verified' : 'Needs Review',
    isVerified: Boolean(tb.isVerified),
    uploadedBy: tb.ownerId || 'Admin',
    tags: [tb.subject, tb.classLevel, 'Textbook Knowledge'],
    createdAt,
  });

  tb.chapters.forEach((ch, idx) => {
    // Chapter Item
    items.push({
      id: `rep-tb-ch-${tb.id}-${idx}`,
      kind: 'KNOWLEDGE_CONTENT',
      contentType: 'CHAPTER_INFO',
      title: `${ch.chapterNumber}: ${ch.chapterTitle} (${tb.subject})`,
      classLevel: tb.classLevel,
      subject: tb.subject,
      chapter: ch.chapterTitle,
      chapterNumber: ch.chapterNumber,
      content: ch.summary,
      summary: `টপিকসমূহ: ${ch.mainTopics.join(', ')}`,
      formulas: ch.formulasAndLaws,
      keyDefinitions: ch.keyDefinitions,
      sourceDocumentId: tb.id,
      sourceDocumentTitle: tb.title,
      sourceDocumentType: 'NCTB_BOOK',
      institutionOrBoard: 'NCTB Bangladesh',
      verificationStatus: ch.isVerified ? 'Verified' : 'Needs Review',
      isVerified: Boolean(ch.isVerified),
      uploadedBy: tb.ownerId || 'Admin',
      tags: ['Chapter Knowledge', tb.subject, ch.chapterTitle],
      createdAt,
    });

    // Formulas & Equations items
    if (ch.formulasAndLaws && ch.formulasAndLaws.length > 0) {
      items.push({
        id: `rep-tb-form-${tb.id}-${idx}`,
        kind: 'KNOWLEDGE_CONTENT',
        contentType: 'DIAGRAM_IMAGE_TABLE',
        title: `${ch.chapterTitle}: প্রয়োজনীয় সূত্র ও সমীকরণ`,
        classLevel: tb.classLevel,
        subject: tb.subject,
        chapter: ch.chapterTitle,
        content: ch.formulasAndLaws.join('\n'),
        formulas: ch.formulasAndLaws,
        sourceDocumentId: tb.id,
        sourceDocumentTitle: tb.title,
        sourceDocumentType: 'NCTB_BOOK',
        verificationStatus: 'Verified',
        isVerified: true,
        uploadedBy: tb.ownerId || 'Admin',
        tags: ['Formula', tb.subject, ch.chapterTitle],
        createdAt,
      });
    }

    // Key Definitions & Answers
    if (ch.keyDefinitions && ch.keyDefinitions.length > 0) {
      ch.keyDefinitions.forEach((def, dIdx) => {
        items.push({
          id: `rep-tb-def-${tb.id}-${idx}-${dIdx}`,
          kind: 'KNOWLEDGE_CONTENT',
          contentType: 'ANSWER_EXPLANATION',
          title: `সংজ্ঞা: ${def.term} [${ch.chapterTitle}]`,
          classLevel: tb.classLevel,
          subject: tb.subject,
          chapter: ch.chapterTitle,
          content: `${def.term}: ${def.definition}`,
          sourceDocumentId: tb.id,
          sourceDocumentTitle: tb.title,
          sourceDocumentType: 'NCTB_BOOK',
          verificationStatus: 'Verified',
          isVerified: true,
          uploadedBy: tb.ownerId || 'Admin',
          tags: ['Definition', def.term, tb.subject],
          createdAt,
        });
      });
    }
  });

  return items;
}

/**
 * Builds the complete unified central repository from all app sources
 */
export function compileUnifiedRepository(params: {
  questions: Question[];
  nctbBooks: NCTBBook[];
  adminPdfDocuments: AdminPdfDocument[];
  boardQuestions: BoardExamQuestionRecord[];
  textbooks?: TextbookKnowledgeItem[];
  importedExamPapers?: ExamPaperImportRecord[];
}): RepositoryContentItem[] {
  const itemMap = new Map<string, RepositoryContentItem>();

  // 1. Ingest NCTB Books
  if (params.nctbBooks) {
    params.nctbBooks.forEach((book) => {
      buildItemsFromNctbBook(book).forEach((item) => itemMap.set(item.id, item));
    });
  }

  // 2. Ingest Admin PDFs
  if (params.adminPdfDocuments) {
    params.adminPdfDocuments.forEach((pdf) => {
      buildItemsFromAdminPdf(pdf).forEach((item) => itemMap.set(item.id, item));
    });
  }

  // 3. Ingest Textbook Knowledge
  if (params.textbooks) {
    params.textbooks.forEach((tb) => {
      buildItemsFromTextbookKnowledge(tb).forEach((item) => itemMap.set(item.id, item));
    });
  }

  // 4. Ingest Board Questions
  if (params.boardQuestions) {
    params.boardQuestions.forEach((bq) => {
      const item = buildItemFromBoardRecord(bq);
      itemMap.set(item.id, item);
    });
  }

  // 5. Ingest Questions (Central Question Bank)
  if (params.questions) {
    params.questions.forEach((q) => {
      const item = buildItemFromQuestion(q);
      itemMap.set(item.id, item);
    });
  }

  return Array.from(itemMap.values());
}

export interface UnifiedSearchFilters {
  query?: string;
  classLevel?: ClassLevel | 'ALL';
  subject?: string;
  chapter?: string;
  topic?: string;
  contentType?: UnifiedContentType | 'ALL';
  questionType?: QuestionType | 'ALL';
  sourceDocumentId?: string;
  sourceDocumentType?: string;
  examYear?: string;
  boardOrInstitution?: string;
  verificationStatus?: string;
  kind?: 'ALL' | 'QUESTION' | 'KNOWLEDGE_CONTENT';
  onlyFavorites?: boolean;
}

/**
 * Unified Search Engine across all items in the Central Question Bank & Knowledge Repository
 */
export function searchUnifiedRepository(
  items: RepositoryContentItem[],
  filters: UnifiedSearchFilters
): RepositoryContentItem[] {
  const qClean = (filters.query || '').trim().toLowerCase();

  return items.filter((item) => {
    // 1. Kind filter
    if (filters.kind && filters.kind !== 'ALL' && item.kind !== filters.kind) {
      return false;
    }

    // 2. Content Type
    if (filters.contentType && filters.contentType !== 'ALL') {
      if (item.contentType !== filters.contentType) return false;
    }

    // 3. Question Type
    if (filters.questionType && filters.questionType !== 'ALL') {
      if (item.questionRef?.questionType !== filters.questionType) return false;
    }

    // 4. Class Level
    if (filters.classLevel && filters.classLevel !== 'ALL') {
      if (item.classLevel !== filters.classLevel && item.classLevel !== 'All Classes') {
        return false;
      }
    }

    // 5. Subject
    if (filters.subject && filters.subject !== 'ALL') {
      const sLower = filters.subject.toLowerCase();
      if (!item.subject.toLowerCase().includes(sLower)) return false;
    }

    // 6. Chapter
    if (filters.chapter && filters.chapter !== 'ALL' && filters.chapter.trim()) {
      const chLower = filters.chapter.toLowerCase();
      if (!item.chapter?.toLowerCase().includes(chLower)) return false;
    }

    // 7. Topic
    if (filters.topic && filters.topic.trim()) {
      const topLower = filters.topic.toLowerCase();
      if (!item.topic?.toLowerCase().includes(topLower)) return false;
    }

    // 8. Source Document
    if (filters.sourceDocumentId && filters.sourceDocumentId !== 'ALL') {
      if (item.sourceDocumentId !== filters.sourceDocumentId) return false;
    }

    // 9. Source Document Type
    if (filters.sourceDocumentType && filters.sourceDocumentType !== 'ALL') {
      if (item.sourceDocumentType !== filters.sourceDocumentType) return false;
    }

    // 10. Exam Year
    if (filters.examYear && filters.examYear !== 'ALL') {
      if (item.examYear !== filters.examYear) return false;
    }

    // 11. Board or Institution
    if (filters.boardOrInstitution && filters.boardOrInstitution !== 'ALL') {
      const bLower = filters.boardOrInstitution.toLowerCase();
      if (!item.institutionOrBoard?.toLowerCase().includes(bLower)) return false;
    }

    // 12. Verification Status
    if (filters.verificationStatus && filters.verificationStatus !== 'ALL') {
      if (item.verificationStatus !== filters.verificationStatus) return false;
    }

    // 13. Favorites
    if (filters.onlyFavorites && !item.questionRef?.isFavorite) {
      return false;
    }

    // 14. Text Search (Bilingual Bangla & English)
    if (qClean) {
      const matchesTitle = item.title.toLowerCase().includes(qClean);
      const matchesContent = item.content.toLowerCase().includes(qClean);
      const matchesSummary = item.summary ? item.summary.toLowerCase().includes(qClean) : false;
      const matchesChapter = item.chapter ? item.chapter.toLowerCase().includes(qClean) : false;
      const matchesTopic = item.topic ? item.topic.toLowerCase().includes(qClean) : false;
      const matchesSubject = item.subject.toLowerCase().includes(qClean);
      const matchesSource = item.sourceDocumentTitle ? item.sourceDocumentTitle.toLowerCase().includes(qClean) : false;
      const matchesInst = item.institutionOrBoard ? item.institutionOrBoard.toLowerCase().includes(qClean) : false;
      const matchesTags = item.tags ? item.tags.some((t) => t.toLowerCase().includes(qClean)) : false;

      // Question specific fields
      let matchesQuestionFields = false;
      if (item.questionRef) {
        const qr = item.questionRef;
        if (qr.stimulus?.toLowerCase().includes(qClean)) matchesQuestionFields = true;
        if (qr.options?.some((o) => o.toLowerCase().includes(qClean))) matchesQuestionFields = true;
        if (qr.cqParts) {
          if (qr.cqParts.partA.question.toLowerCase().includes(qClean)) matchesQuestionFields = true;
          if (qr.cqParts.partB.question.toLowerCase().includes(qClean)) matchesQuestionFields = true;
          if (qr.cqParts.partC.question.toLowerCase().includes(qClean)) matchesQuestionFields = true;
          if (qr.cqParts.partD.question.toLowerCase().includes(qClean)) matchesQuestionFields = true;
        }
      }

      if (
        !matchesTitle &&
        !matchesContent &&
        !matchesSummary &&
        !matchesChapter &&
        !matchesTopic &&
        !matchesSubject &&
        !matchesSource &&
        !matchesInst &&
        !matchesTags &&
        !matchesQuestionFields
      ) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Duplicate detector between candidate text and existing question bank
 */
export function findPossibleDuplicates(
  candidateText: string,
  existingQuestions: Question[],
  threshold = 0.65
): { question: Question; similarity: number }[] {
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\u0980-\u09FFa-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const candidateTokens = new Set(tokenize(candidateText));
  if (candidateTokens.size === 0) return [];

  const results: { question: Question; similarity: number }[] = [];

  for (const q of existingQuestions) {
    const qText = `${q.stimulus || ''} ${q.questionText || ''} ${q.cqParts ? q.cqParts.partA.question + ' ' + q.cqParts.partB.question : ''}`;
    const qTokens = new Set(tokenize(qText));
    if (qTokens.size === 0) continue;

    let intersectionCount = 0;
    candidateTokens.forEach((t) => {
      if (qTokens.has(t)) intersectionCount++;
    });

    const unionSize = new Set([...candidateTokens, ...qTokens]).size;
    const jaccard = unionSize > 0 ? intersectionCount / unionSize : 0;

    if (jaccard >= threshold) {
      results.push({
        question: q,
        similarity: Math.round(jaccard * 100),
      });
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}
