$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$project = Join-Path $repoRoot "unreal\ThreeBWorld\ThreeBWorld.uproject"
$builder = Join-Path $repoRoot "unreal\ThreeBWorld\Scripts\build_hub3b_main_v5.py"
$initScript = Join-Path $repoRoot "unreal\ThreeBWorld\Content\Python\init_unreal.py"

function Fail([string]$message) {
    Write-Host ""
    Write-Host "ERREUR : $message" -ForegroundColor Red
    Write-Host ""
    exit 1
}

if (-not (Test-Path $project)) {
    Fail "ThreeBWorld.uproject est introuvable. Le ZIP doit etre extrait completement."
}
if (-not (Test-Path $builder)) {
    Fail "Le constructeur Hub 3B est introuvable. Telecharge la version main la plus recente."
}
if (-not (Test-Path $initScript)) {
    Fail "Le lanceur automatique Unreal est introuvable. Telecharge la version main la plus recente."
}

$running = Get-Process -Name "UnrealEditor" -ErrorAction SilentlyContinue
if ($running) {
    Fail "Unreal Engine est deja ouvert. Ferme Unreal, puis double-clique de nouveau sur LANCER_HUB_3B.bat."
}

$candidates = New-Object System.Collections.Generic.List[string]

$registryPaths = @(
    "HKLM:\SOFTWARE\EpicGames\Unreal Engine\5.8",
    "HKLM:\SOFTWARE\WOW6432Node\EpicGames\Unreal Engine\5.8"
)

foreach ($regPath in $registryPaths) {
    try {
        if (Test-Path $regPath) {
            $installed = (Get-ItemProperty $regPath -ErrorAction Stop).InstalledDirectory
            if ($installed) {
                $candidates.Add((Join-Path $installed "Engine\Binaries\Win64\UnrealEditor.exe"))
            }
        }
    } catch {}
}

if ($env:ProgramFiles) {
    $candidates.Add((Join-Path $env:ProgramFiles "Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe"))
}

foreach ($drive in (Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue)) {
    $root = $drive.Root
    if (-not $root) { continue }
    $candidates.Add((Join-Path $root "Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe"))
    $candidates.Add((Join-Path $root "Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe"))
}

$editor = $candidates |
    Select-Object -Unique |
    Where-Object { Test-Path $_ } |
    Select-Object -First 1

if (-not $editor) {
    Fail "Unreal Engine 5.8 n'a pas ete trouve automatiquement. Ouvre Epic Games Launcher et verifie que UE 5.8 est installe."
}

Write-Host "Projet : $project" -ForegroundColor Cyan
Write-Host "Unreal : $editor" -ForegroundColor Cyan
Write-Host ""
Write-Host "Unreal va s'ouvrir. La Cité des Huit Héritages V5 avec 10 quartiers et 8 Portes dispersées sera construite automatiquement." -ForegroundColor Green
Write-Host "Ne clique sur rien pendant le chargement initial." -ForegroundColor Yellow
Write-Host ""

$arguments = @(
    ('"' + $project + '"'),
    "-3BHubV5AutoBuild"
)

Start-Process -FilePath $editor -ArgumentList $arguments -WorkingDirectory (Split-Path $project -Parent)
exit 0
