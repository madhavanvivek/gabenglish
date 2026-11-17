# Gabenglish mobile preview and IDE setup

This repository uses **Expo + React Native** for the Android-first learner app. The recommended editor is Visual Studio Code, with Android Studio providing the Android SDK and emulator.

## 1. Install the local tools

On the Mac used for development, install:

1. **Visual Studio Code** — https://code.visualstudio.com/
2. **Node.js 22 or newer** — https://nodejs.org/
3. **pnpm 10.10 or newer** — run `corepack enable` and `corepack prepare pnpm@10.10.0 --activate`.
4. **Android Studio** — https://developer.android.com/studio
   - In SDK Manager, install an Android SDK platform and Android SDK Platform-Tools.
   - In Device Manager, create and start an Android Virtual Device (AVD).
   - Keep the Android SDK and emulator versions managed by Android Studio.

Open the cloned `gabenglish` repository folder in VS Code. Accept the recommended workspace extensions when prompted.

## 2. Install project dependencies

From the repository root:

```bash
pnpm install
```

## 3. Configure the API address

The mobile app reads its public API origin from `EXPO_PUBLIC_API_BASE_URL`.

- Android emulator: use `http://10.0.2.2:4000` to reach an API running on the same Mac.
- Physical Android phone: use the Mac's LAN IP, for example `http://192.168.1.20:4000`. Both devices must be on the same trusted Wi-Fi network, and macOS Firewall must allow the development server.
- Hosted development API: use its HTTPS origin.

Create `apps/mobile/.env` from `apps/mobile/.env.example` and set the variable. Never put API keys, passwords, signing secrets or provider credentials in an `EXPO_PUBLIC_*` variable. Do not commit local `.env` files.

If the API has its own environment configuration, follow `apps/api/.env.example` and ensure it listens on a network interface reachable by the emulator/device, not only loopback, when using a physical phone.

## 4. Start the API and mobile preview

Open two VS Code terminals (or use the Gabenglish tasks):

**Terminal 1 — API**

```bash
pnpm dev:api
```

**Terminal 2 — Expo mobile preview**

```bash
pnpm dev:mobile
```

For the Android emulator, start the AVD first, then run:

```bash
pnpm dev:mobile:android
```

This runs Expo's native Android build/install command (rather than relying on Expo Go), so it compiles the app against the repository's pinned Expo SDK and native modules. The first build can take several minutes. Keep the terminal open while Metro is serving the app. After the first successful install, code changes can use Fast Refresh.

Expo will show a QR code and development URL. On a physical Android phone, install Expo Go if the project's Expo SDK is supported by the installed Expo Go version, connect to the same Wi-Fi and scan the QR code. If Expo Go reports an SDK mismatch or a native module is unavailable, use an Expo development build instead; do not change the project's Expo SDK just to work around that mismatch.

## 5. VS Code workspace tasks

Use **Terminal → Run Task** and choose:

- **Gabenglish: Start API**
- **Gabenglish: Start mobile preview (LAN)**
- **Gabenglish: Open Android app in emulator**

The Android task requires Android Studio's emulator to be running and `adb` to be available on PATH.

## Troubleshooting

- **Phone cannot reach API:** do not use `localhost` or `127.0.0.1` on the phone. Use the Mac's LAN IP and confirm both devices share the same network.
- **Emulator cannot reach API:** use `10.0.2.2`, not `localhost`, for the host Mac.
- **Expo cannot find Android:** start an AVD in Android Studio and verify `adb devices`.
- **Port already in use:** stop the existing API/Metro process or choose a free port and update the API base URL consistently.
- **Blank or stale screen:** stop Expo, restart with `pnpm dev:mobile -- --clear`, and check the Metro terminal for the first error.
- **Native dependency / SDK mismatch:** use an Expo development build compatible with this repository's Expo SDK. Avoid upgrading Expo/React Native versions without a planned compatibility change.

## Scope and safety

This setup is for local development only. It does not deploy the app, provision paid services, change production configuration or connect to any other project. Use only Gabenglish development credentials and data.
