import React, { useState } from 'react';
import { Cpu, Radio, Wrench, Server, EyeOff } from 'lucide-react';

interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  category?: string;
  className?: string;
  containerClassName?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  category,
  className = '',
  containerClassName = '',
}) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const getCategoryIcon = () => {
    switch (category?.toLowerCase()) {
      case 'electronics':
        return <Cpu className="w-10 h-10 text-electric-400" aria-hidden="true" />;
      case 'iot':
        return <Radio className="w-10 h-10 text-emerald-400" aria-hidden="true" />;
      case 'robotics':
        return <Wrench className="w-10 h-10 text-amber-400" aria-hidden="true" />;
      case 'computing':
        return <Server className="w-10 h-10 text-ai-400" aria-hidden="true" />;
      default:
        return <EyeOff className="w-10 h-10 text-slate-500" aria-hidden="true" />;
    }
  };

  const hasValidSrc = Boolean(src && src.trim() && !error);

  return (
    <div
      className={`relative w-full aspect-[4/3] overflow-hidden bg-navy-950 flex items-center justify-center select-none ${containerClassName}`}
    >
      {hasValidSrc ? (
        <>
          {!loaded && (
            <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center">
              <span className="sr-only">Loading photograph...</span>
            </div>
          )}
          <img
            src={src!}
            alt={alt}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
              loaded ? 'opacity-100' : 'opacity-0'
            } ${className}`}
          />
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-navy-900 to-navy-950 border border-navy-800">
          <div className="p-3 rounded-full bg-navy-800/80 mb-2 ring-1 ring-white/10">
            {getCategoryIcon()}
          </div>
          <p className="text-xs font-medium text-slate-400 font-sans">
            Photo not available
          </p>
          <span className="text-[10px] text-slate-500 mt-0.5">
            {category || 'Laboratory Equipment'}
          </span>
        </div>
      )}
    </div>
  );
};
