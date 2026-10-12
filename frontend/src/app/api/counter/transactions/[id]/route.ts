import { forwardToLaravel } from "@/lib/api/bff";
import type { CounterTransaction } from "@/lib/counter/types";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;

  return forwardToLaravel<{ data: CounterTransaction }>(
    request,
    `/api/v1/counter/transactions/${encodeURIComponent(id)}`,
  );
}
