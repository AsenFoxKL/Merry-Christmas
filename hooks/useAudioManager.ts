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
 * 智能音频管理 Hook
 * - 核心功能：应对浏览器自动播放策略
 * - 策略：尝试有声自动播放 -> 失败则静音自动播放 -> 监听用户任意点击恢复声音
 */
export const useAudioManager = (tracks: Track[], autoPlayOnMount = true) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryCountRef = useRef<{ [key: number]: number }>({});
  const maxRetriesRef = useRef(3);

  // 标记是否已经通过用户交互解锁了音频上下文
  const audioUnlockedRef = useRef(false);

  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    currentTrackId: null,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false, // 注意：这里的 isMuted 是 UI 状态，与 audio.muted 可能短暂不一致
  });

  const [playlist, setPlaylist] = useState<Track[]>(tracks);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // --- 内部辅助：恢复声音 ---
  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current || !audioRef.current) return;
    
    // 恢复声音
    audioRef.current.muted = false;
    // 确保音量正常
    audioRef.current.volume = state.volume > 0 ? state.volume : 1; 
    
    audioUnlockedRef.current = true;
    console.log('Audio Context Unlocked by User Interaction');

    // 同步 UI 状态
    setState(prev => ({ ...prev, isMuted: false }));
  }, [state.volume]);

  // --- 初始化音频元素 ---
  useEffect(() => {
    if (audioRef.current) return;

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto'; // 建议改为 auto
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

    // 播放错误处理
    const onError = (e: Event) => {
        // 忽略由 load() 调用产生的中断错误
       if (audio.error && audio.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
           // 可能是路径问题，也可能是加载中切歌
           console.warn("Audio Source Error, attempting retry...");
       }

      setHasError(true);
      setIsLoading(false);
      
      if (state.currentTrackId !== null) {
        const retryCount = retryCountRef.current[state.currentTrackId] || 0;
        if (retryCount < maxRetriesRef.current) {
          retryCountRef.current[state.currentTrackId] = retryCount + 1;
          setTimeout(() => {
            if (audioRef.current) {
              // 重试播放
              play(state.currentTrackId!); 
            }
          }, 1000 * (retryCount + 1));
        }
      }
    };

    // 全局交互监听：只要用户点击任何地方，就解除静音
    const globalUnlockListener = () => {
        unlockAudio();
        // 解锁后移除监听器，避免性能浪费
        document.removeEventListener('click', globalUnlockListener);
        document.removeEventListener('touchstart', globalUnlockListener);
        document.removeEventListener('keydown', globalUnlockListener);
    };

    document.addEventListener('click', globalUnlockListener);
    document.addEventListener('touchstart', globalUnlockListener);
    document.addEventListener('keydown', globalUnlockListener);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    audioRef.current = audio;

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      
      document.removeEventListener('click', globalUnlockListener);
      document.removeEventListener('touchstart', globalUnlockListener);
      document.removeEventListener('keydown', globalUnlockListener);
      audio.pause();
      audio.src = "";
    };
  }, []); // 依赖项为空，只运行一次

  // --- 核心播放逻辑 ---
  const play = useCallback(
    (trackId: number) => {
      const track = playlist.find((t) => t.id === trackId);
      if (!track || !audioRef.current) return;

      setIsLoading(true);
      retryCountRef.current[trackId] = 0;

      // 只有当 URL 变化时才重新赋值 src，避免重复加载
      // 但如果当前没有 src，也需要赋值
      const currentSrcPath = audioRef.current.src.split(window.location.origin)[1];
      // 简单的 URL 比较，处理 base 路径
      const isSameUrl = audioRef.current.src.includes(track.url); 

      if (!isSameUrl || audioRef.current.error) {
           audioRef.current.src = track.url;
      }

      // 定义播放尝试函数
      const attemptPlay = async () => {
        if (!audioRef.current) return;

        try {
            await audioRef.current.play();
            // 成功播放（可能是因为已经有交互，或者是第二次尝试）
            setState((prev) => ({
                ...prev,
                isPlaying: true,
                currentTrackId: trackId,
                isMuted: audioRef.current!.muted // 同步静音状态
            }));
            setHasError(false);
            setIsLoading(false);
        } catch (err: any) {
            console.log('Autoplay blocked check:', err.name);
            
            // 核心修复：如果是 NotAllowedError，说明浏览器拦截了
            if (err.name === 'NotAllowedError') {
                console.log('Policy restricted. Fallback to Muted Autoplay.');
                
                // 1. 设为静音
                audioRef.current.muted = true;
                setState(prev => ({ ...prev, isMuted: true }));
                
                // 2. 再次尝试播放（静音状态下通常允许播放）
                try {
                    await audioRef.current.play();
                    setState((prev) => ({
                        ...prev,
                        isPlaying: true,
                        currentTrackId: trackId,
                    }));
                    setHasError(false);
                    // 此时音乐在播放，但是是静音的
                    // 等待上面 useEffect 里的 globalUnlockListener 被用户触发
                } catch (retryErr) {
                    console.error('Even muted autoplay failed:', retryErr);
                    setIsLoading(false);
                }
            } else {
                // 其他错误（如 404）
                setHasError(true);
                setIsLoading(false);
            }
        }
      };

      attemptPlay();
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
      // 恢复时也要确保尝试解除静音（如果用户是点击播放按钮的话）
      if (!audioUnlockedRef.current) unlockAudio();
      
      audioRef.current
        .play()
        .then(() => {
          setState((prev) => ({
            ...prev,
            isPlaying: true,
          }));
        })
        .catch((e) => console.error("Resume failed", e));
    }
  }, [state.isPlaying, unlockAudio]);

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
    // 这里的逻辑需要获取最新的 currentTrackId，建议通过 setState 回调或 ref 优化
    // 这里简单修复：依赖 state.currentTrackId
    // 为了闭包安全性，最好在 useEffect 内部处理或使用 Ref 存储 CurrentId，但这里不做大改
    setState(currentState => {
        const currentIndex = playlist.findIndex(t => t.id === currentState.currentTrackId);
        const nextIndex = (currentIndex + 1) % playlist.length;
        // 必须异步调用 play 避免 state 更新冲突
        setTimeout(() => play(playlist[nextIndex].id), 0);
        return currentState;
    });
  }, [playlist, play]); // 移除 state.currentTrackId 依赖，改用 setState 回调

  // 上一曲
  const handlePrev = useCallback(() => {
    if (playlist.length === 0) return;
    setState(currentState => {
        const currentIndex = playlist.findIndex(t => t.id === currentState.currentTrackId);
        const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
        setTimeout(() => play(playlist[prevIndex].id), 0);
        return currentState;
    });
  }, [playlist, play]);

  // 设置音量
  const setVolume = useCallback((vol: number) => {
    const clampedVol = Math.max(0, Math.min(1, vol));
    if (audioRef.current) {
      audioRef.current.volume = clampedVol;
      // 如果用户手动拖动音量，也视为解锁
      if (clampedVol > 0 && audioRef.current.muted) {
          audioRef.current.muted = false;
          setState(prev => ({...prev, isMuted: false}));
      }
    }
    setState((prev) => ({
      ...prev,
      volume: clampedVol,
    }));
  }, []);

  // 切换静音
  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      const newMutedState = !state.isMuted;
      audioRef.current.muted = newMutedState;
      // 如果是解除静音，恢复音量
      if (!newMutedState && audioRef.current.volume === 0) {
          audioRef.current.volume = state.volume || 1; 
      }
      setState((prev) => ({
        ...prev,
        isMuted: newMutedState,
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

  // --- 自动播放触发器 ---
  useEffect(() => {
    // 只有当组件挂载、且从未播放过音乐时触发
    if (autoPlayOnMount && playlist.length > 0 && state.currentTrackId === null) {
      console.log('Triggering initial autoplay...');
      // 稍微延迟确保 DOM 准备好
      const timer = setTimeout(() => {
        play(playlist[0].id);
      }, 800);
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