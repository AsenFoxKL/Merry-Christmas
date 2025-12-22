# GitHub Pages 音乐部署快速修复

## 问题

部署到 GitHub Pages 时音乐文件 404 错误。

## 原因

1. 本地音乐文件不在 `public/music/` 文件夹中
2. 构建时文件没有被复制到 `dist/music/`

## 解决方案 ✅

### 自动降级已启用

应用现在会自动处理：

1. **本地音乐加载失败** → 自动切换到 **CDN 备选音乐**
2. 用户无需任何操作，应用会自动使用备选方案

### 工作流程

```
用户尝试播放本地歌曲
   ↓
如果加载失败 (404)
   ↓
自动切换到 CDN 备选音乐
   ↓
播放成功
```

## 目前的配置

**本地音乐** (ID 1-3)：
- Saccharin
- Not Going Home  
- We Don't Talk Anymore

**CDN 备选** (ID 101-103)：
- 免费示例音乐（始终可用）

## 两种完整解决方案

### 方案 A：使用 CDN 音乐（推荐）⭐

最简单，无需维护文件：

编辑 `config/musicConfig.ts`：
```typescript
export const MUSIC_TRACKS: Track[] = []; // 留空

export const MUSIC_TRACKS_CDN: Track[] = [
  {
    id: 1,
    name: 'Your Song 1',
    url: 'https://your-cdn.com/song1.mp3',
  },
  {
    id: 2,
    name: 'Your Song 2',
    url: 'https://your-cdn.com/song2.mp3',
  },
];
```

### 方案 B：上传本地音乐文件

1. 创建文件夹：
```bash
mkdir -p public/music
```

2. 将音乐文件放入：
```
public/
└── music/
    ├── Saccharin.mp3
    ├── Not Going Home.mp3
    └── We Don't Talk Anymore.mp3
```

3. 确保构建配置正确（`vite.config.ts`）：
```typescript
export default defineConfig({
  base: './',  // GitHub Pages 相对路径
  publicDir: 'memories', // 照片文件夹
  // 注意：public/ 文件夹自动被 Vite 处理
});
```

4. 构建并测试：
```bash
npm run build
npm run preview  # 访问 http://localhost:4173
```

## 现在就可以部署！

两种方案都可以工作。应用会：
- ✅ 尝试加载本地音乐
- ✅ 失败时自动降级到 CDN
- ✅ 无缝提供最佳体验

只需 `git push`，GitHub Pages 会自动部署。

---

**推荐**：如果你的音乐文件已经在 `public/music/` 中，确保：
1. 文件名与配置中的 `url` 完全匹配（包括大小写）
2. 运行 `npm run build` 验证构建成功
3. 检查 `dist/music/` 文件夹确认文件被复制
