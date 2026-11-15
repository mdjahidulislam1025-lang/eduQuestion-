import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import JSZip from 'jszip';
import {
  Smartphone,
  Download,
  X,
  CheckCircle2,
  Share,
  PlusSquare,
  ExternalLink,
  Package,
  Copy,
  Check,
  Apple,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  isBangla?: boolean;
  variant?: 'header' | 'sidebar' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  isBangla = true,
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'install' | 'apk' | 'ios'>(
    isIOS ? 'ios' : 'install'
  );
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isDownloadingKit, setIsDownloadingKit] = useState(false);

  // Suppress button when already running in standalone installed app mode
  if (isInstalled && variant === 'header') {
    return null;
  }

  const liveUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://eduquestion-ai.vercel.app';
  const pwabuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(liveUrl)}`;

  const handlePrimaryClick = async () => {
    if (isInstallable && variant === 'header' && !isIOS) {
      setShowModal(true);
      return;
    }
    setShowModal(true);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(liveUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownloadMobileBuildKit = async () => {
    setIsDownloadingKit(true);
    try {
      const zip = new JSZip();

      zip.file(
        'capacitor.config.json',
        JSON.stringify(
          {
            appId: 'com.jahidul.eduquestionai',
            appName: 'EduQuestion AI',
            webDir: 'dist',
            bundledWebRuntime: false,
            server: {
              androidScheme: 'https',
              iosScheme: 'https',
            },
            android: {
              allowMixedContent: true,
              captureInput: true,
            },
            ios: {
              contentInset: 'automatic',
            },
          },
          null,
          2
        )
      );

      zip.file(
        'build-android-apk-aab.sh',
        `#!/usr/bin/env bash
set -e

echo "1. Installing Capacitor Android tooling..."
npm install @capacitor/core @capacitor/cli @capacitor/android

echo "2. Building production web bundle..."
npm run build

echo "3. Initializing / syncing Android project..."
if [ ! -d "android" ]; then
  npx cap add android
fi
npx cap sync android

echo "4. Building Release APK and Play Store AAB..."
cd android
./gradlew assembleRelease
./gradlew bundleRelease

echo "Done!"
echo "APK: android/app/build/outputs/apk/release/app-release-unsigned.apk"
echo "AAB: android/app/build/outputs/bundle/release/app-release.aab"
`
      );

      zip.file(
        'build-ios-app.sh',
        `#!/usr/bin/env bash
set -e

echo "1. Installing Capacitor iOS tooling (macOS + Xcode required)..."
npm install @capacitor/core @capacitor/cli @capacitor/ios

echo "2. Building production web bundle..."
npm run build

echo "3. Initializing / syncing iOS project..."
if [ ! -d "ios" ]; then
  npx cap add ios
fi
npx cap sync ios

echo "4. Opening Xcode (Product -> Archive -> Distribute App for App Store / IPA)..."
npx cap open ios
`
      );

      zip.file(
        'assetlinks.json',
        JSON.stringify(
          [
            {
              relation: ['delegate_permission/common.handle_all_urls'],
              target: {
                namespace: 'android_app',
                package_name: 'com.jahidul.eduquestionai',
                sha256_cert_fingerprints: [
                  'REPLACE_WITH_YOUR_PLAY_STORE_OR_KEYSTORE_SHA256_FINGERPRINT',
                ],
              },
            },
          ],
          null,
          2
        )
      );

      zip.file(
        'README_APK_AAB_IOS.md',
        `# EduQuestion AI — Android (.APK / .AAB) & iOS App Build Guide

## Option 1: 1-Click Cloud Packaging (No Android Studio / Xcode Needed)
1. Deploy your app to Vercel or use your shared HTTPS URL:
   ${liveUrl}
2. Open PWABuilder:
   ${pwabuilderUrl}
3. Click "Package for Stores":
   - Android -> Download signed **.APK** (direct install) & **.AAB** (Google Play Store).
   - iOS -> Download Xcode / App Store **.IPA** package.

## Option 2: Build Locally with Capacitor + Android Studio / Xcode
### Android APK & AAB:
1. Place \`capacitor.config.json\` and \`build-android-apk-aab.sh\` in your project root.
2. Run: \`bash build-android-apk-aab.sh\`
3. Outputs:
   - APK: \`android/app/build/outputs/apk/release/app-release-unsigned.apk\`
   - AAB: \`android/app/build/outputs/bundle/release/app-release.aab\`

### iOS (macOS with Xcode):
1. Run: \`bash build-ios-app.sh\`
2. In Xcode, select signing team and run **Product -> Archive**.
`
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'EduQuestionAI_Android_iOS_Build_Kit.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to build mobile kit zip:', err);
    } finally {
      setIsDownloadingKit(false);
    }
  };

  return (
    <>
      {variant === 'header' && (
        <button
          onClick={handlePrimaryClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-blue-600/20"
          title={
            isBangla
              ? 'Android / iOS অ্যাপ ইনস্টল ও APK / AAB ডাউনলোড'
              : 'Install Android / iOS App & Download APK / AAB'
          }
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {isBangla ? 'অ্যাপ / APK' : 'Get App'}
          </span>
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          onClick={handlePrimaryClick}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border border-blue-200 hover:border-blue-300 transition-all"
        >
          <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="flex-1 text-left">
            {isBangla ? 'Android / iOS অ্যাপ (APK/AAB)' : 'Mobile App (APK / AAB / iOS)'}
          </span>
          <Download className="w-3.5 h-3.5 text-blue-600" />
        </button>
      )}

      {variant === 'card' && (
        <button
          onClick={handlePrimaryClick}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <Smartphone className="w-4 h-4" />
          <span>{isBangla ? 'Android (APK/AAB) ও iOS অ্যাপ সেন্টার' : 'Open Android & iOS App Center'}</span>
        </button>
      )}

      {showModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl border border-white/30 shadow-sm bg-blue-800 overflow-hidden shrink-0 flex items-center justify-center">
                    <img
                      src="/icon.svg"
                      alt="EduQuestion AI App Icon"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg leading-tight font-bangla">
                      EduQuestion AI — Android ও iOS মোবাইল অ্যাপ
                    </h3>
                    <p className="text-[11px] text-blue-100">
                      সরাসরি ফোনে ইনস্টল করুন অথবা Google Play (.APK / .AAB) ও iOS প্যাকেজ তৈরি করুন
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 overflow-x-auto shrink-0">
              <button
                onClick={() => setActiveTab('install')}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'install'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Download className="w-3.5 h-3.5" /> ১-ক্লিকে ফোনে ইনস্টল
              </button>
              <button
                onClick={() => setActiveTab('apk')}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'apk'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Package className="w-3.5 h-3.5" /> APK ও AAB ফাইল ডাউনলোড
              </button>
              <button
                onClick={() => setActiveTab('ios')}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'ios'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Apple className="w-3.5 h-3.5" /> iPhone / iPad (iOS)
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5 font-bangla">
              {activeTab === 'install' && (
                <div className="space-y-4">
                  {/* Live Status */}
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-950 space-y-1">
                      <p className="font-bold">
                        PWA ও অফলাইন অ্যাপ ইঞ্জিন সক্রিয় আছে!
                      </p>
                      <p className="text-emerald-800">
                        Android, iPhone ও কম্পিউটারে আলাদা প্লে-স্টোর ছাড়াই ফুল-স্ক্রিন অ্যাপ হিসেবে ইনস্টল করা যাবে এবং অফলাইনেও প্রশ্ন দেখা যাবে।
                      </p>
                    </div>
                  </div>

                  {/* Direct 1-click native browser install */}
                  {isInstallable ? (
                    <button
                      onClick={async () => {
                        const ok = await install();
                        if (ok) setShowModal(false);
                      }}
                      className="w-full py-3.5 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all"
                    >
                      <Download className="w-5 h-5" />
                      <span>এখনই মোবাইল / পিসিতে ইনস্টল করুন (Install App)</span>
                    </button>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <p className="text-xs font-bold text-slate-800">
                        {isIOS
                          ? 'আপনি iPhone / iPad (iOS) ব্যবহার করছেন:'
                          : isAndroid
                          ? 'Android Chrome-এ সরাসরি ইনস্টল করার নিয়ম:'
                          : 'ব্রাউজার থেকে ১-ক্লিকে ইনস্টল করার নিয়ম:'}
                      </p>
                      {isIOS ? (
                        <ol className="text-xs text-slate-700 space-y-2 list-decimal pl-4">
                          <li>
                            Safari ব্রাউজারের নিচে থাকা <strong>Share</strong>{' '}
                            <Share className="w-3.5 h-3.5 inline text-blue-600" /> বাটনে ট্যাপ করুন।
                          </li>
                          <li>
                            নিচে স্ক্রল করে <strong>Add to Home Screen</strong>{' '}
                            <PlusSquare className="w-3.5 h-3.5 inline text-blue-600" /> সিলেক্ট করুন।
                          </li>
                          <li>
                            উপরে ডানদিকে <strong>Add</strong> চাপুন — অ্যাপ আইকন হোম স্ক্রিনে চলে আসবে!
                          </li>
                        </ol>
                      ) : (
                        <ol className="text-xs text-slate-700 space-y-2 list-decimal pl-4">
                          <li>
                            Google Chrome / Edge ব্রাউজারের উপরে ডানদিকে <strong>⋮ মেনু</strong> (অথবা Address bar-এর Install আইকন)-এ ক্লিক করুন।
                          </li>
                          <li>
                            <strong>"Install App"</strong> অথবা <strong>"Add to Home screen"</strong> চাপুন।
                          </li>
                          <li>
                            কয়েক সেকেন্ডের মধ্যেই আপনার ফোনে আসল অ্যাপের মতো আইকন তৈরি হবে!
                          </li>
                        </ol>
                      )}
                    </div>
                  )}

                  {/* Quick link to APK / AAB tab */}
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-blue-950">
                      <p className="font-bold">অন্যদের শেয়ার করার জন্য `.APK` বা Play Store `.AAB` ফাইল দরকার?</p>
                      <p className="text-blue-800">পাশের "APK ও AAB ফাইল ডাউনলোড" ট্যাব থেকে ১ ক্লিকে তৈরি করুন।</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('apk')}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shrink-0"
                    >
                      APK / AAB তৈরি করুন →
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'apk' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 space-y-1.5">
                    <p className="font-bold text-sm">
                      ১. সরাসরি .APK ও Play Store .AAB তৈরি (PWABuilder — সবচেয়ে সহজ)
                    </p>
                    <p className="text-indigo-900 leading-relaxed">
                      আপনার অ্যাপে এখন অফিসিয়াল PWA Manifest, Service Worker, ৫১২×৫১২ ও Maskable আইকন এবং Digital Asset Links কনফিগার করা আছে। আপনার লাইভ ওয়েবসাইট/Vercel লিংক দিয়ে নিচের বাটনে ক্লিক করলেই সরাসরি সাইন করা <strong>.APK</strong> ও <strong>.AAB</strong> ফাইল ডাউনলোড করতে পারবেন।
                    </p>
                  </div>

                  {/* Live URL Copy Box */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      আপনার বর্তমান অ্যাপ URL:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={liveUrl}
                        className="flex-1 text-xs font-mono bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                      />
                      <button
                        onClick={handleCopyUrl}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                      >
                        {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a
                      href={pwabuilderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>PWABuilder-এ .APK / .AAB তৈরি করুন</span>
                    </a>

                    <button
                      onClick={handleDownloadMobileBuildKit}
                      disabled={isDownloadingKit}
                      className="py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <Package className="w-4 h-4 text-cyan-400" />
                      <span>
                        {isDownloadingKit
                          ? 'Build Kit তৈরি হচ্ছে...'
                          : 'Capacitor Android/iOS Build Kit (.ZIP)'}
                      </span>
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                    <p className="font-bold text-slate-900">
                      ২. নিজের কম্পিউটারে Android Studio দিয়ে .APK ও .AAB বানানোর নিয়ম:
                    </p>
                    <p>
                      উপরের <strong>Capacitor Build Kit (.ZIP)</strong> ডাউনলোড করুন অথবা প্রজেক্টে থাকা{' '}
                      <code className="bg-slate-200 px-1 rounded">capacitor.config.json</code> ব্যবহার করে নিচের কমান্ড চালান:
                    </p>
                    <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] overflow-x-auto font-mono">
{`npm install @capacitor/core @capacitor/cli @capacitor/android
npm run build
npx cap add android && npx cap sync android
cd android && ./gradlew assembleRelease bundleRelease`}
                    </pre>
                    <p className="text-[11px] text-slate-500">
                      • APK পাথ: <code>android/app/build/outputs/apk/release/</code><br />
                      • AAB পাথ (Play Store): <code>android/app/build/outputs/bundle/release/app-release.aab</code>
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'ios' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                    <div className="flex items-center gap-2">
                      <Apple className="w-5 h-5 text-cyan-300" />
                      <h4 className="font-bold text-sm">iPhone ও iPad (iOS) অ্যাপ ইনস্টলেশন</h4>
                    </div>
                    <p className="text-xs text-slate-300">
                      iOS Safari-তে <strong>apple-touch-icon.png (180×180)</strong> ও ফুল-স্ক্রিন স্ট্যান্ডঅ্যালোন মোড যুক্ত করা আছে। যেকোনো iPhone থেকে নিচের ৩টি ধাপেই অ্যাপটি ইনস্টল হয়ে যাবে:
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs text-slate-800">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">
                        ১
                      </span>
                      <p>
                        iPhone / iPad-এর <strong>Safari</strong> ব্রাউজারে এই ওয়েবসাইট লিংকটি ওপেন করুন।
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">
                        ২
                      </span>
                      <p>
                        নিচে থাকা <strong>Share</strong> বাটনে (<Share className="w-3.5 h-3.5 inline text-blue-600" />) চাপুন।
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">
                        ৩
                      </span>
                      <p>
                        <strong>Add to Home Screen</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-blue-600" />) চেপে <strong>Add</strong> দিন — হোম স্ক্রিনে আইকনসহ iOS অ্যাপ তৈরি হয়ে যাবে।
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-2">
                    <p className="font-bold">Apple App Store (.IPA) / Xcode প্যাকেজ:</p>
                    <p>
                      macOS-এ Xcode দিয়ে App Store-এ প্রকাশ করতে চাইলে PWABuilder iOS প্যাকেজ অথবা Capacitor iOS কমান্ড ব্যবহার করুন:
                    </p>
                    <pre className="p-2.5 bg-slate-900 text-slate-100 rounded-xl text-[11px] overflow-x-auto font-mono">
{`npm install @capacitor/core @capacitor/cli @capacitor/ios
npm run build && npx cap add ios && npx cap sync ios && npx cap open ios`}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Android & iOS Ready (PWA + Capacitor + TWA)
              </span>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>,
          document.body
        )}
    </>
  );
};

export const OfflineIndicator: React.FC<{ isBangla?: boolean }> = ({ isBangla = true }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="no-print fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg border border-amber-400">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>
        {isBangla
          ? 'অফলাইন মোড — সংরক্ষিত প্রশ্ন ও ডেটা চালু আছে'
          : 'Offline Mode — Cached questions & papers available'}
      </span>
    </div>
  );
};
