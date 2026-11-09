"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BarcodeDetector } from "barcode-detector/ponyfill";

type CameraScannerOptions = {
  /** Called once per distinct scanned payload. */
  onDetected: (code: string) => void | Promise<void>;
  /** Return true while the parent is busy so no new scan is dispatched. */
  isPaused?: () => boolean;
  /** Hint shown under the video once the camera is running. */
  statusHint?: string;
};

/**
 * Pemindai kamera bersama untuk halaman gerbang.
 *
 * Satu interval per aktivasi: setiap `startCamera` membatalkan timer lama lebih
 * dulu, dan pembersihan menghentikan seluruh track kamera. Payload yang sama
 * tidak dikirim berulang selama kamera masih aktif, sehingga satu barcode tidak
 * memicu request lookup berkali-kali. Pemanggil tetap pemilik keputusan bisnis;
 * hook ini hanya menangani izin, stream, deteksi, dan siklus hidupnya.
 */
export function useCameraScanner({
  onDetected,
  isPaused,
  statusHint = "Arahkan kamera ke barcode.",
}: CameraScannerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const scanningRef = useRef(false);
  const lastCodeRef = useRef("");
  const stopRequestedRef = useRef(false);
  const callbackRef = useRef(onDetected);
  const pausedRef = useRef(isPaused);
  const hintRef = useRef(statusHint);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    callbackRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    hintRef.current = statusHint;
  }, [statusHint]);

  const stopCamera = useCallback(() => {
    stopRequestedRef.current = true;
    scanningRef.current = false;

    if (scanTimerRef.current !== null) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    const stream = streamRef.current;

    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }

      streamRef.current = null;
    }

    const video = videoRef.current;

    if (video) {
      video.srcObject = null;
    }

    detectorRef.current = null;
    setCameraActive(false);
    setCameraStatus(null);
  }, []);

  const resetLastCode = useCallback(() => {
    lastCodeRef.current = "";
  }, []);

  const clearCameraError = useCallback(() => {
    setCameraError(null);
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current !== null) {
      return;
    }

    stopRequestedRef.current = false;
    setCameraError(null);
    setCameraStatus("Meminta izin kamera...");

    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setCameraError("Kamera tidak tersedia di perangkat ini.");
        setCameraStatus(null);
        return;
      }

      detectorRef.current = new BarcodeDetector({
        formats: ["qr_code", "code_128"],
      });

      let stream: MediaStream | null = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (err) {
          if (err instanceof DOMException && err.name === "NotAllowedError") {
            setCameraError(
              "Izin akses kamera ditolak. Gunakan mode scanner fisik.",
            );
          } else if (
            err instanceof DOMException &&
            err.name === "NotFoundError"
          ) {
            setCameraError("Tidak ditemukan kamera yang dapat digunakan.");
          } else {
            setCameraError("Tidak dapat mengakses kamera.");
          }

          setCameraStatus(null);
          detectorRef.current = null;
          return;
        }
      }

      if (stopRequestedRef.current) {
        for (const track of stream.getTracks()) {
          track.stop();
        }

        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;

      if (video) {
        video.srcObject = stream;

        try {
          await video.play();
        } catch {
          // ignore
        }
      }

      setCameraActive(true);
      setCameraStatus(hintRef.current);
      lastCodeRef.current = "";
      scanningRef.current = true;

      if (scanTimerRef.current !== null) {
        window.clearInterval(scanTimerRef.current);
      }

      scanTimerRef.current = window.setInterval(async () => {
        if (stopRequestedRef.current || !scanningRef.current) {
          return;
        }

        if (pausedRef.current?.()) {
          return;
        }

        const detector = detectorRef.current;
        const videoEl = videoRef.current;

        if (!detector || !videoEl || videoEl.readyState < 2) {
          return;
        }

        try {
          const barcodes = await detector.detect(videoEl);

          if (!barcodes || barcodes.length === 0) {
            return;
          }

          const raw = barcodes[0]?.rawValue ?? "";
          const normalized = raw
            .replace(/\r?\n/g, "")
            .trim()
            .replace(/\s+/g, "");

          if (!normalized || normalized === lastCodeRef.current) {
            return;
          }

          lastCodeRef.current = normalized;
          scanningRef.current = false;

          await callbackRef.current(normalized);
        } catch {
          // ignore
        } finally {
          if (!stopRequestedRef.current) {
            scanningRef.current = true;
          }
        }
      }, 250);
    } catch {
      setCameraError("Tidak dapat memulai pemindaian kamera.");
      setCameraStatus(null);
      detectorRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    cameraActive,
    cameraStatus,
    cameraError,
    startCamera,
    stopCamera,
    resetLastCode,
    clearCameraError,
  };
}
