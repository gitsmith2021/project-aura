# Aura Campus — Expo Phase 8 Compatibility Report

> **Type:** Pre-implementation native-dependency health check for Phase 8 (P8.3 NFC · P8.5 Push · P8.6 CCTV/RTSP · in-app Razorpay). **Status:** Diagnostics only — no packages installed, no features implemented. **Generated:** 2026-07-01. **Scope:** `aura-mobile` (Expo SDK 54, EAS project `aura-campus-pro`).

---

## 1. Baseline health ✅

- **`expo-doctor`: 18/18 checks passed**, no issues.
- **`expo install --check`: dependencies up to date** — every installed package is on its SDK 54 pin.
- Verdict: the current project is clean. All risk below is about *not-yet-installed* native modules for P8.3/P8.5/P8.6.

---

## 2. Core toolchain (grounded from installed RN 0.81.5)

| Layer | Version (pinned by SDK 54 / RN 0.81) | Status |
|---|---|---|
| Expo SDK | 54 (`expo ^54.0.35`) | ✅ |
| React Native | **0.81.5** | ✅ |
| React | 19.1.0 | ✅ |
| Expo Router | ~6.0.24 | ✅ |
| **Gradle** | **8.14.3** | ✅ (managed by EAS/prebuild) |
| **Android Gradle Plugin** | **8.11.0** | ✅ |
| **Kotlin** | **2.1.20** | ✅ |
| **JDK** | **17** (required by AGP 8.11) | ✅ — EAS image default; local builds need JDK 17 |
| compileSdk / targetSdk | **36** (Android 16) | ✅ |
| minSdk | **24** (Android 7.0) | ✅ |
| NDK | 27.x | ✅ |

**These are not set manually** — they're pinned by the SDK 54 template and the EAS build image. The only way they break is if a third-party module demands a *different* AGP/Kotlin, which is what §4 checks.

---

## 3. ⚠️ The one cross-cutting risk: New Architecture is **ON**

`app.json` has `newArchEnabled: true` (SDK 54 default). RN 0.81 runs **bridgeless** with an interop layer for legacy native modules — most work, but **each third-party native module below must be verified on a real dev build**, because New-Arch is where these packages most often break.

**Decision point before Sprint 4:** keep New Arch **ON** (future-proof; interop usually works) vs. flip **OFF** for v1.0 (maximum third-party compatibility, re-enable later). Recommendation: **attempt ON**, but treat a green dev build per module as the gate — and be ready to set `newArchEnabled: false` if VLC or Razorpay fails to build. This is the single most important thing to settle early.

---

## 4. Native package assessment

### P8.3 — NFC · `react-native-nfc-manager`
| | |
|---|---|
| Recommended | **`^3.17.2`** (npm latest; published 2025-11-28, actively maintained) |
| Install | `npx expo install react-native-nfc-manager` |
| RN 0.81 / SDK 54 | ✅ Compatible |
| New Arch | ✅ Supported (interop/Fabric) — **verify on dev build** |
| Config | Config plugin in `app.json` `plugins` (sets `NFC` permission + intent filters); needs `expo-dev-client` (already installed); **not runnable in Expo Go** |
| Verdict | 🟢 **Low risk — proceed** |

### P8.5 — Push · `expo-notifications` (+ `expo-device`)
| | |
|---|---|
| Recommended | **`expo-notifications@~0.32.17`**, **`expo-device@~8.0.10`** (SDK 54 pins) |
| Install | `npx expo install expo-notifications expo-device` |
| RN 0.81 / SDK 54 / New Arch | ✅ First-party, fully compatible |
| Config | **Requires a dev build** (Expo Go dropped Android remote push in SDK 53+). Android needs **FCM v1**: a Firebase project + `google-services.json` + push credentials uploaded to EAS. |
| Verdict | 🟢 **Low risk (version)** — the real work is FCM credentials/config, not compatibility |

### P8.6 — CCTV / RTSP · **highest risk** 🔴
No single clean answer — RTSP on Android in RN is genuinely hard. Three paths, ranked:

| Option | Version | RTSP? | Risk | Notes |
|---|---|---|---|---|
| **`expo-video`** (first-party) | `~3.0.16` (SDK pin) | ❌ **HLS/DASH/HTTP only, no raw RTSP** | 🟢 zero | **Lowest-risk architecture: restream RTSP→HLS at the NVR/gateway**, play HLS. If the cameras/NVR can do this, use this and avoid a native module entirely. |
| **`react-native-video`** | `^6.19.2` (published 2026-06) | ⚠️ via Media3 ExoPlayer RTSP | 🟠 medium | Actively maintained, New-Arch ready. Media3 RTSP works but H.265-over-RTSP + TCP-interleaved support is device/codec-dependent. |
| **`react-native-vlc-media-player`** | `^1.0.98` (published 2025-11) | ✅ libVLC — widest codec/RTSP support | 🔴 high | Best for exotic codecs (H.265, audio backchannel), but **New-Arch + Kotlin 2.1.20 build must be verified**; larger binary; may need `packagingOptions` for `.so` conflicts via `expo-build-properties`. |
| **Verdict** | | | 🔴 | **Spike required before committing.** Recommend: try **HLS/expo-video** first; if raw RTSP is mandatory, **react-native-video** primary, **VLC** fallback. |

### In-app pay — Razorpay
| Option | Version | Risk | Notes |
|---|---|---|---|
| **WebView checkout** `react-native-webview` | **`13.15.0`** (SDK 54 pin — *not* npm-latest 14.x) | 🟢 low | Razorpay Standard Checkout in a WebView; New-Arch compatible; no fragile native SDK. |
| Keep **deep-link** to web Pay page | (already implemented for parents via `Linking`) | 🟢 lowest | Zero new native surface. |
| **`react-native-razorpay`** (native) | `^3.0.0` (published 2026-04) | 🟠 medium | v3 is recent, but Razorpay's RN SDK has historically lagged New Arch — **verify on dev build**; needs a config plugin. |
| **Verdict** | | 🟢/🟠 | **Prefer WebView or deep-link**; only use the native module if native UX is required. |

### Config helper (needed once native modules land)
- **`expo-build-properties@~1.0.10`** (SDK pin) — to set Android permissions, `kotlinVersion`/`packagingOptions` overrides (VLC), FCM bits. Install when Sprint 4 begins: `npx expo install expo-build-properties`.

---

## 5. Recommended-versions summary

```
react-native-nfc-manager      ^3.17.2      (P8.3)   🟢
expo-notifications            ~0.32.17     (P8.5)   🟢
expo-device                   ~8.0.10      (P8.5)   🟢
expo-build-properties         ~1.0.10      (config) 🟢
── CCTV: pick after a spike ──
expo-video                    ~3.0.16      (HLS)    🟢  ← preferred if NVR restreams
react-native-video            ^6.19.2      (RTSP)   🟠
react-native-vlc-media-player ^1.0.98      (RTSP)   🔴  fallback only
── Pay: prefer WebView/deep-link ──
react-native-webview          13.15.0      (pay)    🟢
react-native-razorpay         ^3.0.0       (pay)    🟠  native, verify
```

> Always install Expo-managed packages with `npx expo install <pkg>` (picks the SDK-pinned version) rather than `npm install`.

---

## 6. Risk ranking & go/no-go

| Feature | Risk | Recommendation |
|---|---|---|
| **P8.3 NFC** | 🟢 Low | **Go** — cleanest of the three; good Sprint 4 candidate |
| **P8.5 Push** | 🟢 Low (version) | **Go** — but do the **FCM credentials setup first** (it's the real gate, not compatibility) |
| **In-app pay** | 🟢 Low if WebView/deep-link | **Go** via WebView/deep-link; skip the native SDK |
| **P8.6 CCTV/RTSP** | 🔴 High | **Spike before committing** — decide HLS-restream vs. RTSP native; this is the only genuine compatibility unknown |

---

## 7. Do this before writing any Sprint 4–6 code

1. **Settle the New Architecture decision** (§3) — run one throwaway dev build with NFC + notifications to confirm interop is green on the target device.
2. **Order the sprints by risk:** P8.3 (NFC) → in-app pay (WebView) → P8.5 (push, after FCM setup) → **P8.6 (CCTV) last**, gated on the RTSP spike.
3. **Answer two environment questions for CCTV:** can the NVR/cameras restream RTSP→HLS? what codec (H.264 vs H.265)? Those answers pick the package.
4. When Sprint 4 starts, add packages with `npx expo install`, then **`eas build --profile development`** and re-run `npx expo-doctor` to confirm the native graph still resolves.

---

**Bottom line:** the toolchain and three of four features (NFC, push, pay-via-WebView) are cleanly compatible with SDK 54 / RN 0.81 — safe to build. **CCTV/RTSP is the one real risk** and needs a spike + a hardware/codec decision before it enters a sprint. The one sharp compatibility gotcha: install `react-native-webview` at the **SDK-pinned 13.15.0**, not npm-latest.

---

*Data sources: `expo-doctor` (18/18), `expo install --check`, RN 0.81.5 `@react-native/gradle-plugin` version catalog (AGP/Kotlin/Gradle), `expo/bundledNativeModules.json` (SDK 54 pins), and npm registry (current third-party versions + publish dates). New-Architecture status per third-party module must still be confirmed on a real dev build.*
