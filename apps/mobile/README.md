# TaskFlow Mobile

Native mobile shell for TaskFlow, built as a separate Expo app inside the same repository.

## Goals

- Keep the current web app intact
- Deliver an exact-as-web mobile experience quickly
- Use a native shell while loading the real web app inside a WebView
- Leave room for deeper native integrations later if needed

## Before you run it

1. Install mobile dependencies from the root with `npm run mobile:install`, or directly inside `apps/mobile` with `npm install`.
2. Add the web app URL for the shell:

```bash
EXPO_PUBLIC_WEB_APP_URL=https://your-taskflow-domain.com
```

3. Start the app:

```bash
npm run mobile:dev
```

If Expo reports it cannot resolve `@taskflow/shared`, restart Metro with a clear cache:

```bash
npm run dev -- --clear
```

## Current scaffold

- iPhone-friendly native shell
- Toolbar with back, forward, and reload
- Loads the actual web app for exact UI and behavior parity
- Separate mobile project without disturbing the web codebase

## Optional next implementation priorities

1. Native push/deep-link integrations
2. Offline wrapper behavior
3. Native biometric/app-lock support
4. Selected native screens if you later want hybrid behavior
