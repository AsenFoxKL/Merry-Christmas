# 移动端性能优化说明

## 问题分析
iPhone 14 Pro Max 在 Safari 浏览器中打开网页后，摄像头权限请求和圣诞树加载时页面反复自动刷新。这是由于 **GPU 过载导致 WebGL 上下文丢失**。

## 优化方案

### 1. Canvas 配置优化（App.tsx）
```tsx
// 移动端禁用高DPR和抗锯齿
dpr={isMobileDevice() ? 1 : [1, 1.5]}
gl={{ antialias: !isMobileDevice() }}

// 移动端禁用 EffectComposer（Bloom + Vignette）
{!isMobileDevice() && (
  <EffectComposer enableNormalPass multisampling={0}>
    <Bloom luminanceThreshold={1.2} mipmapBlur intensity={0.4} radius={0.3} />
    <Vignette eskil={false} offset={0.2} darkness={0.9} />
  </EffectComposer>
)}
```

### 2. 粒子数量优化

#### GroundRipple（地面波纹）
- **桌面版**: 80,000 粒子
- **移动版**: 15,000 粒子 (↓ 81% 削减)
- 影响最大，这是主要性能瓶颈

#### GoldDust（金尘粒子）
- **桌面版**: 3,500 粒子
- **移动版**: 1,200 粒子 (↓ 66% 削减)

#### Atmosphere（大气）
- 雪花粒子：4,500 → 2,000 (↓ 56% 削减)
- 发光粒子：250 → 100 (↓ 60% 削减)
- 分布范围：100 → 60 (性能和视觉质量平衡)

#### GoldenSpirals（金色螺旋）
- **桌面版**: 400 × 2 = 800 粒子
- **移动版**: 150 × 1 = 150 粒子 (↓ 81% 削减)
- 降低 emissiveIntensity：3 → 1.5

#### Stars（星星）
- **桌面版**: 3,000 颗
- **移动版**: 1,500 颗 (↓ 50% 削减)

### 3. 后处理效果优化
- 移动端**禁用** Bloom（昂贵的后处理）
- 移动端**禁用** Vignette（边界暗化效果）
- 桌面版保持原有视觉效果不变

## 性能对比

| 指标 | 桌面版 | 移动版 | 优化幅度 |
|------|-------|--------|---------|
| 总顶点数 | ~110,000 | ~25,000 | ↓ 77% |
| 后处理 Pass | 2 个 | 0 个 | ↓ 100% |
| DPI 倍率 | 1-1.5x | 1x | ↓ 33% |
| 抗锯齿 | 启用 | 禁用 | ↓ 减少开销 |

## 实现方式

### 移动端检测
```ts
const isMobileDevice = () => {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());
};
```

所有组件接收 `isMobile` 属性作为条件参数：
- `<GoldDust isMobile={isMobileDevice()} />`
- `<Atmosphere isMobile={isMobileDevice()} />`
- `<GoldenSpirals isMobile={isMobileDevice()} />`
- `<GroundRipple isMobile={isMobileDevice()} />`

## 预期效果

✅ **解决问题**: 移动端不再反复刷新，WebGL 上下文保持稳定
✅ **视觉质量**: 通过减少粒子数量而非移除特效，保持整体审美
✅ **交互功能**: 手势交互、拍照、彩蛋运镜等功能保持正常
✅ **桌面端**: 完全不受影响，保持原有高质量渲染

## 测试建议

1. 在 Safari 移动浏览器中打开网页
2. 观察权限请求和加载过程（应无刷新）
3. 测试手势交互（张手/握拳）
4. 测试彩蛋运镜（点击"🎄 彩蛋"按钮）
5. 验证在普通桌面浏览器中效果保持不变

## 其他优化建议（可选）

如果移动端仍有性能问题，可以进一步:
1. 减少照片纹理分辨率加载
2. 禁用 TreeParticles 的 shadow casting
3. 降低 Environment 预设质量
4. 使用 WebWorker 处理复杂动画计算
