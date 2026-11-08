export type ClassLevel = string;

export type SscExamCategory = 'General SSC' | 'Dakhil' | 'SSC Vocational';

export type SscGroup = 'Science' | 'Commerce' | 'Humanities' | 'General' | 'Vocational';

export type QuestionType = 'MCQ' | 'SQ' | 'CQ';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type SourceMode = 'NCTB_TEXTBOOK' | 'BOARD_EXAM' | 'NCTB_BOARD_PATTERN' | 'ORIGINAL_AI' | 'COMMUNITY';

export type LanguageOption = 'Bangla' | 'English' | 'Bilingual';

export type UserRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'REVIEW_REQUIRED' | 'VERIFIED' | 'FAILED';

export interface CQPart {
  question: string;
  marks: number;
  answer?: string;
}

export interface CQStructure {
  partA: CQPart; // ক. জ্ঞানমূলক (1)
  partB: CQPart; // খ. অনুধাবনমূলক (2)
  partC: CQPart; // গ. প্রয়োগমূলক (3)
  partD: CQPart; // ঘ. উচ্চতর দক্ষতামূলক (4)
}

export interface Question {
  id: string;
  workspaceId?: string;
  ownerId?: string;
  classLevel: ClassLevel;
  subject: string;
  chapter: string;
  topic?: string;
  questionType: QuestionType;
  questionText: string;
  stimulus?: string; // উদ্দীপক / context / table / diagram
  cqParts?: CQStructure;
  options?: string[]; // 4 options for MCQ
  correctOptionIndex?: number;
  correctAnswer?: string;
  explanation?: string;
  marks: number;
  difficulty: Difficulty;
  sourceType: SourceMode;
  sscCategory?: SscExamCategory;
  sscGroup?: SscGroup;
  version?: 'Bangla' | 'English';
  setNumber?: string;
  sourceDocumentId?: string;
  sourcePage?: string;
  bookName?: string;
  sourceVerificationStatus?: 'Verified' | 'Review Required' | 'Source not verified';
  confidenceScore?: number;
  boardInfo?: {
    boardName: string;
    year: string;
    examType: string;
    isVerified: boolean;
    pageNumber?: string;
    sscCategory?: SscExamCategory;
  };
  sources?: QuestionSourceRef[];
  timesUsed?: number;
  lastUsedAt?: string;
  officialAnswer?: string;
  adminVerifiedAnswer?: string;
  aiSuggestedAnswer?: string;
  collectionFolder?: string;
  reviewStatus?: 'DRAFT' | 'APPROVED' | 'NEEDS_REVIEW';
  sourcePdfId?: string;
  sourcePdfTitle?: string;
  isAiGenerated?: boolean;
  diagramSvg?: string;
  diagramUrl?: string;
  diagramCaption?: string;
  isFavorite?: boolean;
  tags?: string[];
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaperSection {
  id: string;
  titleBn: string;
  titleEn: string;
  instructions: string;
  totalQuestionsToAnswer?: number;
  questions: Question[];
}

export interface QuestionPaper {
  id: string;
  workspaceId?: string;
  ownerId: string;
  title: string;
  institutionName: string;
  institutionAddress?: string;
  logoUrl?: string;
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkScale?: number;
  watermarkPosition?: 'center' | 'diagonal';
  headerAlignment?: 'center' | 'left' | 'dual';
  classLevel: ClassLevel;
  group?: string;
  subject: string;
  subjectCode?: string;
  academicYear?: string;
  totalMarks: number;
  passMarks?: number;
  duration: string;
  examDate?: string;
  language?: 'Bangla' | 'English' | 'Both';
  instructions: string[];
  sections: PaperSection[];
  layout?: 'standard' | 'two-column' | 'compact';
  fontChoice?: 'bangla-modern' | 'bangla-serif' | 'english';
  showAnswerKey?: boolean;
  templateId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DynamicClassItem {
  id: string;
  name: string;
  nameBn?: string;
  isDefault?: boolean;
  createdBy?: string;
  createdAt: string;
}

export interface DynamicSubjectItem {
  id: string;
  name: string;
  nameBn?: string;
  code?: string;
  classLevel: string;
  group?: string;
  description?: string;
  isCustom?: boolean;
  createdBy?: string;
  createdAt: string;
}

export interface ExamPresetItem {
  id: string;
  name: string;
  nameBn?: string;
  isCustom?: boolean;
  createdBy?: string;
  createdAt: string;
}

export interface UserExamConfiguration {
  id: string;
  userId: string;
  configName: string;
  institutionName: string;
  classLevel: string;
  group?: string;
  subject: string;
  examName: string;
  academicYear: string;
  examDate?: string;
  duration: string;
  fullMarks: number;
  passMarks?: number;
  language: 'Bangla' | 'English' | 'Both';
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  institutionName: string;
  institutionAddress?: string;
  logoUrl?: string;
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkScale?: number;
  watermarkPosition?: 'center' | 'diagonal';
  headerAlignment?: 'center' | 'left' | 'dual';
  fontChoice?: 'bangla-modern' | 'bangla-serif' | 'english';
  defaultLanguage?: LanguageOption;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  userEmail: string;
  displayName: string;
  role: UserRole;
  invitedBy?: string;
  createdAt: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  invitedBy: string;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  createdAt: string;
}

export interface SourceDocumentRecord {
  id: string;
  workspaceId: string;
  uploaderId: string;
  uploaderEmail: string;
  fileName: string;
  fileType: 'PDF' | 'IMAGE' | 'SCANNED_DOC';
  fileSize: number;
  classLevel: ClassLevel;
  subject: string;
  status: DocumentStatus;
  pageCount?: number;
  extractedText?: string;
  extractedChapters?: TextbookChapterData[];
  reviewedBy?: string;
  verifiedAt?: string;
  originalSourceFile?: string;
  createdAt: string;
}

export interface ActivityLogRecord {
  id: string;
  workspaceId: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  createdAt: string;
}

export interface SubmittedQuestion {
  id: string;
  submitterName: string;
  submitterEmail?: string;
  submitterPhone?: string;
  classLevel: string;
  subject: string;
  chapter?: string;
  questionType: QuestionType;
  questionText: string;
  stimulus?: string;
  options?: string[];
  correctAnswer?: string;
  cqParts?: {
    partA: { question: string; marks: number; answer?: string };
    partB: { question: string; marks: number; answer?: string };
    partC: { question: string; marks: number; answer?: string };
    partD: { question: string; marks: number; answer?: string };
  };
  explanation?: string;
  marks: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes?: string;
  notifiedAdminEmail?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface AdminNotification {
  id: string;
  type: 'QUESTION_SUBMITTED' | 'BRANDING_UPDATED' | 'PAPER_CREATED';
  title: string;
  message: string;
  recipientEmail: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  institutionName?: string;
  institutionAddress?: string;
  logoUrl?: string;
  watermarkText?: string;
  watermarkOpacity?: number;
  defaultLanguage?: LanguageOption;
  currentWorkspaceId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TextbookChapterData {
  chapterNumber: string;
  chapterTitle: string;
  mainTopics: string[];
  keyDefinitions: { term: string; definition: string }[];
  formulasAndLaws: string[];
  sampleQuestionIdeas: string[];
  summary: string;
  sourcePageRange?: string;
  isVerified?: boolean;
}

export interface TextbookKnowledgeItem {
  id: string;
  workspaceId?: string;
  ownerId: string;
  title: string;
  classLevel: ClassLevel;
  subject: string;
  editionYear: string;
  chapters: TextbookChapterData[];
  rawNotes?: string;
  sourceDocumentId?: string;
  isVerified?: boolean;
  createdAt: string;
}

export interface BoardExamQuestionRecord {
  id: string;
  workspaceId?: string;
  ownerId?: string;
  boardName: string;
  examYear: string;
  examType: string;
  sscCategory?: SscExamCategory;
  sscGroup?: SscGroup;
  version?: 'Bangla' | 'English';
  setNumber?: string;
  classLevel: ClassLevel;
  subject: string;
  chapter: string;
  questionType: QuestionType;
  questionText: string;
  stimulus?: string;
  cqParts?: CQStructure;
  options?: string[];
  correctOptionIndex?: number;
  correctAnswer?: string;
  explanation?: string;
  marks: number;
  difficulty: Difficulty;
  isVerified: boolean;
  sourceFile?: string;
  sourcePage?: string;
  createdAt: string;
}

export interface SubjectCurriculum {
  id: string;
  classLevels: ClassLevel[];
  nameBn: string;
  nameEn: string;
  code: string;
  sscCategory?: SscExamCategory;
  sscGroup?: SscGroup;
  isCompulsory?: boolean;
  category: 'Science' | 'General' | 'Language' | 'Social' | 'Technology';
  chapters: {
    number: number;
    titleBn: string;
    titleEn: string;
    topics: string[];
  }[];
}

export type NCTBMedium = 'Bangla' | 'English';
export type BookProcessingStatus = 'Uploaded' | 'Processing' | 'Processing Failed' | 'Processed' | 'Needs Review' | 'Verified';
export type BookVerificationStatus = 'Unverified' | 'Needs Review' | 'Verified';

export interface NCTBBookChapter {
  id: string;
  chapterNumber: string; // e.g., "১", "অধ্যায় ১", "Chapter 1"
  titleBn: string;
  titleEn: string;
  startPage: number;
  endPage: number;
  topics: string[];
  subtopics?: string[];
  keyDefinitions?: { term: string; definition: string }[];
  summary?: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface NCTBAuditLogEntry {
  action: string;
  timestamp: string;
  user: string;
  details?: string;
}

export interface NCTBBook {
  id: string;
  workspaceId?: string;
  ownerId?: string;
  classLevel: ClassLevel | 'Class 6' | 'Class 7' | 'Other';
  subject: string;
  bookName: string;
  bookNameEn?: string;
  medium: NCTBMedium;
  curriculumEdition: string;
  publisher: string;
  academicYear?: string;
  language: 'Bangla' | 'English' | 'Bilingual';
  notes?: string;
  coverImageUrl?: string;
  fileUrl?: string;
  fileName: string;
  fileSize: number;
  fileType: 'pdf' | 'scanned_pdf' | 'zip_extracted' | 'image_pages';
  pageCount?: number;
  processingStatus: BookProcessingStatus;
  verificationStatus: BookVerificationStatus;
  processingProgress?: number;
  processingError?: string;
  chapters: NCTBBookChapter[];
  extractedTextSample?: string;
  uploadedAt: string;
  updatedAt: string;
  uploadedBy?: string;
  auditLog?: NCTBAuditLogEntry[];
}

export interface BookUploadQueueItem {
  id: string;
  file?: File;
  fileName: string;
  fileSize: number;
  detectedClass?: string;
  detectedSubject?: string;
  detectedBookName?: string;
  detectedMedium?: NCTBMedium;
  detectedCurriculum?: string;
  status: 'pending' | 'extracting' | 'analyzing' | 'completed' | 'error';
  progress: number;
  errorMessage?: string;
  extractedBook?: Partial<NCTBBook>;
}

// ==========================================
// ADMIN CUSTOM PDF LIBRARY TYPES
// ==========================================

export type PdfDocumentCategory =
  | 'NCTB Textbook'
  | 'Reference Book'
  | 'Guide Book'
  | 'Class Notes'
  | 'Lecture Notes'
  | 'Handout'
  | 'Previous Board Question'
  | 'Model Test'
  | 'Coaching Material'
  | 'University Material'
  | 'Other';

export type PdfAccessLevel = 'OWNER_ONLY' | 'ADMIN_ONLY' | 'SELECTED_MEMBERS' | 'ENTIRE_WORKSPACE';

export type PdfProcessingStatus = 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'REVIEW_NEEDED' | 'FAILED';

export interface PdfExtractedChunk {
  id: string;
  pageNumber: number;
  heading?: string;
  content: string;
  chapterName?: string;
  topicName?: string;
}

export interface AdminPdfDocument {
  id: string;
  workspaceId?: string;
  title: string;
  fileName: string;
  fileUrl?: string;
  fileSize: number;
  pageCount?: number;
  category: PdfDocumentCategory;
  customCategory?: string;
  classLevel: ClassLevel | 'All Classes' | 'Other';
  subject: string;
  chapter?: string;
  topic?: string;
  academicYear?: string;
  institutionName?: string;
  language: 'Bangla' | 'English' | 'Both';
  description?: string;
  accessLevel: PdfAccessLevel;
  allowedMemberIds?: string[];
  tags?: string[];
  status: PdfProcessingStatus;
  failureReason?: string;
  isScanned?: boolean;
  ocrApplied?: boolean;
  extractedChunks: PdfExtractedChunk[];
  detectedChapters?: { chapterNumber: string; title: string; pageRange: string }[];
  uploadedBy: string;
  uploadedByEmail?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// EXAM PAPER IMPORT & QUESTION REPOSITORY TYPES
// ==========================================

export type ExamType =
  | 'Class Test'
  | 'Weekly Exam'
  | 'Monthly Exam'
  | 'Half-Yearly'
  | 'Annual Exam'
  | 'Pre-Test'
  | 'Test Exam'
  | 'Model Test'
  | 'Board Exam'
  | 'Admission Test'
  | 'Other';

export type QuestionImportStatus = 'DRAFT' | 'EXTRACTED' | 'NEEDS_REVIEW' | 'APPROVED' | 'REJECTED' | 'DUPLICATE';

export interface QuestionSourceRef {
  id: string;
  sourceName: string;
  sourceType: 'EXAM_PAPER' | 'ADMIN_PDF' | 'NCTB_BOOK' | 'BOARD_ARCHIVE';
  institutionOrBoard?: string;
  year?: string;
  examType?: string;
  pageNumber?: string;
  addedAt: string;
}

export interface QuestionImportItem extends Question {
  importStatus: QuestionImportStatus;
  duplicateMatchQuestionId?: string;
  duplicateScore?: number;
  rawExtractedBlock?: string;
}

export interface ExamPaperImportRecord {
  id: string;
  workspaceId?: string;
  examName: string;
  institutionName: string;
  classLevel: ClassLevel;
  subject: string;
  examType: ExamType;
  academicYear?: string;
  examYear?: string;
  boardName?: string;
  fullMarks?: number;
  language: 'Bangla' | 'English' | 'Bilingual';
  fileName: string;
  fileUrl?: string;
  status: 'PROCESSING' | 'EXTRACTED' | 'NEEDS_REVIEW' | 'APPROVED' | 'PARTIALLY_APPROVED';
  extractedQuestions: QuestionImportItem[];
  totalExtractedCount: number;
  approvedCount: number;
  uploadedBy: string;
  uploadedByEmail?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// UNIFIED CENTRAL QUESTION BANK & KNOWLEDGE REPOSITORY TYPES
// ==========================================

export type UnifiedContentType =
  | 'ORIGINAL_EXAM_QUESTION'
  | 'MCQ'
  | 'SQ'
  | 'CQ'
  | 'AI_GENERATED'
  | 'NCTB_TEXTBOOK_CONTENT'
  | 'ADMIN_PDF_CONTENT'
  | 'REFERENCE_BOOK_CONTENT'
  | 'CHAPTER_INFO'
  | 'TOPIC_INFO'
  | 'ANSWER_EXPLANATION'
  | 'DIAGRAM_IMAGE_TABLE'
  | 'BOARD_QUESTION'
  | 'MODEL_TEST_QUESTION';

export type RepositoryItemKind = 'QUESTION' | 'KNOWLEDGE_CONTENT';

export type RepositoryVerificationStatus =
  | 'Uploaded'
  | 'Processing'
  | 'Extracted'
  | 'Needs Review'
  | 'Verified'
  | 'Rejected'
  | 'Processing Failed';

export interface RepositoryContentItem {
  id: string;
  kind: RepositoryItemKind;
  contentType: UnifiedContentType;
  title: string;
  classLevel: ClassLevel | 'All Classes' | 'Other' | 'Class 6' | 'Class 7';
  sscCategory?: SscExamCategory;
  sscGroup?: SscGroup;
  version?: 'Bangla' | 'English';
  subject: string;
  chapter?: string;
  chapterNumber?: string | number;
  topic?: string;
  subtopic?: string;
  
  // Knowledge excerpt or question body
  content: string;
  summary?: string;
  pageRange?: string;
  pageNumber?: number | string;
  curriculumEdition?: string;
  
  // Formulas, definitions, equations, diagrams
  formulas?: string[];
  keyDefinitions?: { term: string; definition: string }[];
  diagramSvg?: string;
  diagramUrl?: string;
  diagramCaption?: string;
  tableData?: { headers: string[]; rows: string[][] };
  
  // For Questions
  questionRef?: Question;
  
  // Provenance & Source Metadata
  sourceDocumentId?: string;
  sourceDocumentTitle?: string;
  sourceDocumentType?: 'NCTB_BOOK' | 'ADMIN_PDF' | 'EXAM_PAPER' | 'BOARD_ARCHIVE' | 'MANUAL' | 'AI_GENERATOR';
  institutionOrBoard?: string;
  examType?: ExamType | string;
  examYear?: string;
  academicYear?: string;
  
  // Verification and Authorship
  verificationStatus: RepositoryVerificationStatus;
  isVerified: boolean;
  reviewedBy?: string;
  verifiedAt?: string;
  uploadedBy: string;
  uploadedByEmail?: string;
  
  // Frequency & Organization
  timesUsed?: number;
  lastUsedAt?: string;
  tags?: string[];
  collectionFolder?: string;
  createdAt: string;
  updatedAt?: string;
}

export type UnifiedRepositoryView =
  | 'all-content'
  | 'all-questions'
  | 'mcq-bank'
  | 'sq-bank'
  | 'cq-bank'
  | 'subject-bank'
  | 'nctb-library'
  | 'admin-pdf-library'
  | 'previous-exams'
  | 'verified-questions'
  | 'ai-generated'
  | 'pending-review'
  | 'answers-explanations'
  | 'dashboard';


