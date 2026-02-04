@echo off
echo =========================================
echo   GESTIONE SPESE - Avvio Server
echo =========================================
echo.
echo Avvio server web locale...
echo.
echo Apri il browser e vai a:
echo http://localhost:8000
echo.
echo Premi CTRL+C per fermare il server
echo.
python -m http.server 8000
