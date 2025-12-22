# GitHub Pages 音乐配置指南

## 问题说明

在 GitHub Pages 部署时，可能会出现以下错误：

```
Failed to load resource: the server responded with a status of 404
NotAllowedError: play() failed because the user didn't interact with the document first.
NotSupportedError: Failed to load because no supported source was found.
```

这有两个主要原因：

1. **音乐文件路径不正确** - 本地文件在 GitHub Pages 上找不到
2. **自动播放被浏览器拦截** - 现代浏览器要求用户交互才允许播放

## 解决方案

### 方案 1：使用 CDN 音乐（推荐）⭐

这是最简单和最可靠的方法，无需维护音乐文件：

#### 步骤：

1. 编辑 `config/musicConfig.ts`

2. 在 `MUSIC_TRACKS_CDN` 中添加你的音乐 URL：

```typescript
export const MUSIC_TRACKS_CDN: Track[] = [
  {
    id: 1,
    name: 'Your Song Name',
    url: 'https://example.com/your-music.mp3',  // 替换为实际 URL
  },
];
```

3. 应用会自动使用 CDN 音乐（如果 `MUSIC_TRACKS` 为空）

**推荐的免费音乐源：**
- Zapsplat: https://www.zapsplat.com
- FreePD: https://freepdmusic.com
- Pixabay Music: https://pixabay.com/music
- YouTube Audio Library

### 方案 2：本地音乐文件（需要额外配置）

如果坚持使用本地文件：

1. **创建 public/music/ 文件夹**
   ```bash
   mkdir -p public/music
   ```

2. **放入音乐文件**
   将你的 `.mp3`、`.wav`、`.ogg` 等文件放入此文件夹

3. **编辑 config/musicConfig.ts**
   ```typescript
   export const MUSIC_TRACKS: Track[] = [
     {
       id: 1,
       name: 'Song Name',
       url: './music/song.mp3',  // 使用相对路径！
     },
   ];
   ```

4. **确保 GitHub 工作流程配置正确**

   检查 `.github/workflows/deploy.yml` 是否包含以下内容：

   ```yaml
   - name: Build
     run: npm run build
   ```

   Vite 会自动从 `public/` 复制文件到 `dist/`

5. **本地测试**
   ```bash
   npm run build
   npm run preview
   ```
   访问 http://localhost:4173 测试

### 方案 3：混合方案（推荐）

结合两种方案的优点：

```typescript
export const MUSIC_TRACKS: Track[] = [
  // 本地音乐（如果有的话）
  {
    id: 1,
    name: 'Local Song',
    url: './music/local-song.mp3',
  },
];

export const MUSIC_TRACKS_CDN: Track[] = [
  // CDN 备选音乐
  {
    id: 2,
    name: 'CDN Song',
    url: 'https://example.com/cdn-song.mp3',
  },
];

// 如果本地音乐文件不存在，会自动使用 CDN
export const getMusicTracks = (): Track[] => {
  const combined = [...MUSIC_TRACKS, ...MUSIC_TRACKS_CDN];
  return MUSIC_TRACKS.length > 0 ? combined : MUSIC_TRACKS_CDN;
};
```

## 自动播放问题解决

### 问题

`NotAllowedError: play() failed because the user didn't interact with the document first.`

### 原因

现代浏览器出于安全和用户体验考虑，禁止未经用户交互的自动播放。

### 解决方案

应用已自动处理：

1. **用户交互监听**
   - 应用监听用户的点击、触摸或按键
   - 一旦用户与页面交互，之后的播放不受限制

2. **用户友好的 UI**
   - 右上角音符按钮显示播放状态
   - 用户可以点击按钮手动启动播放
   - 错误时显示红色提示

3. **无缝体验**
   ```typescript
   // 应用在 500ms 后尝试播放第一首歌
   // 如果被阻止，用户点击任何地方后会自动播放
   ```

## 调试步骤

如果仍有问题，请按以下步骤排查：

### 1. 检查浏览器控制台错误

打开开发者工具（F12），查看 Console 标签下的错误信息。

### 2. 检查网络标签

Network 标签中查看音乐文件是否成功加载（绿色 200 状态）。

### 3. 检查 CORS

如果使用跨域 CDN，确保：
- 服务器返回正确的 CORS 头
- 应用已设置 `crossOrigin = 'anonymous'`（已内置）

### 4. 测试音频格式

某些浏览器对音频格式的支持不同：
- `.mp3` - 最兼容 ✅
- `.wav` - 兼容性好
- `.ogg` - 某些浏览器可能不支持
- `.m4a` - 需要合适的 MIME 类型

### 5. 查看完整错误日志

在浏览器控制台运行：

```javascript
// 查看当前加载的音乐 URL
console.log(document.querySelector('audio')?.src);

// 检查音频元素状态
const audio = document.querySelector('audio');
console.log({
  currentSrc: audio?.src,
  networkState: audio?.networkState, // 0=未初始化, 1=空闲, 2=加载中, 3=网络错误
  readyState: audio?.readyState,      // 0=未初始化, 1=元数据, 2=当前数据, 3=足够数据, 4=可播放
});
```

## 常见错误及解决方案

| 错误 | 原因 | 解决方案 |
|------|------|--------|
| `404 Failed to load resource` | 文件不存在或路径错误 | 检查文件路径、确保文件在 public/music/ |
| `NotAllowedError` | 自动播放被拦截 | 点击页面任何地方，或点击音符按钮 |
| `NotSupportedError` | 浏览器不支持此格式 | 更改为 .mp3 格式 |
| `AbortError` | 播放请求被中断 | 正常现象，应用会自动重试 |
| `CORS error` | 跨域资源限制 | 确保 CDN 配置了 CORS |

## GitHub Pages 特定问题

### 仓库名称影响路径

如果你的仓库不是用户名的主仓库，路径会包含仓库名：

```
https://username.github.io/repo-name/
```

应用已使用相对路径处理此问题，无需手动配置。

### 构建和部署

确保以下配置正确：

**vite.config.ts:**
```typescript
export default defineConfig({
  base: './',  // 使用相对路径
  publicDir: 'memories', // 这是照片文件夹，音乐在 public/music/
});
```

**public/ 文件夹结构:**
```
public/
├── music/
│   ├── song1.mp3
│   ├── song2.mp3
│   └── ...
└── ... (其他文件)
```

## 最终建议

1. **快速启动**：使用 CDN 音乐（无需维护文件）
2. **完整体验**：结合本地 + CDN 音乐
3. **测试方式**：
   - 本地：`npm run dev` → `npm run build` → `npm run preview`
   - 部署：推送到 GitHub 后等待 Pages 构建完成

有问题可以检查这些文件：
- 配置：[config/musicConfig.ts](../../config/musicConfig.ts)
- Hook：[hooks/useAudioManager.ts](../../hooks/useAudioManager.ts)
- UI：[components/MusicPlayer.tsx](../../components/MusicPlayer.tsx)
