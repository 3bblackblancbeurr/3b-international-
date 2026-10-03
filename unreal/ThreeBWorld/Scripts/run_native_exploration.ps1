param(
    [ValidateSet('Build', 'Test', 'Play')][string]$Mode = 'Play',
    [string]$EngineRoot = 'C:\Program Files\Epic Games\UE_5.8'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$project = Join-Path $projectRoot 'ThreeBWorld.uproject'
$editor = Join-Path $EngineRoot 'Engine\Binaries\Win64\UnrealEditor.exe'
$commandlet = Join-Path $EngineRoot 'Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
$build = Join-Path $EngineRoot 'Engine\Build\BatchFiles\Build.bat'
$hub = '/Game/3binternational/Maps/Hub3B_Main_V05'
if (-not (Test-Path -LiteralPath $editor)) { throw 'Unreal Engine 5.8 introuvable. Indiquer -EngineRoot.' }
if ($Mode -eq 'Build') {
    & $build ThreeBWorldEditor Win64 Development "-Project=$project" -WaitMutex -NoHotReloadFromIDE
    if ($LASTEXITCODE -ne 0) { throw 'Compilation native echouee.' }
    & $commandlet $project -run=pythonscript "-script=$(Join-Path $PSScriptRoot 'build_native_exploration.py')" -nullrhi -unattended -nosplash -nop4 -NoSound
    if ($LASTEXITCODE -ne 0) { throw 'Construction des cartes echouee.' }
    $report = Get-Content -LiteralPath (Join-Path $projectRoot 'Saved\Validation\native-exploration.json') -Raw | ConvertFrom-Json
    if ($report.status -ne 'PASS') { throw 'Les cartes natives ne sont pas validees.' }
    Write-Output 'Cartes natives Hub et France construites et enregistrees.'
    exit 0
}
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'Binaries\Win64\UnrealEditor-ThreeBWorld.dll'))) {
    throw 'Compiler le projet avec -Mode Build avant de jouer.'
}
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'Content\3binternational\Maps\Hub3B_Main_V05.umap'))) {
    throw 'Construire les cartes avec -Mode Build avant de jouer.'
}
if ($Mode -eq 'Test') {
    & $commandlet $project $hub -game -nullrhi -unattended -nosplash -nop4 -NoSound -ThreeBExplorationSmoke
    if ($LASTEXITCODE -ne 0) { throw 'Le test aller-retour natif a echoue.' }
    Get-Content -LiteralPath (Join-Path $projectRoot 'Saved\Validation\native-exploration-runtime.json')
    exit 0
}
# Play is intentionally an interactive game window, launched by the user.
& $editor $project $hub -game -windowed -ResX=1600 -ResY=900 -nosplash -nop4
