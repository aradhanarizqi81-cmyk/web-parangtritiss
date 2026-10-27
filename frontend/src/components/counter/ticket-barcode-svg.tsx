import { code128BBars, code128BModules } from "@/lib/barcode/code128";

export default function TicketBarcodeSvg({ value }: { value: string }) {
  const bars = code128BBars(value);
  const moduleCount = code128BModules(value).length;
  const quietZone = 10;

  return (
    <svg
      className="ticket-barcode-svg"
      role="img"
      aria-label={`Barcode kode tiket individual ${value}`}
      viewBox={`0 0 ${moduleCount + quietZone * 2} 48`}
      preserveAspectRatio="none"
    >
      <rect
        x="0"
        y="0"
        width={moduleCount + quietZone * 2}
        height="48"
        fill="#ffffff"
      />
      {bars.map((bar) => (
        <rect
          key={bar.x}
          x={bar.x + quietZone}
          y="2"
          width={bar.width}
          height="44"
          fill="#000000"
        />
      ))}
    </svg>
  );
}
