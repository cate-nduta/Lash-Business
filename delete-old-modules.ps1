Set-Location "c:\Users\ADMIN\Lash Website"
$folders = @('module-2','module-3','module-4','module-5','module-6','module-7','module-8','module-9','module-10','module-11','module-12','module-13','module-14','module-15','module-16')
foreach ($f in $folders) {
    $path = Join-Path 'course-content' $f
    if (Test-Path $path) {
        Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Deleted $path"
    }
}




