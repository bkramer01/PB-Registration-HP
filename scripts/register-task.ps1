# Creates (or replaces) the nightly Windows task for the logged-in user. No admin rights needed.
# It runs every night, and on nights with nothing to book the script exits straight away,
# so changing the days in config.json needs no change here.
#
# Interactive logon means it only runs while you're logged in: the browser has to be visible.

$root = Split-Path $PSScriptRoot -Parent
$action = New-ScheduledTaskAction -Execute (Join-Path $PSScriptRoot 'run-booker.cmd') -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Daily -At 11:45PM
$settings = New-ScheduledTaskSettingsSet -WakeToRun -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive

Register-ScheduledTask -TaskName 'Pickleball Booker' -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force `
  -Description 'Books a pickleball court at midnight. See README.md in the PB-Registration-HP folder.' | Out-Null

Write-Output "Next run: $((Get-ScheduledTaskInfo -TaskName 'Pickleball Booker').NextRunTime)"
