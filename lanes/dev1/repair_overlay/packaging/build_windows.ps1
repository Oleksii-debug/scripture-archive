$ErrorActionPreference = "Stop"

function Assert-NativeSuccess {
    param([Parameter(Mandatory = $true)][string]$Step)
    if ($LASTEXITCODE -ne 0) {
        throw "$Step failed with exit code $LASTEXITCODE"
    }
}

$PlatformRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Repo = (Resolve-Path (Join-Path $PlatformRoot "..")).Path
Set-Location $Repo

$Venv = Join-Path $Repo ".venv-r06-dev01-build"
$Python = Join-Path $Venv "Scripts\python.exe"
if (-not (Test-Path $Python)) {
    python -m venv $Venv
    Assert-NativeSuccess "virtualenv creation"
}

& $Python -m pip install --disable-pip-version-check --upgrade pip
Assert-NativeSuccess "pip upgrade"
& $Python -m pip install --disable-pip-version-check -r (Join-Path $PlatformRoot "requirements-build.txt")
Assert-NativeSuccess "build dependency install"

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
Assert-NativeSuccess "Windows release diagnostics"

$actualGitSha = $null
if (Get-Command git -ErrorAction SilentlyContinue) {
    $actualGitSha = (git -C $Repo rev-parse HEAD 2>$null | Out-String).Trim()
}
if (-not $actualGitSha) { $actualGitSha = $env:GITHUB_SHA }
if ($actualGitSha -notmatch '^[0-9a-f]{40}$') {
    throw "Exact 40-hex checkout SHA is required for packaged diagnostics identity"
}

$BuildIdentityDir = Join-Path ([System.IO.Path]::GetTempPath()) ("scripture-build-identity-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $BuildIdentityDir | Out-Null
$BuildIdentity = Join-Path $BuildIdentityDir "build_identity.json"
$BuildIdentityPayload = @{ build_sha = $actualGitSha } | ConvertTo-Json -Compress
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($BuildIdentity, $BuildIdentityPayload, $Utf8NoBom)

$Sep = ";"
$Name = "ScriptureArchive-R06-DEV01"
$Out = Join-Path $Dist "$Name.exe"
if (Test-Path -LiteralPath $Out) {
    Remove-Item -LiteralPath $Out -Force
}
try {
    & (Join-Path $Venv "Scripts\pyinstaller.exe") --noconfirm --clean --onefile --windowed `
      --name $Name `
      --collect-all webview `
      --add-data "$PlatformRoot\frontend${Sep}r06_platform\frontend" `
      --add-data "$Repo\docs\campaigns${Sep}docs\campaigns" `
      --add-data "$BuildIdentity${Sep}r06_platform" `
      --hidden-import runtime_engine.scripture_archive_runtime.application `
      --hidden-import runtime_engine.scripture_archive_runtime.content `
      --hidden-import runtime_engine.scripture_archive_runtime.persistence `
      --hidden-import runtime_engine.scripture_archive_runtime.application_update `
      --hidden-import runtime_engine.scripture_archive_runtime.diagnostics `
      --paths $PlatformRoot --paths $Repo `
      --distpath $Dist --workpath $Work --specpath $Spec `
      (Join-Path $PlatformRoot "run_windows.py")
    Assert-NativeSuccess "PyInstaller build"
} finally {
    Remove-Item -LiteralPath $BuildIdentityDir -Recurse -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path -LiteralPath $Out -PathType Leaf)) {
    throw "Expected executable not produced: $Out"
}

$hash = (Get-FileHash -Algorithm SHA256 $Out).Hash.ToLowerInvariant()
$size = (Get-Item $Out).Length
$sourceArchive = Join-Path $Repo "DEV1_R06_PLATFORM_SOURCE.zip"
$sourceHash = $null
if (Test-Path $sourceArchive) {
    $sourceHash = (Get-FileHash -Algorithm SHA256 $sourceArchive).Hash.ToLowerInvariant()
}
$pythonVersion = (& $Python --version 2>&1 | Out-String).Trim()
Assert-NativeSuccess "Python version query"

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
    python_version = $pythonVersion
    source_archive_sha256 = $sourceHash
    diagnostics_file = (Split-Path -Leaf $Diagnostics)
    proof_scope = @(
        "PyInstaller build completed",
        "artifact size/hash readback verified",
        "WebView2 runtime presence probed before build",
        "packaged diagnostics build identity bound to exact checkout SHA"
    )
    not_proven = @(
        "human NVDA acceptance",
        "full application functional acceptance",
        "visual correctness",
        "recovery execution"
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
Assert-NativeSuccess "artifact verification"

Write-Output "Built $Out ($size bytes) SHA256=$hash"
