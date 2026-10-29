# DESK 실행 도우미 — 바탕화면(Lively 웹페이지)에서 아이콘을 누르면 진짜 바로가기를 연다.
# node 같은 설치 없이 윈도우 기본 PowerShell만으로 돈다. 127.0.0.1(내 PC 안)에서만 듣고,
# apps.js에 적힌 바로가기만, apps.js의 토큰이 맞을 때만 연다. 메모도 여기 파일로 저장한다
# (Lively 웹 저장소는 켤 때마다 비워져서).
# 토큰은 apps.js(내 PC 파일)와 토큰을 아는 요청에만 있다 → 다른 웹사이트는 토큰을 알 길이 없어 아무것도 못 연다.
# -NoLaunch = 가상 설치 시험용(앱 열기 요청에 답만 하고 실제로는 안 엶)
# -WatchDirs = 지켜볼 바탕화면 폴더(시험용으로 바꿀 때만, 보통은 내 바탕화면 + 공용 바탕화면)
param([string]$Root = (Join-Path $env:LOCALAPPDATA 'DeskWallpaper'), [switch]$NoLaunch, [string[]]$WatchDirs = @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('CommonDesktopDirectory')))
$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Load-Desk {
  $t = [IO.File]::ReadAllText((Join-Path $Root 'apps.js'), $utf8)
  $i = $t.IndexOf('window.DESK=')
  ($t.Substring($i + 12).TrimEnd().TrimEnd(';')) | ConvertFrom-Json
}
$desk = Load-Desk
$port = if ($desk.port) { [int]$desk.port } else { 47331 }

# 바탕화면 폴더 지켜보기: 새 앱을 깔거나 '바탕화면' 칸으로 연 폴더에 바로가기를 끌어다 놓으면 폴더 '고친 시각'이 바뀐다.
# 배경이 10초마다 /ping을 부를 때 20초에 한 번 그 시각만 보고, 바뀌었으면 '바탕화면 다시 읽기'를 창 없이 돌린다
# → 새 앱 목록 지문(rev)이 바뀌어 배경이 스스로 새로고침. 갤러는 .bat을 몰라도 됨
$script:deskCheck = [DateTime]::MinValue; $script:deskStamp = $null
function Watch-Desktop {
  $now = [DateTime]::UtcNow; if (($now - $script:deskCheck).TotalSeconds -lt 20) { return }; $script:deskCheck = $now
  try {
    $stamp = ($WatchDirs | Where-Object { $_ -and [IO.Directory]::Exists($_) } | ForEach-Object { [IO.Directory]::GetLastWriteTimeUtc($_).Ticks }) -join ','
    if ($script:deskStamp -and $stamp -ne $script:deskStamp) {
      Start-Process powershell.exe -WindowStyle Hidden -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', "`"$(Join-Path $Root 'rescan.ps1')`"", '-Login'
    }
    $script:deskStamp = $stamp
  } catch {}
}

# 쓰다가 꺼져도 파일이 반쪽이 되지 않게: 옆에 다 쓴 뒤 한 번에 바꿔치기
function Write-Atomic([string]$path, [string]$text) {
  $tmp = "$path.tmp"; [IO.File]::WriteAllText($tmp, $text, $utf8)
  if ([IO.File]::Exists($path)) { [IO.File]::Replace($tmp, $path, [NullString]::Value) } else { [IO.File]::Move($tmp, $path) }
}
function Rev([string]$text) { $h = [Security.Cryptography.SHA1]::Create().ComputeHash($utf8.GetBytes($text)); ([BitConverter]::ToString($h) -replace '-', '').Substring(0, 12) }

Add-Type @'
using System; using System.Runtime.InteropServices;
public static class DeskWin {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, UIntPtr e);
}
'@

# 폴더는 그냥 열면 창이 뒤에 깔린다 → 탐색기로 열고 Alt를 한 번 눌러 맨 앞으로 (최대 2초만 기다림)
function Open-Folder([string]$p) {
  $want = (Resolve-Path -LiteralPath $p).Path.TrimEnd('\')
  $sh = New-Object -ComObject Shell.Application
  $find = { foreach ($w in $sh.Windows()) { try { if ($w.Document.Folder.Self.Path.TrimEnd('\') -eq $want) { return [IntPtr]$w.HWND } } catch {} } }
  $h = & $find
  if (-not $h) { Start-Process explorer.exe -ArgumentList "`"$want`""; for ($i = 0; $i -lt 20 -and -not $h; $i++) { Start-Sleep -Milliseconds 100; $h = & $find } }
  if ($h) {
    if ([DeskWin]::IsIconic($h)) { [DeskWin]::ShowWindow($h, 9) | Out-Null }
    [DeskWin]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero); [DeskWin]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
    [DeskWin]::SetForegroundWindow($h) | Out-Null
  }
}

# JSON 응답만 배경 페이지(file://)가 읽을 수 있게 CORS를 연다. HTML(메모 창)은 같은 주소에서만 쓰니 안 연다
function Send($s, [int]$code, $body, [string]$type = 'application/json; charset=utf-8') {
  $bytes = if ($body -is [byte[]]) { $body } elseif ($body -is [string]) { $utf8.GetBytes($body) } else { $utf8.GetBytes(($body | ConvertTo-Json -Depth 8 -Compress)) }
  $reason = @{ 200 = 'OK'; 400 = 'Bad Request'; 403 = 'Forbidden'; 404 = 'Not Found'; 409 = 'Conflict' }[$code]
  $cors = if ($type -like 'application/json*') { "Access-Control-Allow-Origin: *`r`n" } else { '' }
  $head = "HTTP/1.1 $code $reason`r`nContent-Type: $type`r`nContent-Length: $($bytes.Length)`r`n${cors}Cache-Control: no-store`r`nConnection: close`r`n`r`n"
  $hb = [Text.Encoding]::ASCII.GetBytes($head)
  $s.Write($hb, 0, $hb.Length); $s.Write($bytes, 0, $bytes.Length); $s.Flush()
}

# 요청 읽기: 한 요청에 최대 3초. 조금씩 흘려보내며 붙잡고 있는 연결 때문에 도우미 전체가 멈추지 않게
function Read-Request($s) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $buf = New-Object byte[] 8192; $ms = New-Object IO.MemoryStream; $headEnd = -1
  # 읽기 한 번의 기다림도 남은 시간 안에서만 → 요청 하나가 3초를 넘지 않는다
  $left = { $l = 3000 - $sw.ElapsedMilliseconds; if ($l -lt 50) { $null } else { [int]$l } }
  while ($headEnd -lt 0) {
    $t = & $left; if (-not $t) { return $null }; $s.ReadTimeout = $t
    $n = $s.Read($buf, 0, $buf.Length); if ($n -le 0) { return $null }
    $ms.Write($buf, 0, $n); $all = $ms.ToArray()
    for ($i = [Math]::Max(0, $all.Length - $n - 3); $i -le $all.Length - 4; $i++) { if ($all[$i] -eq 13 -and $all[$i + 1] -eq 10 -and $all[$i + 2] -eq 13 -and $all[$i + 3] -eq 10) { $headEnd = $i; break } }
    if ($ms.Length -gt 65536) { return $null }
  }
  $all = $ms.ToArray()
  $lines = [Text.Encoding]::ASCII.GetString($all, 0, $headEnd) -split "`r`n"
  $parts = $lines[0].Split(' '); if ($parts.Count -lt 2) { return $null }
  $method = $parts[0]; $target = $parts[1]
  $len = 0; foreach ($l in $lines) { if ($l -match '^Content-Length:\s*(\d{1,9})\s*$') { $len = [int]$Matches[1] } }
  if ($len -gt 2000000) { return $null }
  $body = New-Object IO.MemoryStream; $start = $headEnd + 4
  if ($all.Length -gt $start) { $body.Write($all, $start, $all.Length - $start) }
  while ($body.Length -lt $len) {
    $t = & $left; if (-not $t) { return $null }; $s.ReadTimeout = $t
    $n = $s.Read($buf, 0, $buf.Length); if ($n -le 0) { break }; $body.Write($buf, 0, $n)
  }
  $q = @{}; $path = $target; $k = $target.IndexOf('?')
  if ($k -ge 0) {
    $path = $target.Substring(0, $k)
    foreach ($pair in $target.Substring($k + 1).Split('&')) { if ($pair) { $kv = $pair.Split('=', 2); $q[[Uri]::UnescapeDataString($kv[0])] = if ($kv.Count -gt 1) { [Uri]::UnescapeDataString($kv[1].Replace('+', ' ')) } else { '' } } }
  }
  @{ Method = $method; Path = $path; Q = $q; Body = $utf8.GetString($body.ToArray()) }
}

function Handle($s, $r) {
  $desk = Load-Desk  # 매번 다시 읽기(바탕화면 다시 읽기로 apps.js가 바뀌어도 도우미를 안 꺼도 되게)
  $okToken = ([string]$r.Q['t'] -ceq [string]$desk.token) -and $desk.token
  switch ($r.Path) {
    # 설치·배경이 '진짜 우리 도우미'인지, 앱 목록이 바뀌었는지(rev) 확인하는 곳
    '/ping' { Watch-Desktop; return Send $s 200 @{ ok = $true; app = 'desk-wallpaper'; tokenOk = [bool]$okToken; rev = $desk.rev } }
    '/notes' {
      if (-not $okToken) { return Send $s 403 @{ ok = $false } }
      $f = Join-Path $Root 'notes.json'
      $cur = if ([IO.File]::Exists($f)) { [IO.File]::ReadAllText($f, $utf8) } else { '[]' }
      if ($r.Method -eq 'POST') {
        # 여러 창(모니터마다 배경 창)이 서로 덮어쓰지 않게: 내가 읽었던 판(rev)이 지금 판일 때만 저장. 판 번호 없이는 저장 안 받음
        if ($r.Q['rev'] -cne (Rev $cur)) { return Send $s 409 ('{"ok":false,"rev":"' + (Rev $cur) + '","notes":' + $cur + '}') }
        try { $null = $r.Body | ConvertFrom-Json; if ($r.Body.TrimStart()[0] -ne '[') { throw 'list' } } catch { return Send $s 400 @{ ok = $false } }
        if ([IO.File]::Exists($f)) { Copy-Item -LiteralPath $f (Join-Path $Root 'notes.bak.json') -Force }
        Write-Atomic $f $r.Body
        return Send $s 200 @{ ok = $true; rev = (Rev $r.Body) }
      }
      return Send $s 200 ('{"ok":true,"rev":"' + (Rev $cur) + '","notes":' + $cur + '}')
    }
    '/open' {
      if (-not $okToken) { return Send $s 403 @{ ok = $false } }
      $app = $desk.apps | Where-Object { $_.id -eq $r.Q['id'] } | Select-Object -First 1
      if (-not $app -or -not (Test-Path -LiteralPath $app.path)) { return Send $s 404 @{ ok = $false; error = '바로가기를 찾을 수 없어요' } }
      Send $s 200 @{ ok = $true }
      # 연 횟수 남기기 → 바탕화면 다시 읽을 때 자주 쓰는 앱이 밝아짐
      try {
        $rf = Join-Path $Root 'runs.json'; $runs = @{}
        if ([IO.File]::Exists($rf)) { ([IO.File]::ReadAllText($rf, $utf8) | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $runs[$_.Name] = [int]$_.Value } }
        $runs[$app.path] = [int]$runs[$app.path] + 1
        Write-Atomic $rf ($runs | ConvertTo-Json -Compress)
      } catch {}
      if ($NoLaunch) { return }
      if ((Get-Item -LiteralPath $app.path).PSIsContainer) { Open-Folder $app.path } else { Start-Process -FilePath $app.path }
      return
    }
  }
  Send $s 404 @{ ok = $false }
}

$listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, $port)
try { $listener.Start() } catch { exit 0 }  # 이미 하나 떠 있으면 조용히 끝
while ($true) {
  $c = $listener.AcceptTcpClient()
  try {
    $c.SendTimeout = 2000; $s = $c.GetStream()
    $r = Read-Request $s
    if ($r) { Handle $s $r }
  } catch {} finally { $c.Close() }
}
