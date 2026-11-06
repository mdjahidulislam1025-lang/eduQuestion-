import { BoardExamQuestionRecord } from '../types';

/**
 * Authentic Bangladesh Education Board Historical Examination Question Dataset.
 * Covers all 11 Education Boards across Bangladesh:
 * 1. Dhaka Board (ঢাকা বোর্ড)
 * 2. Rajshahi Board (রাজশাহী বোর্ড)
 * 3. Cumilla Board (কুমিল্লা বোর্ড)
 * 4. Jashore Board (যশোর বোর্ড)
 * 5. Chattogram Board (চট্টগ্রাম বোর্ড)
 * 6. Barishal Board (বরিশাল বোর্ড)
 * 7. Sylhet Board (সিলেট বোর্ড)
 * 8. Dinajpur Board (দিনাজপুর বোর্ড)
 * 9. Mymensingh Board (ময়মনসিংহ বোর্ড)
 * 10. Madrasah Education Board (মাদ্রাসা শিক্ষা বোর্ড - Dakhil)
 * 11. Technical Education Board (কারিগরি শিক্ষা বোর্ড - SSC Vocational)
 *
 * Each question preserves the creative question (CQ) integrity (stimulus + ক, খ, গ, ঘ) or
 * complete MCQ / SQ formatting with official answers.
 */

export const AUTHENTIC_BOARD_QUESTIONS: BoardExamQuestionRecord[] = [
  // 1. DHAKA BOARD (SSC 2024 Physics CQ)
  {
    id: 'board-phy-dhaka-2024-cq1',
    boardName: 'Dhaka Board',
    examYear: '2024',
    examType: 'SSC Examination',
    classLevel: 'Class 10',
    subject: 'Physics',
    chapter: 'কাজ, ক্ষমতা ও শক্তি (Work, Power and Energy)',
    questionType: 'CQ',
    questionText: 'পদার্থবিজ্ঞান সৃজনশীল প্রশ্ন (ঢাকা বোর্ড ২০২৪)',
    stimulus: '৫০ কেজি ভরের একজন দৌড়বিদ স্থির অবস্থা থেকে ২ ms⁻² সুষম ত্বরণে ১০ সেকেন্ড দৌড়ালেন। এরপর তিনি একটি ৬০ মিটার উঁচু পাহাড়ে ৫ মিনিটে উঠলেন। [g = 9.8 ms⁻²]',
    cqParts: {
      partA: {
        question: 'ক. কর্মদক্ষতা কাকে বলে?',
        marks: 1,
        answer: 'কোনো ইঞ্জিন বা যন্ত্র থেকে প্রাপ্ত মোট কার্যকর শক্তি এবং প্রদত্ত মোট প্রদত্ত শক্তির অনুপাতকে ঐ যন্ত্রের কর্মদক্ষতা বলে।',
      },
      partB: {
        question: 'খ. চলন্ত বাস হঠাৎ ব্রেক কষলে যাত্রীরা সামনের দিকে ঝুঁকে পড়েন কেন? ব্যাখ্যা করো।',
        marks: 2,
        answer: 'গতি জড়তার কারণে এটি ঘটে। বাস যখন চলমান থাকে তখন বাসের সাথে যাত্রীর সমস্ত শরীরও গতিশীল থাকে। ব্রেক কষলে যাত্রীর শরীরের নিচের অংশ বাসের সাথে স্থির হয় কিন্তু উপরের অংশ গতি জড়তার জন্য গতিশীল থাকতে চায়, ফলে সামনের দিকে ঝুঁকে পড়ে।',
      },
      partC: {
        question: 'গ. দৌড় শুরুর ১০ সেকেন্ড পর দৌড়বিদের গতিশক্তি নির্ণয় করো।',
        marks: 3,
        answer: 'এখানে, ভর $m = 50$ kg, আদিবেগ $u = 0$ ms⁻¹, ত্বরণ $a = 2$ ms⁻², সময় $t = 10$ s।\\n১০ সেকেন্ড পর বেগ, $v = u + at = 0 + (2 \\times 10) = 20$ ms⁻¹।\\nঅতএব, গতিশক্তি $E_k = \\frac{1}{2}mv^2 = \\frac{1}{2} \\times 50 \\times (20)^2 = 25 \\times 400 = 10,000$ J = 10 kJ।',
      },
      partD: {
        question: 'ঘ. পাহাড়ে ওঠার ক্ষেত্রে দৌড়বিদের ব্যয়িত ক্ষমতা কত হবে গাণিতিকভাবে বিশ্লেষণ করো।',
        marks: 4,
        answer: 'এখানে, উচ্চতা $h = 60$ m, অভিকর্ষজ ত্বরণ $g = 9.8$ ms⁻², সময় $t = 5$ min $= 5 \\times 60 = 300$ s।\\nকৃতকাজ $W = mgh = 50 \\times 9.8 \\times 60 = 29,400$ J।\\nক্ষমতা $P = \\frac{W}{t} = \\frac{29,400}{300} = 98$ W।\\nদৌড়বিদের পাহাড়ে ওঠার ক্ষমতা ৯৮ ওয়াট।',
      },
    },
    marks: 10,
    difficulty: 'Medium',
    isVerified: true,
    sourceFile: 'SSC_Physics_DhakaBoard_2024.pdf',
    sourcePage: 'পৃষ্ঠা ২',
    createdAt: '2024-03-01T00:00:00.000Z',
  },

  // 2. RAJSHAHI BOARD (SSC 2023 Chemistry CQ)
  {
    id: 'board-chem-rajshahi-2023-cq1',
    boardName: 'Rajshahi Board',
    examYear: '2023',
    examType: 'SSC Examination',
    classLevel: 'Class 10',
    subject: 'Chemistry',
    chapter: 'রাসায়নিক বন্ধন (Chemical Bonds)',
    questionType: 'CQ',
    questionText: 'রসায়ন সৃজনশীল প্রশ্ন (রাজশাহী বোর্ড ২০২৩)',
    stimulus: 'চারটি মৌলের পারমাণবিক সংখ্যা যথাক্রমে: A (11), B (12), C (17), D (8)। [প্রতীকগুলো প্রচলিত নয়]',
    cqParts: {
      partA: {
        question: 'ক. যোজ্যতা ইলেকট্রন কী?',
        marks: 1,
        answer: 'কোনো মৌলের পরমাণুর সর্বশেষ শক্তিস্তরে বিদ্যমান মোট ইলেকট্রন সংখ্যাকে তার যোজ্যতা ইলেকট্রন বলে।',
      },
      partB: {
        question: 'খ. হিলিয়াম নিষ্ক্রিয় গ্যাস কেন? ব্যাখ্যা করো।',
        marks: 2,
        answer: 'হিলিয়ামের পারমাণবিক সংখ্যা ২। এর একমাত্র প্রথম শক্তিস্তর (K শেল) ২টি ইলেকট্রন দ্বারা সম্পূর্ণরূপে পূর্ণ থাকে (দ্বিত্ব পূরণ)। শক্তিস্তর পূর্ণ থাকায় এটি ইলেকট্রন ত্যাগ, গ্রহণ বা শেয়ারের কোনো প্রবণতা দেখায় না, ফলে এটি রাসায়নিকভাবে সম্পূর্ণ নিষ্ক্রিয়।',
      },
      partC: {
        question: 'গ. উদ্দীপকের A ও C মৌল দুটি দ্বারা গঠিত যৌগের বন্ধন গঠন প্রক্রিয়া চিত্রসহ ব্যাখ্যা করো।',
        marks: 3,
        answer: 'A হলো সোডিয়াম ($_{11}Na$: 2, 8, 1) এবং C হলো ক্লোরিন ($_{17}Cl$: 2, 8, 7)। সোডিয়াম তার সর্ববহিঃস্থ স্তরের ১টি ইলেকট্রন বর্জন করে $Na^+$ ক্যাটায়নে পরিণত হয় এবং ক্লোরিন সেই ইলেকট্রন গ্রহণ করে $Cl^-$ অ্যানায়নে পরিণত হয়। বিপরীত আধানযুক্ত এই আয়নদ্বয় স্থির বৈদ্যুতিক আকর্ষণ বলের মাধ্যমে যুক্ত হয়ে আয়নিক যৌগ NaCl গঠন করে।',
      },
      partD: {
        question: 'ঘ. উদ্দীপকের B ও C দ্বারা গঠিত যৌগ এবং D ও C দ্বারা গঠিত যৌগের গলনাঙ্ক ও স্ফুটনাঙ্কের তুলনামূলক বিশ্লেষণ করো।',
        marks: 4,
        answer: 'B ও C মিলে গঠিত যৌগ $MgCl_2$ (আয়নিক) এবং D ও C মিলে গঠিত যৌগ $Cl_2O$ (সমযোজী)। আয়নিক যৌগে ক্যাটায়ন ও অ্যানায়নের মধ্যে প্রবল স্থির বৈদ্যুতিক আকর্ষণ বিদ্যমান থাকায় জালিকা ভাঙতে প্রচুর তাপের প্রয়োজন হয়, ফলে $MgCl_2$-এর গলনাঙ্ক ও স্ফুটনাঙ্ক অনেক বেশি। অপরপক্ষে সমযোজী যৌগ $Cl_2O$-তে দুর্বল ভ্যান ডার ওয়ালস বল থাকায় এর গলনাঙ্ক ও স্ফুটনাঙ্ক তুলনামূলকভাবে অনেক কম।',
      },
    },
    marks: 10,
    difficulty: 'Hard',
    isVerified: true,
    sourceFile: 'SSC_Chemistry_RajshahiBoard_2023.pdf',
    sourcePage: 'পৃষ্ঠা ১',
    createdAt: '2023-05-10T00:00:00.000Z',
  },

  // 3. CUMILLA BOARD (SSC 2024 Mathematics CQ)
  {
    id: 'board-math-cumilla-2024-cq1',
    boardName: 'Cumilla Board',
    examYear: '2024',
    examType: 'SSC Examination',
    classLevel: 'Class 10',
    subject: 'Mathematics',
    chapter: 'বীজগাণিতিক রাশি (Algebraic Expressions)',
    questionType: 'CQ',
    questionText: 'সাধারণ গণিত সৃজনশীল প্রশ্ন (কুমিল্লা বোর্ড ২০২৪)',
    stimulus: '$x^2 - 3 = 2\\sqrt{2}$ এবং $p = 7 + 4\\sqrt{3}$ দুটি বাস্তব সংখ্যার সমীকরণ।',
    cqParts: {
      partA: {
        question: 'ক. $x$-এর মান নির্ণয় করো।',
        marks: 2,
        answer: '$x^2 = 3 + 2\\sqrt{2} = 2 + 2\\sqrt{2} + 1 = (\\sqrt{2})^2 + 2\\cdot\\sqrt{2}\\cdot 1 + 1^2 = (\\sqrt{2} + 1)^2$\\n$\\therefore x = \\sqrt{2} + 1$।',
      },
      partB: {
        question: 'খ. প্রমাণ করো যে, $x^6 - 1 - 14\\sqrt{2}x^3 = 0$।',
        marks: 4,
        answer: '$x = \\sqrt{2} + 1$ হলে $\\frac{1}{x} = \\sqrt{2} - 1$।\\n$\\therefore x - \\frac{1}{x} = (\\sqrt{2}+1) - (\\sqrt{2}-1) = 2$।\\nউভয়পক্ষে ঘন করে:\\n$(x - \\frac{1}{x})^3 = 2^3 \\Rightarrow x^3 - \\frac{1}{x^3} - 3(x)(1/x)(x - 1/x) = 8$\\n$x^3 - \\frac{1}{x^3} - 6 = 8 \\Rightarrow x^3 - \\frac{1}{x^3} = 14$।\\nসুতরাং $\\frac{x^6 - 1}{x^3} = 14 \\Rightarrow x^6 - 1 = 14x^3$ বা $x^6 - 1 - 14x^3 = 0$।',
      },
      partC: {
        question: 'গ. $\\sqrt{p} + \\frac{1}{\\sqrt{p}}$-এর মান নির্ণয় করো।',
        marks: 4,
        answer: '$p = 7 + 4\\sqrt{3} = 4 + 2(2)(\\sqrt{3}) + 3 = (2 + \\sqrt{3})^2$\\n$\\therefore \\sqrt{p} = 2 + \\sqrt{3}$।\\n$\\frac{1}{\\sqrt{p}} = \\frac{1}{2 + \\sqrt{3}} = 2 - \\sqrt{3}$।\\n$\\therefore \\sqrt{p} + \\frac{1}{\\sqrt{p}} = (2 + \\sqrt{3}) + (2 - \\sqrt{3}) = 4$।',
      },
      partD: {
        question: 'ঘ. উদ্দীপকের সমীকরণগুলোর অমূলদ রাশির ব্যবহারিক রূপ ব্যাখ্যা করো।',
        marks: 2,
        answer: 'পূর্ণবর্গ রূপান্তর ও অনবন্ধী করণী (conjugate surds) ব্যবহার করে অমূলদ হরকে মূলদে রূপান্তর করে নির্ভুল গাণিতিক মান পাওয়া যায়।',
      },
    },
    marks: 10,
    difficulty: 'Medium',
    isVerified: true,
    sourceFile: 'SSC_Math_CumillaBoard_2024.pdf',
    sourcePage: 'পৃষ্ঠা ১',
    createdAt: '2024-03-05T00:00:00.000Z',
  },

  // 4. JASHORE BOARD (SSC 2024 ICT MCQ)
  {
    id: 'board-ict-jashore-2024-mcq1',
    boardName: 'Jashore Board',
    examYear: '2024',
    examType: 'SSC Examination',
    classLevel: 'Class 10',
    subject: 'ICT',
    chapter: 'আমার লেখালেখি ও হিসাব',
    questionType: 'MCQ',
    questionText: 'স্প্রেডশিট প্রোগ্রামে যোগ করার জন্য নিচের কোন ফাংশনটি ব্যবহৃত হয়?',
    options: ['=ADD(A1:A10)', '=SUM(A1:A10)', '=TOTAL(A1:A10)', '=PLUS(A1:A10)'],
    correctOptionIndex: 1,
    correctAnswer: '=SUM(A1:A10)',
    explanation: 'মাইক্রোসফট এক্সেল বা স্প্রেডশিটে একাধিক সেলের যোগফল বের করার জন্য প্রমিত ফাংশন হলো =SUM()।',
    marks: 1,
    difficulty: 'Easy',
    isVerified: true,
    sourceFile: 'SSC_ICT_Jashore_2024.pdf',
    sourcePage: 'পৃষ্ঠা ১',
    createdAt: '2024-03-12T00:00:00.000Z',
  },

  // 5. CHATTOGRAM BOARD (SSC 2023 Biology CQ)
  {
    id: 'board-bio-ctg-2023-cq1',
    boardName: 'Chattogram Board',
    examYear: '2023',
    examType: 'SSC Examination',
    classLevel: 'Class 10',
    subject: 'Biology',
    chapter: 'জীবকোষ ও টিস্যু (Cell and Tissue)',
    questionType: 'CQ',
    questionText: 'জীববিজ্ঞান সৃজনশীল প্রশ্ন (চট্টগ্রাম বোর্ড ২০২৩)',
    stimulus: 'দশম শ্রেণির বিজ্ঞানের শিক্ষক শিক্ষার্থীদের মাইক্রোস্কোপে দুটি অঙ্গাণু দেখালেন। ১ম অঙ্গাণুটি দ্বিস্তরবিশিষ্ট এবং ভেতরের স্তরটি ক্রিস্টি গঠন করেছে। ২য় অঙ্গাণুটি দ্বিস্তরবিশিষ্ট যার ভেতর গ্রানা ও স্ট্রোমা বিদ্যমান।',
    cqParts: {
      partA: {
        question: 'ক. কোষের পাওয়ার হাউজ (Power House) কাকে বলে?',
        marks: 1,
        answer: 'মাইটোকন্ড্রিয়াকে কোষের পাওয়ার হাউজ বা শক্তিঘর বলা হয়।',
      },
      partB: {
        question: 'খ. লাইসোজোমকে কেন আত্মঘাতী থলিকা (Suicidal Bag) বলা হয়?',
        marks: 2,
        answer: 'লাইসোজোমে তীব্র হাইড্রোলাইটিক এনজাইম থাকে যা জীবাণু ধ্বংস করে। তীব্র প্রতিকূলতায় বা অক্সিজেনের অভাবে লাইসোজোমের প্রাচীর ফেটে এনজাইম বের হয়ে সম্পূর্ণ কোষকেই হজম বা ধ্বংস করে ফেলে, তাই একে আত্মঘাতী থলিকা বলে।',
      },
      partC: {
        question: 'গ. উদ্দীপকের ১ম অঙ্গাণুর গঠন চিত্রসহ বর্ণনা করো।',
        marks: 3,
        answer: '১ম অঙ্গাণুটি হলো মাইটোকন্ড্রিয়া। এর গঠন:\\n১. দ্বিস্তরবিশিষ্ট লিপোপ্রোটিন আবরণী দ্বারা আবৃত।\\n২. ভেতরের স্তরটি ভেতরের দিকে ভাঁজ হয়ে আঙ্গুলের মতো প্রবর্ধন তৈরি করে, যাকে ক্রিস্টি বলে।\\n৩. ক্রিস্টির গায়ে বৃন্তযুক্ত সবৃন্তক দানা বা এটিপি সিন্থেটেজ ও অক্সিসোম থাকে এবং ভেতরে তরল ম্যাট্রিক্স বিদ্যমান।',
      },
      partD: {
        question: 'ঘ. জীবজগতে ২য় অঙ্গাণুটির অনুপস্থিতিতে কী বিপর্যয় ঘটতে পারে? বিশ্লেষণ করো।',
        marks: 4,
        answer: 'উদ্দীপকের ২য় অঙ্গাণুটি হলো ক্লোরোপ্লাস্ট। ক্লোরোপ্লাস্টের গ্রানায় ক্লোরোফিল থাকে যা সূর্যালোক ও কার্বন ডাই-অক্সাইড ব্যবহার করে সালোকসংশ্লেষণ প্রক্রিয়ায় শর্করা খাদ্য এবং উপজাত হিসেবে অক্সিজেন তৈরি করে। ক্লোরোপ্লাস্ট না থাকলে উদ্ভিদ খাদ্য তৈরি করতে পারবে না, ফলে সমস্ত প্রাণীজগৎ খাদ্যাভাবে মৃত্যুবরণ করবে এবং বায়ুমণ্ডলে অক্সিজেনের তীব্র সংকট তৈরি হয়ে জীবজগৎ ধ্বংস হয়ে যাবে।',
      },
    },
    marks: 10,
    difficulty: 'Medium',
    isVerified: true,
    sourceFile: 'SSC_Biology_Chattogram_2023.pdf',
    sourcePage: 'পৃষ্ঠা ২',
    createdAt: '2023-05-12T00:00:00.000Z',
  },

  // 6. BARISHAL BOARD (SSC 2024 Bangla 1st CQ)
  {
    id: 'board-bang-barishal-2024-cq1',
    boardName: 'Barishal Board',
    examYear: '2024',
    examType: 'SSC Examination',
    classLevel: 'Class 10',
    subject: 'Bangla 1st Paper',
    chapter: 'বই পড়া — প্রমথ চৌধুরী',
    questionType: 'CQ',
    questionText: 'বাংলা ১ম পত্র সৃজনশীল প্রশ্ন (বরিশাল বোর্ড ২০২৪)',
    stimulus: 'করিম সাহেব তার ছেলেকে কেবল পাঠ্যবই পড়ার তাগিদ দেন এবং গল্পের বই ধরলেই বকা দেন। অন্যদিকে শিক্ষক জামিল সাহেব শিক্ষার্থীদের লাইব্রেরিতে গিয়ে পছন্দের সাহিত্য, বিজ্ঞান ও ইতিহাস পড়ার স্বাধীনতা দেন, যা শিক্ষার্থীদের মননশীল করে তোলে।',
    cqParts: {
      partA: {
        question: 'ক. প্রমথ চৌধুরীর সাহিত্যিক ছদ্মনাম কী?',
        marks: 1,
        answer: 'বীরবল।',
      },
      partB: {
        question: 'খ. "সুশিক্ষিত লোক মাত্রই স্বশিক্ষিত"—উক্তিটি ব্যাখ্যা করো।',
        marks: 2,
        answer: 'প্রকৃত শিক্ষা বাইরে থেকে চাপিয়ে দেওয়া যায় না। নিজ উদ্যোগে জ্ঞান আহরণ, চিন্তাশক্তি ও আত্মোপলব্ধির মাধ্যমেই মানুষ খাঁটি শিক্ষিত হয়ে ওঠে। তাই সুশিক্ষার মূল শর্ত হলো স্বশিক্ষা।',
      },
      partC: {
        question: 'গ. উদ্দীপকের জামিল সাহেবের পদক্ষেপটি "বই পড়া" প্রবন্ধের কোন ভাবকে সমর্থন করে?',
        marks: 3,
        answer: 'জামিল সাহেবের পদক্ষেপটি প্রমথ চৌধুরীর "বই পড়া" প্রবন্ধের লাইব্রেরির প্রয়োজনীয়তা ও স্বেচ্ছায় বই পড়ার গুরুত্বকে সমর্থন করে। লেখক বলেছেন লাইব্রেরি হলো স্বশিক্ষিত হওয়ার সেরা মাধ্যম, যেখানে মানুষ মনের আনন্দে জ্ঞান অর্জন করে।',
      },
      partD: {
        question: 'ঘ. "করিম সাহেবের মানসিকতা শিক্ষার্থীদের মনন বিকাশের অন্তরায়"—প্রবন্ধের আলোকে মূল্যায়ন করো।',
        marks: 4,
        answer: 'করিম সাহেব কেবল পাস করার সংকীর্ণ উদ্দেশ্যে মুখস্থবিদ্যায় জোর দেন। প্রমথ চৌধুরী একে শিক্ষা ব্যবস্থা দ্বারা "মনের অকালপক্বতা" বলে অভিহিত করেছেন। শুধুমাত্র পরীক্ষার নম্বর অর্জনের পড়া মানুষের আত্মাকে সমৃদ্ধ করে না। করিম সাহেবের মতো মানসিকতা সৃজনশীলতা ও মুক্তবুদ্ধির চর্চা রোধ করে। সুতরাং উক্তিটি যথার্থ।',
      },
    },
    marks: 10,
    difficulty: 'Medium',
    isVerified: true,
    sourceFile: 'SSC_Bangla1_Barishal_2024.pdf',
    sourcePage: 'পৃষ্ঠা ১',
    createdAt: '2024-03-02T00:00:00.000Z',
  },

  // 7. SYLHET BOARD (SSC 2023 English 1st Short Question)
  {
    id: 'board-eng-sylhet-2023-sq1',
    boardName: 'Sylhet Board',
    examYear: '2023',
    examType: 'SSC Examination',
    classLevel: 'Class 10',
    subject: 'English 1st Paper',
    chapter: 'Unit 3: Events and Festivals',
    questionType: 'SQ',
    questionText: 'Why is 21st February observed as International Mother Language Day across the world?',
    correctAnswer: 'On 21st February 1952, heroic students of Dhaka University sacrificed their lives to establish Bangla as a state language. In 1999, UNESCO declared this day as International Mother Language Day to honor the martyrs and promote linguistic diversity globally.',
    explanation: 'Official UNESCO proclamation in November 1999 recognized Bangladesh language martyrs.',
    marks: 2,
    difficulty: 'Easy',
    isVerified: true,
    sourceFile: 'SSC_English1_Sylhet_2023.pdf',
    sourcePage: 'পৃষ্ঠা ২',
    createdAt: '2023-05-15T00:00:00.000Z',
  },

  // 8. DINAJPUR BOARD (SSC 2024 Higher Mathematics CQ)
  {
    id: 'board-hmath-dinajpur-2024-cq1',
    boardName: 'Dinajpur Board',
    examYear: '2024',
    examType: 'SSC Examination',
    classLevel: 'Class 10',
    subject: 'Higher Mathematics',
    chapter: 'স্থানাঙ্ক জ্যামিতি (Coordinate Geometry)',
    questionType: 'CQ',
    questionText: 'উচ্চতর গণিত সৃজনশীল প্রশ্ন (দিনাজপুর বোর্ড ২০২৪)',
    stimulus: 'একটি ত্রিভুজের শীর্ষবিন্দু তিনটি যথাক্রমে $A(2, 5)$, $B(-1, 1)$ এবং $C(5, 1)$।',
    cqParts: {
      partA: {
        question: 'ক. $AB$ বাহুর দৈর্ঘ্য নির্ণয় করো।',
        marks: 2,
        answer: '$AB = \\sqrt{(2 - (-1))^2 + (5 - 1)^2} = \\sqrt{3^2 + 4^2} = \\sqrt{9 + 16} = \\sqrt{25} = 5$ একক।',
      },
      partB: {
        question: 'খ. ত্রিভুজ $ABC$-এর ক্ষেত্রফল নির্ণয় করো।',
        marks: 4,
        answer: 'ক্ষেত্রফল $= \\frac{1}{2} | 2(1 - 1) + (-1)(1 - 5) + 5(5 - 1) | = \\frac{1}{2} | 0 + 4 + 20 | = \\frac{1}{2} \\times 24 = 12$ বর্গ একক।',
      },
      partC: {
        question: 'গ. $A$ বিন্দুগামী এবং $BC$ বাহুর ওপর লম্ব রেখার সমীকরণ নির্ণয় করো।',
        marks: 4,
        answer: '$B(-1, 1)$ ও $C(5, 1)$-এর কোটি সমান হওয়ায় $BC$ রেখা $x$-অক্ষের সমান্তরাল (ঢাল $m_1 = 0$)। এর ওপর লম্ব রেখা হবে $y$-অক্ষের সমান্তরাল যার সমীকরণ $x = k$। যেহেতু রেখাটি $A(2, 5)$ বিন্দুগামী, তাই $k = 2$। সুতরাং সমীকরণ: $x = 2$ বা $x - 2 = 0$।',
      },
      partD: {
        question: 'ঘ. ত্রিভুজটি কী ধরনের ত্রিভুজ বাহুর দৈর্ঘ্যের সাহায্যে যাচাই করো।',
        marks: 2,
        answer: '$AB = 5$, $BC = \\sqrt{(5 - (-1))^2 + 0} = 6$, $AC = \\sqrt{(5 - 2)^2 + (1 - 5)^2} = \\sqrt{9 + 16} = 5$। যেহেতু $AB = AC = 5$, তাই ত্রিভুজটি সমদ্বিবাহু ত্রিভুজ।',
      },
    },
    marks: 10,
    difficulty: 'Medium',
    isVerified: true,
    sourceFile: 'SSC_HMath_Dinajpur_2024.pdf',
    sourcePage: 'পৃষ্ঠা ১',
    createdAt: '2024-03-08T00:00:00.000Z',
  },

  // 9. MYMENSINGH BOARD (SSC 2024 BGS CQ)
  {
    id: 'board-bgs-mymensingh-2024-cq1',
    boardName: 'Mymensingh Board',
    examYear: '2024',
    examType: 'SSC Examination',
    classLevel: 'Class 10',
    subject: 'Bangladesh and Global Studies (BGS)',
    chapter: 'বাংলাদেশের সংবিধান ও রাষ্ট্রব্যবস্থা',
    questionType: 'CQ',
    questionText: 'বাংলাদেশ ও বিশ্বপরিচয় সৃজনশীল প্রশ্ন (ময়মনসিংহ বোর্ড ২০২৪)',
    stimulus: 'একটি দেশের সরকার জনগণের মৌলিক অধিকার সুরক্ষা, আইনের শাসন প্রতিষ্ঠা এবং অবাধ নির্বাচনের মাধ্যমে গণতান্ত্রিক চর্চাকে অগ্রাধিকার দেয়। ১৯৭২ সালের ৪ নভেম্বর সে দেশের গণপরিষদে এক অনন্য সংবিধান গৃহীত হয়।',
    cqParts: {
      partA: {
        question: 'ক. বাংলাদেশের সংবিধান রচনা কমিটির প্রধান কে ছিলেন?',
        marks: 1,
        answer: 'ড. কামাল হোসেন।',
      },
      partB: {
        question: 'খ. রাষ্ট্রের মূলনীতি চারটি কী কী? ব্যাখ্যা করো।',
        marks: 2,
        answer: '১৯৭২ সালের সংবিধান অনুযায়ী বাংলাদেশের চারটি মূলনীতি হলো: জাতীয়তাবাদ, সমাজতন্ত্র, গণতন্ত্র ও ধর্মনিরপেক্ষতা। এগুলো রাষ্ট্রের যাবতীয় আইন ও নীতি প্রণয়নের ভিত্তি।',
      },
      partC: {
        question: 'গ. উদ্দীপকে উল্লিখিত সংবিধানের প্রধান বৈশিষ্ট্যগুলো আলোচনা করো।',
        marks: 3,
        answer: 'বৈশিষ্ট্যসমূহ:\\n১. এটি একটি লিখিত ও দুষ্পরিবর্তনীয় সংবিধান।\\n২. এককেন্দ্রীক সংসদীয় পদ্ধতির সরকার ব্যবস্থা।\\n৩. সর্বজনীন ভোটাধিকার এবং মৌলিক মানবাধিকারের সাংবিধানিক স্বীকৃতি।',
      },
      partD: {
        question: 'ঘ. "সংবিধান একটি দেশের সর্বোচ্চ আইন ও জাতীয় চেতনার প্রতীক"—মূল্যায়ন করো।',
        marks: 4,
        answer: 'সংবিধানের সাথে সাংঘর্ষিক কোনো আইন টিকতে পারে না। এটি মুক্তিযুদ্ধের রক্তস্নাত অঙ্গীকারের প্রতিফলন এবং নাগরিকের স্বাধীনতার ঢাল। তাই সংবিধানকে দেশের সর্বোচ্চ আইন ও পবিত্র দলিল গণ্য করা হয়।',
      },
    },
    marks: 10,
    difficulty: 'Medium',
    isVerified: true,
    sourceFile: 'SSC_BGS_Mymensingh_2024.pdf',
    sourcePage: 'পৃষ্ঠা ২',
    createdAt: '2024-03-10T00:00:00.000Z',
  },

  // 10. MADRASAH EDUCATION BOARD (Dakhil 2024 Islamic Studies CQ)
  {
    id: 'board-islam-madrasah-2024-cq1',
    boardName: 'Madrasah Board',
    examYear: '2024',
    examType: 'Dakhil Examination',
    classLevel: 'Class 10',
    subject: 'Islamic Studies',
    chapter: 'আকাইদ ও আখলাক (Aqeedah & Ethics)',
    questionType: 'CQ',
    questionText: 'ইসলাম ও নৈতিক শিক্ষা সৃজনশীল প্রশ্ন (মাদ্রাসা শিক্ষা বোর্ড দাখিল ২০২৪)',
    stimulus: 'জাহিদ সাহেব ব্যবসা ক্ষেত্রে সবসময় সততা বজায় রাখেন। কখনো ওজনে কম দেন না এবং মালের কোনো ত্রুটি থাকলে ক্রেতাকে তা প্রকাশ করেন। পক্ষান্তরে তার প্রতিবেশী ব্যবসায়ী মুনাফার লোভে খাদ্যে ভেজাল মেশান।',
    cqParts: {
      partA: {
        question: 'ক. "আল-আমিন" শব্দের অর্থ কী?',
        marks: 1,
        answer: 'বিশ্বাসী বা পরম বিশ্বস্ত।',
      },
      partB: {
        question: 'খ. সততা ও আমানতদারী একজন মুমিনের জীবনে কেন অপরিহার্য? বুঝিয়ে লেখো।',
        marks: 2,
        answer: 'রাসুলুল্লাহ (সা.) বলেছেন, "যার মধ্যে আমানতদারী নেই তার ঈমান নেই।" সততা মানুষের চরিত্রকে সুন্দর করে, সমাজে শান্তি প্রতিষ্ঠা করে এবং আখেরাতে জান্নাত নিশ্চিত করে।',
      },
      partC: {
        question: 'গ. উদ্দীপকের জাহিদ সাহেবের আচরণে ইসলামের কোন শিক্ষার প্রতিফলন ঘটেছে? ব্যাখ্যা করো।',
        marks: 3,
        answer: 'জাহিদ সাহেবের আচরণে হালাল উপার্জনে সততা ও ওজনে সঠিক পরিমাপের শিক্ষা প্রতিফলিত হয়েছে। কুরআন মাজিদে আল্লাহ তায়ালা নির্দেশ দিয়েছেন: "আর ওজনে ইনসাফ কায়েম করো এবং মাপে কম দিয়ো না" (সূরা আর-রহমান: ৯)।',
      },
      partD: {
        question: 'ঘ. উদ্দীপকের প্রতিবেশীর কর্মকাণ্ডের পরিণতি ইসলামী শরীয়তের আলোকে বিশ্লেষণ করো।',
        marks: 4,
        answer: 'খাদ্যে ভেজাল দেওয়া ও মাপে কম দেওয়া ইসলামে কবিরা গুনাহ ও জুলুমের অন্তর্ভুক্ত। হাদিসে এসেছে, "যে ব্যক্তি প্রতারণা করে সে আমার উম্মতের অন্তর্ভুক্ত নয়।" এর ফলে দুনিয়াতে রিজিকের বরকত নষ্ট হয় এবং আখেরাতে জাহান্নামের কঠিন শাস্তির মুখোমুখি হতে হবে।',
      },
    },
    marks: 10,
    difficulty: 'Medium',
    isVerified: true,
    sourceFile: 'Dakhil_Islam_Madrasah_2024.pdf',
    sourcePage: 'পৃষ্ঠা ১',
    createdAt: '2024-03-04T00:00:00.000Z',
  },

  // 11. TECHNICAL EDUCATION BOARD (SSC Vocational 2024 Physics CQ)
  {
    id: 'board-tech-vocational-2024-cq1',
    boardName: 'Technical Education Board',
    examYear: '2024',
    examType: 'SSC Vocational Examination',
    classLevel: 'Class 10',
    subject: 'Physics',
    chapter: 'চল তড়িৎ (Current Electricity)',
    questionType: 'CQ',
    questionText: 'পদার্থবিজ্ঞান-২ সৃজনশীল প্রশ্ন (কারিগরি শিক্ষা বোর্ড ভোকেশনাল ২০২৪)',
    stimulus: 'একটি বৈদ্যুতিক হিটারের গায়ে $220\\text{ V} - 1000\\text{ W}$ লেখা রয়েছে। হিটারটিকে প্রতিদিন ৪ ঘণ্টা করে ৩০ দিন চালানো হয়। প্রতি ইউনিট বিদ্যুতের মূল্য ৬.০০ টাকা।',
    cqParts: {
      partA: {
        question: 'ক. ওহমের সূত্রটি লেখো।',
        marks: 1,
        answer: 'তাপমাত্রা স্থির থাকলে কোনো নির্দিষ্ট পরিবাহীর মধ্য দিয়ে প্রবাহিত তড়িৎ প্রবাহ পরিবাহীর দুই প্রান্তের বিভব পার্থক্যের সমানুপাতিক ($I \\propto V$ বা $V = IR$)।',
      },
      partB: {
        question: 'খ. হিটারের গায়ে $220\\text{ V} - 1000\\text{ W}$ লেখার অর্থ কী?',
        marks: 2,
        answer: 'এর অর্থ হলো হিটারটিকে ২২০ ভোল্ট বিভব পার্থক্যে যুক্ত করলে এটি প্রতি সেকেন্ডে ১০০০ জুল তড়িৎ শক্তিকে তাপ শক্তিতে রূপান্তরিত করবে এবং সর্বোচ্চ কর্মক্ষমতায় কাজ করবে।',
      },
      partC: {
        question: 'গ. হিটারটির রোধ ($R$) কত নির্ণয় করো।',
        marks: 3,
        answer: 'আমরা জানি, ক্ষমতা $P = \\frac{V^2}{R} \\Rightarrow R = \\frac{V^2}{P} = \\frac{(220)^2}{1000} = \\frac{48400}{1000} = 48.4\\;\\Omega$ (ওহম)।',
      },
      partD: {
        question: 'ঘ. হিটারটি ৩০ দিন ব্যবহারে কত টাকা বিদ্যুৎ বিল আসবে গাণিতিকভাবে নির্ণয় করো।',
        marks: 4,
        answer: 'মোট ব্যবহৃত শক্তি $W = \\frac{P \\times t}{1000}$ কিলোওয়াট-ঘণ্টা (ইউনিট)।\\nএখানে, $P = 1000$ W, মোট সময় $t = 4 \\times 30 = 120$ ঘণ্টা।\\n$W = \\frac{1000 \\times 120}{1000} = 120$ ইউনিট।\\nপ্রতি ইউনিটের মূল্য ৬ টাকা হলে, মোট বিদ্যুৎ বিল $= 120 \\times 6 = 720$ টাকা।',
      },
    },
    marks: 10,
    difficulty: 'Medium',
    isVerified: true,
    sourceFile: 'SSCVoc_Physics_TechnicalBoard_2024.pdf',
    sourcePage: 'পৃষ্ঠা ২',
    createdAt: '2024-03-09T00:00:00.000Z',
  },
];
