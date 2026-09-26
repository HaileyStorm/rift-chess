param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('controller', 'scene', 'chrome', 'menu')]
  [string] $Module
)

# Supervise only this invocation's child tree. The source-bound cache emitter
# checks the clean pin and refuses source changes; a timed-out cache is unusable.
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$artifact = Join-Path $repo '.artifacts/bend2/v2-preview/selected-js'
New-Item -ItemType Directory -Path $artifact -Force | Out-Null
$tag = '{0}-{1}-{2}' -f $Module, [DateTimeOffset]::UtcNow.ToString('yyyyMMddTHHmmssZ'), $PID
$stdoutPath = Join-Path $artifact "$tag.stdout.log"
$stderrPath = Join-Path $artifact "$tag.stderr.log"
$env:BEND_NO_TELEMETRY = '1'
$env:BEND_TIMEOUT_MS = '600000'
$nodePath = (Get-Command node -ErrorAction Stop).Source
$watch = [System.Diagnostics.Stopwatch]::StartNew()
$start = [System.Diagnostics.ProcessStartInfo]::new()
$start.FileName = $nodePath
$start.Arguments = "bend2/tools/bend.mjs --run bend2/tools/emit-selected.ts $Module"
$start.WorkingDirectory = $repo
$start.UseShellExecute = $false
$start.CreateNoWindow = $true
$start.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
$child = [System.Diagnostics.Process]::new()
$child.StartInfo = $start
if (-not $child.Start()) { throw 'Could not start selected Bend emitter' }
$rootStartedUtc = $child.StartTime.ToUniversalTime()
$stdoutTask = $child.StandardOutput.ReadToEndAsync()
$stderrTask = $child.StandardError.ReadToEndAsync()
$capBytes = 8GB
$peakBytes = 0L
$reason = ''
while (-not $child.HasExited) {
  $rows = Get-CimInstance Win32_Process
  $owned = [System.Collections.Generic.HashSet[int]]::new()
  $null = $owned.Add([int]$child.Id)
  $changed = $true
  while ($changed) {
    $changed = $false
    foreach ($row in $rows) {
      $id = [int]$row.ProcessId
      if ($owned.Contains([int]$row.ParentProcessId) -and -not $owned.Contains($id)) {
        $null = $owned.Add($id)
        $changed = $true
      }
    }
  }
  $bytes = 0L
  foreach ($id in $owned) {
    $process = Get-Process -Id $id -ErrorAction SilentlyContinue
    if ($process) { $bytes += $process.WorkingSet64 }
  }
  if ($bytes -gt $peakBytes) { $peakBytes = $bytes }
  if ($bytes -ge $capBytes) { $reason = 'rss_cap'; break }
  if ($watch.Elapsed.TotalSeconds -ge 630) { $reason = 'supervisor_timeout'; break }
  Start-Sleep -Milliseconds 500
}
if ($reason -and -not $child.HasExited) {
  # Windows PowerShell's .NET Process has Kill(), not Kill(bool). Rebuild the
  # exact live ancestry and verify its root identity/time before stopping only
  # this invocation's children. Never infer recovery from a stale PID alone.
  $liveRows = Get-CimInstance Win32_Process
  $liveRoot = $liveRows | Where-Object { [int]$_.ProcessId -eq $child.Id } | Select-Object -First 1
  if ($liveRoot) {
    $sameExe = [string]::Equals([string]$liveRoot.ExecutablePath, [string]$nodePath,
      [System.StringComparison]::OrdinalIgnoreCase)
    $sameCommand = $liveRoot.CommandLine -like "*bend2/tools/emit-selected.ts $Module*"
    $sameStart = [Math]::Abs(($liveRoot.CreationDate.ToUniversalTime() - $rootStartedUtc).TotalSeconds) -le 2
    if (-not ($sameExe -and $sameCommand -and $sameStart)) {
      throw "Emitter identity changed before bounded stop: PID $($child.Id), reason $reason"
    }
    $verified = [System.Collections.Generic.HashSet[int]]::new()
    $null = $verified.Add([int]$child.Id)
    $again = $true
    while ($again) {
      $again = $false
      foreach ($row in $liveRows) {
        $pidValue = [int]$row.ProcessId
        if ($verified.Contains([int]$row.ParentProcessId) -and -not $verified.Contains($pidValue)) {
          if ($row.CreationDate.ToUniversalTime() -lt $rootStartedUtc.AddSeconds(-2)) {
            throw "Preexisting descendant cannot be stopped: PID $pidValue"
          }
          $null = $verified.Add($pidValue)
          $again = $true
        }
      }
    }
    [System.IO.File]::WriteAllText((Join-Path $artifact "$tag.stop.json"),
      (@{ module = $Module; reason = $reason; rootPid = $child.Id;
          startedUtc = $rootStartedUtc.ToString('o');
          stoppedUtc = [DateTime]::UtcNow.ToString('o');
          verifiedPids = @($verified) } | ConvertTo-Json -Compress))
    foreach ($ownedPid in @($verified | Where-Object { $_ -ne $child.Id })) {
      $live = $liveRows | Where-Object { [int]$_.ProcessId -eq $ownedPid } | Select-Object -First 1
      $fresh = Get-CimInstance Win32_Process -Filter "ProcessId=$ownedPid"
      if ($fresh -and $live) {
        if ($fresh.CreationDate -ne $live.CreationDate -or
            [int]$fresh.ParentProcessId -ne [int]$live.ParentProcessId) {
          throw "Descendant identity changed before bounded stop: PID $ownedPid"
        }
        Stop-Process -Id $ownedPid -Force -ErrorAction Stop
      }
    }
    if (-not $child.HasExited) { $child.Kill() }
  }
}
$child.WaitForExit()
$child.Refresh()
$exitCode = $child.ExitCode
$exitValue = if ($null -eq $exitCode) { 126 } else { [int] $exitCode }
$stdoutTask.Wait()
$stderrTask.Wait()
[System.IO.File]::WriteAllText($stdoutPath, $stdoutTask.Result)
[System.IO.File]::WriteAllText($stderrPath, $stderrTask.Result)
$watch.Stop()
Get-Content -LiteralPath $stdoutPath -ErrorAction SilentlyContinue
Get-Content -LiteralPath $stderrPath -ErrorAction SilentlyContinue
Write-Output ('SELECTED_MODULE {0} elapsed_s={1:F2} peak_tree_rss_mib={2:F1} exit={3} stop={4}' -f `
  $Module, $watch.Elapsed.TotalSeconds, ($peakBytes / 1MB), $exitValue, $reason)
if ($reason) { exit 125 }
exit $exitValue
