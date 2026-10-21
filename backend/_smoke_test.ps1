$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:8000/api/v1"

function Call($method, $path, $token, $bodyObj) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  $params = @{ Method=$method; Uri="$base$path"; Headers=$headers; ContentType="application/json; charset=utf-8" }
  if ($null -ne $bodyObj) { $params["Body"] = ($bodyObj | ConvertTo-Json -Depth 8 -Compress) }
  try {
    $resp = Invoke-RestMethod @params
    return @{ code=200; data=$resp }
  } catch {
    $code = $null
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    return @{ code=$code; error=$_.ErrorDetails.Message }
  }
}

Write-Host "== 1) login admin =="
$admin = Call POST /auth/login $null @{email="admin@kongzi.local";password="Kongzi@2026"}
Write-Host ("login code=" + $admin.code)
$at = $admin.data.token
$aid = $admin.data.user.id
Write-Host ("admin id=" + $aid + " is_admin=" + $admin.data.user.is_admin)

Write-Host "== 2) register normal user =="
$uname = "tester_" + (Get-Random) + "@example.com"
$nu = Call POST /auth/register $null @{email=$uname;password="Test123456";display_name="tester"}
$nt = $nu.data.token
$nuid = $nu.data.user.id
Write-Host ("register code=" + $nu.code + " normal uid=" + $nuid)

Write-Host "== 3) auth matrix =="
$r1 = Call GET /admin/dashboard $null
Write-Host ("no token -> " + $r1.code + " (expect 401)")
$r2 = Call GET /admin/dashboard $nt
Write-Host ("normal user -> " + $r2.code + " (expect 403)")
$r3 = Call GET /admin/dashboard $at
Write-Host ("admin -> " + $r3.code + " (expect 200)")
$r4 = Call GET "/admin/dashboard?days=7" $at
Write-Host ("admin days=7 -> " + $r4.code + " new_7d=" + $r4.data.users.new_7d + " (expect 200)")
$r5 = Call GET "/admin/dashboard?days=90" $at
Write-Host ("admin days=90 -> " + $r5.code + " (expect 200)")

Write-Host "== 4) self-protection =="
$s1 = Call PATCH ("/admin/users/" + $aid) $at @{is_admin=$false}
Write-Host ("self-degrade -> " + $s1.code + " " + $s1.error + " (expect 400)")
$s2 = Call DELETE ("/admin/users/" + $aid) $at
Write-Host ("self-delete -> " + $s2.code + " " + $s2.error + " (expect 400)")

Write-Host "== 5) user patch/ban roundtrip =="
$u1 = Call PATCH ("/admin/users/" + $nuid) $at @{display_name="renamed";is_banned=$true}
Write-Host ("patch+ban -> " + $u1.code + " is_banned=" + $u1.data.is_banned)
$u2 = Call PATCH ("/admin/users/" + $nuid) $at @{is_banned=$false}
Write-Host ("unban -> " + $u2.code + " is_banned=" + $u2.data.is_banned)
$u3 = Call GET ("/admin/users/" + $nuid + "/activity") $at
Write-Host ("activity -> " + $u3.code + " total_events=" + $u3.data.total_events)
$u4 = Call GET "/admin/users/export.csv" $at
Write-Host ("export.csv -> " + $u4.code + " (expect 200)")

Write-Host "== 6) content CRUD roundtrip (book) =="
$c1 = Call POST /admin/books $at @{id="zz_smoke_book";title_zh="Smoke Book";era="test";is_published=$true;meta=@{source="smoke"}}
Write-Host ("create book -> " + $c1.code + " id=" + $c1.data.id)
$c2 = Call GET /admin/books $at
$found = ($c2.data | Where-Object { $_.id -eq "zz_smoke_book" })
Write-Host ("list contains book -> " + [bool]$found)
$c3 = Call PATCH /admin/books/zz_smoke_book $at @{title_zh="Smoke Book v2"}
Write-Host ("patch book -> " + $c3.code + " title=" + $c3.data.title_zh)
$c4 = Call DELETE /admin/books/zz_smoke_book $at
Write-Host ("delete book -> " + $c4.code)
$c5 = Call GET /admin/books $at
$gone = -not ($c5.data | Where-Object { $_.id -eq "zz_smoke_book" })
Write-Host ("book gone after delete -> " + $gone)

Write-Host "== 7) settings + audit =="
$g1 = Call PUT /admin/settings $at @{values=@{banner="smoke banner";feature_flags=@{new_game=$true};site_mode="demo"}}
Write-Host ("put settings -> " + $g1.code)
$g2 = Call GET /admin/settings $at
Write-Host ("get settings -> " + $g2.code + " banner=" + $g2.data.banner)
$g3 = Call GET /admin/audit-log $at
Write-Host ("audit-log -> " + $g3.code + " total=" + $g3.data.total + " latest=" + $g3.data.items[0].action + "/" + $g3.data.items[0].target_type)

Write-Host "== 8) games list =="
$g4 = Call GET "/admin/games/rounds?game=math&page=1" $at
Write-Host ("game rounds math -> " + $g4.code + " total=" + $g4.data.total)

Write-Host "== cleanup: delete normal test user =="
$cl = Call DELETE ("/admin/users/" + $nuid) $at
Write-Host ("delete test user -> " + $cl.code)

Write-Host "== DONE =="
