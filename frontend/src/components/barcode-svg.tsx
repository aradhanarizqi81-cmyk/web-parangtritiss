
"use client";

import { QRCodeSVG } from "qrcode.react";

type BarcodeSvgProps = {
  value: string;
  height?: number;
};

function BarcodeSvg({ value, height = 192 }: BarcodeSvgProps) {
  if (!value.trim()) {
    return null;
  }

  return (
    <div
      className="flex w-full items-center justify-center bg-white p-3"
      role="img"
      aria-label="QR Code tiket gerbang"
      data-qr-value={value}
    >
      <QRCodeSVG
        value={value}
        width={height}
        height={height}
        level="M"
        marginSize={2}
        bgColor="#FFFFFF"
        fgColor="#000000"
        title="QR Code tiket gerbang"
      />
    </div>
  );
}

export default BarcodeSvg;
