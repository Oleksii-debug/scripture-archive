$ErrorActionPreference = "Stop"
$Repo = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $Repo
$Venv = Join-Path $Repo ".venv-r06-dev-a-build"
if (-not (Test-Path "$Venv\Scripts\python.exe")) { python -m venv $Venv }
& "$Venv\Scripts\python.exe" -m pip install --disable-pip-version-check -r r06_platform\requirements-build.txt
$Sep = ";"
$Dist = Join-Path $Repo "r06_platform\dist"
$Work = Join-Path $Repo "r06_platform\build"
$Spec = Join-Path $Repo "r06_platform\build-spec"
New-Item -ItemType Directory -Force -Path $Dist,$Work,$Spec | Out-Null
& "$Venv\Scripts\pyinstaller.exe" --noconfirm --clean --onefile --windowed `
  --name ScriptureArchive-R06-3DEV-A `
  --collect-all webview `
  --add-data "r06_platform\frontend${Sep}r06_platform\frontend" `
  --add-data "docs\campaigns${Sep}docs\campaigns" `
  --hidden-import runtime_engine.scripture_archive_runtime.application `
  --hidden-import runtime_engine.scripture_archive_runtime.content `
  --hidden-import runtime_engine.scripture_archive_runtime.persistence `
  --paths r06_platform --paths . `
  --distpath $Dist --workpath $Work --specpath $Spec `
  r06_platform\run_windows.py
$Out = Join-Path $Dist "ScriptureArchive-R06-3DEV-A.exe"
if (-not (Test-Path $Out)) { throw "Expected executable not produced" }
$hash = (Get-FileHash -Algorithm SHA256 $Out).Hash.ToLowerInvariant()
$size = (Get-Item $Out).Length
"SHA256=$hash" | Set-Content -Encoding utf8 (Join-Path $Dist "ScriptureArchive-R06-3DEV-A.sha256.txt")
"SIZE=$size" | Add-Content -Encoding utf8 (Join-Path $Dist "ScriptureArchive-R06-3DEV-A.sha256.txt")
Write-Output "Built $Out ($size bytes) SHA256=$hash"
