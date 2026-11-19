import { auth } from '../lib/firebase';

/**
 * Returns Authorization & JSON headers using the signed-in Firebase user's ID token.
 */
export async function getAuthHeaders(forceRefresh = false): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('অনুগ্রহ করে প্রথমে গুগল বা ইমেইল দিয়ে লগইন করুন। (Authentication required)');
  }
  const token = await user.getIdToken(forceRefresh);
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Performs an authenticated API request to the backend (/api/*) with automatic
 * Firebase ID token attachment and single token-refresh retry on 401.
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = await getAuthHeaders(false);
  const mergedHeaders = {
    ...headers,
    ...(options.headers as Record<string, string> | undefined),
  };

  let response = await fetch(url, {
    ...options,
    headers: mergedHeaders,
  });

  if (response.status === 401 && auth.currentUser) {
    const refreshedHeaders = await getAuthHeaders(true);
    response = await fetch(url, {
      ...options,
      headers: {
        ...refreshedHeaders,
        ...(options.headers as Record<string, string> | undefined),
      },
    });
  }

  return response;
}

/**
 * Sanitizes SVG markup before rendering via dangerouslySetInnerHTML
 * to prevent Stored/Reflected XSS via <script>, <foreignObject>, event handlers, or JS URIs.
 */
export function sanitizeSvg(rawSvg: string): string {
  if (!rawSvg || typeof rawSvg !== 'string') return '';

  const trimmed = rawSvg.trim();
  if (!trimmed) return '';

  // Browser DOMParser sanitization (strict whitelist-style node/attribute filtering)
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, 'image/svg+xml');
      const parserError = doc.querySelector('parsererror');
      const svgEl = doc.documentElement;

      if (!parserError && svgEl && svgEl.tagName.toLowerCase() === 'svg') {
        const blockedTags = new Set([
          'script',
          'foreignobject',
          'iframe',
          'object',
          'embed',
          'link',
          'meta',
          'base',
          'applet',
          'audio',
          'video',
          'source',
          'canvas',
        ]);

        const walk = (node: Element) => {
          const children = Array.from(node.children);
          for (const child of children) {
            if (blockedTags.has(child.tagName.toLowerCase())) {
              child.remove();
              continue;
            }
            // Remove unsafe attributes
            const attrs = Array.from(child.attributes);
            for (const attr of attrs) {
              const name = attr.name.toLowerCase();
              const val = attr.value.trim().toLowerCase();

              if (name.startsWith('on')) {
                child.removeAttribute(attr.name);
                continue;
              }
              if (
                (name === 'href' || name === 'xlink:href' || name === 'src') &&
                (val.startsWith('javascript:') ||
                  val.startsWith('vbscript:') ||
                  val.startsWith('data:text/html') ||
                  val.startsWith('http://') ||
                  val.startsWith('https://'))
              ) {
                child.removeAttribute(attr.name);
                continue;
              }
              if (name === 'style' && /javascript:|expression\s*\(|@import/i.test(val)) {
                child.removeAttribute(attr.name);
              }
            }
            walk(child);
          }
        };

        // Also scrub root <svg> attributes
        for (const attr of Array.from(svgEl.attributes)) {
          const name = attr.name.toLowerCase();
          if (name.startsWith('on')) {
            svgEl.removeAttribute(attr.name);
          }
        }
        walk(svgEl);

        return new XMLSerializer().serializeToString(svgEl);
      }
    } catch {
      // Fallback to regex sanitizer below
    }
  }

  // Regex defense-in-depth fallback
  return trimmed
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/<(iframe|object|embed|link|meta|base|applet)[^>]*?>([\s\S]*?<\/\1>)?/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|xlink:href|src)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*')/gi, '');
}

/**
 * Checks whether an image/logo URL uses a safe protocol.
 */
export function isSafeMediaUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/')) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-zA-Z0-9+/=]+$/i.test(trimmed)) {
    return true;
  }
  return false;
}
