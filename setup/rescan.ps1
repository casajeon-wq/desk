# 바탕화면 다시 읽기 — 새로 깐 앱·지운 앱을 배경 아이콘에 반영한다.
# -Login: 컴퓨터 켤 때(start-helper.vbs) 조용히 돌리는 것.
# 배경은 Lively 명령 없이 스스로 새로고침한다(배경 페이지가 도우미에 앱 목록 지문을 물어봄).
param([switch]$Login)
$ErrorActionPreference = 'Stop'
. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'common.ps1')
$lock = Lock-Desk
$changed = Update-Apps
if (-not $Login) { Write-Host ''; Write-Host $(if ($changed) { '  배경에 반영했어요! (몇 초 안에 바뀌어요)' } else { '  바뀐 게 없어요' }) -ForegroundColor Green }
# 새로 생긴 바로가기도 원래 바탕화면에선 숨김 유지 (설치 때 숨긴 경우만)
if ([IO.File]::Exists((Join-Path $Root 'icons-hidden-by-us.txt'))) { [void][DeskIcons]::Set($false) }
