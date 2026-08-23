param(
    [Parameter(Mandatory=$true)]
    [string]$Executable,
    [int]$ProbeSeconds = 8,
    [string]$OutputJson = ""
)

$ErrorActionPreference = "Stop"
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
    Start-Sleep -Seconds $ProbeSeconds
    $process.Refresh()
    if ($process.HasExited) {
        $result.exit_code = $process.ExitCode
        if ($process.ExitCode -ne 0) {
            throw "Packaged process exited during probe with code $($process.ExitCode)"
        }
    } else {
        $result.survived_probe_window = $true
        Stop-Process -Id $process.Id -Force
        $process.WaitForExit()
    }
}
finally {
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
    $json = $result | ConvertTo-Json -Depth 4
    Write-Output $json
    if ($OutputJson) {
        $parent = Split-Path -Parent $OutputJson
        if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
        $json | Set-Content -Encoding utf8 $OutputJson
    }
}
