const DEFAULT_MAX_BODY_SIZE = 100 * 1024; // 100KB default
const LARGE_BODY_SIZE = 1024 * 1024; // 1MB for larger payloads

export function checkRequestSize(
  request: Request,
  maxBytes: number = DEFAULT_MAX_BODY_SIZE,
): Response | null {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (!Number.isNaN(size) && size > maxBytes) {
      return Response.json(
        { ok: false, error: "Request body too large", code: "PAYLOAD_TOO_LARGE" },
        { status: 413 },
      );
    }
  }
  return null;
}

export async function parseJsonBody<T>(
  request: Request,
  maxBytes: number = DEFAULT_MAX_BODY_SIZE,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  const sizeCheck = checkRequestSize(request, maxBytes);
  if (sizeCheck) {
    return { ok: false, response: sizeCheck };
  }

  try {
    const data = await request.json();
    return { ok: true, data: data as T };
  } catch {
    return {
      ok: false,
      response: Response.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 },
      ),
    };
  }
}

export const RequestSizeLimits = {
  DEFAULT: DEFAULT_MAX_BODY_SIZE,
  SMALL: 10 * 1024, // 10KB for simple forms
  MEDIUM: 100 * 1024, // 100KB default
  LARGE: LARGE_BODY_SIZE, // 1MB for file metadata, etc.
} as const;
