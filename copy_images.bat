@echo off
setlocal

echo ========================================================
echo   SRI SAI'S FOODS - IMAGE ASSET ORGANIZER
echo ========================================================
echo.
echo This script keeps website images in a clean assets folder:
echo   assets\images\hero
echo   assets\images\factory
echo   assets\images\products
echo   assets\images\upcoming
echo.

call :ensure "assets\images\hero"
call :ensure "assets\images\factory"
call :ensure "assets\images\products"
call :ensure "assets\images\upcoming"

call :move_if_found "Slide-1.jpeg" "assets\images\hero\factory-fryer.jpeg"
call :move_if_found "Slide 2.jpeg" "assets\images\hero\seasoning-drum.jpeg"
call :move_if_found "Banner.png" "assets\images\hero\product-range.png"
call :move_if_found "Processor.png" "assets\images\factory\processor.png"
call :move_if_found "Aaloo laccha banner.png" "assets\images\products\aloo-laccha-rs5.png"
call :move_if_found "Aloo_lacha.png" "assets\images\products\aloo-laccha-rs2.png"
call :move_if_found "Time_Pass.png" "assets\images\products\time-pass.png"
call :move_if_found "Magi.png" "assets\images\products\tasty-magi.png"
call :move_if_found "Kaali_churail.png" "assets\images\products\kali-chudail.png"
call :move_if_found "Kala_Bhoot.png" "assets\images\products\kala-bhoot.png"
call :move_if_found "Nimki.png" "assets\images\products\peturam-nimki.png"
call :move_if_found "Katori.png" "assets\images\upcoming\katori.png"
call :move_if_found "Bundia.png" "assets\images\upcoming\bundia.png"
call :move_if_found "Bhindi.png" "assets\images\upcoming\bhindi.png"

echo.
echo Checking organized website images...
call :check "assets\images\hero\factory-fryer.jpeg"
call :check "assets\images\hero\seasoning-drum.jpeg"
call :check "assets\images\hero\product-range.png"
call :check "assets\images\factory\processor.png"
call :check "assets\images\products\aloo-laccha-rs5.png"
call :check "assets\images\products\aloo-laccha-rs2.png"
call :check "assets\images\products\time-pass.png"
call :check "assets\images\products\tasty-magi.png"
call :check "assets\images\products\kali-chudail.png"
call :check "assets\images\products\kala-bhoot.png"
call :check "assets\images\products\peturam-nimki.png"
call :check "assets\images\upcoming\katori.png"
call :check "assets\images\upcoming\bundia.png"
call :check "assets\images\upcoming\bhindi.png"

echo.
echo ========================================================
echo   Asset organization completed.
echo ========================================================
echo.
pause
exit /b

:ensure
if not exist "%~1" mkdir "%~1"
exit /b

:move_if_found
if exist "%~1" (
  move /Y "%~1" "%~2" >nul
  echo Moved: %~1
) else (
  if exist "%~2" echo Ready: %~2
)
exit /b

:check
if exist "%~1" (
  echo OK: %~1
) else (
  echo Missing: %~1
)
exit /b
