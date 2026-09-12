param(
    [string]$ExpectedGitSha = "",
    [int]$ProbeSeconds = 8,
    [string]$OutputJson = ""
)

$ErrorActionPreference = "Stop"
$PlatformRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Repo = (Resolve-Path (Join-Path $PlatformRoot "..")).Path
$Dist = Join-Path $PlatformRoot "dist"
$Name = "ScriptureArchive-R06-DEV01"
$Exe = Join-Path $Dist "$Name.exe"
$BuildManifest = Join-Path $Dist "build_manifest.json"
$Diagnostics = Join-Path $Dist "windows_release_diagnostics.json"
$WebView2Probe = Join-Path $Dist "webview2_host_probe.json"
$StartupProbe = Join-Path $Dist "packaged_startup_probe.json"
if (-not $OutputJson) { $OutputJson = Join-Path $Dist "release_gate.json" }

$result = [ordered]@{
    schema_version = 1
    started_utc = (Get-Date).ToUniversalTime().ToString("o")
    platform_root = $PlatformRoot
    repo_root = $Repo
    expected_git_sha = $ExpectedGitSha
    actual_git_sha = $null
    github_event_sha = $env:GITHUB_SHA
    source_compile = $false
    unit_tests = $false
    javascript_syntax = $false
    tools_smoke = $false
    build = $false
    artifact_readback = $false
    webview2_detected = $false
    webview2_host_probe = $false
    process_liveness = $false
    per_user_state_writable = $false
    running_without_admin = $false
    artifact_sha256 = $null
    artifact_size_bytes = $null
    status = "RUNNING"
    not_proven = @(
        "human NVDA acceptance",
        "complete functional WebView UI acceptance",
        "packaged application's own WebView2 content-ready signal",
        "visual quality acceptance",
        "source/theological audit"
    )
    failure = $null
}

function Write-GateResult {
    param([System.Collections.IDictionary]$Payload)
    $parent = Split-Path -Parent $OutputJson
    if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    $Payload | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 $OutputJson
    $Payload | ConvertTo-Json -Depth 8 | Write-Output
}

try {
    if (Get-Command git -ErrorAction SilentlyContinue) {
        $result.actual_git_sha = (git -C $Repo rev-parse HEAD 2>$null | Out-String).Trim()
    }
    if (-not $result.actual_git_sha -and $env:GITHUB_SHA) {
        $result.actual_git_sha = $env:GITHUB_SHA
    }
    if ($ExpectedGitSha -and $result.actual_git_sha -and ($ExpectedGitSha.ToLowerInvariant() -ne $result.actual_git_sha.ToLowerInvariant())) {
        throw "Git SHA mismatch: expected $ExpectedGitSha, actual $($result.actual_git_sha)"
    }

    python -m compileall -q `
        (Join-Path $PlatformRoot "scripture_archive_platform") `
        (Join-Path $PlatformRoot "tests") `
        (Join-Path $PlatformRoot "packaging")
    if ($LASTEXITCODE -ne 0) { throw "Python compileall failed with code $LASTEXITCODE" }
    $result.source_compile = $true

    Push-Location $PlatformRoot
    try {
        $previousReferenceTestOnly = $env:SCRIPTURE_ARCHIVE_REFERENCE_TEST_ONLY
        $env:SCRIPTURE_ARCHIVE_REFERENCE_TEST_ONLY = "1"
        try {
            python -m unittest discover -s tests -v
            $unitExit = $LASTEXITCODE
        }
        finally {
            if ($null -eq $previousReferenceTestOnly) {
                Remove-Item Env:SCRIPTURE_ARCHIVE_REFERENCE_TEST_ONLY -ErrorAction SilentlyContinue
            } else {
                $env:SCRIPTURE_ARCHIVE_REFERENCE_TEST_ONLY = $previousReferenceTestOnly
            }
        }
        if ($unitExit -ne 0) { throw "Unit tests failed with code $unitExit" }
        $result.unit_tests = $true
    }
    finally { Pop-Location }

    node --check (Join-Path $PlatformRoot "frontend\renderers.js")
    if ($LASTEXITCODE -ne 0) { throw "JavaScript syntax check failed with code $LASTEXITCODE" }
    $result.javascript_syntax = $true

    python (Join-Path $PlatformRoot "tools_smoke.py")
    if ($LASTEXITCODE -ne 0) { throw "tools_smoke.py failed with code $LASTEXITCODE" }
    $result.tools_smoke = $true

    & (Join-Path $PSScriptRoot "build_windows.ps1")
    if (-not (Test-Path $Exe) -or -not (Test-Path $BuildManifest) -or -not (Test-Path $Diagnostics)) {
        throw "Build did not produce the complete expected evidence set"
    }
    $result.build = $true

    $build = Get-Content -Raw -Encoding utf8 $BuildManifest | ConvertFrom-Json
    $diag = Get-Content -Raw -Encoding utf8 $Diagnostics | ConvertFrom-Json
    $readbackPath = Join-Path $Dist "artifact_readback.json"
    $readback = Get-Content -Raw -Encoding utf8 $readbackPath | ConvertFrom-Json
    if (-not $readback.ok) { throw "Artifact hash/size readback did not pass" }
    $result.artifact_readback = $true
    $result.artifact_sha256 = $build.sha256
    $result.artifact_size_bytes = $build.size_bytes
    $result.webview2_detected = @($diag.webview2_candidates).Count -gt 0
    $result.per_user_state_writable = [bool]$diag.state_write_probe.writable
    $result.running_without_admin = ($diag.is_admin -eq $false)
    if (-not $result.running_without_admin) {
        $result.not_proven += "no-admin startup acceptance"
    }

    $BuildPython = Join-Path $Repo ".venv-r06-dev01-build\Scripts\python.exe"
    if (-not (Test-Path $BuildPython)) { throw "Build Python environment missing: $BuildPython" }
    & $BuildPython (Join-Path $PSScriptRoot "probe_webview2_host.py") `
        --output $WebView2Probe `
        --timeout-seconds 20
    if ($LASTEXITCODE -ne 0) { throw "Real EdgeChromium/WebView2 host probe failed with code $LASTEXITCODE" }
    $hostProbe = Get-Content -Raw -Encoding utf8 $WebView2Probe | ConvertFrom-Json
    if (-not $hostProbe.ok -or $hostProbe.renderer_actual -ne "edgechromium" -or -not $hostProbe.main_found) {
        throw "Real EdgeChromium/WebView2 host probe did not verify renderer + semantic DOM"
    }
    $result.webview2_host_probe = $true

    & (Join-Path $PSScriptRoot "probe_packaged_startup.ps1") `
        -Executable $Exe `
        -ProbeSeconds $ProbeSeconds `
        -OutputJson $StartupProbe
    $probe = Get-Content -Raw -Encoding utf8 $StartupProbe | ConvertFrom-Json
    if (-not $probe.process_started) { throw "Packaged process did not start" }
    if (-not $probe.survived_probe_window) {
        throw "Packaged process did not survive the complete startup probe window (exit_code=$($probe.exit_code))"
    }
    if ($null -ne $probe.exit_code) {
        throw "Packaged process exited during startup probe with code $($probe.exit_code)"
    }
    $result.process_liveness = $true

    if (-not $result.webview2_detected) { throw "WebView2 was not detected in build diagnostics" }
    if (-not $result.per_user_state_writable) { throw "Per-user state directory is not writable" }

    $result.status = "ENGINEERING_GATE_PASS"
}
catch {
    $result.status = "ENGINEERING_GATE_FAIL"
    $result.failure = $_.Exception.Message
    Write-GateResult -Payload $result
    throw
}

Write-GateResult -Payload $result
