# 资源下载脚本 - 用于获取外部依赖到本地

Write-Host "正在下载必需的外部资源..." -ForegroundColor Cyan

# 1. 下载 hand_landmarker.task 模型文件
$modelUrl = "https://cdn.jsdelivr.net/gh/google-ai-edge/mediapipe@0.10.14/mediapipe/modules/hand_landmark/hand_landmark_full.tflite"
$modelPath = "public\assets\mediapipe\models\hand_landmarker.task"

# MediaPipe 官方模型 URL (更准确)
$officialModelUrl = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"

Write-Host "`n[1/3] 下载 Mediapipe 手势识别模型..." -ForegroundColor Yellow
try {
    Write-Host "  尝试从官方源下载..." -ForegroundColor Gray
    Invoke-WebRequest -Uri $officialModelUrl -OutFile $modelPath -TimeoutSec 30 -ErrorAction Stop
    Write-Host "  成功下载模型" -ForegroundColor Green
} catch {
    Write-Host "  模型下载失败，请手动下载：" -ForegroundColor Red
    Write-Host "    URL: $officialModelUrl" -ForegroundColor Gray
    Write-Host "    保存到: $modelPath" -ForegroundColor Gray
}

# 2. 下载 lobby.hdr 环境贴图
$hdrUrl = "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/hall_1k.hdr"
$hdrPath = "public\assets\env\lobby.hdr"

Write-Host "`n[2/3] 下载 HDR 环境贴图..." -ForegroundColor Yellow
try {
    Write-Host "  从 Poly Haven 下载 hall_1k.hdr..." -ForegroundColor Gray
    Invoke-WebRequest -Uri $hdrUrl -OutFile $hdrPath -TimeoutSec 60 -ErrorAction Stop
    Write-Host "  成功下载 HDR 环境贴图" -ForegroundColor Green
} catch {
    Write-Host "  HDR 下载失败，请手动下载：" -ForegroundColor Red
    Write-Host "    推荐：https://polyhaven.com/hdris (选择室内场景 1k 分辨率)" -ForegroundColor Gray
    Write-Host "    保存到: $hdrPath" -ForegroundColor Gray
}

# 3. 下载字体文件
Write-Host "`n[3/3] 下载字体文件..." -ForegroundColor Yellow

# Dancing Script
$dancingScriptUrl = "https://github.com/google/fonts/raw/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf"
$dancingScriptPath = "public\fonts\DancingScript.woff2"

try {
    Write-Host "  下载 Dancing Script..." -ForegroundColor Gray
    $tempTtf = "$env:TEMP\DancingScript.ttf"
    Invoke-WebRequest -Uri $dancingScriptUrl -OutFile $tempTtf -TimeoutSec 30 -ErrorAction Stop
    
    New-Item -ItemType Directory -Force -Path "public\fonts" | Out-Null
    Copy-Item $tempTtf "public\fonts\DancingScript.ttf" -Force
    Write-Host "  成功下载 Dancing Script" -ForegroundColor Green
} catch {
    Write-Host "  Dancing Script 下载失败" -ForegroundColor Red
    Write-Host "    请从 Google Fonts 手动下载: https://fonts.google.com/specimen/Dancing+Script" -ForegroundColor Gray
}

# Great Vibes
$greatVibesUrl = "https://github.com/google/fonts/raw/main/ofl/greatvibes/GreatVibes-Regular.ttf"
$greatVibesPath = "public\fonts\GreatVibes.ttf"

try {
    Write-Host "  下载 Great Vibes..." -ForegroundColor Gray
    Invoke-WebRequest -Uri $greatVibesUrl -OutFile $greatVibesPath -TimeoutSec 30 -ErrorAction Stop
    Write-Host "  成功下载 Great Vibes" -ForegroundColor Green
} catch {
    Write-Host "  Great Vibes 下载失败" -ForegroundColor Red
    Write-Host "    请从 Google Fonts 手动下载: https://fonts.google.com/specimen/Great+Vibes" -ForegroundColor Gray
}

Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "资源下载完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`n请检查上述输出，确认所有文件已成功下载。" -ForegroundColor White
Write-Host "如有失败项，请按照提示手动下载。`n" -ForegroundColor White
