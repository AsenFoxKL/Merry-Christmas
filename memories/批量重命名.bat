@echo off
setlocal enabledelayedexpansion

echo ===== 第一步：临时重命名，避免冲突 =====

set tempCount=1
for %%f in (*.jpg *.png *.bmp *.jpeg *.gif) do (
    ren "%%f" "__tmp__!tempCount!%%~xf"
    set /a tempCount+=1
)

echo ===== 第二步：正式顺序命名 =====

set count=1
for %%f in (__tmp__*.jpg __tmp__*.png __tmp__*.bmp __tmp__*.jpeg __tmp__*.gif) do (
    ren "%%f" "photo!count!%%~xf"
    set /a count+=1
)

echo 重命名完成！共处理 %count% 张图片
pause
