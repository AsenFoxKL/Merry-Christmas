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
 * 配置本地音乐列表
 * 注意：GitHub Pages 上请使用相对路径
 * 文件需要在 public/music/ 文件夹中，构建时会复制到 dist/music/
 */
export const MUSIC_TRACKS: Track[] = [
  {
    id: 1,
    name: 'Saccharin',
    url: './music/Saccharin.mp3',
  },
  {
    id: 2,
    name: 'Not Going Home',
    url: './music/Not Going Home.mp3',
  },
  {
    id: 3,
    name: "We Don't Talk Anymore",
    url: "./music/We Don't Talk Anymore.mp3",
  },
];

/**
 * 从 CDN 加载音乐（推荐用于 GitHub Pages）
 * 无需托管音乐文件，直接使用外部资源
 * 这些是免费的示例音乐 URL，你可以替换为自己的
 */
export const MUSIC_TRACKS_CDN: Track[] = [
//   {
//     id: 101,
//     name: 'Christmas Music (Example 1)',
//     url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
//   },
//   {
//     id: 102,
//     name: 'Christmas Music (Example 2)',
//     url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
//   },
//   {
//     id: 103,
//     name: 'Christmas Music (Example 3)',
//     url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
//   },
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
 * 合并多个音乐源（本地 + CDN）
 * 如果本地音乐文件不存在，会自动使用 CDN 音乐
 */
export const getMusicTracks = (): Track[] => {
  const combined = [...MUSIC_TRACKS, ...MUSIC_TRACKS_CDN];
  // 如果没有配置任何本地音乐，优先使用 CDN（更可靠）
  return MUSIC_TRACKS.length > 0 ? combined : MUSIC_TRACKS_CDN;
};
