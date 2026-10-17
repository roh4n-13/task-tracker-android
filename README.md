# Rolling Task Tracker Android (offline WebView)

This project packages the supplied task tracker HTML into a native Android shell using the Android SDK WebView only. No third-party runtime libraries are used, and the manifest intentionally declares no `INTERNET` permission.

## Requirements
- Android Studio with Android SDK Platform 35 installed
- JDK 17 or newer (JDK 21 is fine)
- Gradle 8.9+ (or use Android Studio's Gradle integration)

## Build a debug APK
From this project directory, run:

```bash
gradle assembleDebug
```

Or open the folder in Android Studio, allow Gradle sync, then select **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

Expected APK path after a successful build:

`app/build/outputs/apk/debug/app-debug.apk`

## Notes
- Minimum Android version: Android 5.0 (API 21).
- Tasks use WebView local storage on the device. Clearing app data can erase them; use Export backup when supported by the device's WebView.
- Google Sheets integration is removed/disabled because this APK is designed to have no network access. It does not sync across devices.
- Build/emulator verification must be performed in an environment with Android SDK Platform 35 and Android Gradle Plugin available; those were not installed in the generation environment.

## Build without installing Android Studio (GitHub Actions)

1. Create a GitHub repository and upload the contents of this folder (the `app`, `build.gradle`, `settings.gradle`, `.github`, and other files) to its root.
2. Open the repository's **Actions** tab. If asked, enable GitHub Actions.
3. Select **Build Task Tracker APK** → **Run workflow** (or wait for the first push build to finish).
4. Open the completed workflow run and download the **TaskTracker-debug-APK** artifact. GitHub downloads it as a ZIP; extract it to find `app-debug.apk`.
5. Transfer `app-debug.apk` to your Android phone and open it to install. If Android asks, allow installation from that source. Only install APKs you built or trust.

This cloud build needs internet access in GitHub Actions to download Android build tools and Gradle plugins. The resulting app itself has no INTERNET permission and is intended to run offline. Google Sheets sync will not work in this offline APK.
