export type Role = "visitor" | "admin" | "cashier" | "gate_staff";

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  created_at: string | null;
};

export type ValidationErrors = Record<string, string[]>;

export type ApiErrorKind =
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "server"
  | "network"
  | "unknown";

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | {
      ok: false;
      status: number;
      kind: ApiErrorKind;
      message: string;
      errors?: ValidationErrors;
    };
