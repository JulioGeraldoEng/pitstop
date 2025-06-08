@echo off
setlocal

:: Caminho do Node.js portátil
set NODEJS_PATH=%~dp0\nodejs-portable

:: Caminho do WPPConnect
set WPP_PATH=%~dp0wppconnect-server

:: Iniciar WPPConnect em segundo plano
start "" /min "%NODEJS_PATH%\node.exe" "%WPP_PATH%\dist\server.js"

:: Aguardar 5 segundos para iniciar o servidor
timeout /t 5 >nul

:: Iniciar o aplicativo PitStop
start "" "%~dp0\desktop\dist\PitStop.exe"

exit
