import React from 'react';
import { Plyr } from 'plyr-react';
import 'plyr-react/plyr.css';
import plyrSprite from '../../assets/plyr.svg?url';

// Custom CSS to fix invisible icons and match branding
const plyrCustomStyles = `
  .plyr {
    --plyr-color-main: #4f46e5;
    --plyr-video-control-color: #ffffff;
    --plyr-video-control-color-hover: #ffffff;
    --plyr-control-icon-size: 18px;
    border-radius: inherit;
  }
  .plyr__control svg {
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  }
  /* Fix for Play/Pause and other controls */
  .plyr__control--overlaid svg {
    width: 44px !important;
    height: 44px !important;
  }
  .plyr__control--overlaid {
    background: rgba(79, 70, 229, 0.9) !important;
    padding: 24px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 50%;
  }
  .plyr--video .plyr__control.plyr__tab-focus,
  .plyr--video .plyr__control:hover,
  .plyr--video .plyr__control[aria-expanded=true] {
    background: rgba(79, 70, 229, 1) !important;
  }
`;
import { Play, AlertCircle, ExternalLink, Shield } from 'lucide-react';

const ensureAbsoluteUrl = (url) => {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.)?(youtube\.com|youtu\.be|vimeo\.com)/i.test(trimmed)) return `https://${trimmed.replace(/^\/+/, '')}`;
  return trimmed;
};

const getYouTubeId = (url) => {
  if (!url) return '';
  const safeUrl = ensureAbsoluteUrl(url);
  try {
    const parsed = new URL(safeUrl);
    const hostname = parsed.hostname.replace(/^www\./, '');
    if (hostname === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || '';
    if (hostname.endsWith('youtube.com')) {
      if (parsed.pathname.startsWith('/watch')) return parsed.searchParams.get('v') || '';
      if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/')[2] || '';
      if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/')[2] || '';
    }
  } catch { return ''; }
  return '';
};

const getVimeoId = (url) => {
  if (!url) return '';
  const safeUrl = ensureAbsoluteUrl(url);
  try {
    const parsed = new URL(safeUrl);
    const hostname = parsed.hostname.replace(/^www\./, '');
    if (!hostname.endsWith('vimeo.com')) return '';
    const segments = parsed.pathname.split('/').filter(Boolean);
    return segments[segments.length - 1] || '';
  } catch { return ''; }
};

const isVimeo = (url) => url && url.includes('vimeo.com');
const isYouTube = (url) => url && (url.includes('youtube.com') || url.includes('youtu.be'));

const getYouTubeThumbnail = (url) => {
  const videoId = getYouTubeId(url);
  if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  return null;
};

const isDirectMediaUrl = (url) => {
  if (!url) return false;
  if (isYouTube(url) || isVimeo(url)) return false;
  const lowerUrl = url.toLowerCase().split('?')[0];
  return [
    '.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v', '.m3u8',
  ].some((extension) => lowerUrl.endsWith(extension)) || lowerUrl.includes('/storage/v1/object/public/');
};

const VideoPlayer = ({ url, onEnded }) => {
  const [hasStarted, setHasStarted] = React.useState(false);
  const [playbackError, setPlaybackError] = React.useState('');

  const safeUrl = React.useMemo(() => ensureAbsoluteUrl(url), [url]);
  const youtubeId = React.useMemo(() => getYouTubeId(safeUrl), [safeUrl]);
  const vimeoId = React.useMemo(() => getVimeoId(safeUrl), [safeUrl]);
  const isDirectMedia = React.useMemo(() => isDirectMediaUrl(safeUrl), [safeUrl]);
  
  const thumbnailUrl = React.useMemo(() => (isYouTube(safeUrl) ? getYouTubeThumbnail(safeUrl) : null), [safeUrl]);
  const platformLabel = vimeoId ? 'Vimeo' : youtubeId ? 'YouTube' : 'วิดีโอ';

  const plyrSource = React.useMemo(() => {
    if (youtubeId) {
      return {
        type: 'video',
        sources: [{ src: youtubeId, provider: 'youtube' }],
      };
    }
    if (vimeoId) {
      return {
        type: 'video',
        sources: [{ src: vimeoId, provider: 'vimeo' }],
      };
    }
    if (isDirectMedia) {
      return {
        type: 'video',
        sources: [{ src: safeUrl, type: 'video/mp4' }], // Simplified type
      };
    }
    return null;
  }, [youtubeId, vimeoId, isDirectMedia, safeUrl]);

  // Prevent right-click to hide "Copy Video URL"
  const handleContextMenu = (event) => event.preventDefault();

  if (!safeUrl || (!plyrSource && !isDirectMedia)) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-white/5 bg-gray-900">
        <p className="text-sm font-bold text-gray-500">ไม่พบลิงก์วิดีโอ หรือลิงก์ไม่ถูกต้อง</p>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <button
        type="button"
        className="group relative w-full aspect-video cursor-pointer overflow-hidden bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.2)] md:rounded-[2.5rem]"
        onClick={() => setHasStarted(true)}
        onContextMenu={handleContextMenu}
        aria-label="เริ่มเล่นวิดีโอ"
      >
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt="ภาพตัวอย่างวิดีโอ"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/30 bg-white/20 pl-1 text-white shadow-2xl backdrop-blur-md transition-all duration-500 group-hover:scale-110 group-hover:bg-white/30">
            <Play size={44} fill="currentColor" />
          </div>
        </div>
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 md:bottom-6 md:left-8 md:translate-x-0 glass rounded-full border border-white/20 px-4 md:px-5 py-1.5 md:py-2 text-[10px] md:text-[11px] font-black tracking-[0.04em] text-white flex items-center gap-2 whitespace-nowrap">
          <Shield size={12} className="text-primary-light" />
          {platformLabel} • SECURE PLAYER
        </div>
      </button>
    );
  }

  if (playbackError) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-red-500/20 bg-slate-950 p-6 text-center">
        <div>
          <AlertCircle className="mx-auto mb-3 h-12 w-12 text-red-500" />
          <p className="mb-2 text-lg font-black text-white">เกิดข้อผิดพลาดในการเล่นวิดีโอ</p>
          <a href={safeUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-primary font-bold hover:underline">
            ลองเปิดลิงก์โดยตรง <ExternalLink size={16} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full aspect-video overflow-hidden bg-black shadow-2xl rounded-[1.5rem] md:rounded-[2rem] border border-white/10 group/player"
      onContextMenu={handleContextMenu}
    >
      <style>{plyrCustomStyles}</style>
      {/* Click Shield Layers - These cover parts of the player where titles/logos usually hide */}
      {/* Top Shield: Covers the header/title area */}
      <div className="absolute top-0 left-0 right-0 h-16 z-20 pointer-events-auto bg-transparent" />
      
      {/* Corner Shields: Cover redirect buttons for YouTube/Vimeo */}
      <div className="absolute top-0 right-0 w-24 h-20 z-20 pointer-events-auto bg-transparent" />
      <div className="absolute bottom-12 right-0 w-24 h-16 z-20 pointer-events-auto bg-transparent" />

      <div className="plyr-container h-full w-full">
        <Plyr
          source={plyrSource}
          options={{
            autoplay: true,
            iconUrl: plyrSprite,
            fullscreen: { iosNative: true },
            controls: [
              'play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen'
            ],
            settings: ['quality', 'speed'],
            quality: {
              default: 1080,
              // Let provider auto-populate options
            },
            youtube: { 
              noCookie: true, 
              rel: 0, 
              showinfo: 0, 
              iv_load_policy: 3, 
              modestbranding: 1,
              vq: 'hd1080'
            },
            vimeo: { 
              byline: false, 
              portrait: false, 
              title: false, 
              transparent: false,
              quality: '1080p'
            },
          }}
          onEnd={onEnded}
          onError={() => setPlaybackError('error')}
        />

      </div>

      {/* Subtle Protection indicator */}
      <div className="absolute top-4 right-4 z-30 opacity-0 group-hover/player:opacity-100 transition-opacity pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-[10px] font-black text-white/50 tracking-widest uppercase">
          <Shield size={10} /> Secure Content
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
