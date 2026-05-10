// Adapted from https://github.com/emilkowalski/vaul/blob/main/src/browser.ts (MIT)

function testPlatform(re: RegExp): boolean | undefined {
  return typeof window !== 'undefined' && window.navigator != null
    ? re.test(window.navigator.platform)
    : undefined;
}

export function isMac(): boolean | undefined {
  return testPlatform(/^Mac/);
}

export function isIPhone(): boolean | undefined {
  return testPlatform(/^iPhone/);
}

export function isIPad(): boolean | undefined {
  return (
    testPlatform(/^iPad/) ||
    // iPadOS 13+ reports as Mac; distinguish via touch.
    (isMac() && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)
  );
}

export function isIOS(): boolean | undefined {
  return isIPhone() || isIPad();
}

export function isSafari(): boolean | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}
