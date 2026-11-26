import React, { useEffect, useRef } from 'react';

interface MovieScenePreviewVideoProps {
  srcUrl: string;
  posterUrl?: string;
  title: string;
  muted: boolean;
  maxSeconds?: number;
  startFraction?: number;
  onProgress?: (elapsedSeconds: number, remainingSeconds: number) => void;
  onComplete?: () => void;
  onError?: () => void;
  className?: string;
}

export const MovieScenePreviewVideo: React.FC<MovieScenePreviewVideoProps> = ({
  srcUrl,
  posterUrl,
  title,
  muted,
  maxSeconds = 30,
  startFraction = 0.08,
  onProgress,
  onComplete,
  onError,
  className = 'h-full w-full object-cover bg-black',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startTimeRef = useRef<number>(0);
  const seekAppliedRef = useRef<boolean>(false);

  useEffect(() => {
    startTimeRef.current = 0;
    seekAppliedRef.current = false;
  }, [srcUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  const handleLoadedMetadata = () => {
    const el = videoRef.current;
    if (!el || seekAppliedRef.current) return;
    seekAppliedRef.current = true;

    const dur = el.duration;
    let targetOffset = 0;
    if (Number.isFinite(dur) && dur > 90) {
      targetOffset = Math.min(Math.max(25, Math.round(dur * startFraction)), Math.max(25, dur - maxSeconds - 5));
    } else if (Number.isFinite(dur) && dur > maxSeconds + 10) {
      targetOffset = Math.round(dur * 0.15);
    }

    startTimeRef.current = targetOffset;
    if (targetOffset > 0) {
      try {
        el.currentTime = targetOffset;
      } catch {
        startTimeRef.current = 0;
      }
    }
    void el.play().catch(() => {
      // Ignore autoplay promise rejection if browser requires muted playback
    });
  };

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el) return;
    const elapsed = Math.max(0, el.currentTime - startTimeRef.current);
    const remaining = Math.max(0, Math.ceil(maxSeconds - elapsed));
    onProgress?.(elapsed, remaining);
    if (elapsed >= maxSeconds) {
      el.pause();
      onComplete?.();
    }
  };

  const safePoster =
    posterUrl && (posterUrl.startsWith('https://') || posterUrl.startsWith('/src/assets/images/'))
      ? posterUrl
      : undefined;

  return (
    <video
      ref={videoRef}
      src={srcUrl}
      poster={safePoster}
      aria-label={`${title} scene preview`}
      autoPlay
      muted={muted}
      playsInline
      preload="metadata"
      onLoadedMetadata={handleLoadedMetadata}
      onTimeUpdate={handleTimeUpdate}
      onEnded={() => onComplete?.()}
      onError={() => onError?.()}
      className={className}
    />
  );
};
