// Place this file at app/@modal/default.tsx
// Prevents the stale-modal-in-DOM issue:
// Without default.tsx, Next.js keeps the last matched @modal slot in the DOM
// after navigating away from the intercepted route.
export default function ModalSlotDefault() {
  return null;
}
