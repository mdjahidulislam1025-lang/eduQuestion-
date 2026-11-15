# EduQuestion AI — Android (.APK / .AAB) & iOS (.IPA) Packaging Guide

This project is pre-configured as a full Progressive Web App (PWA) **and** includes native Capacitor & Digital Asset Links configuration so you can install it directly or compile store-ready `.apk`, `.aab`, and `.ipa` binaries.

## 1. Instant Installation (Android & iOS — No Store Required)
- **Android (Chrome/Edge):** Click **"অ্যাপ / APK" -> "Install App"** inside the app header, or open Chrome menu -> **Install App**.
- **iOS (Safari on iPhone/iPad):** Tap **Share** -> **Add to Home Screen**.

## 2. Generate Signed `.APK` & `.AAB` (Google Play Store) via PWABuilder
1. Deploy to Vercel (or use your live HTTPS app URL).
2. Visit `https://www.pwabuilder.com/` and enter your live HTTPS URL.
3. Click **Package for Stores**:
   - **Android:** Generates signed `.apk` (for direct phone download/sharing) and `.aab` (for Google Play Console upload), plus `assetlinks.json` verification.
   - **iOS:** Generates an Xcode/App Store package.

## 3. Build `.APK`, `.AAB`, and iOS `.IPA` Locally via Capacitor
`capacitor.config.json` is already configured in the root directory (`appId: com.jahidul.eduquestionai`, `webDir: dist`).

### Android APK & AAB (requires Node.js + Android Studio / JDK 17+)
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleRelease   # Outputs app-release.apk
./gradlew bundleRelease     # Outputs app-release.aab (Google Play Store)
```

### iOS App (requires macOS + Xcode)
```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios            # Archive & Export .ipa in Xcode
```
