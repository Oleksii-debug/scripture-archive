$ErrorActionPreference = "Stop"

$PlatformRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Repo = (Resolve-Path (Join-Path $PlatformRoot "..")).Path
Set-Location $Repo

$Venv = Join-Path $Repo ".venv-r06-dev01-build"
$Python = Join-Path $Venv "Scripts\python.exe"
if (-not (Test-Path $Python)) {
    python -m venv $Venv
}

& $Python -m pip install --disable-pip-version-check --upgrade pip
& $Python -m pip install --disable-pip-version-check -r (Join-Path $PlatformRoot "requirements-build.txt")

$Dist = Join-Path $PlatformRoot "dist"
$Work = Join-Path $PlatformRoot "build"
$Spec = Join-Path $PlatformRoot "build-spec"
New-Item -ItemType Directory -Force -Path $Dist,$Work,$Spec | Out-Null

$Diagnostics = Join-Path $Dist "windows_release_diagnostics.json"
& $Python (Join-Path $PSScriptRoot "windows_release.py") diagnose `
  --platform-root $PlatformRoot `
  --output $Diagnostics `
  --write-check `
  --require-windows `
  --require-pywebview `
  --require-webview2 `
  --require-write

$Sep = ";"
$Name = "ScriptureArchive-R06-DEV01"
& (Join-Path $Venv "Scripts\pyinstaller.exe") --noconfirm --clean --onefile --windowed `
  --name $Name `
  --collect-all webview `
  --add-data "$PlatformRoot\frontend${Sep}r06_platform\frontend" `
  --add-data "$Repo\docs\campaigns${Sep}docs\campaigns" `
  --hidden-import runtime_engine.scripture_archive_runtime.application `
  --hidden-import runtime_engine.scripture_archive_runtime.content `
  --hidden-import runtime_engine.scripture_archive_runtime.persistence `
  --paths $PlatformRoot --paths $Repo `
  --distpath $Dist --workpath $Work --specpath $Spec `
  (Join-Path $PlatformRoot "run_windows.py")

$Out = Join-Path $Dist "$Name.exe"
if (-not (Test-Path $Out)) {
    throw "Expected executable not produced: $Out"
}

$hash = (Get-FileHash -Algorithm SHA256 $Out).Hash.ToLowerInvariant()
$size = (Get-Item $Out).Length
$sourceArchive = Join-Path $Repo "DEV1_R06_PLATFORM_SOURCE.zip"
$sourceHash = $null
if (Test-Path $sourceArchive) {
    $sourceHash = (Get-FileHash -Algorithm SHA256 $sourceArchive).Hash.ToLowerInvariant()
}
$actualGitSha = $null
if (Get-Command git -ErrorAction SilentlyContinue) {
    $actualGitSha = (git -C $Repo rev-parse HEAD 2>$null | Out-String).Trim()
}
if (-not $actualGitSha) { $actualGitSha = $env:GITHUB_SHA }

$manifest = [ordered]@{
    schema_version = 1
    artifact_name = (Split-Path -Leaf $Out)
    artifact_path = $Out
    size_bytes = $size
    sha256 = $hash
    built_utc = (Get-Date).ToUniversalTime().ToString("o")
    git_sha = $actualGitSha
    github_event_sha = $env:GITHUB_SHA
    git_ref_name = $env:GITHUB_REF_NAME
    python_version = (& $Python --version 2>&1 | Out-String).Trim()
    source_archive_sha256 = $sourceHash
    diagnostics_file = (Split-Path -Leaf $Diagnostics)
    proof_scope = @(
        "PyInstaller build completed",
        "artifact size/hash readback verified",
        "WebView2 runtime presence probed before build"
    )
    not_proven = @(
        "human NVDA acceptance",
        "full application functional acceptance",
        "visual correctness"
    )
}
$ManifestPath = Join-Path $Dist "build_manifest.json"
$manifest | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 $ManifestPath

"SHA256=$hash" | Set-Content -Encoding utf8 (Join-Path $Dist "$Name.sha256.txt")
"SIZE=$size" | Add-Content -Encoding utf8 (Join-Path $Dist "$Name.sha256.txt")

& $Python (Join-Path $PSScriptRoot "windows_release.py") verify-artifact `
  --artifact $Out `
  --manifest $ManifestPath `
  --output (Join-Path $Dist "artifact_readback.json")

Write-Output "Built $Out ($size bytes) SHA256=$hash"
