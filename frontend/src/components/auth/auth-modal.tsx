"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import TouristLoginForm from "./tourist-login-form";
import TouristRegisterForm from "./tourist-register-form";
import StaffLoginForm from "./staff-login-form";

type AuthVariant = "login" | "register" | "staff";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultVariant?: AuthVariant;
}

const VARIANT_LABEL: Record<AuthVariant, { title: string; tagline: string }> = {
  login: {
    title: "Masuk akun",
    tagline: "Pesisir selatan, ruang untuk menjelajah.",
  },
  register: {
    title: "Buat akun wisatawan",
    tagline: "Mulai perjalananmu ke Parangtritis.",
  },
  staff: {
    title: "Masuk sebagai petugas",
    tagline: "Akses Pegawai - Kelola kunjungan wisata.",
  },
};

export default function AuthModal({
  isOpen,
  onClose,
  defaultVariant = "login",
}: AuthModalProps) {
  const [variant, setVariant] = useState<AuthVariant>(defaultVariant);
  const [mounted, setMounted] = useState(false);
  const [entering, setEntering] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLElement | null>(null);
  const lastFocusableRef = useRef<HTMLElement | null>(null);

  // Buka tutup modal dengan animasi, kunci scroll body, tangkap tombol Esc.
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setEntering(true);
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
        if (e.key === "Tab") trapFocus(e);
      };
      document.addEventListener("keydown", onKey);

      return () => {
        document.removeEventListener("keydown", onKey);
        document.body.style.overflow = "";
        document.body.style.touchAction = "";
      };
    } else {
      setEntering(true);
      const timer = setTimeout(() => {
        setMounted(false);
        setEntering(false);
      }, 240);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  const trapFocus = useCallback(
    (e: KeyboardEvent) => {
      if (!firstFocusableRef.current || !lastFocusableRef.current) return;
      if (e.shiftKey && document.activeElement === firstFocusableRef.current) {
        e.preventDefault();
        lastFocusableRef.current.focus();
      } else if (
        !e.shiftKey &&
        document.activeElement === lastFocusableRef.current
      ) {
        e.preventDefault();
        firstFocusableRef.current.focus();
      }
    },
    []
  );

  const switchVariant = (next: AuthVariant) => {
    setVariant(next);
  };

  if (!mounted && !entering) return null;

  const { title, tagline } = VARIANT_LABEL[variant];

  return (
    <>
      {isOpen ? (
        <div
          ref={overlayRef}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-[100] bg-[#082834]/25 flex items-center justify-center p-4 md:p-6 transition-opacity duration-200 ease-out"
          role="presentation"
        >
          <div
            ref={cardRef}
            className="relative w-full max-w-[880px] h-[520px] bg-[var(--auth-surface)] rounded-[20px] shadow-[0_24px_70px_rgba(8,40,52,0.20)] overflow-hidden flex flex-col md:flex-row transition-all duration-240 ease-out"
            style={{
              opacity: entering ? 0 : 1,
              transform: entering ? "scale(0.96)" : "scale(1)",
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
          >
            {/* Tombol tutup (X) di pojok kanan atas kartu */}
            <button
              type="button"
              onClick={onClose}
              ref={firstFocusableRef as React.RefObject<HTMLButtonElement>}
              className="absolute top-4 right-4 z-30 p-2 text-[var(--auth-muted)] hover:text-[var(--auth-title)] transition-colors"
              aria-label="Tutup dialog masuk"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>

            {/* Header: judul dan tagline (posisi kiri atas di dalam panel form) */}
            <div className="absolute top-6 left-6 z-20 md:max-w-[40%]">
              <h2
                id="auth-modal-title"
                className="text-[26px] font-bold text-[var(--auth-title)] leading-tight"
              >
                {title}
              </h2>
              <p className="mt-2 text-[14px] text-[var(--auth-muted)] leading-6">
                {tagline}
              </p>
            </div>

            {/* Panel kanan: foto pantai + overlay gradien + tagline besar */}
            <div
              className="hidden md:flex flex-1 items-end justify-end p-8 relative overflow-hidden"
            >
              <img
                src="https://images.unsplash.com/photo-1507525429043-ec0160a4b379?auto=format&fit=crop&w=1200&q=80"
                alt="Pantai Parangtritis"
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Overlay gradien gelap tipis di bawah untuk teks putih */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#082834]/75 via-[#082834]/30 to-transparent" />
              <p className="relative z-10 text-[22px] font-bold text-white leading-[1.15] text-right">
                LOREM IPSUM
              </p>
              <p className="relative z-10 mt-1 text-[14px] text-[#d8e2e7] text-right uppercase tracking-wider">
                Dolor sit amet
              </p>
            </div>

            {/* Pemisah SVG bergelombang antara panel form dan foto */}
            <div
              className="hidden md:flex w-12 self-stretch relative z-20"
            >
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 60 100"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 0 C 20 15 40 85 60 100 L 60 0 Z"
                  fill="var(--auth-surface)"
                />
              </svg>
            </div>

            {/* Panel kiri: form (42%) */}
            <div className="flex-1 flex flex-col p-8 md:p-12 overflow-y-auto min-w-0">
              <div className="flex flex-col gap-6">
                {variant === "login" && (
                  <TouristLoginForm
                    onSwitchToRegister={() => switchVariant("register")}
                    firstFocusableRef={firstFocusableRef}
                    lastFocusableRef={lastFocusableRef}
                  />
                )}
                {variant === "register" && (
                  <TouristRegisterForm
                    onSwitchToLogin={() => switchVariant("login")}
                    firstFocusableRef={firstFocusableRef}
                    lastFocusableRef={lastFocusableRef}
                  />
                )}
                {variant === "staff" && (
                  <StaffLoginForm
                    onSwitchToLogin={() => switchVariant("login")}
                    firstFocusableRef={firstFocusableRef}
                    lastFocusableRef={lastFocusableRef}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
