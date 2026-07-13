@echo off
echo ========================================================
echo   SRI SAI'S FRYUMS - IMAGE ASSET COPIER
echo ========================================================
echo.
echo This script will copy all generated design assets and the
echo product packaging images you uploaded to your website assets folder.
echo.
echo Destination: .\assets\images\
echo.

:: Create assets directory if it doesn't exist
if not exist "assets\images" (
    echo Creating assets\images directory...
    mkdir "assets\images"
)

:: Copy website layout assets
echo.
echo [1/16] Copying Hero Banner...
copy /Y "C:\Users\harsh\.gemini\antigravity\brain\c4ac75db-1532-40ab-8e0b-3d9e44d6fb97\fryums_hero_banner_1783699420233.jpg" "assets\images\hero_banner.jpg" >nul
if %errorlevel% equ 0 (echo   Success!) else (echo   Failed to copy Hero Banner.)

echo [2/16] Copying Factory Plant Image...
copy /Y "C:\Users\harsh\.gemini\antigravity\brain\c4ac75db-1532-40ab-8e0b-3d9e44d6fb97\fryums_factory_1783699434361.jpg" "assets\images\factory.jpg" >nul
if %errorlevel% equ 0 (echo   Success!) else (echo   Failed to copy Factory Image.)

echo [3/16] Copying Wheel Fryums Product Image...
copy /Y "C:\Users\harsh\.gemini\antigravity\brain\c4ac75db-1532-40ab-8e0b-3d9e44d6fb97\wheel_fryums_1783699453203.jpg" "assets\images\wheel_fryums.jpg" >nul
if %errorlevel% equ 0 (echo   Success!) else (echo   Failed to copy Wheel Fryums.)

echo [4/16] Copying Finger/Pipe Fryums Product Image...
copy /Y "C:\Users\harsh\.gemini\antigravity\brain\c4ac75db-1532-40ab-8e0b-3d9e44d6fb97\pipe_fryums_1783699471206.jpg" "assets\images\pipe_fryums.jpg" >nul
if %errorlevel% equ 0 (echo   Success!) else (echo   Failed to copy Pipe Fryums.)

echo [5/16] Copying Alphabet Shapes Product Image...
copy /Y "C:\Users\harsh\.gemini\antigravity\brain\c4ac75db-1532-40ab-8e0b-3d9e44d6fb97\shapes_fryums_1783699485214.jpg" "assets\images\shapes_fryums.jpg" >nul
if %errorlevel% equ 0 (echo   Success!) else (echo   Failed to copy Shapes Fryums.)

echo [6/16] Copying Spicy Katori Product Image...
copy /Y "C:\Users\harsh\.gemini\antigravity\brain\c4ac75db-1532-40ab-8e0b-3d9e44d6fb97\spicy_katori_1783699499746.jpg" "assets\images\spicy_katori.jpg" >nul
if %errorlevel% equ 0 (echo   Success!) else (echo   Failed to copy Spicy Katori.)

:: Copy uploaded packaging images
echo.
echo [7/16] Copying Sri Sai's Aloo Laccha Rs.5 Packaging...
copy /Y "C:\Users\harsh\.gemini\antigravity\brain\c4ac75db-1532-40ab-8e0b-3d9e44d6fb97\media__1783699673473.jpg" "assets\images\aloo_laccha_5.jpg" >nul
if %errorlevel% equ 0 (echo   Success!) else (echo   Failed to copy Aloo Laccha 5.)

echo [8/16] Copying Sri Sai's Aloo Laccha Rs.2 Packaging...
copy /Y "C:\Users\harsh\.gemini\antigravity\brain\c4ac75db-1532-40ab-8e0b-3d9e44d6fb97\media__1783699673656.jpg" "assets\images\aloo_laccha_2.jpg" >nul
if %errorlevel% equ 0 (echo   Success!) else (echo   Failed to copy Aloo Laccha 2.)

echo [9/16] Copying Madan Ji Ka Kali Chudail Packaging...
copy /Y "C:\Users\harsh\.gemini\antigravity\brain\c4ac75db-1532-40ab-8e0b-3d9e44d6fb97\media__1783699694915.jpg" "assets\images\kali_chudail.jpg" >nul
if %errorlevel% equ 0 (echo   Success!) else (echo   Failed to copy Kali Chudail.)

echo [10/16] Copying Madan Ji Ka Kala Bhoot Packaging...
copy /Y "C:\Users\harsh\.gemini\antigravity\brain\c4ac75db-1532-40ab-8e0b-3d9e44d6fb97\media__1783699695005.jpg" "assets\images\kala_bhoot.jpg" >nul
if %errorlevel% equ 0 (echo   Success!) else (echo   Failed to copy Kala Bhoot.)

echo [11/16] Copying Sri Sai's Tasty Magi Masala Packaging...
copy /Y "C:\Users\harsh\.gemini\antigravity\brain\c4ac75db-1532-40ab-8e0b-3d9e44d6fb97\media__1783699715649.jpg" "assets\images\tasty_magi.jpg" >nul
if %errorlevel% equ 0 (echo   Success!) else (echo   Failed to copy Tasty Magi.)

echo [12/16] Copying Sri Sai's Time Pass Packaging...
copy /Y "C:\Users\harsh\.gemini\antigravity\brain\c4ac75db-1532-40ab-8e0b-3d9e44d6fb97\media__1783699752490.jpg" "assets\images\time_pass.jpg" >nul
if %errorlevel% equ 0 (echo   Success!) else (echo   Failed to copy Time Pass.)

echo [13/16] Copying Peturam Nimki Packaging...
copy /Y "C:\Users\harsh\.gemini\antigravity\brain\c4ac75db-1532-40ab-8e0b-3d9e44d6fb97\media__1783699752507.jpg" "assets\images\peturam_nimki.jpg" >nul
if %errorlevel% equ 0 (echo   Success!) else (echo   Failed to copy Peturam Nimki.)

:: Copy upcoming product bowls
echo.
echo [14/16] Copying Upcoming Katori Bowl...
copy /Y "C:\Users\harsh\.gemini\antigravity\brain\c4ac75db-1532-40ab-8e0b-3d9e44d6fb97\media__1783703428585.jpg" "assets\images\upcoming_katori.jpg" >nul
if %errorlevel% equ 0 (echo   Success!) else (echo   Failed to copy Upcoming Katori.)

echo [15/16] Copying Upcoming Multicolor Shapes Bowl...
copy /Y "C:\Users\harsh\.gemini\antigravity\brain\c4ac75db-1532-40ab-8e0b-3d9e44d6fb97\media__1783703442868.jpg" "assets\images\upcoming_multicolor.jpg" >nul
if %errorlevel% equ 0 (echo   Success!) else (echo   Failed to copy Upcoming Multicolor.)

echo [16/16] Copying Upcoming Momo Balls Bowl...
copy /Y "C:\Users\harsh\.gemini\antigravity\brain\c4ac75db-1532-40ab-8e0b-3d9e44d6fb97\media__1783703458187.jpg" "assets\images\upcoming_momoballs.jpg" >nul
if %errorlevel% equ 0 (echo   Success!) else (echo   Failed to copy Upcoming Momo Balls.)

echo.
echo ========================================================
echo   Asset copying completed!
echo   You can now open index.html and view all images.
echo ========================================================
echo.
pause
