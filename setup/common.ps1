# 설치·제거·다시 읽기가 같이 쓰는 것들 (. 으로 불러 씀)
$utf8 = New-Object System.Text.UTF8Encoding($false)
$Root = Join-Path $env:LOCALAPPDATA 'DeskWallpaper'
$WallName = 'desk-wallpaper'
$StartupLnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'DESK 도우미.lnk'

function Say([string]$m) { Write-Host "  $m" }
function Step([string]$m) { Write-Host ''; Write-Host "▶ $m" -ForegroundColor Cyan }

# 쓰다가 꺼져도 파일이 반쪽이 되지 않게: 옆에 다 쓴 뒤 한 번에 바꿔치기
function Write-Atomic([string]$path, [string]$text) {
  $tmp = "$path.tmp"; [IO.File]::WriteAllText($tmp, $text, $utf8)
  if ([IO.File]::Exists($path)) { [IO.File]::Replace($tmp, $path, [NullString]::Value) } else { [IO.File]::Move($tmp, $path) }
}

# 설치·제거·다시 읽기가 동시에 돌지 않게(두 번 눌러도 하나씩)
function Lock-Desk {
  $m = New-Object Threading.Mutex($false, 'Local\DeskWallpaperSetup')
  try { if (-not $m.WaitOne(0)) { Say '이미 설치·제거·다시 읽기 중 하나가 돌고 있어요. 그 창이 끝난 뒤 다시 눌러 주세요.'; exit 1 } } catch [Threading.AbandonedMutexException] {}
  $m
}

# Lively 찾기: 설치판(winget·홈페이지) → 실행 파일 경로와 데이터 폴더. 스토어판은 데이터 폴더만 다르다.
function Find-Lively {
  $exe = @("$env:ProgramFiles\Lively Wallpaper\Lively.exe", "${env:ProgramFiles(x86)}\Lively Wallpaper\Lively.exe", "$env:LOCALAPPDATA\Programs\Lively Wallpaper\Lively.exe") | Where-Object { [IO.File]::Exists($_) } | Select-Object -First 1
  $data = Join-Path $env:LOCALAPPDATA 'Lively Wallpaper'
  $store = Get-ChildItem -LiteralPath "$env:LOCALAPPDATA\Packages" -Directory -Filter '*LivelyWallpaper*' -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $exe -and $store) { $data = Join-Path $store.FullName 'LocalCache\Local\Lively Wallpaper' }
  [pscustomobject]@{ Exe = $exe; Data = $data; Store = [bool]($store -and -not $exe) }
}

# Lively에 명령 보내기(켜져 있는 Lively로 전달됨). 안 켜져 있으면 Lively가 켜지므로 끝나길 기다리지 않는다.
# 명령을 보내기라도 했으면 $true. 실제로 바뀌었는지는 Test-WallActive로 따로 확인한다
function Lively-Cmd($lv, [string[]]$a) {
  $exe = if ($lv.Exe) { $lv.Exe } else { 'lively' }  # 스토어판 = 실행 별칭
  try { Start-Process -FilePath $exe -ArgumentList $a -WindowStyle Hidden -ErrorAction Stop; Start-Sleep -Milliseconds 1500; $true } catch { $false }
}

# Lively 켜기(설치판·스토어판 둘 다)
function Start-Lively($lv) {
  if (Get-Process -Name 'Lively' -ErrorAction SilentlyContinue) { return $true }
  try {
    if ($lv.Exe) { Start-Process $lv.Exe -ErrorAction Stop }
    else {
      $p = Get-AppxPackage -Name '*LivelyWallpaper*' | Select-Object -First 1; if (-not $p) { return $false }
      $id = (Get-AppxPackageManifest $p).Package.Applications.Application | Select-Object -First 1 -ExpandProperty Id
      Start-Process "shell:AppsFolder\$($p.PackageFamilyName)!$id" -ErrorAction Stop
    }
  } catch { return $false }
  for ($i = 0; $i -lt 20; $i++) { if (Get-Process -Name 'Lively' -ErrorAction SilentlyContinue) { Start-Sleep 2; return $true }; Start-Sleep -Milliseconds 500 }
  $false
}

function Stop-Lively { Get-Process -Name 'Lively*' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 1500 }

# 우리 배경이 진짜 화면에 떠 있나: Lively 재생 프로그램이 우리 폴더의 index.html을 틀고 있는지 (최대 $sec초 기다림)
function Test-WallActive([string]$wall, [int]$sec = 15) {
  for ($i = 0; $i -lt $sec * 2; $i++) {
    $on = Get-CimInstance Win32_Process -Filter "Name like 'Lively.Player%'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($wall) }
    if ($on) { return $true }; Start-Sleep -Milliseconds 500
  }
  $false
}

# 그 주소에서 도는 게 '우리 도우미'이고 토큰도 맞는지 (아무 프로그램이나 대답하는 것과 구분)
function Test-Helper([int]$port, [string]$token, [int]$sec = 10) {
  for ($i = 0; $i -lt $sec * 2; $i++) {
    try { $r = Invoke-RestMethod "http://127.0.0.1:$port/ping?t=$token" -TimeoutSec 1; if ($r.app -eq 'desk-wallpaper' -and $r.tokenOk) { return $true } } catch {}
    Start-Sleep -Milliseconds 500
  }
  $false
}

# 모니터별 원래 배경 기억하기·되돌리기 (Lively의 WallpaperLayout.json = 모니터 번호 → 배경 폴더)
function Save-Layout($lv) {
  $src = Join-Path $lv.Data 'WallpaperLayout.json'; $dst = Join-Path $Root 'layout-before.json'
  if ([IO.File]::Exists($dst)) { return }  # 맨 처음 것만
  if ([IO.File]::Exists($src)) { Copy-Item -LiteralPath $src $dst -ErrorAction Stop } else { Write-Atomic $dst '[]' }
}
# 되돌린 배경이 실제로 떴는지까지 확인. 하나라도 안 뜨면 이유를 던진다(→ 제거가 백업을 지우지 않고 멈춤)
function Restore-Layout($lv) {
  $f = Join-Path $Root 'layout-before.json'; if (-not [IO.File]::Exists($f)) { return 0 }
  $n = 0
  foreach ($e in @([IO.File]::ReadAllText($f, $utf8) | ConvertFrom-Json)) {
    $p = $e.LivelyInfoPath
    if (-not $p -or $p -like "*\$WallName" -or -not (Test-Path -LiteralPath $p)) { continue }
    $cmd = @('setwp', '--file', "`"$p`""); if ($e.LivelyScreen.Index) { $cmd += @('--monitor', [string]$e.LivelyScreen.Index) }
    if (-not (Lively-Cmd $lv $cmd)) { throw "Lively에 명령을 못 보냄: $p" }
    if (-not (Test-WallActive $p 15)) { throw "원래 배경이 다시 안 떴어요: $p" }
    $n++
  }
  $n
}

# 바탕화면 아이콘 숨기기/보이기: 탐색기를 재시작하지 않고, 바탕화면 우클릭 → 보기 → '바탕 화면 아이콘 표시'와 같은 신호를 보낸다
Add-Type @'
using System; using System.Runtime.InteropServices;
public static class DeskIcons {
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindow(string c, string n);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr p, IntPtr a, string c, string n);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  static IntPtr DefView() {
    var v = FindWindowEx(FindWindow("Progman", null), IntPtr.Zero, "SHELLDLL_DefView", null);
    IntPtr w = IntPtr.Zero;
    while (v == IntPtr.Zero) { w = FindWindowEx(IntPtr.Zero, w, "WorkerW", null); if (w == IntPtr.Zero) break; v = FindWindowEx(w, IntPtr.Zero, "SHELLDLL_DefView", null); }
    return v;
  }
  // 1 = 보임, 0 = 숨김, -1 = 바탕화면 창을 못 찾음
  public static int State() { var v = DefView(); if (v == IntPtr.Zero) return -1; var lv = FindWindowEx(v, IntPtr.Zero, "SysListView32", null); return IsWindowVisible(lv) ? 1 : 0; }
  public static bool Set(bool show) { var s = State(); if (s < 0) return false; if ((s == 1) != show) SendMessage(DefView(), 0x111, (IntPtr)0x7402, IntPtr.Zero); return true; }
}
'@

# 바탕화면 다시 읽기: apps.js를 새로 만들어 배경 폴더에 넣는다.
# Lively 명령은 안 쓴다 — 배경 페이지가 몇 초마다 도우미에 앱 목록 지문(rev)을 묻고, 달라졌으면 스스로 새로고침한다.
# 순서: 새 목록을 옆 파일(apps.next.js)에 만들기 → 배경 폴더에 먼저 넣기 → 마지막에 도우미 쪽(apps.js)을 바꿔 새 지문을 알림.
# 그래야 배경이 새 지문을 보고 새로고침했을 때 이미 새 목록이 있다.
function Update-Apps {
  $cfg = [IO.File]::ReadAllText((Join-Path $Root 'config.json'), $utf8) | ConvertFrom-Json
  $next = Join-Path $Root 'apps.next.js'
  if ([IO.File]::Exists((Join-Path $Root 'apps.js'))) { Copy-Item -LiteralPath (Join-Path $Root 'apps.js') $next -Force }  # 토큰·로고 이어받기
  & (Join-Path $Root 'scan.ps1') -Out $next -Port $cfg.port
  $new = [IO.File]::ReadAllText($next, $utf8)
  $cur = Join-Path $Root 'apps.js'
  if ([IO.File]::Exists($cur) -and [IO.File]::ReadAllText($cur, $utf8) -eq $new) { Remove-Item -LiteralPath $next -Force; return $false }
  Write-Atomic (Join-Path $cfg.wall 'apps.js') $new
  Write-Atomic $cur $new
  Remove-Item -LiteralPath $next -Force
  $true
}
