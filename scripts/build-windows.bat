@echo off
setlocal enabledelayedexpansion

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed. Please install it first.
    exit /b 1
)

:: Set directory variables
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%\.."
set "BUILD_DIR=%PROJECT_ROOT%\build"
set "DIST_DIR=%PROJECT_ROOT%\dist"
set "APP_NAME=Jellify"

:: Ask user for installation directory
set "DEFAULT_INSTALL_DIR=%LOCALAPPDATA%\Jellify"
set /p INSTALL_DIR=Enter installation directory (default: %DEFAULT_INSTALL_DIR%): 
if "!INSTALL_DIR!"=="" set "INSTALL_DIR=%DEFAULT_INSTALL_DIR%"

echo Building %APP_NAME%...
cd "%PROJECT_ROOT%"
call npm run build:windows

:: Check if build succeeded
if %ERRORLEVEL% neq 0 (
    echo Build failed. Exiting.
    exit /b 1
)

:: Directory installation
echo Creating installation directory...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: Copy installer to user selected location
echo Installing to %INSTALL_DIR%...
for %%F in ("%DIST_DIR%\*.exe") do (
    copy "%%F" "%INSTALL_DIR%\"
    set "INSTALLER_FILE=%%~nxF"
)

:: Create desktop shortcut
echo Creating desktop shortcut...
set "DESKTOP_DIR=%USERPROFILE%\Desktop"
set "SHORTCUT_FILE=%DESKTOP_DIR%\%APP_NAME%.lnk"

powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_FILE%'); $Shortcut.TargetPath = '%INSTALL_DIR%\%INSTALLER_FILE%'; $Shortcut.IconLocation = '%INSTALL_DIR%\%INSTALLER_FILE%,0'; $Shortcut.Description = 'A Jellyfin music player with Spotify-like UI'; $Shortcut.Save()"

echo.
echo %APP_NAME% has been installed successfully!
echo You can run it from the desktop shortcut or from %INSTALL_DIR%\%INSTALLER_FILE%
echo.
echo Installation complete!

endlocal 