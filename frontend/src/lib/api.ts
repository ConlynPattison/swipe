export type FieldError = { field: string; message: string };

export class ApiError extends Error {
  status: number;
  detail: string;
  fieldErrors: FieldError[];

  constructor(status: number, detail: string, fieldErrors: FieldError[] = []) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
  }
}

type PydanticErrorItem = {
  type: string;
  loc: (string | number)[];
  msg: string;
};

function parseDetail(body: unknown): { detail: string; fieldErrors: FieldError[] } {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") {
      return { detail, fieldErrors: [] };
    }
    if (Array.isArray(detail)) {
      const items = detail as PydanticErrorItem[];
      const fieldErrors: FieldError[] = items.map((item) => {
        const loc = item.loc.filter((s) => s !== "body");
        const field = loc.length > 0 ? String(loc[loc.length - 1]) : "";
        const msg = item.msg.replace(/^Value error,\s*/, "");
        return { field, message: msg };
      });
      const summary = fieldErrors.length > 0 ? fieldErrors[0].message : "Validation failed";
      return { detail: summary, fieldErrors };
    }
  }
  return { detail: "Request failed", fieldErrors: [] };
}

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; token?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const { detail, fieldErrors } = parseDetail(data);
    throw new ApiError(res.status, detail, fieldErrors);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>("GET", path, { token }),
  post: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>("POST", path, { body, token }),
  put: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>("PUT", path, { body, token }),
  del: <T = null>(path: string, token?: string | null) =>
    request<T>("DELETE", path, { token }),
};

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type VoteChoice = "yes" | "no";

export type Pet = {
  id: number;
  label: string;
  image_url: string;
  your_vote: VoteChoice | null;
};

export type VoteResponse = {
  pet_id: number;
  choice: VoteChoice;
  updated_at: string;
};

export type SortOption = "most_loved" | "most_skipped" | "most_divisive";

export type ResultRow = {
  id: number;
  label: string;
  image_url: string;
  yes_count: number;
  no_count: number;
  total_votes: number;
  yes_percent: number;
};
