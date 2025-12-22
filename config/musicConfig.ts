/**
 * 音乐配置文件
 * 
 * 使用说明：
 * 1. 将音乐文件放在 public/music/ 文件夹中（需要创建此文件夹）
 * 2. 在下面的 MUSIC_TRACKS 中添加对应的条目
 * 3. URL 格式：'/music/filename.mp3'
 * 
 * 支持格式：.mp3, .wav, .ogg, .m4a
 * 
 * 示例：
 * {
 *   id: 1,
 *   name: 'Jingle Bells',
 *   url: '/music/jingle-bells.mp3'
 * }
 */

import { Track } from '../hooks/useAudioManager';

/**
 * 配置你的音乐列表
 * 更新此数组来添加或修改歌曲
 */
export const MUSIC_TRACKS: Track[] = [
  // 示例：取消注释以使用
  {
    id: 1,
    name: 'Saccharin.mp3',
    url: '/music/Saccharin.mp3',
  },
  {
    id: 2,
    name: "Not Going Home",
    url: "/music/Not Going Home.mp3",
  },
  {
    id: 3,
    name: "We Don't Talk Anymore",
    url: "/music/We Don't Talk Anymore.mp3"
  },
  // 添加更多歌曲...
];

/**
 * 从 CDN 加载音乐（备选方案）
 * 
 * 示例使用 free Christmas music CDN：
 * https://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg
 */
export const MUSIC_TRACKS_CDN: Track[] = [
  // {
  //   id: 1,
  //   name: 'Christmas Music',
  //   url: 'https://example.com/christmas-music.mp3',
  // },
];

/**
 * 动态加载音乐列表（来自 memories/music/ 文件夹）
 * 
 * 使用 import.meta.glob 自动检测 public/music/ 中的所有音乐文件
 */
export const loadDynamicMusicTracks = async (): Promise<Track[]> => {
  // 注意：这需要在构建时已知文件
  // 如果你想真正动态加载，需要后端 API 支持
  return MUSIC_TRACKS;
};

/**
 * 合并多个音乐源
 */
export const getMusicTracks = (): Track[] => {
  return [...MUSIC_TRACKS, ...MUSIC_TRACKS_CDN];
};
