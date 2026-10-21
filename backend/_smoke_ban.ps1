$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:8000/api/v1"
function Call($method, $path, $token, $bodyObj) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  $params = @{ Method=$method; Uri="$base$path"; Headers=$headers; ContentType="application/json; charset=utf-8" }
  if ($null -ne $bodyObj) { $params["Body"] = ($bodyObj | ConvertTo-Json -Depth 8 -Compress) }
  try { $resp = Invoke-RestMethod @params; return @{ code=200; data=$resp } }
  catch { $code=$null; if ($_.Exception.Response){$code=[int]$_.Exception.Response.StatusCode}; return @{ code=$code; error=$_.ErrorDetails.Message } }
}

$admin = Call POST /auth/login $null @{email="admin@kongzi.local";password="Kongzi@2026"}
$at = $admin.data.token

# temp user
$uname = "bancheck_" + (Get-Random) + "@example.com"
$nu = Call POST /auth/register $null @{email=$uname;password="Test123456";display_name="bancheck"}
$nt = $nu.data.token; $nuid = $nu.data.user.id

$before = Call GET /auth/me $nt
Write-Host ("me before ban -> " + $before.code + " (expect 200)")

$b = Call PATCH ("/admin/users/" + $nuid) $at @{is_banned=$true}
Write-Host ("ban -> " + $b.code)

$after = Call GET /auth/me $nt
Write-Host ("me after ban -> " + $after.code + " " + $after.error + " (expect 403)")

# cleanup: unban then delete user; reset smoke settings
$u = Call PATCH ("/admin/users/" + $nuid) $at @{is_banned=$false}
$d = Call DELETE ("/admin/users/" + $nuid) $at
Write-Host ("cleanup user -> " + $d.code)
$s = Call PUT /admin/settings $at @{values=@{banner="";featureFlags=@{};siteMode=""}}
Write-Host ("reset settings -> " + $s.code)
Write-Host "DONE"
