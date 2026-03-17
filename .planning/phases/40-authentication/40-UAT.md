---
status: testing
phase: 40-authentication
source: [40-01-SUMMARY.md, 40-02-SUMMARY.md]
started: 2026-03-17T10:00:00Z
updated: 2026-03-17T10:00:00Z
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  Kill any running dev server. Start the application fresh with `vercel dev`. Server boots without errors. The app loads in the browser — you should see either a loading spinner or the login page (since you're unauthenticated).
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Start the application fresh with `vercel dev`. Server boots without errors. The app loads in the browser — you should see either a loading spinner or the login page.
result: [pending]

### 2. Login Page Display
expected: When unauthenticated, you see a centered glass-panel card with a Gem icon and "ClearContract" branding. The card has Email and Password fields, and a "Sign In" button.
result: [pending]

### 3. Login Error Handling
expected: Enter an incorrect email/password and submit. An inline error message appears (e.g., "Invalid email or password"). The form does not navigate away.
result: [pending]

### 4. Login Success
expected: Enter valid credentials and submit. A spinner appears on the button during submission. After successful auth, the login page disappears and you see the full app (Dashboard with Sidebar).
result: [pending]

### 5. Loading Screen
expected: On initial page load (before session resolves), a branded loading spinner with the Gem icon appears on a slate background. It disappears once auth state is determined.
result: [pending]

### 6. Sign Out
expected: While authenticated, click "Sign Out" at the bottom of the Sidebar. You are immediately returned to the Login page. All in-memory app state (contracts, active views) is cleared.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0

## Gaps

[none yet]
