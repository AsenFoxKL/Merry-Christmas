import React, { useState, useMemo } from 'react';
import { AudioState, Track } from '../hooks/useAudioManager';

interface MusicPlayerProps {
  state: AudioState;
  playlist: Track[];
  onTogglePlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSelectTrack: (trackId: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onSeek: (time: number) => void;
  isLoading: boolean;
  hasError: boolean;
  showUI: boolean;
}

/**
 * 右上角音符UI：圆圈中间有音符，旋转表示播放，点击停止
 */
const MusicControlButton: React.FC<{
  isPlaying: boolean;
  isMuted: boolean;
  onTogglePlayPause: () => void;
  isLoading: boolean;
  hasError: boolean;
}> = ({ isPlaying, isMuted, onTogglePlayPause, isLoading, hasError }) => {
  return (
    <button
      onClick={onTogglePlayPause}
      className={`group relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
        hasError
          ? 'bg-red-500/20 border border-red-500/40'
          : 'bg-yellow-500/20 border border-yellow-500/40 hover:bg-yellow-500/30'
      } ${isLoading ? 'animate-pulse' : ''}`}
      title={isMuted ? 'Unmute' : 'Mute'}
    >
      {/* 外圆圈 */}
      <div
        className={`absolute inset-0 rounded-full border border-yellow-400/60 transition-all duration-500 ${
          isPlaying && !isMuted ? 'animate-spin' : ''
        }`}
        style={{ animationDuration: '3s' }}
      />

      {/* 音符符号 */}
      <svg
        className="w-6 h-6 text-yellow-300 relative z-10"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 3v9.28c-.47-.46-1.12-.75-1.84-.75-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V7h4V3h-5z" />
      </svg>

      {/* 静音时的斜线 */}
      {isMuted && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-0.5 bg-red-400 rotate-45 rounded-full" />
        </div>
      )}

      {/* 错误指示 */}
      {hasError && (
        <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      )}
    </button>
  );
};

/**
 * 右侧可展开的播放列表
 */
const PlaylistPanel: React.FC<{
  playlist: Track[];
  currentTrackId: number | null;
  onSelectTrack: (trackId: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ playlist, currentTrackId, onSelectTrack, isOpen, onToggle }) => {
  return (
    <div
      className={`fixed right-0 top-0 h-full bg-black/80 backdrop-blur-xl border-l border-yellow-500/20 transition-all duration-300 z-40 ${
        isOpen ? 'w-80' : 'w-0'
      } overflow-hidden`}
    >
      <div className="flex flex-col h-full p-6">
        <button
          onClick={onToggle}
          className="self-start mb-4 px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full text-yellow-300 hover:bg-yellow-500/30 transition-colors text-sm"
        >
          ✕ 关闭
        </button>

        <h2 className="text-xl font-serif text-yellow-300 mb-4 italic">歌单</h2>

        <div className="flex-1 overflow-y-auto space-y-2">
          {playlist.length === 0 ? (
            <p className="text-gray-400 text-sm">暂无歌曲</p>
          ) : (
            playlist.map((track) => (
              <button
                key={track.id}
                onClick={() => {
                  onSelectTrack(track.id);
                  onToggle();
                }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                  currentTrackId === track.id
                    ? 'bg-yellow-500/40 border border-yellow-400/60 text-yellow-100 font-semibold shadow-[0_0_12px_rgba(255,215,0,0.3)]'
                    : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  {currentTrackId === track.id && (
                    <svg className="w-4 h-4 text-yellow-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                  <span className="truncate">{track.name}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const MusicPlayer: React.FC<MusicPlayerProps> = ({
  state,
  playlist,
  onTogglePlayPause,
  onNext,
  onPrev,
  onSelectTrack,
  onVolumeChange,
  onToggleMute,
  onSeek,
  isLoading,
  hasError,
  showUI,
}) => {
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const currentTrack = useMemo(
    () => playlist.find((t) => t.id === state.currentTrackId),
    [playlist, state.currentTrackId]
  );

  const progressPercent = useMemo(
    () => (state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0),
    [state.currentTime, state.duration]
  );

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* 右上角音符控制按钮 */}
      <div
        className={`fixed top-4 right-4 md:top-8 md:right-8 transition-all duration-1000 z-50 ${
          showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
          className="absolute -left-16 top-0 w-12 h-12 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center hover:bg-yellow-500/30 transition-colors group"
          title="Toggle Playlist"
        >
          <svg
            className="w-6 h-6 text-yellow-300 group-hover:scale-110 transition-transform"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
          </svg>
        </button>

        <MusicControlButton
          isPlaying={state.isPlaying}
          isMuted={state.isMuted}
          onTogglePlayPause={onTogglePlayPause}
          isLoading={isLoading}
          hasError={hasError}
        />
      </div>

      {/* 右侧播放列表面板 */}
      <PlaylistPanel
        playlist={playlist}
        currentTrackId={state.currentTrackId}
        onSelectTrack={onSelectTrack}
        isOpen={isPlaylistOpen}
        onToggle={() => setIsPlaylistOpen(!isPlaylistOpen)}
      />
    </>
  );
};

export default MusicPlayer;
