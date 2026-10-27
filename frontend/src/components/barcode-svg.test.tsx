import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BarcodeSvg from "./barcode-svg";

/**
 * The visitor's counter QR must encode the redemption token exactly as shown
 * below it. `data-qr-value` exposes the same value that is handed to
 * `QRCodeSVG`, so the browser suite can assert the payload without decoding
 * the rendered matrix or depending on a brittle accessible name.
 */
describe("BarcodeSvg", () => {
  it("renders the redemption token as the QR payload", () => {
    const token = "RDM-ABCDEFGHIJKLMNOPQRSTUVWX";
    const markup = renderToStaticMarkup(<BarcodeSvg value={token} height={72} />);

    expect(markup).toContain(`data-qr-value="${token}"`);
    expect(markup).toContain("<svg");
  });

  it("encodes different tokens differently", () => {
    const first = renderToStaticMarkup(<BarcodeSvg value="RDM-FIRST00000000000000000" />);
    const second = renderToStaticMarkup(<BarcodeSvg value="RDM-SECOND0000000000000000" />);

    expect(first).not.toBe(second);
  });

  it("renders nothing for an empty payload", () => {
    expect(renderToStaticMarkup(<BarcodeSvg value="   " />)).toBe("");
  });
});
