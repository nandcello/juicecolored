# Dependency upgrade — September 2026

Updated all workspaces against the npm registry's latest releases on September 20, 2026, with the compatibility constraints below. Existing mobile/offline and backend work was preserved.

## Main versions

| Package               | Version                                   |
| --------------------- | ----------------------------------------- |
| Bun                   | 1.4.0                                     |
| Vite+                 | 0.3.3 (Vite 8.3.0, bundled Vitest 4.1.11) |
| TanStack Start        | 1.168.56                                  |
| TanStack React Router | 1.170.38                                  |
| Tailwind CSS          | 4.3.3                                     |
| Convex                | 1.46.0                                    |
| Expo                  | 57.0.24                                   |
| React Native          | 0.86.3                                    |
| React / React DOM     | 19.2.3                                    |
| Uniwind               | 1.12.0                                    |
| TypeScript (web)      | 7.0.2                                     |
| TypeScript (mobile)   | 6.0.3                                     |

The manifests and `bun.lock` are authoritative for the complete dependency tree.

## Compatibility decisions

- Expo SDK 57 supplies a tested native dependency set. React Native, React, gesture handler, screens, safe-area context, Reanimated, Worklets, mobile React types, and mobile TypeScript follow that set instead of independently selecting newer major/minor releases. The web app shares React 19.2.3 to avoid duplicate React instances during server rendering.
- ESLint stays on 9.39.5. The current Expo React lint plugin crashes on ESLint 10 with `contextOrFilename.getFilename is not a function`.
- Vitest is pinned to Vite+ 0.3.3's bundled 4.1.11. The obsolete `@voidzero-dev/vite-plus-test` alias was replaced with upstream Vitest, and the Vite alias is pinned to the matching Vite+ core release.
- Nitro remains on its current v3 beta release stream, as the app already used Nitro v3.

## Code and configuration changes

- Use ConvexHttpClient for TanStack server data loading. Convex's Next.js preload payload has a function-bearing type that the current TanStack serializer rejects. Client queries still provide live updates; a live `null` result now correctly replaces initial data.
- Await Expo's asynchronous photo copy before reading the copied size or queuing an offline upload. Regression tests cover pending and failed copies.
- Keep thumbnail hooks stable across touch/hover changes and use a consistent server/client initial state. A regression test covers both directions.
- Add the explicit icon dependency removed from Expo's defaults, plus Expo's image and SQLite config plugins.
- Replace the old `@theme dark` declaration with Uniwind light/dark variants so native content follows system appearance. Add `expo-system-ui` for Android automatic appearance.
- Enable SDK 57's scene lifecycle support for Xcode 27 builds.
- Merge Camera and background removal's ML Kit model declarations with `plugins/with-mlkit-dependencies.cjs`. This resolves the Android manifest collision while retaining both `subject_segment` and `barcode_ui`, including on fresh EAS/prebuild runs.
- Use Expo's fingerprint runtime policy so updates with a different native dependency set cannot target an older native build.
- Move Vite+ lint/format settings to the workspace root; ignore generated and installed skill files. Root check/test scripts now cover all workspaces, including mobile ESLint and offline tests.

## Validation

- All 10 tests pass, including Convex behavior, offline retry/copy behavior, and thumbnail input-mode changes.
- Workspace lint, formatting, type checks, and mobile ESLint pass.
- Expo Doctor passes all 21 checks.
- Both iOS and Android Hermes bundles export successfully.
- The iOS release build compiles with Xcode 27 for arm64 and x86_64 simulators. Startup and light/dark appearance were verified on an isolated iOS 26.5 simulator.
- Android `assembleRelease -PreactNativeArchitectures=arm64-v8a` passes, including manifest merge, native background removal, and release lint. Android runtime UI was not tested on a device/emulator.
- `vp install --frozen-lockfile` succeeds without dependency changes.
- Node-server and Vercel production builds pass.
- Development and production browser smoke tests load live Convex content without runtime errors; desktop hover previews and the 390px mobile layout were checked.

### Commands

```sh
vp install
vp run check
vp run test
vp run build
NITRO_PRESET=vercel vp run build
vp run -F @personal/convex test
vp run -F @personal/mobile test
cd apps/mobile
vp dlx expo-doctor@latest
vp exec expo export --platform ios --platform android --output-dir /tmp/personal-mobile-upgrade-export
```

SDK 57 requires iOS 16.4 or newer. A new native build is required for SDK 57; an over-the-air JavaScript update cannot upgrade an SDK 55 binary. Camera, background removal, location permissions, and background sync still require a physical-device smoke test before release. The web app was subsequently deployed to [juicecolored.com](https://juicecolored.com) on September 20, 2026 using production environment variables and Node.js 24. The Vercel deployment is `dpl_4BqJrUbBU9cptgjigrF84YKnqPhA`. The live site passed HTTP, desktop/mobile layout, production-data, and browser-error checks. This web-only release did not deploy Convex functions or migrate the database.

## References

- [Expo SDK upgrade workflow](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [SDK 56 breaking changes](https://expo.dev/changelog/sdk-56)
- [SDK 57 release notes](https://expo.dev/changelog/sdk-57)
- [SDK 57 with Xcode 27](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md#staying-on-sdk-57-with-xcode-27)
- [Vite+ toolchain migration](https://viteplus.dev/guide/migrate)
- [Uniwind theme variables](https://docs.uniwind.dev/theming/global-css)
- [ML Kit model declarations](https://developers.google.com/ml-kit/vision/subject-segmentation/android)
- [Vite+ monorepo configuration](https://viteplus.dev/guide/monorepo)
