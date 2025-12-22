/**
 * 音乐配置文件 - 自动加载版本
 * 
 * 使用说明：
 * 1. 将音乐文件放在 public/music/ 文件夹中
 * 2. 支持格式：.mp3, .wav, .ogg, .m4a
 * 3. 代码会自动检测并加载所有音乐文件，无需手动配置
 * 
 * 原理：使用 import.meta.glob 自动扫描 public/music/ 文件夹
 * 这与图片加载逻辑一致，保证了一致性和可维护性
 */

import { generateMusicTracks } from '../utils';

/**
 * 动态加载音乐列表
 * 使用 import.meta.glob 自动扫描 public/music/ 中的所有音乐文件
 */
export const getMusicTracks = () => {
  return generateMusicTracks();
};
