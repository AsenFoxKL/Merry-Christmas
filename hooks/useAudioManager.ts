import { useState, useRef, useEffect, useCallback } from 'react';

export interface Track {
  id: number;
  name: string;
  url: string;
}

export interface AudioState {
  isPlaying: boolean;
  currentTrackId: number | null;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
}

/**
 * 健壮的音频管理 Hook
 * - 自动重试加载失败的音乐
 * - 处理多浏览器兼容性
 * - 优雅降级
 */
export const useAudioManager = (tracks: Track[], autoPlayOnMount = true) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryCountRef = useRef<{ [key: number]: number }>({});
  const maxRetriesRef = useRef(3);
  const userInteractedRef = useRef(false);

  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    currentTrackId: null,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
  });

  const [playlist, setPlaylist] = useState<Track[]>(tracks);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // 初始化音频元素
  useEffect(() => {
    if (audioRef.current) return;

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.volume = 1;

    // 监听播放进度
    const onTimeUpdate = () => {
      setState((prev) => ({
        ...prev,
        currentTime: audio.currentTime,
      }));
    };

    // 监听时长加载
    const onLoadedMetadata = () => {
      setState((prev) => ({
        ...prev,
        duration: audio.duration,
      }));
      setIsLoading(false);
    };

    // 监听播放结束
    const onEnded = () => {
      handleNext();
    };

    // 播放错误处理 - 带自动重试
    const onError = () => {
      setHasError(true);
      setIsLoading(false);
      
      if (state.currentTrackId !== null) {
        const retryCount = retryCountRef.current[state.currentTrackId] || 0;
        if (retryCount < maxRetriesRef.current) {
          retryCountRef.current[state.currentTrackId] = retryCount + 1;
          setTimeout(() => {
            if (audioRef.current && userInteractedRef.current) {
              audio.play().catch(() => {});
            }
          }, 1000 * (retryCount + 1)); // 指数退避
        } else {
          handleNext();
        }
      }
    };

    // 自动播放就绪
    const onCanPlay = () => {
      setHasError(false);
      if (state.isPlaying) {
        audio
          .play()
          .catch((err) => {
            console.log('Autoplay prevented:', err);
          });
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('canplay', onCanPlay);

    audioRef.current = audio;

    // 监听用户交互，解除自动播放限制
    const onUserInteract = () => {
      userInteractedRef.current = true;
      // 尝试恢复播放（如果被自动播放策略中断）
      if (state.currentTrackId !== null && !state.isPlaying && autoPlayOnMount) {
        audio.play().catch(() => {});
      }
    };

    document.addEventListener('click', onUserInteract, { once: true });
    document.addEventListener('touchstart', onUserInteract, { once: true });
    document.addEventListener('keydown', onUserInteract, { once: true });

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('canplay', onCanPlay);
      document.removeEventListener('click', onUserInteract);
      document.removeEventListener('touchstart', onUserInteract);
      document.removeEventListener('keydown', onUserInteract);
    };
  }, []);

  // 播放指定曲目
  const play = useCallback(
    (trackId: number) => {
      const track = playlist.find((t) => t.id === trackId);
      if (!track || !audioRef.current) return;

      setIsLoading(true);
      retryCountRef.current[trackId] = 0;

      audioRef.current.src = track.url;
      
      // 只有在用户交互后或明确调用 play 时才播放
      const attemptPlay = () => {
        if (!audioRef.current) return;
        
        audioRef.current
          .play()
          .then(() => {
            setState((prev) => ({
              ...prev,
              isPlaying: true,
              currentTrackId: trackId,
            }));
          })
          .catch((err: Error) => {
            console.log('Play failed:', err.name);
            // NotAllowedError 是自动播放被拦截，这是正常的
            if (err.name === 'NotAllowedError') {
              // 等待用户交互后再试
              setHasError(false);
              return;
            }
            // 其他错误（文件不存在、格式不支持等）
            setHasError(true);
            setIsLoading(false);
          });
      };

      // 检查是否已获得用户交互
      if (userInteractedRef.current) {
        attemptPlay();
      } else {
        // 如果还没有用户交互，延迟尝试
        setTimeout(attemptPlay, 100);
      }
    },
    [playlist]
  );

  // 暂停
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState((prev) => ({
        ...prev,
        isPlaying: false,
      }));
    }
  }, []);

  // 继续播放
  const resume = useCallback(() => {
    if (audioRef.current && !state.isPlaying) {
      audioRef.current
        .play()
        .then(() => {
          setState((prev) => ({
            ...prev,
            isPlaying: true,
          }));
        })
        .catch(() => {
          setHasError(true);
        });
    }
  }, [state.isPlaying]);

  // 切换播放/暂停
  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else if (state.currentTrackId !== null) {
      resume();
    } else if (playlist.length > 0) {
      play(playlist[0].id);
    }
  }, [state.isPlaying, state.currentTrackId, pause, resume, play, playlist]);

  // 下一曲
  const handleNext = useCallback(() => {
    if (playlist.length === 0) return;

    const currentIndex = playlist.findIndex(
      (t) => t.id === state.currentTrackId
    );
    const nextIndex = (currentIndex + 1) % playlist.length;
    play(playlist[nextIndex].id);
  }, [playlist, state.currentTrackId, play]);

  // 上一曲
  const handlePrev = useCallback(() => {
    if (playlist.length === 0) return;

    const currentIndex = playlist.findIndex(
      (t) => t.id === state.currentTrackId
    );
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    play(playlist[prevIndex].id);
  }, [playlist, state.currentTrackId, play]);

  // 设置音量
  const setVolume = useCallback((vol: number) => {
    const clampedVol = Math.max(0, Math.min(1, vol));
    if (audioRef.current) {
      audioRef.current.volume = clampedVol;
    }
    setState((prev) => ({
      ...prev,
      volume: clampedVol,
    }));
  }, []);

  // 切换静音
  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (state.isMuted) {
        audioRef.current.volume = state.volume;
      } else {
        audioRef.current.volume = 0;
      }
      setState((prev) => ({
        ...prev,
        isMuted: !prev.isMuted,
      }));
    }
  }, [state.isMuted, state.volume]);

  // 拖动进度条
  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState((prev) => ({
        ...prev,
        currentTime: time,
      }));
    }
  }, []);

  // 自动播放初始化
  useEffect(() => {
    if (autoPlayOnMount && playlist.length > 0 && !state.currentTrackId) {
      // 延迟播放以避免浏览器自动播放政策
      // 同时等待用户交互
      const timer = setTimeout(() => {
        play(playlist[0].id);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPlayOnMount, playlist, state.currentTrackId, play]);

  return {
    state,
    playlist,
    setPlaylist,
    play,
    pause,
    resume,
    togglePlayPause,
    handleNext,
    handlePrev,
    setVolume,
    toggleMute,
    seek,
    isLoading,
    hasError,
  };
};
