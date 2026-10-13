import { forwardDownload } from "@/lib/api/download";

export async function GET(request: Request) {
  return forwardDownload(request, "/api/v1/admin/reports/visits/export");
}
