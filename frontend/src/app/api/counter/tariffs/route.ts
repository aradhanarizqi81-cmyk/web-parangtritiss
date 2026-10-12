import { forwardToLaravel } from "@/lib/api/bff";
import type { TariffCatalog } from "@/lib/pricing/tariffs";

export async function GET(request: Request) {
  return forwardToLaravel<{ data: TariffCatalog }>(
    request,
    "/api/v1/counter/tariffs",
  );
}
