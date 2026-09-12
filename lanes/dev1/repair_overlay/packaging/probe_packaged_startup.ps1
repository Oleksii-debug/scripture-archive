param(
    [Parameter(Mandatory=$true)]
    [string]$Executable,
    [int]$ProbeSeconds = 8,
    [string]$OutputJson = ""
)

$ErrorActionPreference = "Stop"
if ($ProbeSeconds -lt 1) {
    throw "ProbeSeconds must be at least 1 second"
}
$exe = (Resolve-Path $Executable).Path
$process = $null
$result = [ordered]@{
    schema_version = 1
    artifact = $exe
    started_utc = (Get-Date).ToUniversalTime().ToString("o")
    probe_seconds = $ProbeSeconds
    process_started = $false
    survived_probe_window = $false
    exit_code = $null
    note = "Process-liveness probe only; this is not NVDA acceptance or functional WebView content verification."
}

try {
    $process = Start-Process -FilePath $exe -PassThru
    $result.process_started = $true
    $exitedEarly = $process.WaitForExit($ProbeSeconds * 1000)
    if ($exitedEarly) {
        $result.exit_code = $process.ExitCode
        throw "Packaged process exited before completing the $ProbeSeconds-second liveness window with code $($process.ExitCode)"
    }

    $result.survived_probe_window = $true
    Stop-Process -Id $process.Id -Force
    $process.WaitForExit()
}
finally {
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        $process.WaitForExit()
    }
    $json = $result | ConvertTo-Json -Depth 4
    Write-Output $json
    if ($OutputJson) {
        $parent = Split-Path -Parent $OutputJson
        if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
        $json | Set-Content -Encoding utf8 $OutputJson
    }
}
