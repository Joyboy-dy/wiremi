# Contributing to Wiremi

Thanks for helping. Bug reports, ideas and pull requests are all welcome.

## Report a bug or suggest a feature

Open an issue with the matching template. For a bug, say what you did, what you expected and what happened; a screenshot or an exported `.wire.json` helps a lot.

## Make a change

1. Fork the repository and create a branch from `main`.
2. Install and run the app:

   ```bash
   npm install
   npm run dev
   ```

3. Make your change. Editing logic lives in `src/contexts/editorReducer.ts` as pure functions: add a test in `editorReducer.test.ts` for any new operation or bug fix.
4. Check that everything passes before opening the pull request:

   ```bash
   npm run lint
   npm test
   npm run build
   ```

5. Open a pull request that explains what changes for the user and why.

## Guidelines

- Every change to the canvas must go through the reducer, so it can be undone.
- Elements inside a group store their position relative to the group: use the helpers in `src/lib/elements.ts` for page coordinates.
- Keep the interface keyboard-friendly: buttons have a label, dialogs close with Escape.
- No tracking, no network calls besides the AI builder the user configures.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
