param(
    [Parameter(Mandatory = $true)]
    [string]$Executable,
    [string]$ExpectedSha256 = "",
    [int]$ProbeSeconds = 8,
    [string]$OutputJson = "",
    [string]$StartupProbeScript = ""
)

$ErrorActionPreference = "Stop"

function Get-Sha256Hex {
    param([Parameter(Mandatory = $true)][string]$Path)

    $resolved = (Resolve-Path -LiteralPath $Path -ErrorAction Stop).Path
    $stream = [IO.File]::Open($resolved, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
    try {
        $sha = [System.Security.Cryptography.SHA256]::Create()
        try {
            $digest = $sha.ComputeHash($stream)
        }
        finally {
            $sha.Dispose()
        }
    }
    finally {
        $stream.Dispose()
    }
    return ([BitConverter]::ToString($digest)).Replace("-", "").ToLowerInvariant()
}

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Resolve-CurrentUserLocalAppData {
    param([Security.Principal.WindowsIdentity]$Identity)

    if (-not $Identity -or -not $Identity.User) {
        throw "Current Windows identity does not expose a user SID."
    }
    $sid = $Identity.User.Value
    $profileKey = "Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList\$sid"
    if (-not (Test-Path -LiteralPath $profileKey)) {
        throw "Current standard-user SID is not bound to a Windows profile."
    }

    $profileRaw = [string](Get-ItemProperty -LiteralPath $profileKey -Name ProfileImagePath -ErrorAction Stop).ProfileImagePath
    if (-not $profileRaw) {
        throw "Current standard-user profile does not expose ProfileImagePath."
    }
    $profilePath = [Environment]::ExpandEnvironmentVariables($profileRaw)
    if (-not [IO.Path]::IsPathRooted($profilePath)) {
        throw "Current standard-user ProfileImagePath is not absolute."
    }
    $profilePath = [IO.Path]::GetFullPath($profilePath).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    if (-not (Test-Path -LiteralPath $profilePath -PathType Container)) {
        throw "Current standard-user profile directory is unavailable."
    }

    $localAppData = Join-Path $profilePath "AppData\Local"
    New-Item -ItemType Directory -Force -Path $localAppData | Out-Null
    $localAppData = (Resolve-Path -LiteralPath $localAppData -ErrorAction Stop).Path
    $prefix = $profilePath + [IO.Path]::DirectorySeparatorChar
    if (-not $localAppData.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Resolved LocalApplicationData escaped the current SID-bound profile."
    }

    return [ordered]@{
        profile_path = $profilePath
        local_app_data = $localAppData
        profile_sid_bound = $true
    }
}

function Get-WebView2Candidates {
    param([string]$LocalAppData)

    $matches = @()
    $registryRoots = @(
        "HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients",
        "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients"
    )
    foreach ($root in $registryRoots) {
        if (-not (Test-Path -LiteralPath $root)) { continue }
        foreach ($child in Get-ChildItem -LiteralPath $root -ErrorAction SilentlyContinue) {
            try {
                $props = Get-ItemProperty -LiteralPath $child.PSPath -ErrorAction Stop
                $name = [string]$props.name
                if ($name -and $name.ToLowerInvariant().Contains("webview2")) {
                    $matches += [ordered]@{
                        source = "registry"
                        location = $child.Name
                        name = $name
                        version = [string]$props.pv
                    }
                }
            }
            catch { }
        }
    }

    foreach ($root in @($env:ProgramFiles, ${env:ProgramFiles(x86)}, $LocalAppData)) {
        if (-not $root) { continue }
        $path = Join-Path $root "Microsoft\EdgeWebView\Application"
        if (Test-Path -LiteralPath $path -PathType Container) {
            $versions = @(Get-ChildItem -LiteralPath $path -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending)
            $matches += [ordered]@{
                source = "filesystem"
                location = $path
                name = "Microsoft Edge WebView2 Runtime"
                version = $(if ($versions.Count) { $versions[0].Name } else { "present" })
            }
        }
    }
    return @($matches)
}

function Write-AcceptanceResult {
    param([System.Collections.IDictionary]$Payload)
    $json = $Payload | ConvertTo-Json -Depth 8
    Write-Output $json
    if ($OutputJson) {
        $parent = Split-Path -Parent $OutputJson
        if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
        $json | Set-Content -Encoding utf8 -LiteralPath $OutputJson
    }
}

$result = [ordered]@{
    schema = "R06_NO_ADMIN_ACCEPTANCE_v1"
    started_utc = (Get-Date).ToUniversalTime().ToString("o")
    user = [Environment]::UserName
    identity_name = $null
    user_sid = $null
    is_admin = $null
    profile_image_path = $null
    local_app_data = $null
    local_app_data_source = $null
    profile_sid_bound = $false
    per_user_state_writable = $false
    webview2_detected = $false
    webview2_candidate_count = 0
    source_artifact = $null
    source_sha256 = $null
    expected_sha256 = $(if ($ExpectedSha256) { $ExpectedSha256.ToLowerInvariant() } else { $null })
    copied_artifact = $null
    copied_sha256 = $null
    unicode_spaced_path = $false
    process_started = $false
    survived_probe_window = $false
    process_exit_code = $null
    status = "RUNNING"
    not_proven = @(
        "human NVDA acceptance",
        "complete functional WebView UI acceptance",
        "visual quality acceptance",
        "source/theological audit"
    )
    failure = $null
}

$exitCode = 0
$writeProbe = $null

try {
    if ($env:OS -ne "Windows_NT") {
        throw "No-admin packaged acceptance requires Windows."
    }

    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $result.identity_name = $identity.Name
    $result.user_sid = $identity.User.Value
    $result.is_admin = [bool](Test-IsAdministrator)
    if ($result.is_admin) {
        throw "Standard-user token required: current process is elevated/administrator."
    }

    $profile = Resolve-CurrentUserLocalAppData -Identity $identity
    $localAppData = [string]$profile.local_app_data
    $result.profile_image_path = [string]$profile.profile_path
    $result.local_app_data = $localAppData
    $result.local_app_data_source = "HKLM_ProfileList_current_sid"
    $result.profile_sid_bound = [bool]$profile.profile_sid_bound

    $source = (Resolve-Path -LiteralPath $Executable -ErrorAction Stop).Path
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Packaged executable is not a regular file."
    }
    $result.source_artifact = $source
    $sourceHash = Get-Sha256Hex -Path $source
    $result.source_sha256 = $sourceHash

    if ($ExpectedSha256) {
        $expected = $ExpectedSha256.Trim().ToLowerInvariant()
        if ($expected -notmatch "^[0-9a-f]{64}$") {
            throw "Expected SHA-256 must be exactly 64 hexadecimal characters."
        }
        if ($sourceHash -ne $expected) {
            throw "Source artifact SHA-256 does not match the expected build identity."
        }
    }

    $stateRoot = Join-Path $localAppData "ScriptureArchive"
    $diagnosticsRoot = Join-Path $stateRoot "diagnostics"
    New-Item -ItemType Directory -Force -Path $diagnosticsRoot | Out-Null
    $writeProbe = Join-Path $diagnosticsRoot ("no-admin-write-probe-" + $PID + ".tmp")
    [IO.File]::WriteAllText($writeProbe, "scripture-archive-no-admin-write-probe", (New-Object Text.UTF8Encoding($false)))
    if ([IO.File]::ReadAllText($writeProbe, [Text.Encoding]::UTF8) -ne "scripture-archive-no-admin-write-probe") {
        throw "Per-user state write/readback probe mismatch."
    }
    $result.per_user_state_writable = $true

    $webviewCandidates = @(Get-WebView2Candidates -LocalAppData $localAppData)
    $result.webview2_candidate_count = $webviewCandidates.Count
    $result.webview2_detected = $webviewCandidates.Count -gt 0
    if (-not $result.webview2_detected) {
        throw "Edge WebView2 Runtime was not detected for the standard-user context."
    }

    $acceptanceRoot = Join-Path $stateRoot "acceptance\Архів Писання Standard User"
    New-Item -ItemType Directory -Force -Path $acceptanceRoot | Out-Null
    $target = Join-Path $acceptanceRoot ([IO.Path]::GetFileName($source))
    Copy-Item -LiteralPath $source -Destination $target -Force
    $target = (Resolve-Path -LiteralPath $target).Path
    $result.copied_artifact = $target
    $result.unicode_spaced_path = ($target.Contains(" ") -and ($target.ToCharArray() | Where-Object { [int]$_ -gt 127 }).Count -gt 0)
    if (-not $result.unicode_spaced_path) {
        throw "Acceptance copy did not land in the required Unicode + spaced per-user path."
    }

    $copyHash = Get-Sha256Hex -Path $target
    $result.copied_sha256 = $copyHash
    if ($copyHash -ne $sourceHash) {
        throw "Copied artifact SHA-256 differs from the source artifact."
    }

    if (-not $StartupProbeScript) {
        $StartupProbeScript = Join-Path $PSScriptRoot "probe_packaged_startup.ps1"
    }
    $probeScript = (Resolve-Path -LiteralPath $StartupProbeScript -ErrorAction Stop).Path
    $probeJson = Join-Path $acceptanceRoot "packaged_startup_probe.json"
    & $probeScript -Executable $target -ProbeSeconds $ProbeSeconds -OutputJson $probeJson
    if (-not (Test-Path -LiteralPath $probeJson -PathType Leaf)) {
        throw "Packaged startup probe did not emit its evidence JSON."
    }
    $probe = Get-Content -Raw -Encoding utf8 -LiteralPath $probeJson | ConvertFrom-Json
    $result.process_started = [bool]$probe.process_started
    $result.survived_probe_window = [bool]$probe.survived_probe_window
    $result.process_exit_code = $probe.exit_code
    if (-not $result.process_started) {
        throw "Packaged process did not start under the standard-user token."
    }
    if (-not $result.survived_probe_window) {
        if ($null -ne $result.process_exit_code -and [int]$result.process_exit_code -ne 0) {
            throw "Packaged process exited non-zero during the no-admin probe."
        }
        throw "Packaged process did not remain alive for the full no-admin probe window."
    }

    $result.status = "NO_ADMIN_ACCEPTANCE_PASS"
}
catch {
    $result.status = "NO_ADMIN_ACCEPTANCE_FAIL"
    $result.failure = $_.Exception.Message
    $exitCode = 2
}
finally {
    if ($writeProbe) {
        Remove-Item -LiteralPath $writeProbe -Force -ErrorAction SilentlyContinue
    }
    Write-AcceptanceResult -Payload $result
}

exit $exitCode
