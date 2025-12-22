# 🎵 音乐播放功能使用指南

## 功能概述

本项目现已支持以下音乐功能：

✅ **自动播放**：进入网页时自动开始播放音乐（带重试机制）
✅ **音符控制UI**：右上角圆圈音符，旋转表示播放，点击停止/继续
✅ **播放列表**：右上角列表按钮，展开后显示所有歌曲并可选择
✅ **健壮性**：自动重试失败的加载，优雅处理浏览器自动播放策略
✅ **迷你播放器**：底部显示当前播放歌曲、进度和控制按钮

## 配置音乐

### 步骤 1：创建音乐文件夹

在项目根目录创建 `public/music/` 文件夹（如果不存在）：

```bash
mkdir public/music
```

### 步骤 2：添加音乐文件

将你的音乐文件（支持 `.mp3`, `.wav`, `.ogg`, `.m4a`）放入 `public/music/` 文件夹。

### 步骤 3：配置音乐列表

编辑 [config/musicConfig.ts](config/musicConfig.ts)，在 `MUSIC_TRACKS` 数组中添加你的歌曲：

```typescript
export const MUSIC_TRACKS: Track[] = [
  {
    id: 1,
    name: 'Jingle Bells',
    url: '/music/jingle-bells.mp3',
  },
  {
    id: 2,
    name: 'Silent Night',
    url: '/music/silent-night.mp3',
  },
  // 添加更多歌曲...
];
```

### 步骤 4（可选）：使用 CDN 音乐

如果你想使用 CDN 上的音乐而不需要自己托管，可以修改配置：

```typescript
export const MUSIC_TRACKS_CDN: Track[] = [
  {
    id: 1,
    name: 'Christmas Music',
    url: 'https://example.com/christmas-music.mp3',
  },
];
```

## UI 说明

### 右上角音符按钮
- **圆圈旋转**：表示音乐正在播放
- **点击**：暂停/继续播放
- **静音状态**：音符上出现红色斜线
- **错误状态**：右上角出现红点提示加载失败

### 右上角列表按钮（音符左侧）
- **点击**：展开/关闭播放列表面板
- **选择歌曲**：点击列表中的歌曲可直接播放
- **当前播放**：会高亮显示，并左侧有播放图标

### 底部迷你播放器
- **显示当前歌曲名称和进度**
- **上/下一曲按钮**：快速切换歌曲
- **暂停/继续按钮**：控制播放状态
- **进度条**：可拖动改变播放位置

## 高级配置

### 自动重试机制

音乐加载失败时会自动重试最多 3 次，间隔为指数退避：
- 第1次失败后：1秒后重试
- 第2次失败后：2秒后重试
- 第3次失败后：3秒后重试

### 浏览器自动播放策略

现代浏览器要求用户交互后才能播放音乐。本项目使用以下策略：
- 页面加载后延迟 500ms 开始播放，给用户时间反应
- 如果自动播放被拦截，用户可点击音符按钮手动播放
- 一旦用户与页面交互（点击、手势等），之后的播放不受限制

### 跨域配置

如果使用 CDN 音乐，确保服务器配置了 CORS。本项目已在 `useAudioManager` 中设置：

```javascript
audio.crossOrigin = 'anonymous';
```

## 故障排除

### 音乐无法播放
1. 检查文件路径是否正确：`/music/filename.mp3`
2. 确保文件格式被浏览器支持（.mp3 兼容性最好）
3. 查看浏览器控制台是否有 CORS 错误
4. 尝试点击音符按钮手动播放

### 自动播放不工作
1. 这是浏览器的安全策略，用户需要先与页面交互
2. 点击任何地方（3D 场景、按钮等）后，音乐会自动播放
3. 确保 `useAudioManager` 的第二个参数是 `true`

### 音乐卡顿或延迟
1. 检查网络连接
2. 使用更高效的音频格式（.mp3 通常比 .wav 小）
3. 如果使用远程 URL，考虑使用 CDN

## 扩展功能建议

- [ ] 音量调节滑块
- [ ] 循环播放和随机播放
- [ ] 音乐可视化效果
- [ ] 保存用户的播放历史和偏好
- [ ] 与摄像头手势识别集成（挥手切换歌曲）
- [ ] 从 Spotify/Apple Music API 加载歌单

## 相关文件

- 🎵 **Hook**：[hooks/useAudioManager.ts](../../hooks/useAudioManager.ts)
- 🎨 **UI 组件**：[components/MusicPlayer.tsx](../../components/MusicPlayer.tsx)
- ⚙️ **配置文件**：[config/musicConfig.ts](../../config/musicConfig.ts)
- 📱 **主应用**：[App.tsx](../../App.tsx)
