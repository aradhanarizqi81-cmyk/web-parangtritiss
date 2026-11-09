"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type Place = {
  slug: string;
  name: string;
  subtitle: string;
  image: string;
  alt: string;
};

export function PlacesCoverflow({ places }: { places: Place[] }) {
  const [active, setActive] = useState(Math.floor(places.length / 2));
  const [max, setMax] = useState(3); // card terlihat per sisi
  const startX = useRef<number | null>(null);
  const dragged = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const set = () => setMax(mq.matches ? 2 : 3);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  const go = (i: number) =>
    setActive(Math.min(places.length - 1, Math.max(0, i)));

  return (
    <div>
      <div
        className="cf"
        role="region"
        aria-roledescription="carousel"
        aria-label="Destinasi pesisir"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(active - 1);
          if (e.key === "ArrowRight") go(active + 1);
        }}
        onPointerDown={(e) => {
          startX.current = e.clientX;
          dragged.current = false;
        }}
        onPointerCancel={() => {
          startX.current = null;
        }}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          if (Math.abs(dx) > 40) {
            dragged.current = true;
            go(active + (dx < 0 ? 1 : -1));
          }
          startX.current = null;
        }}
      >
        {places.map((p, i) => {
          const off = i - active;
          const abs = Math.abs(off);
          return (
            <article
              key={p.slug}
              className="cf-card"
              style={
                { "--abs": abs, "--sg": Math.sign(off) } as React.CSSProperties
              }
              data-hidden={abs > max}
              data-active={off === 0}
              aria-hidden={off !== 0}
              onClick={() => {
                if (!dragged.current && off !== 0) go(i);
              }}
            >
              <Image
                src={p.image}
                alt={p.alt}
                fill
                draggable={false}
                sizes="(max-width: 767px) 54vw, 300px"
                loading={off === 0 ? "eager" : "lazy"}
                style={{ objectFit: "cover" }}
              />
              <div className="cf-grad" />
              <div className="cf-cap">
                <b>{p.name}</b>
                <span>{p.subtitle}</span>
              </div>
            </article>
          );
        })}
        <div className="cf-floor" aria-hidden />
      </div>

      <div className="cf-ctrl">
        <button
          type="button"
          className="cf-btn"
          onClick={() => go(active - 1)}
          disabled={active === 0}
          aria-label="Sebelumnya"
        >
          ←
        </button>
        <div className="cf-dots" aria-hidden>
          {places.map((_, i) => (
            <i key={i} className={i === active ? "on" : ""} />
          ))}
        </div>
        <button
          type="button"
          className="cf-btn"
          onClick={() => go(active + 1)}
          disabled={active === places.length - 1}
          aria-label="Berikutnya"
        >
          →
        </button>
      </div>
    </div>
  );
}
