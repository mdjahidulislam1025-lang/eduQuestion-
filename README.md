# EduQuestion AI — Personal AI Question Bank & Examination Paper Generator

**EduQuestion AI** is a full-stack educational question bank and examination paper generation suite tailored for Classes 8, 9, and 10 in Bangladesh under the National Curriculum and Textbook Board (NCTB) syllabus.

---

## 🌟 Core Features

1. **AI Question Generator (Gemini 3.8 Flash)**
   - Creative Questions (CQ / সৃজনশীল প্রশ্ন) with উদ্দীপক (Stimulus) and standard 4-tier sub-questions: ক. জ্ঞানমূলক (1), খ. অনুধাবনমূলক (2), গ. প্রয়োগমূলক (3), ঘ. উচ্চতর দক্ষতামূলক (4).
   - Multiple Choice Questions (MCQ / বহুনির্বাচনী প্রশ্ন) with 4 options, distractors, correct answers, and pedagogical explanations.
   - Short Questions (SQ / সংক্ষিপ্ত প্রশ্ন) with precise model answers and marks.
   - **"Generate Unique Questions"**: Original questions designed to evaluate deep concept mastery without repeating standard board clichés.

2. **Verified Board Question Archive (শিক্ষা বোর্ড আর্কাইভ)**
   - Curated archive covering SSC and Junior Board examinations from Dhaka, Rajshahi, Cumilla, Chattogram, Jashore, Barishal, Sylhet, Dinajpur, and Mymensingh.
   - Original exam years (2018–2024), exam types, and authentic source citations.

3. **NCTB Textbook Knowledge Base**
   - Searchable syllabus and chapter reference across all 8 NCTB subjects: Bangla, English, BGS, ICT, Physics, Chemistry, General Mathematics, and Higher Mathematics.
   - Document upload & OCR/text extraction to automatically identify chapters, key definitions, formulas, and laws.

4. **Mathematical Equations & Vector Diagram System**
   - High-performance KaTeX rendering for algebraic formulas, indices, fractions, and chemical reaction equations.
   - Educational SVG diagram generator (electric circuits, geometric figures, coordinate grids, Bohr atomic structures) that print crisply at 300 DPI on A4 paper.

5. **Examination Paper Builder & Professional Print/PDF**
   - Section customization (ক-বিভাগ, খ-বিভাগ, গ-বিভাগ) with compulsory instructions.
   - Dynamic real-time calculation of total marks, section marks, and question count.
   - Customizable Institution Name, Title, Logo, and Watermark with adjustable opacity.
   - High-fidelity A4 layout (single-column or 2-column Board layout).
   - Dual download modes: **Student Question Paper** and **Teacher's Model Answer Sheet & Marking Scheme**.

6. **Cloud & Offline Portability**
   - Firebase Authentication & Firestore cloud synchronization.
   - JSON Backup and Restore for complete offline preservation.

---

## 🚀 Deployment on Vercel

### 1. Environment Variables
In your Vercel Project Settings > Environment Variables, add:
- `GEMINI_API_KEY`: Your Google Gemini API key.
- `APP_URL`: Your Vercel production URL (e.g. `https://your-project.vercel.app`).
- `NODE_ENV`: `production`

### 2. Build & Output Configuration
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`
