import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile } from '../types';
import {
  User,
  Building,
  MapPin,
  Image as ImageIcon,
  Shield,
  LogOut,
  LogIn,
  Save,
  CheckCircle2,
  FileText,
  Sparkles,
  Phone,
  Eye,
  GraduationCap,
  Layers,
} from 'lucide-react';

interface UserProfileViewProps {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile;
  isSuperAdminOwner: boolean;
  isBangla?: boolean;
  onSaveProfile: (updated: Partial<UserProfile>) => Promise<void>;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  currentUser,
  userProfile,
  isSuperAdminOwner,
  isBangla = true,
  onSaveProfile,
  onOpenAuthModal,
  onSignOut,
}) => {
  // Local editable draft state for user's personal branding
  const [displayName, setDisplayName] = useState(
    currentUser?.displayName || userProfile.displayName || ''
  );
  const [institutionName, setInstitutionName] = useState(
    userProfile.institutionName || ''
  );
  const [institutionAddress, setInstitutionAddress] = useState(
    userProfile.institutionAddress || ''
  );
  const [logoUrl, setLogoUrl] = useState(userProfile.logoUrl || '');
  const [watermarkText, setWatermarkText] = useState(
    userProfile.watermarkText || ''
  );
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(
    userProfile.watermarkOpacity ?? 0.08
  );
  const [watermarkPosition, setWatermarkPosition] = useState<'diagonal' | 'center'>(
    userProfile.watermarkPosition || 'diagonal'
  );
  const [phoneNumber, setPhoneNumber] = useState(userProfile.phoneNumber || '');

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync draft when userProfile changes
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || userProfile.displayName || '');
      setInstitutionName(userProfile.institutionName || '');
      setInstitutionAddress(userProfile.institutionAddress || '');
      setLogoUrl(userProfile.logoUrl || '');
      setWatermarkText(userProfile.watermarkText || '');
      setWatermarkOpacity(userProfile.watermarkOpacity ?? 0.08);
      setWatermarkPosition(userProfile.watermarkPosition || 'diagonal');
      setPhoneNumber(userProfile.phoneNumber || '');
    }
  }, [currentUser, userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await onSaveProfile({
        displayName,
        institutionName,
        institutionAddress,
        logoUrl,
        watermarkText,
        watermarkOpacity,
        watermarkPosition,
        phoneNumber,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Unauthenticated Guest State
  if (!currentUser) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs text-center space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-slate-100 to-blue-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
            <User className="w-10 h-10 text-slate-400" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              {isBangla ? 'অতিথি ব্যবহারকারী (Guest User)' : 'Guest Educator / Visitor'}
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {isBangla ? 'ব্যক্তিগত অ্যাকাউন্টে লগইন করুন' : 'Sign in to Personalize Your Profile'}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isBangla
                ? 'যে কেউ তার ব্যক্তিগত জিমেইল দিয়ে লগইন করতে পারেন। লগইন করলে আপনার নিজস্ব স্কুলের নাম, ওয়াটারমার্ক ও প্রোফাইল সংরক্ষিত হবে এবং প্রশ্নপত্র তৈরির সময় স্বয়ংক্রিয়ভাবে যুক্ত হবে।'
                : 'Sign in with your Google or email account to customize your school name, watermark, and personal exam branding.'}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onOpenAuthModal}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 mx-auto shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              {isBangla ? 'গুগল বা জিমেইল দিয়ে লগইন করুন' : 'Sign In with Google / Email'}
            </button>
          </div>

          {/* Feature Highlights for Logged-In Teachers */}
          <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                <Building className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-800 text-xs">
                {isBangla ? 'কাস্টম স্কুল ব্র্যান্ডিং' : 'School Branding'}
              </h4>
              <p className="text-[11px] text-slate-500">
                {isBangla ? 'আপনার প্রতিষ্ঠান বা কোচিংয়ের নাম হেডারে থাকবে' : 'Display your institution on all papers'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-800 text-xs">
                {isBangla ? 'ব্যক্তিগত ওয়াটারমার্ক' : 'Custom Watermark'}
              </h4>
              <p className="text-[11px] text-slate-500">
                {isBangla ? 'প্রশ্নপত্রের ব্যাকগ্রাউন্ডে আপনার ওয়াটারমার্ক' : 'Light watermark on exam sheets'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-800 text-xs">
                {isBangla ? 'প্রশ্ন ও পরীক্ষা পত্র সংরক্ষণ' : 'Saved Exams'}
              </h4>
              <p className="text-[11px] text-slate-500">
                {isBangla ? 'আপনার তৈরি প্রশ্নপত্র ক্লাউডে সংরক্ষিত থাকবে' : 'Full access to your saved exams'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated User Profile & Exam Branding Management
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* User Identity Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName || 'User'}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500 shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-blue-500/20">
                {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  {currentUser.displayName || userProfile.displayName || 'Authorized Educator'}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isSuperAdminOwner
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-blue-100 text-blue-800 border border-blue-300'
                  }`}
                >
                  {isSuperAdminOwner
                    ? '🛡️ মাস্টার অ্যাডমিন (Super Admin)'
                    : '🎓 শিক্ষক / ব্যবহারকারী (Educator)'}
                </span>
              </div>

              <p className="text-xs text-blue-700 font-mono font-medium">{currentUser.email}</p>

              <div className="flex items-center gap-2 pt-0.5 text-[11px] text-slate-500">
                <span>
                  প্রোভাইডার:{' '}
                  <strong className="text-slate-700">
                    {currentUser.providerData?.[0]?.providerId === 'google.com'
                      ? 'Google Account (Gmail)'
                      : 'ইমেইল ও পাসওয়ার্ড'}
                  </strong>
                </span>
                <span>•</span>
                <span className="text-emerald-700 font-bold">● সক্রিয় ক্লাউড সিঙ্ক</span>
              </div>
            </div>
          </div>

          <button
            onClick={onSignOut}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            {isBangla ? 'লগআউট করুন' : 'Sign Out'}
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-2xl flex items-center gap-3 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            {isBangla
              ? 'সফলভাবে আপনার প্রোফাইল ও প্রশ্নপত্রের ব্র্যান্ডিং তথ্য সংরক্ষিত হয়েছে!'
              : 'Successfully saved your profile and exam paper branding preferences!'}
          </span>
        </div>
      )}

      {/* Exam Paper Institutional Branding & Watermark Form */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-blue-600 text-xs font-extrabold uppercase tracking-wider">
            <Building className="w-4 h-4" />
            {isBangla ? 'প্রশ্নপত্র ব্র্যান্ডিং ও প্রতিষ্ঠান কনফিগারেশন' : 'Exam Paper Branding Configuration'}
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
            {isBangla ? 'আপনার প্রশ্নপত্রের প্রাতিষ্ঠানিক হেডার ও ওয়াটারমার্ক' : 'Personalize Your Question Paper Header'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {isBangla
              ? 'এখানে আপনি আপনার স্কুল, কলেজ বা কোচিংয়ের নাম ও ওয়াটারমার্ক সেট করবেন। পরীক্ষা পত্র তৈরি করার সময় এই তথ্যগুলো স্বয়ংক্রিয়ভাবে ব্যবহার হবে।'
              : 'These institutional details and watermark will automatically populate every examination paper you generate.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isBangla ? 'শিক্ষক / পরীক্ষকের নাম (Display Name):' : 'Educator / Examiner Name:'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="যেমন: মুহাম্মদ রফিকুল ইসলাম"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bangla focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isBangla ? 'যোগাযোগ / ফোন নম্বর (ঐচ্ছিক):' : 'Contact / Phone Number (Optional):'}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="যেমন: ০১৭XXXXXXXX"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Institution Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isBangla ? 'প্রতিষ্ঠানের নাম (School / Coaching Center):' : 'Institution / Coaching Name:'}
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="যেমন: মতিঝিল আইডিয়াল স্কুল / উদ্ভাস একাডেমি"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bangla focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Institution Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isBangla ? 'প্রতিষ্ঠানের ঠিকানা ও শহর (Address / City):' : 'Institution Address / City:'}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={institutionAddress}
                  onChange={(e) => setInstitutionAddress(e.target.value)}
                  placeholder="যেমন: মতিঝিল, ঢাকা-১০০০"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bangla focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Watermark Text */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isBangla ? 'ওয়াটারমার্ক টেক্সট (Watermark Text):' : 'Watermark Text:'}
              </label>
              <div className="relative">
                <Sparkles className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="যেমন: IDEAL SCHOOL / UDVASH / CONFIDENTIAL"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Institution Logo URL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isBangla ? 'প্রতিষ্ঠানের লোগো URL (Logo Image URL):' : 'Institution Logo Image URL:'}
              </label>
              <div className="relative">
                <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/school-logo.png"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Watermark Slider & Position Controls */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">
                {isBangla ? 'ওয়াটারমার্ক অপাসিটি / দৃশ্যমানতা:' : 'Watermark Opacity:'}
              </span>
              <span className="text-xs font-mono font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                {Math.round(watermarkOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.02"
              max="0.25"
              step="0.01"
              value={watermarkOpacity}
              onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
              className="w-full cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>খুবই হালকা (২%)</span>
              <span>স্ট্যান্ডার্ড (৮%)</span>
              <span>স্পষ্ট (২৫%)</span>
            </div>
          </div>

          {/* LIVE QUESTION PAPER HEADER & WATERMARK PREVIEW */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-600" />
                {isBangla ? 'লাইভ প্রশ্নপত্র প্রিভিউ (Exam Header Preview):' : 'Live Exam Header Preview:'}
              </span>
              <span className="text-[10px] text-slate-400">
                A4 সাইজ প্রশ্নপত্রে এই হেডারটি তৈরি হবে
              </span>
            </div>

            <div className="relative overflow-hidden bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6 shadow-xs text-center">
              {/* Background Watermark Simulation */}
              {watermarkText && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
                  style={{
                    opacity: watermarkOpacity,
                    transform: watermarkPosition === 'diagonal' ? 'rotate(-25deg)' : 'none',
                  }}
                >
                  <span className="text-3xl sm:text-5xl font-black uppercase text-slate-800 tracking-widest whitespace-nowrap">
                    {watermarkText}
                  </span>
                </div>
              )}

              {/* Foreground Header Content */}
              <div className="relative z-10 space-y-1">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="Logo Preview"
                    onError={(e) => ((e.target as any).style.display = 'none')}
                    className="w-12 h-12 object-contain mx-auto mb-1.5"
                  />
                )}
                <h4 className="text-base sm:text-lg font-black text-slate-900 font-bangla">
                  {institutionName || 'আপনার প্রতিষ্ঠানের নাম এখানে দেখা যাবে'}
                </h4>
                <p className="text-xs text-slate-500 font-bangla">
                  {institutionAddress || 'প্রতিষ্ঠানের ঠিকানা'}
                  {phoneNumber ? ` • ফোন: ${phoneNumber}` : ''}
                </p>
                <div className="text-xs font-bold text-blue-700 pt-1">
                  এসএসসি নির্বাচনী পরীক্ষা — ২০২৬
                </div>
                <div className="text-[11px] text-slate-400 pt-0.5">
                  শ্রেণি: দশম • বিষয়: পদার্থবিজ্ঞান • পূর্ণমান: ৭০
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isSaving
                ? isBangla
                  ? 'সংরক্ষিত হচ্ছে...'
                  : 'Saving to Cloud...'
                : isBangla
                ? 'তথ্য ক্লাউডে সংরক্ষণ করুন (Save Branding)'
                : 'Save Exam Paper Branding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
