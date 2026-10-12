import { forwardToLaravel } from "@/lib/api/bff";
import type { CounterTariffs } from "@/lib/counter/types";

export async function GET(request: Request) {
  return forwardToLaravel<{ data: CounterTariffs }>(
    request,
    "/api/v1/counter/tariffs",
  );
}
