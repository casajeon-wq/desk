# 바탕화면 읽기 → apps.js 만들기.
# 1) 내 바탕화면 + 공용 바탕화면의 바로가기·폴더를 모은다(낱개 파일은 '바탕화면' 칸 하나로 묶음)
# 2) 흔한 앱은 known-apps.json으로 우리 선 아이콘·분류, 나머지는 진짜 아이콘을 뽑아 넣는다(배경 페이지가 색 분리)
# 3) 윈도우 실행 기록(UserAssist, 이 PC 안에서만 읽음)으로 자주 쓰는 앱일수록 밝게(1~3단계) 앞에 세운다
param(
  [string]$Out = (Join-Path $env:LOCALAPPDATA 'DeskWallpaper\apps.js'),
  [string[]]$Desktop = @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('CommonDesktopDirectory')),
  [int]$Port = 47331,
  [string]$Token = '',
  [string]$Logo = ''
)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$utf8 = New-Object System.Text.UTF8Encoding($false)

# 전에 만든 apps.js가 있으면 토큰·판은 그대로 둔다(다시 읽어도 메모·테마 저장이 안 끊기게)
$old = $null
if ([IO.File]::Exists($Out)) { try { $t = [IO.File]::ReadAllText($Out, $utf8); $old = ($t.Substring($t.IndexOf('window.DESK=') + 12).TrimEnd().TrimEnd(';')) | ConvertFrom-Json } catch {} }
if (-not $Token) { $Token = if ($old.token) { $old.token } else { -join ((1..24) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) }) } }
if (-not $Logo) { $Logo = if ($old.logo) { $old.logo } else { ($env:USERNAME.ToUpper() -replace '[^\w가-힣]', '') + '·DESK' } }

Add-Type -AssemblyName System.Drawing
Add-Type @'
using System; using System.Runtime.InteropServices;
public static class DeskIcon {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct SHFILEINFO { public IntPtr hIcon; public int iIcon; public uint attr; [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)] public string name; [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 80)] public string type; }
  [DllImport("shell32.dll", CharSet = CharSet.Unicode)] static extern IntPtr SHGetFileInfo(string p, uint a, ref SHFILEINFO i, uint cb, uint f);
  [DllImport("shell32.dll")] static extern int SHGetImageList(int list, ref Guid iid, out IImageList ppv);
  [DllImport("user32.dll")] public static extern bool DestroyIcon(IntPtr h);
  [ComImport, Guid("46EB5926-582E-4017-9FDF-E8998DAA0950"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IImageList {
    [PreserveSig] int Add(); [PreserveSig] int ReplaceIcon(); [PreserveSig] int SetOverlayImage(); [PreserveSig] int Replace();
    [PreserveSig] int AddMasked(); [PreserveSig] int Draw(); [PreserveSig] int Remove();
    [PreserveSig] int GetIcon(int i, int flags, out IntPtr icon);
  }
  // 탐색기가 보여 주는 48px 아이콘(바로가기 화살표 없이). 0이면 못 뽑은 것
  public static IntPtr Get(string path) {
    var fi = new SHFILEINFO();
    if (SHGetFileInfo(path, 0, ref fi, (uint)Marshal.SizeOf(fi), 0x4000) == IntPtr.Zero) return IntPtr.Zero; // SHGFI_SYSICONINDEX
    var iid = new Guid("46EB5926-582E-4017-9FDF-E8998DAA0950"); IImageList il;
    if (SHGetImageList(2, ref iid, out il) != 0) return IntPtr.Zero; // SHIL_EXTRALARGE = 48px
    IntPtr h; il.GetIcon(fi.iIcon, 1, out h); return h;
  }
}
'@

function Icon-DataUrl([string]$p) {
  $h = [DeskIcon]::Get($p); if ($h -eq [IntPtr]::Zero) { return $null }
  try {
    $bmp = [Drawing.Icon]::FromHandle($h).ToBitmap()
    # 48칸 중 실제로 그려진 곳만 남기기(작은 아이콘이 구석에 붙어 있는 경우)
    $ms = New-Object IO.MemoryStream; $bmp.Save($ms, [Drawing.Imaging.ImageFormat]::Png)
    'data:image/png;base64,' + [Convert]::ToBase64String($ms.ToArray())
  } catch { $null } finally { [DeskIcon]::DestroyIcon($h) | Out-Null }
}

# 실행 기록: 이름이 ROT13로 적혀 있고, 데이터 4~7번째 바이트가 실행 횟수
function Rot13([string]$s) { -join ($s.ToCharArray() | ForEach-Object { $c = [int]$_; if ($c -ge 65 -and $c -le 90) { [char](65 + ($c - 52) % 26) } elseif ($c -ge 97 -and $c -le 122) { [char](97 + ($c - 84) % 26) } else { $_ } }) }
$runs = @{}
try {
  foreach ($k in Get-ChildItem 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\UserAssist' -ErrorAction Stop) {
    $cnt = Join-Path $k.PSPath 'Count'; if (-not (Test-Path $cnt)) { continue }
    $item = Get-Item $cnt
    foreach ($n in $item.GetValueNames()) {
      $v = $item.GetValue($n); if ($v -isnot [byte[]] -or $v.Length -lt 8) { continue }
      $leaf = ((Rot13 $n) -split '[\\/]')[-1].ToLower(); $c = [BitConverter]::ToInt32($v, 4)
      if ($c -gt 0 -and $c -lt 100000) { $runs[$leaf] = [int]$runs[$leaf] + $c }
    }
  }
} catch {}
# 설치한 뒤엔 바탕화면(실행 도우미)으로 앱을 여니까 윈도우 기록이 안 쌓인다 → 도우미가 남긴 횟수(runs.json)도 더한다
$helperRuns = @{}
$rf = Join-Path (Split-Path -Parent $Out) 'runs.json'
if ([IO.File]::Exists($rf)) { try { $helperRuns = [IO.File]::ReadAllText($rf, $utf8) | ConvertFrom-Json } catch {} }

$known =(Get-Content -Raw -Encoding UTF8 (Join-Path $here 'known-apps.json') | ConvertFrom-Json).apps
function Match-Known([string]$text) {
  foreach ($a in $known) {
    foreach ($w in $a.k) {
      $w = $w.ToLower()
      # 짧은 영어 낱말은 낱말 앞에서만 시작(예: 'vroid'는 'vroidstudio'에 걸림), 3글자 이하는 뒤도 끊겨야('obs'가 'obsidian'에 안 걸리게)
      $hit = if ($w -match '^[a-z0-9 .+-]{1,3}$') { $text -match ('(^|[^a-z0-9])' + [regex]::Escape($w) + '([^a-z0-9]|$)') }
             elseif ($w -match '^[a-z0-9 .+-]{4,5}$') { $text -match ('(^|[^a-z0-9])' + [regex]::Escape($w)) }
             else { $text.Contains($w) }
      if ($hit) { return $a }
    }
  }
  $null
}

$wsh = New-Object -ComObject WScript.Shell
$apps = New-Object System.Collections.ArrayList
$seen = @{}; $looseFiles = 0
foreach ($d in $Desktop | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique) {
  # 바탕화면 하나를 못 읽어도(권한·OneDrive 연결 끊김) 나머지는 계속
  try { $files = @(Get-ChildItem -LiteralPath $d -Force -ErrorAction Stop) } catch { Write-Warning "바탕화면 읽기 실패: $d"; continue }
  foreach ($f in $files | Where-Object { -not ($_.Attributes -band [IO.FileAttributes]::Hidden) }) {
    $ext = $f.Extension.ToLower(); $name = if ($f.PSIsContainer) { $f.Name } else { $f.BaseName }
    $isLink = @('.lnk', '.url', '.exe', '.appref-ms', '.bat', '.cmd') -contains $ext
    if (-not $f.PSIsContainer -and -not $isLink) { $looseFiles++; continue }
    if ($seen[$name.ToLower()]) { continue }; $seen[$name.ToLower()] = 1
    $target = ''; $url = ''
    if ($ext -eq '.lnk') { try { $sc = $wsh.CreateShortcut($f.FullName); $target = $sc.TargetPath; if ($sc.Arguments -match 'https?://[^\s"]+') { $url = $Matches[0] } } catch {} }
    if ($ext -eq '.url') { try { $url = ((Get-Content -LiteralPath $f.FullName -Encoding UTF8) -match '^URL=' | Select-Object -First 1) -replace '^URL=', '' } catch {} }
    if ($ext -eq '.exe') { $target = $f.FullName }
    $leaf = if ($target) { ($target -split '[\\/]')[-1].ToLower() } else { '' }
    $hostName = if ($url -match '^\w+://([^/:?#]+)') { $Matches[1].ToLower() -replace '^www\.', '' } else { '' }
    # 이름 → 주소(웹 바로가기·Edge 앱 창) → 실행 파일 이름 순. 폴더 경로 전체는 안 본다(내 폴더 이름에 'claude'가 있다고 클로드가 되면 안 되니까)
    $k = $null
    if (-not $f.PSIsContainer) { foreach ($text in @($name.ToLower(), $hostName, $leaf)) { if ($text -and -not $k) { $k = Match-Known $text } } }
    $count = [int]$runs[$leaf] + [int]$runs[$f.Name.ToLower()] + [int]$helperRuns.($f.FullName)
    $app = [ordered]@{ id = 'a' + $apps.Count; name = $name; group = 'tool'; sub = ''; path = $f.FullName }
    if ($k) { $app.icon = $k.icon; $app.group = $k.group; $app.sub = $k.sub }
    elseif ($f.PSIsContainer) { $app.icon = 'folder'; $app.sub = '폴더' }
    else { $u = Icon-DataUrl $f.FullName; if ($u) { $app.img = $u }; $app.sub = if ($ext -eq '.url') { '웹' } else { '앱' } }
    [void]$apps.Add([pscustomobject]@{ app = $app; count = $count; folder = [bool]$f.PSIsContainer; known = [bool]$k })
  }
}

# 순서 = 밝기 그라데이션: 많이 쓴 앱 5개 1단계, 다음 5개 2단계, 다음 6개 3단계, 나머지는 테두리만
$ranked = @($apps | Where-Object { $_.count -gt 0 } | Sort-Object count -Descending)
$rest = @($apps | Where-Object { $_.count -le 0 } | Sort-Object @{ e = { $_.folder } }, @{ e = { -not $_.known } }, @{ e = { $_.app.name } })
for ($i = 0; $i -lt $ranked.Count; $i++) { if ($i -lt 5) { $ranked[$i].app.tier = 1 } elseif ($i -lt 10) { $ranked[$i].app.tier = 2 } elseif ($i -lt 16) { $ranked[$i].app.tier = 3 } }
# 실행 기록이 하나도 없으면(새 PC 등) 흔한 앱 앞쪽을 2단계로만 살짝
if ($ranked.Count -eq 0) { $j = 0; foreach ($x in $rest) { if ($x.known -and $j -lt 9) { $x.app.tier = if ($j -lt 4) { 2 } else { 3 }; $j++ } } }
$list = @($ranked + $rest | ForEach-Object { $_.app })
# 낱개 파일(사진·문서 등)은 '바탕화면' 칸 하나로 — 누르면 바탕화면 폴더가 열림
$list += [ordered]@{ id = 'desktop'; name = '바탕화면'; group = 'tool'; icon = 'house'; sub = "파일 $looseFiles개"; path = $Desktop[0] }
# id = 경로로 만든 고정 이름. 순서가 바뀌어도 같은 앱은 같은 id라서, 다시 읽는 사이에 엉뚱한 앱이 열리지 않는다
$sha = [Security.Cryptography.SHA1]::Create()
foreach ($a in $list) { if ($a.id -ne 'desktop') { $a.id = 'a' + ([BitConverter]::ToString($sha.ComputeHash($utf8.GetBytes($a.path.ToLowerInvariant()))) -replace '-', '').Substring(0, 10).ToLower() } }

$desk = [ordered]@{ token = $Token; port = $Port; logo = $Logo; rev = ''; apps = $list }
# rev = 앱 목록 지문. 배경 페이지가 도우미에 물어서 달라졌으면 스스로 새로고침(Lively 명령 없이)
$desk.rev = ([BitConverter]::ToString($sha.ComputeHash($utf8.GetBytes(($list | ConvertTo-Json -Depth 6 -Compress)))) -replace '-', '').Substring(0, 12)
$json = $desk | ConvertTo-Json -Depth 6
New-Item -ItemType Directory -Force (Split-Path -Parent $Out) | Out-Null
$tmp = "$Out.tmp"
[IO.File]::WriteAllText($tmp, "// 설치할 때 바탕화면을 읽어 만든 아이콘 목록(바탕화면 다시 읽기.bat로 새로 만듦). 손으로 고쳐도 됨: hidden=true 숨김, tier 1~3 밝기`r`nwindow.DESK=" + $json + ";`r`n", $utf8)
if ([IO.File]::Exists($Out)) { [IO.File]::Replace($tmp, $Out, [NullString]::Value) } else { [IO.File]::Move($tmp, $Out) }
Write-Host ("바탕화면 앱 {0}개 읽음 (흔한 앱 {1}, 진짜 아이콘 {2}, 실행 기록 있는 앱 {3}) → {4}" -f ($list.Count - 1), @($apps | Where-Object known).Count, @($list | Where-Object { $_.img }).Count, $ranked.Count, $Out)
