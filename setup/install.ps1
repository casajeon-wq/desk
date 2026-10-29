# DESK 설치 — 설치.bat이 부른다.
# 하는 일: Lively 준비 → 내 바탕화면 읽어서 아이콘 만들기 → 배경 넣기 → Lively 설정(배터리·가림 멈춤, 키보드 넘기기)
#          → 실행 도우미를 시작프로그램에 → 원래 바탕화면 아이콘 숨기기 → 적용
# 되돌리기는 제거.bat (바꾼 Lively 설정·바탕화면 아이콘 표시를 원래대로)
#
# 가상 설치(-DryRun): 진짜 PC는 안 건드리고 %TEMP%\adesk-dry 안에 '가짜 PC'를 만들어 똑같은 순서로 깔아 본다.
#   Lively 설정은 복사본에, 시작프로그램은 가짜 폴더에, 실행 도우미는 잠깐 켰다가 끄고(앱은 실제로 안 염),
#   Lively 명령·바탕화면 아이콘 숨기기는 '했을 일'만 적는다. -NoLively 를 붙이면 Lively 없는 PC 흉내(받을 파일만 확인).
param([int]$Port = 47331, [switch]$DryRun, [switch]$NoLively, [string[]]$Desktop)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
. (Join-Path $repo 'setup\common.ps1')

$checks = New-Object System.Collections.ArrayList
function Check([string]$what, [bool]$ok, [string]$note = '') { [void]$checks.Add([pscustomobject]@{ 결과 = $(if ($ok) { '통과' } else { '실패' }); 확인 = $what; 내용 = $note }) }

$lock = Lock-Desk  # 가상 설치 폴더를 지우기 전에 먼저 잠금
if ($DryRun) {
  $Box = Join-Path $env:TEMP 'adesk-dry'
  Remove-Item -LiteralPath $Box -Recurse -Force -ErrorAction SilentlyContinue
  $Root = Join-Path $Box 'DeskWallpaper'
  $StartupLnk = Join-Path $Box 'Startup\DESK 도우미.lnk'; New-Item -ItemType Directory -Force (Split-Path $StartupLnk) | Out-Null
  if ($Port -eq 47331) { $Port = 47339 }
  function Lively-Cmd($lv, [string[]]$a) { Say "(가상) Lively 명령: $($a -join ' ')"; $true }
  function Stop-Lively { Say '(가상) Lively 잠깐 끄기' }
  function Test-WallActive([string]$wall, [int]$sec = 15) { Say '(가상) 배경이 화면에 떴다고 치기'; $true }
}

Write-Host ''
Write-Host '  ┌──────────────────────────────┐'
Write-Host $(if ($DryRun) { '  │  DESK 가상 설치 (시험)  │' } else { '  │   DESK 바탕화면 설치    │' })
Write-Host '  └──────────────────────────────┘'

Step 'Lively 확인'
$lv = Find-Lively
if ($DryRun) {
  # 가짜 PC의 Lively: 데이터 폴더만 상자 안에. 진짜 설정 파일이 있으면 복사본으로 시험
  $real = $lv; $lv = [pscustomobject]@{ Exe = $null; Data = (Join-Path $Box 'Lively Wallpaper'); Store = $false }
  New-Item -ItemType Directory -Force $lv.Data | Out-Null
  if (-not $NoLively -and (Test-Path (Join-Path $real.Data 'Settings.json'))) { Copy-Item (Join-Path $real.Data 'Settings.json') $lv.Data }
  elseif (-not $NoLively) { '{"AppFullscreenPause":1,"AppFocusPause":0,"BatteryPause":0,"PowerSaveModePause":0,"InputForward":1}' | Set-Content (Join-Path $lv.Data 'Settings.json') }
  if ($NoLively) {
    Say '(가상) Lively 없는 PC → winget 설치, 안 되면 공식 GitHub에서 직접 받기'
    try {
      [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
      $rel = Invoke-RestMethod 'https://api.github.com/repos/rocksdanister/lively/releases/latest' -Headers @{ 'User-Agent' = 'desk-wallpaper' }
      $asset = $rel.assets | Where-Object { $_.name -match '^lively_setup.*\.exe$' } | Select-Object -First 1
      Check 'Lively 직접 받을 파일 찾기' ([bool]$asset) "$($rel.tag_name) $($asset.name) $([int]($asset.size / 1MB))MB"
    } catch { Check 'Lively 직접 받을 파일 찾기' $false $_.Exception.Message }
    Check 'winget 있음' ([bool](Get-Command winget -ErrorAction SilentlyContinue)) 'winget install rocksdanister.LivelyWallpaper'
    '{}' | Set-Content (Join-Path $lv.Data 'Settings.json')  # 막 깐 Lively = 설정 거의 빈 상태
  }
}
elseif (-not $lv.Exe -and -not $lv.Store) {
  Say 'Lively가 없어서 같이 설치할게요 (무료 · 오픈소스 · 약 220MB)'
  Say '관리자 허락 창이 뜨면 "예"를 눌러 주세요'
  # 1순위 winget(윈도우 10·11 기본), 안 되면 Lively 공식 GitHub에서 최신 설치 파일을 직접 받아 조용히 설치
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget install --id rocksdanister.LivelyWallpaper -e --silent --accept-source-agreements --accept-package-agreements
    $lv = Find-Lively
  }
  if (-not $lv.Exe) {
    try {
      [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
      $rel = Invoke-RestMethod 'https://api.github.com/repos/rocksdanister/lively/releases/latest' -Headers @{ 'User-Agent' = 'desk-wallpaper' }
      $asset = $rel.assets | Where-Object { $_.name -match '^lively_setup.*\.exe$' } | Select-Object -First 1
      $setup = Join-Path $env:TEMP $asset.name
      Say "받는 중: $($asset.name) ($([int]($asset.size / 1MB))MB) — 인터넷 속도에 따라 1~3분"
      $ProgressPreference = 'SilentlyContinue'  # 진행 막대를 그리면 PowerShell 5.1 다운로드가 몇 배 느려짐
      Invoke-WebRequest $asset.browser_download_url -OutFile $setup -UseBasicParsing
      Start-Process $setup -ArgumentList '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/SP-' -Wait
      Remove-Item $setup -Force -ErrorAction SilentlyContinue
      $lv = Find-Lively
    } catch { Say "직접 받기 실패: $($_.Exception.Message)" }
  }
  if (-not $lv.Exe) {
    Say 'Lively를 자동으로 못 깔았어요. 열리는 페이지에서 lively_setup…exe를 받아 깔고, 설치.bat을 다시 눌러 주세요.'
    Start-Process 'https://github.com/rocksdanister/lively/releases/latest'; exit 1
  }
}
Say ("Lively: " + $(if ($DryRun) { "(가상) $($lv.Data)" } elseif ($lv.Exe) { $lv.Exe } else { '스토어판' }))
# 처음 깐 Lively는 한 번 켜야 설정 파일·라이브러리 폴더가 생긴다
$settings = Join-Path $lv.Data 'Settings.json'
if (-not $DryRun -and -not [IO.File]::Exists($settings)) {
  if ($lv.Exe) { Start-Process $lv.Exe } else { Start-Process 'shell:AppsFolder\12030rocksdanister.LivelyWallpaper_97hta09mmv6hy!App' }
  for ($i = 0; $i -lt 40 -and -not [IO.File]::Exists($settings); $i++) { Start-Sleep -Milliseconds 500 }
}

Step '파일 넣기'
New-Item -ItemType Directory -Force $Root | Out-Null
# 다시 설치하는 거면 옛 도우미부터 끈다(새 코드로 다시 켜지게)
if (-not $DryRun) { Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like '*DeskWallpaper*helper.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } }
foreach ($f in @('helper\helper.ps1', 'helper\start-helper.vbs', 'setup\scan.ps1', 'setup\known-apps.json', 'setup\common.ps1', 'setup\rescan.ps1')) { Copy-Item (Join-Path $repo $f) $Root -Force }
$wall = Join-Path $lv.Data "Library\wallpapers\$WallName"
New-Item -ItemType Directory -Force $wall | Out-Null
Copy-Item (Join-Path $repo 'wallpaper\*') $wall -Recurse -Force
Write-Atomic (Join-Path $Root 'config.json') (@{ port = $Port; wall = $wall; lively = $lv.Exe } | ConvertTo-Json)
Say "배경: $wall"
Check '배경 파일 복사' (([IO.File]::Exists((Join-Path $wall 'index.html'))) -and ([IO.File]::Exists((Join-Path $wall 'photo\record.png')))) $wall

Step '내 바탕화면 읽기 (아이콘 만들기)'
$scanArgs = @{ Out = (Join-Path $Root 'apps.js'); Port = $Port }; if ($Desktop) { $scanArgs.Desktop = $Desktop }
& (Join-Path $Root 'scan.ps1') @scanArgs
Copy-Item (Join-Path $Root 'apps.js') $wall -Force
$appsText = [IO.File]::ReadAllText((Join-Path $wall 'apps.js'), $utf8)
$desk = $appsText.Substring($appsText.IndexOf('window.DESK=') + 12).TrimEnd().TrimEnd(';') | ConvertFrom-Json
Check '아이콘 목록 만들기' ($desk.apps.Count -gt 1) "앱 $($desk.apps.Count - 1)개 · 토큰 $($desk.token.Length)자리"

Step 'Lively 설정 맞추기'
# 배터리일 때 Lively가 통째로 멈추면 아이콘 클릭도 죽는다 → Lively는 계속 돌리고, 배경 페이지가 충전 안 할 때 움직임만 멈춘다(eco 모드).
# 다른 창이 화면을 다 덮으면(전체 화면·최대화) Lively가 멈춘다. 키보드도 넘겨야 바탕화면 메모에 바로 글을 쓸 수 있다.
$want = [ordered]@{ AppFullscreenPause = 0; AppFocusPause = 1; BatteryPause = 1; PowerSaveModePause = 1; InputForward = 2 }
if ([IO.File]::Exists($settings)) {
  Save-Layout $lv  # 모니터별 원래 배경(제거할 때 되돌림)
  $bak = Join-Path $Root 'lively-settings.bak.json'
  # Lively를 끄기 전에 설정 파일을 먼저 읽어 본다. 깨져 있으면: 멀쩡한 백업이 있으면 그걸로, 없으면 Lively는 건드리지 않고 이 단계만 건너뜀
  $s = $null; try { $s = [IO.File]::ReadAllText($settings, $utf8) | ConvertFrom-Json } catch {}
  if (-not $s -and [IO.File]::Exists($bak)) { try { $s = [IO.File]::ReadAllText($bak, $utf8) | ConvertFrom-Json; Say '설정 파일이 깨져 있어서 설치 전 백업으로 고칠게요' } catch {} }
  if (-not $s) { Say '설정 파일이 깨져 있어서 Lively 설정은 건너뜀 (Lively를 한 번 켜고 끈 뒤 설치.bat을 다시 눌러 주세요)'; Check 'Lively 설정 5개' $false '설정 파일 깨짐' }
}
if ($s) {
  if (-not [IO.File]::Exists($bak)) { Write-Atomic $bak ([IO.File]::ReadAllText($settings, $utf8)) }  # 멀쩡한 맨 처음 것만 보관(제거할 때 이걸로 되돌림)
  Stop-Lively
  foreach ($k in $want.Keys) { if ($s.PSObject.Properties[$k]) { $s.$k = $want[$k] } else { $s | Add-Member -NotePropertyName $k -NotePropertyValue $want[$k] } }
  Write-Atomic $settings ($s | ConvertTo-Json -Depth 30)
  Say '전체 화면 앱 위에선 멈춤 · 배터리 땐 움직임만 멈춤 · 키보드 넘기기 켬'
  $s2 = [IO.File]::ReadAllText($settings, $utf8) | ConvertFrom-Json
  Check 'Lively 설정 5개' (@($want.Keys | Where-Object { $s2.$_ -ne $want[$_] }).Count -eq 0) (($want.Keys | ForEach-Object { "$_=$($s2.$_)" }) -join ' ')
} elseif (-not [IO.File]::Exists($settings)) { Say '설정 파일을 못 찾아서 건너뜀 (Lively 기본값으로 돌아감)' }

Step '실행 도우미 (아이콘 누르면 앱 열어 주는 작은 프로그램)'
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($StartupLnk); $sc.TargetPath = "$env:windir\System32\wscript.exe"; $sc.Arguments = "`"$(Join-Path $Root 'start-helper.vbs')`""; $sc.WorkingDirectory = $Root; $sc.Save()
Check '시작프로그램 바로가기' ([IO.File]::Exists($StartupLnk)) $StartupLnk
$u = "http://127.0.0.1:$Port"
if ($DryRun) {
  # 가상: 도우미를 이 창 안에서 잠깐 켜서(앱은 안 엶) 주고받기를 시험하고 끈다
  $job = Start-Job -ScriptBlock { param($h, $r) & $h -Root $r -NoLaunch } -ArgumentList (Join-Path $Root 'helper.ps1'), $Root
} else {
  Start-Process "$env:windir\System32\wscript.exe" -ArgumentList "`"$(Join-Path $Root 'start-helper.vbs')`" nowait"
}
# 아무 프로그램이나 대답하는 게 아니라 '우리 도우미 + 이번 토큰'인지 확인
$ok = Test-Helper $Port $desk.token 15
Say $(if ($ok) { '켜짐 · 컴퓨터 켤 때마다 자동으로 켜지고, 그때 바탕화면도 다시 읽어요' } else { "안 켜졌어요 — 다른 프로그램이 $Port 번을 쓰고 있거나 백신이 막았을 수 있어요" })
Check '실행 도우미 켜짐 (우리 도우미·토큰 맞음)' $ok $u
if ($DryRun -and $ok) {
  $code = { param($x, $m = 'GET', $b) try { $r = Invoke-WebRequest "$u$x" -Method $m -Body $b -UseBasicParsing -TimeoutSec 5; [pscustomobject]@{ c = [int]$r.StatusCode; t = $r.Content } } catch { [pscustomobject]@{ c = [int]$_.Exception.Response.StatusCode; t = '' } } }
  $t = $desk.token; $first = $desk.apps[0]
  Check '토큰 없이 앱 열기 → 막힘' ((& $code "/open?id=$($first.id)&t=xx").c -eq 403)
  Check '목록에 없는 앱 → 못 찾음' ((& $code "/open?id=zzz&t=$t").c -eq 404)
  Check "앱 열기 요청 ($($first.name))" ((& $code "/open?id=$($first.id)&t=$t").c -eq 200) '가상이라 실제로는 안 엶'
  Check '토큰 없이 메모 읽기 → 막힘' ((& $code '/notes').c -eq 403)
  $memo = '[{"id":"n1","style":"A","x":960,"y":700,"rot":2,"text":"한글 메모 시험 ✎","created":"2026-10-29T00:00:00Z"}]'
  $rev0 = ((& $code "/notes?t=$t").t | ConvertFrom-Json).rev
  $w = & $code "/notes?t=$t&rev=$rev0" 'POST' ([Text.Encoding]::UTF8.GetBytes($memo)); $back = & $code "/notes?t=$t"
  Check '메모 저장 → 다시 읽기 (한글)' ($w.c -eq 200 -and $back.t -match '한글 메모 시험') ''
  Check '옛 판으로 저장 → 거절(다른 창 덮어쓰기 막음)' ((& $code "/notes?t=$t&rev=$rev0" 'POST' ([Text.Encoding]::UTF8.GetBytes('[]'))).c -eq 409)
  Check '판 번호 없이 저장 → 거절(빈 목록으로 덮어쓰기 막음)' ((& $code "/notes?t=$t" 'POST' ([Text.Encoding]::UTF8.GetBytes('[]'))).c -eq 409)
  Check '메모 창 주소는 없음(쓸데없는 문 닫기)' ((& $code "/note?t=$t").c -eq 404)
  Check '앱 연 횟수 기록' ([IO.File]::Exists((Join-Path $Root 'runs.json')))
  # 아무것도 안 보내고 붙잡고 있는 연결이 있어도 다른 요청이 답을 받는지(3초 제한)
  $hang = New-Object Net.Sockets.TcpClient('127.0.0.1', $Port)
  $sw = [Diagnostics.Stopwatch]::StartNew(); $pong = & $code '/ping'; $hang.Close()
  Check '멈춘 연결이 있어도 계속 답함' ($pong.c -eq 200) "$([int]$sw.Elapsed.TotalSeconds)초"
  Stop-Job $job; Remove-Job $job -Force
}

Step '배경 적용'
if (-not $DryRun -and -not (Start-Lively $lv)) { Say 'Lively를 켜지 못했어요' }
Lively-Cmd $lv @('setwp', '--file', "`"$(Join-Path $wall 'index.html')`"")
$wallOk = Test-WallActive $wall 20
Check '배경이 화면에 뜸' $wallOk $wall
$iconState = [DeskIcons]::State()
# 배경이 실제로 떴고 도우미도 켜졌을 때만 원래 아이콘을 숨긴다(실패했는데 아이콘까지 사라지면 바탕화면이 텅 빔)
if ($wallOk -and $ok -and $iconState -eq 1) {
  if ($DryRun) { Say '(가상) 원래 바탕화면 아이콘 숨기기' }
  elseif ([DeskIcons]::Set($false)) { Write-Atomic (Join-Path $Root 'icons-hidden-by-us.txt') '1'; Say '원래 바탕화면 아이콘은 숨김 (바로가기 파일은 그대로 있어요)' }
} elseif ($iconState -eq 0) { Say '원래 바탕화면 아이콘은 이미 숨겨져 있어서 그대로 둠' }
elseif (-not ($wallOk -and $ok)) {
  Say '배경이나 도우미가 확인되지 않아서 원래 바탕화면 아이콘은 그대로 뒀어요'
  if ($lv.Store) { Say '스토어판 Lively라면 → Lively 열기 → 라이브러리에서 "DESK" 누르기 → 설치.bat 한 번 더' }
}
if ($DryRun) { Check '바탕화면 아이콘 창 찾기' ($iconState -ge 0) $(if ($iconState -eq 1) { '지금 보임 → 진짜 설치면 숨김' } elseif ($iconState -eq 0) { '지금 이미 숨김 → 그대로' } else { '못 찾음' }) }

if ($DryRun) {
  Write-Host ''; Write-Host '  ── 가상 설치 결과 ──' -ForegroundColor Cyan
  $checks | Format-Table -AutoSize | Out-String -Width 200 | Write-Host
  [IO.File]::WriteAllText((Join-Path $Box 'result.json'), ($checks | ConvertTo-Json), $utf8)
  Write-Host "  가짜 PC: $Box"
  if (@($checks | Where-Object { $_.결과 -eq '실패' }).Count) { exit 1 } else { exit 0 }
}

Write-Host ''
Write-Host '  다 됐어요! 바탕화면을 보세요 (Win + D)' -ForegroundColor Green
Write-Host '  · 새 앱을 깔았으면: 바탕화면 다시 읽기.bat (또는 컴퓨터 다시 켜기)'
Write-Host '  · 원래대로: 제거.bat'
Write-Host ''
