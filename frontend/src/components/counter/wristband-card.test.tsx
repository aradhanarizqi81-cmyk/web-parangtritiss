import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WristbandCard from "./wristband-card";

const transaction = {
  transaction_code: "TRX-20261025-ABC123",
  barcode_token: "transaction-gate-token",
  visit_date: "2026-10-25",
  total_amount: 0,
  payment: null,
  visitors: [
    { id: 7, full_name: "Pengunjung Satu", masked_nik: "************1234" },
    { id: 8, full_name: "Pengunjung Dua", masked_nik: "************5678" },
  ],
};

function renderWristband(ticketCode: string, visitorId: number) {
  return renderToStaticMarkup(
    <WristbandCard
      transaction={transaction}
      ticket={{
        id: visitorId,
        visitor_id: visitorId,
        ticket_code: ticketCode,
        status: "issued",
        status_label: "Terbit",
        printed_at: null,
      }}
    />,
  );
}

describe("WristbandCard", () => {
  it("encodes the stable individual ticket code, not the group gate token", () => {
    const code = "TKT-20261025-A1B2C3D4";
    const firstRender = renderWristband(code, 7);
    const reprint = renderWristband(code, 7);

    expect(firstRender).toContain(`Barcode kode tiket individual ${code}`);
    expect(firstRender).toContain(code);
    expect(firstRender).not.toContain("transaction-gate-token");
    expect(reprint).toBe(firstRender);
  });

  it("renders a distinct barcode for each ticket code", () => {
    const first = renderWristband("TKT-20261025-A1B2C3D4", 7);
    const second = renderWristband("TKT-20261025-E5F6G7H8", 8);

    expect(first).not.toBe(second);
    expect(first).toContain("Pengunjung Satu");
    expect(second).toContain("Pengunjung Dua");
  });
});
