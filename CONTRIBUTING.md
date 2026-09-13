# Contributing to PRAHARI

Thank you for contributing to the **PRAHARI Hilly Emergency & Disaster Management Platform**.  
This guide explains our team branching model, modular feature guidelines, and code standards so teammates can work concurrently without breaking the application.

---

## 🌿 Git Branching Strategy

We follow a structured Git branching model designed for agile team collaboration and hackathon sprints:

```
main (Production / Stable Releases)
  │
  └── development (Integration & Staging)
        ├── feature/ai-briefing
        ├── feature/voice-reporting
        ├── feature/routing-enhancements
        ├── bugfix/gps-staleness
        └── docs/feature-matrix
```

### Branch Roles
1. **`main`**: Protected branch. Always deployable and tested. Merges into `main` occur only via reviewed Pull Requests from `development`.
2. **`development`**: The default active integration branch where teammates merge their completed feature branches.
3. **`feature/<name>`**: Individual teammate working branches. Branch off `development` and merge back into `development` via Pull Request.
4. **`bugfix/<name>`**: Targeted fixes for discovered issues. Branch off `development`.

---

## 🚀 Step-by-Step Developer Workflow

### 1. Synchronize & Create Your Branch
Always branch off the latest `development` branch:
```bash
git checkout development
git pull origin development
git checkout -b feature/your-feature-name
```

### 2. Register Feature in Central Toggle Config
If you are introducing a new module or capability, register its flag in `src/config/features.ts`:
```typescript
// src/config/features.ts
export interface FeatureFlags {
  // ... existing flags
  yourNewFeature: boolean;
}

export const DEFAULT_FEATURES: FeatureFlags = {
  // ...
  yourNewFeature: true,
};
```
This enables teammates to test the app with your feature enabled or disabled, both programmatically and via the in-app **Features** modal.

### 3. Follow the Isolated Architecture
- **Keep UI Isolated**: Never write direct database queries or raw fetch calls inside UI components.
  - Correct: `UI -> Service (e.g. incidentService) -> Backend / Persistent Store`
  - Incorrect: `UI -> direct Firestore / raw API calls`
- **Error Isolation**: Wrap optional or external-dependent components in `<ErrorBoundary moduleName="Your Feature">`.
- **Safe Fallback**: Always verify that if `isFeatureEnabled('yourNewFeature')` is `false`, the parent component renders a clean, non-crashing fallback UI.

### 4. Local Validation Before Committing
Always ensure your code passes static type-checking and builds cleanly:
```bash
# Verify TypeScript types and syntax
npm run lint

# Verify full production build
npm run build
```

### 5. Commit & Push
Commit with clear, conventional messages:
```bash
git add .
git commit -m "feat(routing): add elevation slope penalty to evacuation calculation"
git push -u origin feature/your-feature-name
```

### 6. Open a Pull Request
- Create a PR targeting the `development` branch.
- Complete the items in the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).
- Request review from at least one teammate.

---

## 🔒 Security & Secrets Policy

> **CRITICAL**: Never commit credentials, private tokens, or secret keys to GitHub.

Before staging files, verify that no sensitive files are included:
- `.env` and `.env.local` files must remain untracked (guarded by `.gitignore`).
- Use `.env.example` to document newly added variable names without actual secret values.
- Never hardcode Firebase service-account private keys or API tokens in client code.

---

## 📁 Codebase Directory Structure

```
src/
├── components/          # Shared layout and reusable components
│   ├── ErrorBoundary.tsx
│   ├── FeatureSettingsModal.tsx
│   └── Header.tsx
├── features/            # Modular feature packages
│   ├── ai-situation-summary/
│   ├── alerts/
│   ├── incidents/
│   ├── locations/
│   ├── offline-mode/
│   ├── risk-analysis/
│   ├── routing/
│   ├── sensors/
│   └── voice-reporting/
├── services/            # Service abstraction layer
│   ├── alertService.ts
│   ├── incidentService.ts
│   ├── locationService.ts
│   ├── userService.ts
│   ├── aiAssistant.ts
│   ├── aStarRouting.ts
│   └── offlineSync.ts
├── config/              # Central configuration & feature toggles
│   └── features.ts
├── data/                # Geographic terrain nodes & initial data
│   └── zones.ts
└── types.ts             # Global TypeScript models
```

---

## 🤝 Code Style Guidelines

- **Language**: TypeScript with strict types. Avoid `any` whenever practical.
- **Icons**: Import exclusively from `lucide-react`.
- **Styling**: Tailwind CSS utility classes.
- **Imports**: Place external and type imports at the top of the file.
