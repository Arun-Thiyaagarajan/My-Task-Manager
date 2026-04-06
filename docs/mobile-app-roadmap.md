# TaskFlow Mobile Roadmap

This repo now includes a native mobile scaffold in `apps/mobile` and a shared domain package in `packages/shared`.

## What is implemented now

- Separate Expo app in the same repository
- Shared package for core types, constants, and validators
- iPhone-first premium shell with native tabs
- Starter screens for:
  - Tasks
  - Task detail
  - Notes
  - Templates
  - Insights
  - Settings
- Firebase mobile bootstrap utility using Expo public env vars

## What is intentionally not complete yet

- Real Firebase auth/session management
- Real Firestore query/mutation layer
- Full feature parity with the web app
- Native file uploads, exports, PDF/Excel flows
- Push notifications and reminder scheduling
- App store build/signing configuration

## Recommended next steps

1. Install dependencies at the repo root with workspace support.
2. Add Expo public Firebase variables for mobile.
3. Implement auth bootstrap and workspace/company loading.
4. Replace sample data with real shared data hooks.
5. Port core task CRUD, comments, reminders, notes, and templates.
6. Track and close parity gaps feature by feature.
