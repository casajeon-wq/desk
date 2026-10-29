# DESK 제거 — 제거.bat이 부른다. 설치 때 바꾼 걸 원래대로 돌린다(Lively 프로그램 자체는 남김).
# 백업·되돌리기가 하나라도 실패하면 설치 폴더(백업이 든 곳)를 지우지 않고 멈춘다.
# -DryRun: install.ps1 -DryRun 이 만든 가짜 PC(%TEMP%\adesk-dry)에서 제거를 시험
param([switch]$DryRun)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
. (Join-Path $repo 'setup\common.ps1')
$lv = Find-Lively
$docs = [Environment]::GetFolderPath('MyDocuments')
if ($DryRun) {
  $Box = Join-Path $env:TEMP 'adesk-dry'
  $Root = Join-Path $Box 'DeskWallpaper'; $StartupLnk = Join-Path $Box 'Startup\DESK 도우미.lnk'; $docs = $Box
  $lv = [pscustomobject]@{ Exe = $null; Data = (Join-Path $Box 'Lively Wallpaper'); Store = $false }
  function Lively-Cmd($lv, [string[]]$a) { Say "(가상) Lively 명령: $($a -join ' ')"; $true }
  function Stop-Lively { Say '(가상) Lively 잠깐 끄기' }
  function Test-WallActive([string]$wall, [int]$sec = 15) { $true }
  $bakText = if ([IO.File]::Exists((Join-Path $Root 'lively-settings.bak.json'))) { [IO.File]::ReadAllText((Join-Path $Root 'lively-settings.bak.json'), $utf8) } else { '' }
}
$lock = Lock-Desk

if (-not (Test-Path -LiteralPath $Root)) {
  # 이미 지웠거나 설치한 적 없음 → 다른 건 건드리지 않는다(두 번 눌러도 안전). 짝 잃은 시작프로그램 바로가기만 치움
  $msg = '  DESK가 설치돼 있지 않아요. 바꾼 건 없어요.'
  if ([IO.File]::Exists($StartupLnk)) { Remove-Item -LiteralPath $StartupLnk -Force; $msg = '  DESK가 설치돼 있지 않아요. 남아 있던 시작프로그램 바로가기만 지웠어요.' }
  Write-Host ''; Write-Host $msg -ForegroundColor Green; Write-Host ''; exit 0
}

try {
  Step '실행 도우미 끄기'
  if (-not $DryRun) { Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like '*DeskWallpaper*helper.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } }
  if ([IO.File]::Exists($StartupLnk)) { Remove-Item -LiteralPath $StartupLnk -Force }
  Say '껐고, 시작프로그램에서도 뺐어요'

  Step '메모 백업'
  $notes = Join-Path $Root 'notes.json'
  if ([IO.File]::Exists($notes) -and ([IO.File]::ReadAllText($notes, $utf8).Trim() -ne '[]')) {
    $keep = Join-Path $docs ('DESK 메모 백업 ' + (Get-Date -Format 'yyyy-MM-dd HHmmss') + '.json')  # 다시 깔고 또 지워도 옛 백업을 안 덮게
    Copy-Item -LiteralPath $notes $keep -Force
    if (-not [IO.File]::Exists($keep)) { throw "메모 백업 실패: $keep" }
    Say "붙여 둔 메모는 여기 남겨 뒀어요: $keep"
  } else { Say '붙인 메모 없음' }

  Step 'Lively 되돌리기'
  $cfgFile = Join-Path $Root 'config.json'
  $wall = if ([IO.File]::Exists($cfgFile)) { ([IO.File]::ReadAllText($cfgFile, $utf8) | ConvertFrom-Json).wall } else { Join-Path $lv.Data "Library\wallpapers\$WallName" }
  # Lively를 끄기 전에 '우리 배경이 떠 있었나'를 먼저 기억(끄고 나면 알 수 없어서)
  $wasOurs = Test-WallActive $wall 2
  $bak = Join-Path $Root 'lively-settings.bak.json'
  if ([IO.File]::Exists($bak)) {
    Stop-Lively
    Copy-Item -LiteralPath $bak (Join-Path $lv.Data 'Settings.json') -Force
    Say 'Lively 설정을 설치 전으로'
  }
  if (-not $DryRun -and -not (Start-Lively $lv)) { throw 'Lively를 다시 켜지 못했어요' }
  # 우리 배경이 떠 있었으면 닫고, 모니터마다 원래 배경을 다시 건 뒤 실제로 떴는지 확인
  if ($wasOurs) {
    if (-not (Lively-Cmd $lv @('closewp', '--monitor', '-1'))) { throw 'Lively에 명령을 못 보냄' }
    $n = Restore-Layout $lv
    Say $(if ($n) { "원래 배경 $n 개를 다시 걸었어요" } else { '배경을 내렸어요 (설치 전엔 Lively 배경이 없었어요)' })
  }
  if (Test-Path -LiteralPath $wall) { Remove-Item -LiteralPath $wall -Recurse -Force }

  Step '바탕화면 아이콘 되돌리기'
  # 우리가 숨긴 경우에만 다시 보이게(원래 숨겨 두던 사람은 그대로)
  if ([IO.File]::Exists((Join-Path $Root 'icons-hidden-by-us.txt'))) {
    if ($DryRun) { Say '(가상) 바탕화면 아이콘 다시 보이게' }
    elseif (-not [DeskIcons]::Set($true) -or [DeskIcons]::State() -ne 1) { throw '바탕화면 아이콘을 다시 보이게 하지 못했어요 (바탕화면 우클릭 → 보기 → 바탕 화면 아이콘 표시)' }
    else { Say '다시 보이게 했어요' }
  } else { Say '설치 때 숨기지 않았으니 그대로 둠' }
} catch {
  Write-Host ''; Write-Host "  되돌리다가 멈췄어요: $($_.Exception.Message)" -ForegroundColor Yellow
  Write-Host "  백업이 든 폴더는 지우지 않고 남겨 뒀어요: $Root"; Write-Host '  제거.bat을 한 번 더 눌러 주세요.'; Write-Host ''
  exit 1
}

Step '파일 정리'
Remove-Item -LiteralPath $Root -Recurse -Force

if ($DryRun) {
  $r = @(
    [pscustomobject]@{ 확인 = '시작프로그램 바로가기 지움'; 통과 = -not [IO.File]::Exists($StartupLnk) }
    [pscustomobject]@{ 확인 = 'Lively 설정 설치 전으로'; 통과 = ($bakText -and [IO.File]::ReadAllText((Join-Path $lv.Data 'Settings.json'), $utf8) -eq $bakText) }
    [pscustomobject]@{ 확인 = '배경 폴더 지움'; 통과 = -not (Test-Path -LiteralPath $wall) }
    [pscustomobject]@{ 확인 = '설치 폴더 지움'; 통과 = -not (Test-Path -LiteralPath $Root) }
    [pscustomobject]@{ 확인 = '메모 백업 남김'; 통과 = [bool](Get-ChildItem -LiteralPath $docs -Filter 'DESK 메모 백업 *.json' -ErrorAction SilentlyContinue) }
  )
  Write-Host ''; Write-Host '  ── 가상 제거 결과 ──' -ForegroundColor Cyan
  $r | Format-Table -AutoSize | Out-String | Write-Host
  [IO.File]::WriteAllText((Join-Path $Box 'uninstall-result.json'), ($r | ConvertTo-Json), $utf8)
  if (@($r | Where-Object { -not $_.통과 }).Count) { exit 1 } else { exit 0 }
}
Write-Host ''; Write-Host '  원래대로 돌렸어요.' -ForegroundColor Green; Write-Host ''
