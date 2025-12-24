
import React, { useRef, useEffect } from 'react';

interface VideoFeedProps {
  stream: MediaStream | null;
  label: string;
  isMuted?: boolean;
  isMirror?: boolean;
}

export const VideoFeed: React.FC<VideoFeedProps> = ({ stream, label, isMuted = false, isMirror = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full aspect-[4/3] bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shadow-lg">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className={`w-full h-full object-cover ${isMirror ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-[10px] italic">
          <svg className="w-6 h-6 mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label}
        </div>
      )}
      <div className="absolute bottom-1.5 left-1.5 bg-black/60 px-1.5 py-0.5 rounded text-[8px] text-white uppercase tracking-wider font-bold">
        {label}
      </div>
    </div>
  );
};
