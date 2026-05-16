// Parallel slot fallback (ADR 0002, issue #7).
//
// When the user navigates to a route that does not have an intercepting
// counterpart in `@modal`, this default renders nothing — the slot stays
// empty and the underlying page takes over. Without this, Next would
// re-render the last intercepted modal indefinitely.
export default function ModalDefault() {
  return null;
}
