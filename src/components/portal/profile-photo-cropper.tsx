"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Label } from "@/components/ui/label";

const PREVIEW_SIZE = 160;
const OUTPUT_SIZE = 400;
const MAX_ZOOM = 3;

export interface ProfilePhotoCropperRef {
  getCroppedFile: () => Promise<File | null>;
}

interface ProfilePhotoCropperProps {
  currentPhotoUrl?: string | null;
  onPhotoReady: (file: File | null) => void;
  onPhotoSelected?: () => void;
}

function getCoverScale(width: number, height: number, targetSize: number) {
  return Math.max(targetSize / width, targetSize / height);
}

function getContainScale(width: number, height: number, targetSize: number) {
  return Math.min(targetSize / width, targetSize / height);
}

export const ProfilePhotoCropper = forwardRef<ProfilePhotoCropperRef, ProfilePhotoCropperProps>(
  function ProfilePhotoCropper({ currentPhotoUrl, onPhotoReady, onPhotoSelected }, ref) {
    const [imageSrc, setImageSrc] = useState<string | null>(currentPhotoUrl ?? null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [userZoom, setUserZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
    const imageRef = useRef<HTMLImageElement | null>(null);
    const userPickedPhotoRef = useRef(false);

    useEffect(() => {
      setImageSrc(currentPhotoUrl ?? null);
      setDimensions({ width: 0, height: 0 });
      setUserZoom(1);
      setOffset({ x: 0, y: 0 });
      userPickedPhotoRef.current = false;
    }, [currentPhotoUrl]);

    const previewCoverScale = useMemo(() => {
      if (!dimensions.width || !dimensions.height) return 1;
      return getCoverScale(dimensions.width, dimensions.height, PREVIEW_SIZE);
    }, [dimensions]);

    const zoomRange = useMemo(() => {
      if (!dimensions.width || !dimensions.height) {
        return { min: 0.25, max: MAX_ZOOM };
      }
      const cover = getCoverScale(dimensions.width, dimensions.height, PREVIEW_SIZE);
      const contain = getContainScale(dimensions.width, dimensions.height, PREVIEW_SIZE);
      return {
        min: Math.min(contain / cover, 1),
        max: MAX_ZOOM,
      };
    }, [dimensions]);

    const exportCropped = useCallback(async (): Promise<File | null> => {
      const img = imageRef.current;
      if (!img || !imageSrc || !img.naturalWidth) return null;

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const coverScale = getCoverScale(img.naturalWidth, img.naturalHeight, OUTPUT_SIZE);
      const finalScale = coverScale * userZoom;
      const w = img.naturalWidth * finalScale;
      const h = img.naturalHeight * finalScale;
      const x = (OUTPUT_SIZE - w) / 2 + offset.x * (OUTPUT_SIZE / PREVIEW_SIZE);
      const y = (OUTPUT_SIZE - h) / 2 + offset.y * (OUTPUT_SIZE / PREVIEW_SIZE);

      ctx.beginPath();
      ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, x, y, w, h);

      return new Promise((resolve) => {
        const createFile = (blob: Blob, type: string, name: string) =>
          resolve(new File([blob], name, { type }));

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(null);
              return;
            }
            createFile(blob, "image/webp", "profile-photo.webp");
          },
          "image/webp",
          0.85
        );
      });
    }, [imageSrc, userZoom, offset]);

    useImperativeHandle(ref, () => ({ getCroppedFile: exportCropped }), [exportCropped]);

    const publishCroppedPreview = useCallback(async () => {
      if (!userPickedPhotoRef.current) return;
      const file = await exportCropped();
      onPhotoReady(file);
    }, [exportCropped, onPhotoReady]);

    function handleImageLoad(img: HTMLImageElement) {
      imageRef.current = img;
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setUserZoom(1);
      setOffset({ x: 0, y: 0 });
      if (userPickedPhotoRef.current) {
        void publishCroppedPreview();
      }
    }

    async function handleFileChange(file: File | null) {
      if (!file) return;
      userPickedPhotoRef.current = true;
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setDimensions({ width: 0, height: 0 });
      setUserZoom(1);
      setOffset({ x: 0, y: 0 });
      onPhotoReady(null);
      onPhotoSelected?.();
    }

    function onPointerDown(e: React.PointerEvent) {
      if (!imageSrc) return;
      setDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        ox: offset.x,
        oy: offset.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: React.PointerEvent) {
      if (!dragging) return;
      setOffset({
        x: dragStart.current.ox + (e.clientX - dragStart.current.x),
        y: dragStart.current.oy + (e.clientY - dragStart.current.y),
      });
    }

    function onPointerUp() {
      setDragging(false);
    }

    useEffect(() => {
      if (!userPickedPhotoRef.current || !imageSrc || !dimensions.width) return;
      const timer = window.setTimeout(() => {
        void publishCroppedPreview();
      }, 150);
      return () => window.clearTimeout(timer);
    }, [imageSrc, dimensions.width, userZoom, offset.x, offset.y, publishCroppedPreview]);

    const displayScale = previewCoverScale * userZoom;

    return (
      <div className="space-y-4 rounded-lg border border-white/10 p-4">
        <div>
          <Label className="text-white">Foto de perfil público</Label>
          <p className="mt-1 text-xs text-muted">
            Opcional. Você pode salvar sem ajustar — arraste ou use o zoom apenas se quiser refinar o enquadramento.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div
            className="relative shrink-0 cursor-grab overflow-hidden rounded-full border-2 border-primary/40 bg-zinc-800 active:cursor-grabbing"
            style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Prévia da foto"
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  width: dimensions.width || "auto",
                  height: dimensions.height || "auto",
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${displayScale})`,
                  transformOrigin: "center center",
                }}
                onLoad={(e) => handleImageLoad(e.currentTarget)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                Sem foto
              </div>
            )}
          </div>

          <div className="w-full flex-1 space-y-3">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            {imageSrc && dimensions.width > 0 && (
              <>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted">Zoom</Label>
                    <span className="text-[10px] text-muted">
                      {userZoom <= 1 ? "afastar" : "aproximar"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={zoomRange.min}
                    max={zoomRange.max}
                    step="0.02"
                    value={userZoom}
                    onChange={(e) => setUserZoom(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
);
