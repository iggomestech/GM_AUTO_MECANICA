@echo off
setlocal

set TASK_NAME=GM Sistema - Backup Semanal
set SCRIPT_PATH=%~dp0backup-weekly.ps1

schtasks /Create /F /SC WEEKLY /D SUN /ST 22:00 /TN "%TASK_NAME%" /TR "powershell -NoProfile -ExecutionPolicy Bypass -File \"%SCRIPT_PATH%\""
if errorlevel 1 (
  echo Falha ao criar tarefa agendada.
  exit /b 1
)

echo Tarefa criada com sucesso: %TASK_NAME%
echo Execucao semanal: domingo as 22:00
endlocal
