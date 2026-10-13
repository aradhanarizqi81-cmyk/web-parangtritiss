# scripts/smoke/smoke-mysql.ps1
#
# Uji terima end-to-end terhadap MySQL lokal + `php artisan serve` (Fase 9).
#
# PRASYARAT
#   - Database MySQL lokal `parangtritis` sudah dimigrasi & diseed (akun demo).
#   - Backend berjalan:  php artisan serve --host=127.0.0.1 --port=8000
#
# KONKURENSI
#   Server bawaan `php artisan serve` memproses satu permintaan sekaligus
#   (di Windows `pcntl_fork` tidak tersedia, jadi worker ganda tidak mungkin).
#   Agar dua pindai barcode benar-benar berjalan paralel terhadap database yang
#   sama, jalankan server KEDUA di port lain dan arahkan `-ConcurrentBaseUrl`
#   ke sana:
#     php artisan serve --host=127.0.0.1 --port=8001
#     powershell -File scripts/smoke/smoke-mysql.ps1 `
#       -ConcurrentBaseUrl http://127.0.0.1:8001/api/v1
#   Bila tidak diberikan, pemeriksaan tetap berjalan (berurutan) dan tetap
#   memastikan hanya satu check-in yang sukses.
#
# KEAMANAN & SIFAT
#   - HANYA menambah data baru (booking/transaksi/pengguna uji). Tidak pernah
#     menghapus, mereset, atau menimpa data yang sudah ada.
#   - Aman dijalankan berulang: setiap NIK, email, dan kode uji dibuat unik.
#   - Tidak mencetak token, password, atau NIK mentah.
#
# PEMAKAIAN
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke/smoke-mysql.ps1
#   Keluar dengan kode 1 bila ada pemeriksaan yang FAIL.

param(
  [string]$BaseUrl = 'http://127.0.0.1:8000/api/v1',
  [string]$ConcurrentBaseUrl = '',
  [string]$DemoPassword = 'password'
)

if (-not $ConcurrentBaseUrl) { $ConcurrentBaseUrl = $BaseUrl }

$ErrorActionPreference = 'Stop'
$script:Pass = 0
$script:Fail = 0

function Check {
  param([string]$Name, [bool]$Ok, [string]$Detail = '')
  if ($Ok) {
    $script:Pass++
    Write-Host ("PASS  {0}" -f $Name) -ForegroundColor Green
  } else {
    $script:Fail++
    Write-Host ("FAIL  {0}  {1}" -f $Name, $Detail) -ForegroundColor Red
  }
}

function Invoke-Api {
  param(
    [string]$Method = 'GET',
    [string]$Path,
    $Body = $null,
    [string]$Token = ''
  )
  $headers = @{ Accept = 'application/json' }
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }
  $params = @{ Method = $Method; Uri = "$BaseUrl$Path"; Headers = $headers; ErrorAction = 'Stop' }
  if ($null -ne $Body) {
    $params['Body'] = ($Body | ConvertTo-Json -Depth 12)
    $params['ContentType'] = 'application/json'
  }
  try {
    $response = Invoke-RestMethod @params
    return @{ status = 200; body = $response; raw = ($response | ConvertTo-Json -Depth 12) }
  } catch {
    $status = 0
    $raw = $null
    $resp = $_.Exception.Response
    if ($null -ne $resp) {
      $status = [int]$resp.StatusCode
      try {
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $raw = $reader.ReadToEnd()
      } catch { $raw = $null }
    }
    $parsed = $null
    if ($raw) { try { $parsed = $raw | ConvertFrom-Json } catch { $parsed = $null } }
    return @{ status = $status; body = $parsed; raw = $raw }
  }
}

function Invoke-Download {
  param([string]$Path, [string]$Token = '')
  $headers = @{ Accept = 'text/csv' }
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }
  try {
    $resp = Invoke-WebRequest -Uri "$BaseUrl$Path" -Headers $headers -UseBasicParsing -ErrorAction Stop
    return @{
      status      = 200
      contentType = [string]$resp.Headers['Content-Type']
      disposition = [string]$resp.Headers['Content-Disposition']
      content     = [string]$resp.Content
    }
  } catch {
    $status = 0
    $content = $null
    $resp = $_.Exception.Response
    if ($null -ne $resp) {
      $status = [int]$resp.StatusCode
      try {
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $content = $reader.ReadToEnd()
      } catch { $content = $null }
    }
    return @{ status = $status; contentType = ''; disposition = ''; content = $content }
  }
}

function Login {
  param([string]$Email)
  $result = Invoke-Api -Method Post -Path '/auth/login' -Body @{
    email       = $Email
    password    = $DemoPassword
    device_name = 'smoke-mysql'
  }
  if ($result.status -ne 200) { throw "Login $Email gagal (status $($result.status))" }
  return $result.body.token
}

# Tanggal kunjungan dalam WIB (UTC+7), sesuai VISIT_TIMEZONE default.
$nowWib = (Get-Date).ToUniversalTime().AddHours(7)
$today = $nowWib.ToString('yyyy-MM-dd')
$tomorrow = $nowWib.AddDays(1).ToString('yyyy-MM-dd')
$runId = (Get-Date).ToUniversalTime().ToString('HHmmss')
$suffix = -join ((1..4) | ForEach-Object { [char](Get-Random -Minimum 97 -Maximum 122) })

$nikSeq = 0
function Next-Nik { $script:nikSeq++; return ('3201' + $runId + ('{0:d6}' -f $script:nikSeq)) }

$bookingNikA = Next-Nik
$bookingNikB = Next-Nik

Write-Host "Smoke MySQL (Fase 9) - today(WIB)=$today run=$runId" -ForegroundColor Cyan

# ---------- Preflight ----------
try {
  Invoke-WebRequest -Uri 'http://127.0.0.1:8000/up' -UseBasicParsing -ErrorAction Stop | Out-Null
} catch {
  Write-Host "Server tidak merespons di http://127.0.0.1:8000. Jalankan 'php artisan serve' lebih dulu." -ForegroundColor Yellow
  exit 2
}

$admin = Login 'admin@parangtritis.test'
$cashier = Login 'cashier@parangtritis.test'
$gate = Login 'gate@parangtritis.test'
$visitor = Login 'visitor@parangtritis.test'
Check 'login semua peran demo' ($admin -and $cashier -and $gate -and $visitor)

$tariffs = Invoke-Api -Path '/counter/tariffs' -Token $cashier
$motorId = (@($tariffs.body.data.vehicle_types | Where-Object { $_.code -eq 'motorcycle' }))[0].id
$carId = (@($tariffs.body.data.vehicle_types | Where-Object { $_.code -eq 'car' }))[0].id
Check 'katalog kendaraan terbaca' ($motorId -gt 0 -and $carId -gt 0) "motor=$motorId car=$carId"

# ============================================================
# A. Booking online: registrasi -> booking -> bayar -> cetak -> gerbang
# ============================================================
$newEmail = "smoke-$runId$suffix@example.com"
$register = Invoke-Api -Method Post -Path '/auth/register' -Body @{
  name                  = 'Smoke Wisatawan'
  email                 = $newEmail
  password              = 'password123'
  password_confirmation = 'password123'
}
Check 'register: visitor baru 2xx' ($register.status -ge 200 -and $register.status -lt 300) "status=$($register.status) raw=$($register.raw)"
Check 'register: peran selalu visitor' ($register.body.data.role -eq 'visitor')
Check 'register: token terbit' ([bool]$register.body.token)
$newVisitor = $register.body.token

$registerDup = Invoke-Api -Method Post -Path '/auth/register' -Body @{
  name                  = 'Smoke Wisatawan'
  email                 = $newEmail
  password              = 'password123'
  password_confirmation = 'password123'
}
Check 'register: email duplikat 422' ($registerDup.status -eq 422) "status=$($registerDup.status)"

$me = Invoke-Api -Path '/auth/me' -Token $newVisitor
Check 'profil: token hasil registrasi valid' ($me.status -eq 200 -and $me.body.data.role -eq 'visitor')

$booking = Invoke-Api -Method Post -Path '/bookings' -Token $newVisitor -Body @{
  visit_date          = $today
  client_total_amount = 1
  visitors            = @(
    @{ full_name = 'Smoke Online A'; nik = $bookingNikA },
    @{ full_name = 'Smoke Online B'; nik = $bookingNikB }
  )
  vehicles            = @(
    @{ vehicle_type_id = $motorId; quantity = 2 },
    @{ vehicle_type_id = $carId; quantity = 1 }
  )
}
Check 'booking: buat 2xx' ($booking.status -ge 200 -and $booking.status -lt 300) "status=$($booking.status) raw=$($booking.raw)"
$bookingId = $booking.body.data.id
$bookingCode = $booking.body.data.transaction_code
$bookingBarcode = $booking.body.data.barcode_token
$bookingRef = $booking.body.data.payment.simulation_reference
Check 'booking: total dihitung server (39000)' ([int]$booking.body.data.total_amount -eq 39000) "total=$($booking.body.data.total_amount)"
Check 'booking: belum ada tiket' ((@($booking.body.data.tickets)).Count -eq 0)
Check 'booking: NIK tersamarkan, tanpa nik mentah' (($booking.raw -match '\*') -and (-not ($booking.raw -match '"nik"')))

$payFail = Invoke-Api -Method Post -Path "/bookings/$bookingId/simulate-payment" -Token $newVisitor -Body @{ outcome = 'failure'; reference = $bookingRef }
Check 'booking: simulasi gagal -> pending' (($payFail.status -ge 200 -and $payFail.status -lt 300) -and $payFail.body.data.status -eq 'pending') "status=$($payFail.status)"
Check 'booking: gagal tidak menerbitkan tiket' ((@($payFail.body.data.tickets)).Count -eq 0)

$payOk = Invoke-Api -Method Post -Path "/bookings/$bookingId/simulate-payment" -Token $newVisitor -Body @{ outcome = 'success'; reference = $bookingRef }
Check 'booking: simulasi sukses -> paid' (($payOk.status -ge 200 -and $payOk.status -lt 300) -and $payOk.body.data.status -eq 'paid') "status=$($payOk.status)"
Check 'booking: tiket terbit 1 per pengunjung' ((@($payOk.body.data.tickets)).Count -eq 2)

$payAgain = Invoke-Api -Method Post -Path "/bookings/$bookingId/simulate-payment" -Token $newVisitor -Body @{ outcome = 'success'; reference = $bookingRef }
Check 'booking: kirim ulang sukses -> 409' ($payAgain.status -eq 409) "status=$($payAgain.status)"

$print = Invoke-Api -Method Post -Path "/bookings/$bookingId/print" -Token $newVisitor
Check 'booking: cetak tiket 2xx' ($print.status -ge 200 -and $print.status -lt 300) "status=$($print.status)"

$intruder = Invoke-Api -Path "/bookings/$bookingId" -Token $visitor
Check 'IDOR: visitor lain tidak bisa membaca booking -> 403' ($intruder.status -eq 403) "status=$($intruder.status)"
$intruderPay = Invoke-Api -Method Post -Path "/bookings/$bookingId/simulate-payment" -Token $visitor -Body @{ outcome = 'success'; reference = $bookingRef }
Check 'IDOR: visitor lain tidak bisa membayar booking -> 403' ($intruderPay.status -eq 403) "status=$($intruderPay.status)"

$ciOnline = Invoke-Api -Method Post -Path '/gate/check-in' -Token $gate -Body @{ barcode_token = $bookingBarcode }
Check 'gate: check-in booking online 2xx' ($ciOnline.status -ge 200 -and $ciOnline.status -lt 300) "status=$($ciOnline.status) raw=$($ciOnline.raw)"
Check 'gate: status checked_in' ($ciOnline.body.data.status -eq 'checked_in')
Check 'gate: jumlah hadir = 2' ([int]$ciOnline.body.data.visitor_count -eq 2)
Check 'gate: respons tanpa nik/barcode' ((-not ($ciOnline.raw -match '"nik"')) -and (-not ($ciOnline.raw -match [regex]::Escape($bookingBarcode))))

$ciOnlineAgain = Invoke-Api -Method Post -Path '/gate/check-in' -Token $gate -Body @{ barcode_token = $bookingBarcode }
Check 'gate: check-in ganda -> 409' ($ciOnlineAgain.status -eq 409) "status=$($ciOnlineAgain.status)"

# ============================================================
# B. Transaksi loket + C. Barcode & check-in
# ============================================================
$counter = Invoke-Api -Method Post -Path '/counter/transactions' -Token $cashier -Body @{
  visit_date = $today
  visitors   = @(
    @{ full_name = 'Smoke Loket A'; nik = (Next-Nik) },
    @{ full_name = 'Smoke Loket B'; nik = (Next-Nik) }
  )
  vehicles   = @(@{ vehicle_type_id = $motorId; quantity = 1 })
}
Check 'counter: buat transaksi 2xx' ($counter.status -ge 200 -and $counter.status -lt 300) "status=$($counter.status) raw=$($counter.raw)"
$counterId = $counter.body.data.id
$counterCode = $counter.body.data.transaction_code
$counterBarcode = $counter.body.data.barcode_token
Check 'counter: total dihitung server (32000)' ([int]$counter.body.data.total_amount -eq 32000) "total=$($counter.body.data.total_amount)"

$ciUnpaid = Invoke-Api -Method Post -Path '/gate/check-in' -Token $gate -Body @{ barcode_token = $counterBarcode }
Check 'gate: transaksi belum lunas -> 422' ($ciUnpaid.status -eq 422) "status=$($ciUnpaid.status)"

$confirm = Invoke-Api -Method Post -Path "/counter/transactions/$counterId/confirm-payment" -Token $cashier
Check 'counter: konfirmasi tunai -> paid' (($confirm.status -ge 200 -and $confirm.status -lt 300) -and $confirm.body.data.status -eq 'paid') "status=$($confirm.status)"

$printCounter = Invoke-Api -Method Post -Path "/counter/transactions/$counterId/print" -Token $cashier
Check 'counter: cetak tiket 2xx' ($printCounter.status -ge 200 -and $printCounter.status -lt 300) "status=$($printCounter.status)"

$ciCounter = Invoke-Api -Method Post -Path '/gate/check-in' -Token $gate -Body @{ barcode_token = $counterBarcode }
Check 'gate: check-in loket lunas 2xx' ($ciCounter.status -ge 200 -and $ciCounter.status -lt 300) "status=$($ciCounter.status)"
Check 'gate: sumber counter' ($ciCounter.body.data.source -eq 'counter')

$ciUnknown = Invoke-Api -Method Post -Path '/gate/check-in' -Token $gate -Body @{ barcode_token = 'unknown-token-000000000000000000000000000000' }
Check 'gate: token tak dikenal -> 404' ($ciUnknown.status -eq 404) "status=$($ciUnknown.status)"
Check 'gate: 404 tanpa data transaksi' ($null -eq $ciUnknown.body.data)

$ciFuture = Invoke-Api -Method Post -Path '/counter/transactions' -Token $cashier -Body @{
  visit_date = $tomorrow
  visitors   = @(@{ full_name = 'Smoke Besok'; nik = (Next-Nik) })
}
Invoke-Api -Method Post -Path "/counter/transactions/$($ciFuture.body.data.id)/confirm-payment" -Token $cashier | Out-Null
$ciFutureScan = Invoke-Api -Method Post -Path '/gate/check-in' -Token $gate -Body @{ barcode_token = $ciFuture.body.data.barcode_token }
Check 'gate: tanggal bukan hari kunjungan -> 422' ($ciFutureScan.status -eq 422) "status=$($ciFutureScan.status)"

# ---------- Konkurensi nyata (row lock + unique di MySQL) ----------
$race = Invoke-Api -Method Post -Path '/counter/transactions' -Token $cashier -Body @{
  visit_date = $today
  visitors   = @(
    @{ full_name = 'Smoke Race A'; nik = (Next-Nik) },
    @{ full_name = 'Smoke Race B'; nik = (Next-Nik) }
  )
}
Invoke-Api -Method Post -Path "/counter/transactions/$($race.body.data.id)/confirm-payment" -Token $cashier | Out-Null
$raceBarcode = $race.body.data.barcode_token
$checkinUrl = "$BaseUrl/gate/check-in"
$checkinUrl2 = "$ConcurrentBaseUrl/gate/check-in"

$job = {
  param($Url, $Token, $Barcode)
  $headers = @{ Accept = 'application/json'; Authorization = "Bearer $Token" }
  $body = @{ barcode_token = $Barcode } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method Post -Uri $Url -Headers $headers -ContentType 'application/json' -Body $body -ErrorAction Stop | Out-Null
    return 201
  } catch {
    if ($null -ne $_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
    return 0
  }
}

$j1 = Start-Job -ScriptBlock $job -ArgumentList $checkinUrl, $gate, $raceBarcode
$j2 = Start-Job -ScriptBlock $job -ArgumentList $checkinUrl2, $gate, $raceBarcode
Wait-Job $j1, $j2 | Out-Null
$r1 = Receive-Job $j1
$r2 = Receive-Job $j2
Remove-Job $j1, $j2 -Force
$codes = @($r1, $r2) | Sort-Object
Check 'konkurensi: tepat satu check-in sukses' ($codes[0] -eq 201 -and $codes[1] -eq 409) "hasil=$r1,$r2"

$raceAfter = Invoke-Api -Method Post -Path '/gate/check-in' -Token $gate -Body @{ barcode_token = $raceBarcode }
Check 'konkurensi: pindai ketiga -> 409' ($raceAfter.status -eq 409) "status=$($raceAfter.status)"

# ============================================================
# E. Hak akses & keamanan
# ============================================================
$dashAnon = Invoke-Api -Path "/admin/dashboard?date_from=$today&date_to=$today"
Check 'akses: dashboard anonim -> 401' ($dashAnon.status -eq 401) "status=$($dashAnon.status)"
foreach ($role in @(
    @{ name = 'visitor'; token = $visitor },
    @{ name = 'cashier'; token = $cashier },
    @{ name = 'gate_staff'; token = $gate }
  )) {
  $denied = Invoke-Api -Path "/admin/dashboard?date_from=$today&date_to=$today" -Token $role.token
  Check "akses: dashboard $($role.name) -> 403" ($denied.status -eq 403) "status=$($denied.status)"
}

$ciVisitor = Invoke-Api -Method Post -Path '/gate/check-in' -Token $visitor -Body @{ barcode_token = $counterBarcode }
Check 'akses: visitor tidak boleh check-in -> 403' ($ciVisitor.status -eq 403) "status=$($ciVisitor.status)"
$ciCashier = Invoke-Api -Method Post -Path '/gate/check-in' -Token $cashier -Body @{ barcode_token = $counterBarcode }
Check 'akses: cashier tidak boleh check-in -> 403' ($ciCashier.status -eq 403) "status=$($ciCashier.status)"

# ============================================================
# D. Dashboard & laporan
# ============================================================
$range = "date_from=$today&date_to=$today"

$dash = Invoke-Api -Path "/admin/dashboard?$range" -Token $admin
Check 'dashboard: admin 200' ($dash.status -eq 200) "status=$($dash.status)"
Check 'dashboard: periode berakhir hari ini' ($dash.body.data.period.date_to -eq $today)
Check 'dashboard: transaksi >= 2' ([int]$dash.body.data.transactions.total -ge 2) "total=$($dash.body.data.transactions.total)"
Check 'dashboard: wisatawan terdaftar >= 2' ([int]$dash.body.data.visitors.registered -ge 2) "reg=$($dash.body.data.visitors.registered)"
Check 'dashboard: pengunjung hadir >= 2' ([int]$dash.body.data.visitors.checked_in -ge 2) "in=$($dash.body.data.visitors.checked_in)"
Check 'dashboard: pendapatan > 0' ([int]$dash.body.data.revenue.total -gt 0) "rev=$($dash.body.data.revenue.total)"
Check 'dashboard: basis pendapatan paid_at' ($dash.body.data.revenue.basis -eq 'paid_at')
Check 'dashboard: basis transaksi created_at' ($dash.body.data.transactions.basis -eq 'created_at')

$visits = Invoke-Api -Path "/admin/reports/visits?$range" -Token $admin
Check 'visits: admin 200' ($visits.status -eq 200) "status=$($visits.status)"
Check 'visits: ringkasan terdaftar >= 2' ([int]$visits.body.summary.registered_visitors -ge 2) "reg=$($visits.body.summary.registered_visitors)"
Check 'visits: ringkasan hadir >= 2' ([int]$visits.body.summary.checked_in_visitors -ge 2) "in=$($visits.body.summary.checked_in_visitors)"
$visitRow = (@($visits.body.data | Where-Object { $_.transaction_code -eq $counterCode }))[0]
Check 'visits: baris counter muncul & checked_in' ($null -ne $visitRow -and $visitRow.checked_in -eq $true)

$visitsChecked = Invoke-Api -Path "/admin/reports/visits?$range&checked_in=true" -Token $admin
$notChecked = @($visitsChecked.body.data | Where-Object { -not $_.checked_in })
Check 'visits: filter checked_in=true konsisten' (($visitsChecked.status -eq 200) -and ($notChecked.Count -eq 0)) "bad=$($notChecked.Count)"

$txReport = Invoke-Api -Path "/admin/reports/transactions?$range" -Token $admin
Check 'transactions: admin 200' ($txReport.status -eq 200) "status=$($txReport.status)"
Check 'transactions: pendapatan > 0 & basis paid_at' (([int]$txReport.body.summary.revenue.total -gt 0) -and ($txReport.body.summary.revenue.basis -eq 'paid_at'))

$txSuccess = Invoke-Api -Path "/admin/reports/transactions?$range&payment_status=success" -Token $admin
$notSuccess = @($txSuccess.body.data | Where-Object { -not $_.payment -or $_.payment.status -ne 'success' })
Check 'transactions: filter payment_status=success konsisten' (($txSuccess.status -eq 200) -and ($notSuccess.Count -eq 0)) "bad=$($notSuccess.Count)"

$vehicles = Invoke-Api -Path "/admin/reports/vehicles?$range" -Token $admin
Check 'vehicles: admin 200 & semua jenis tampil' (($vehicles.status -eq 200) -and ((@($vehicles.body.data)).Count -eq 3))

$identities = Invoke-Api -Path "/admin/reports/identities?$range" -Token $admin
Check 'identities: admin 200' ($identities.status -eq 200) "status=$($identities.status)"
Check 'identities: tanpa kunci nik mentah' (-not ($identities.raw -match '"nik"'))
Check 'identities: NIK uji tidak bocor' (-not ($identities.raw -match [regex]::Escape($bookingNikA)))
$unmasked = @($identities.body.data | Where-Object { $_.masked_nik -notmatch '\*' })
Check 'identities: semua NIK tersamarkan' ($unmasked.Count -eq 0) "bad=$($unmasked.Count)"

# ---------- Ekspor CSV ----------
$visitsCsv = Invoke-Download -Path "/admin/reports/visits/export?$range" -Token $admin
Check 'export kunjungan: 200 csv lampiran' (($visitsCsv.status -eq 200) -and ($visitsCsv.contentType -match 'text/csv') -and ($visitsCsv.disposition -match 'attachment')) "status=$($visitsCsv.status)"
Check 'export kunjungan: memuat baris counter' ($visitsCsv.content -match [regex]::Escape($counterCode))

$idCsv = Invoke-Download -Path "/admin/reports/identities/export?$range" -Token $admin
Check 'export identitas: 200 csv' (($idCsv.status -eq 200) -and ($idCsv.contentType -match 'text/csv')) "status=$($idCsv.status)"
Check 'export identitas: tanpa NIK mentah' ((-not ($idCsv.content -match [regex]::Escape($bookingNikA))) -and ($idCsv.content -match '\*'))

$anonCsv = Invoke-Download -Path "/admin/reports/visits/export?$range"
Check 'export: anonim -> 401' ($anonCsv.status -eq 401) "status=$($anonCsv.status)"
$visitorCsv = Invoke-Download -Path "/admin/reports/visits/export?$range" -Token $visitor
Check 'export: visitor -> 403' ($visitorCsv.status -eq 403) "status=$($visitorCsv.status)"

# ---------- Validasi rentang & paginasi ----------
$reversed = Invoke-Api -Path "/admin/reports/visits?date_from=$today&date_to=2020-01-01" -Token $admin
Check 'validasi: rentang terbalik -> 422' ($reversed.status -eq 422) "status=$($reversed.status)"

$spanFrom = $nowWib.AddDays(-400).ToString('yyyy-MM-dd')
$tooLong = Invoke-Api -Path "/admin/reports/visits?date_from=$spanFrom&date_to=$today" -Token $admin
Check 'validasi: rentang > 366 hari -> 422' ($tooLong.status -eq 422) "status=$($tooLong.status)"

$tooMany = Invoke-Api -Path "/admin/reports/visits?$range&per_page=101" -Token $admin
Check 'validasi: per_page > 100 -> 422' ($tooMany.status -eq 422) "status=$($tooMany.status)"

$paged = Invoke-Api -Path "/admin/reports/visits?$range&per_page=1&page=1" -Token $admin
Check 'paginasi: per_page=1 diterapkan' (($paged.status -eq 200) -and ([int]$paged.body.meta.per_page -eq 1)) "per_page=$($paged.body.meta.per_page)"

Write-Host ""
Write-Host ("HASIL: {0} PASS, {1} FAIL" -f $script:Pass, $script:Fail) -ForegroundColor Cyan
if ($script:Fail -gt 0) { exit 1 }
