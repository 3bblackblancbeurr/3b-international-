[CmdletBinding()]
param(
    [string]$EngineRoot = $env:UE58_ROOT,
    [ValidateSet("Prepare", "Validate", "WorldPartition", "Full")]
    [string]$Mode = "Prepare",
    [switch]$ForceDedicatedServer
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = (Resolve-Path (Join-Path $ScriptDir "..")).Path
$Project = Join-Path $ProjectDir "ThreeBWorld.uproject"
$Map = "/Game/3B/World/France/Maps/L_France_OpenWorld"
$PrepareScript = Join-Path $ProjectDir "Scripts\prepare_france_goldmaster.py"
$GateScript = Join-Path $ProjectDir "Scripts\france_goldmaster_gate.py"
$SavedRoot = Join-Path $ProjectDir "Saved\3B\FranceGoldMaster"
$EvidenceDir = Join-Path $SavedRoot "Evidence"
$LogDir = Join-Path $SavedRoot "Logs"

New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Resolve-UE58Root {
    param([string]$Requested)

    $Candidates = @()
    if ($Requested) { $Candidates += $Requested }
    if ($env:UE58_ROOT) { $Candidates += $env:UE58_ROOT }
    $Candidates += "C:\Program Files\Epic Games\UE_5.8"
    $Candidates += "D:\Program Files\Epic Games\UE_5.8"
    $Candidates += "D:\Epic Games\UE_5.8"

    foreach ($Candidate in ($Candidates | Select-Object -Unique)) {
        if (-not $Candidate) { continue }
        $EditorCmd = Join-Path $Candidate "Engine\Binaries\Win64\UnrealEditor-Cmd.exe"
        $BuildBat = Join-Path $Candidate "Engine\Build\BatchFiles\Build.bat"
        if ((Test-Path $EditorCmd) -and (Test-Path $BuildBat)) {
            return (Resolve-Path $Candidate).Path
        }
    }

    throw "Unreal Engine 5.8 introuvable. Definis UE58_ROOT ou passe -EngineRoot."
}

function Write-Evidence {
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][ValidateSet("PASS","FAIL")][string]$Status,
        [Parameter(Mandatory=$true)][string]$Kind,
        [hashtable]$Details = @{}
    )

    $Payload = [ordered]@{
        schema_version = "1.0.0"
        status = $Status
        engine = "5.8"
        map = $Map
        proof_type = $Kind
        generated_at_utc = [DateTime]::UtcNow.ToString("o")
        machine = $env:COMPUTERNAME
        details = $Details
    }

    $Path = Join-Path $EvidenceDir $Name
    $Payload | ConvertTo-Json -Depth 12 | Set-Content -Path $Path -Encoding UTF8
    Write-Host "[3B France] evidence -> $Path ($Status)"
}

function Invoke-Logged {
    param(
        [Parameter(Mandatory=$true)][string]$Label,
        [Parameter(Mandatory=$true)][string]$Exe,
        [Parameter(Mandatory=$true)][string[]]$Arguments,
        [Parameter(Mandatory=$true)][string]$LogName
    )

    $LogPath = Join-Path $LogDir $LogName
    Write-Host ""
    Write-Host "=== $Label ==="
    Write-Host "$Exe $($Arguments -join ' ')"

    & $Exe @Arguments 2>&1 | Tee-Object -FilePath $LogPath
    $Exit = $LASTEXITCODE
    if ($Exit -ne 0) {
        throw "$Label failed with exit code $Exit. Log: $LogPath"
    }
    return $LogPath
}

function Test-EvidencePass {
    param([string]$Name)

    $Path = Join-Path $EvidenceDir $Name
    if (-not (Test-Path $Path)) { return $false }
    try {
        $Payload = Get-Content $Path -Raw | ConvertFrom-Json
        return ($Payload.status -eq "PASS")
    } catch {
        return $false
    }
}

function Assert-FinalArtEvidenceForPartitionBuild {
    $Required = @(
        "final_nanite_geometry.json",
        "final_underside_caverns.json",
        "final_architecture.json",
        "final_vegetation.json",
        "water_system.json"
    )

    $Missing = @()
    foreach ($Name in $Required) {
        if (-not (Test-EvidencePass $Name)) { $Missing += $Name }
    }

    if ($Missing.Count -gt 0) {
        throw "Refus HLOD/Nav final: preuves AAA manquantes: $($Missing -join ', ')."
    }
}

$EngineRoot = Resolve-UE58Root $EngineRoot
$EditorExe = Join-Path $EngineRoot "Engine\Binaries\Win64\UnrealEditor.exe"
$EditorCmd = Join-Path $EngineRoot "Engine\Binaries\Win64\UnrealEditor-Cmd.exe"
$BuildBat = Join-Path $EngineRoot "Engine\Build\BatchFiles\Build.bat"
$InstalledBuildMarker = Join-Path $EngineRoot "Engine\Build\InstalledBuild.txt"

Write-Host "[3B France] EngineRoot=$EngineRoot"
Write-Host "[3B France] Project=$Project"
Write-Host "[3B France] Mode=$Mode"

if (-not (Test-Path $Project)) { throw "Projet introuvable: $Project" }
if (-not (Test-Path $PrepareScript)) { throw "Script introuvable: $PrepareScript" }
if (-not (Test-Path $GateScript)) { throw "Script introuvable: $GateScript" }

$CompileLogs = @{}
try {
    $CompileLogs.Editor = Invoke-Logged -Label "Compile ThreeBWorldEditor Win64 Development" -Exe $BuildBat -Arguments @("ThreeBWorldEditor","Win64","Development","-Project=$Project","-WaitMutex","-NoHotReloadFromIDE") -LogName "compile-editor.log"
    $CompileLogs.Client = Invoke-Logged -Label "Compile ThreeBWorldClient Win64 Development" -Exe $BuildBat -Arguments @("ThreeBWorldClient","Win64","Development","-Project=$Project","-WaitMutex") -LogName "compile-client.log"

    $CanBuildServer = $ForceDedicatedServer -or -not (Test-Path $InstalledBuildMarker)
    if ($CanBuildServer) {
        $CompileLogs.Server = Invoke-Logged -Label "Compile ThreeBWorldServer Win64 Development" -Exe $BuildBat -Arguments @("ThreeBWorldServer","Win64","Development","-Project=$Project","-WaitMutex") -LogName "compile-server.log"
        Write-Evidence -Name "compile.json" -Status "PASS" -Kind "compile_log" -Details @{ targets = @("ThreeBWorldEditor","ThreeBWorldClient","ThreeBWorldServer"); logs = $CompileLogs }
    } else {
        Write-Host "[3B France] Build Unreal installee detectee: le serveur dedie reste non valide."
        $Partial = [ordered]@{
            schema_version = "1.0.0"
            status = "PREPARED"
            engine = "5.8"
            generated_at_utc = [DateTime]::UtcNow.ToString("o")
            targets = @("ThreeBWorldEditor","ThreeBWorldClient")
            missing_target = "ThreeBWorldServer"
            reason = "Installed Engine build detected; dedicated-server validation requires a server-capable/source UE build."
            logs = $CompileLogs
        }
        $Partial | ConvertTo-Json -Depth 12 | Set-Content -Path (Join-Path $EvidenceDir "compile_partial.json") -Encoding UTF8
        Remove-Item (Join-Path $EvidenceDir "compile.json") -ErrorAction SilentlyContinue
    }
} catch {
    Write-Evidence -Name "compile.json" -Status "FAIL" -Kind "compile_log" -Details @{ error = $_.Exception.Message }
    throw
}

if ($Mode -in @("Prepare","Full")) {
    Invoke-Logged -Label "France Editor preparation" -Exe $EditorCmd -Arguments @($Project,$Map,"-ExecutePythonScript=$PrepareScript","-Unattended","-NoSplash","-NoP4") -LogName "prepare-france.log" | Out-Null
}

if ($Mode -in @("WorldPartition","Full")) {
    Assert-FinalArtEvidenceForPartitionBuild

    try {
        $HlodLog = Invoke-Logged -Label "Build World Partition HLOD" -Exe $EditorExe -Arguments @($Project,$Map,"-run=WorldPartitionBuilderCommandlet","-AllowCommandletRendering","-Builder=WorldPartitionHLODsBuilder","-SetupHLODs","-BuildHLODs","-SCCProvider=None","-Unattended") -LogName "world-partition-hlod.log"
        Write-Evidence -Name "hlod.json" -Status "PASS" -Kind "world_partition_commandlet" -Details @{ log = $HlodLog; builder = "WorldPartitionHLODsBuilder" }
    } catch {
        Write-Evidence -Name "hlod.json" -Status "FAIL" -Kind "world_partition_commandlet" -Details @{ error = $_.Exception.Message }
        throw
    }

    try {
        $NavLog = Invoke-Logged -Label "Build World Partition navigation" -Exe $EditorExe -Arguments @($Project,$Map,"-run=WorldPartitionBuilderCommandlet","-AllowCommandletRendering","-Builder=WorldPartitionNavigationDataBuilder","-SCCProvider=None","-Unattended") -LogName "world-partition-navigation.log"
        Write-Evidence -Name "navigation.json" -Status "PASS" -Kind "navigation_capture" -Details @{ log = $NavLog; builder = "WorldPartitionNavigationDataBuilder" }
        Write-Evidence -Name "world_partition.json" -Status "PASS" -Kind "world_partition_commandlet" -Details @{ hlod_log = $HlodLog; navigation_log = $NavLog }
    } catch {
        Write-Evidence -Name "navigation.json" -Status "FAIL" -Kind "navigation_capture" -Details @{ error = $_.Exception.Message }
        Write-Evidence -Name "world_partition.json" -Status "FAIL" -Kind "world_partition_commandlet" -Details @{ error = $_.Exception.Message }
        throw
    }
}

$GateLog = Join-Path $LogDir "goldmaster-gate.log"
Write-Host ""
Write-Host "=== France Gold Master strict gate ==="
& $EditorCmd @($Project,$Map,"-ExecutePythonScript=$GateScript","-Unattended","-NoSplash","-NoP4") 2>&1 | Tee-Object -FilePath $GateLog
$GateExit = $LASTEXITCODE

if ($GateExit -ne 0) {
    Write-Host "[3B France] NOT GOLD MASTER. Rapport: $SavedRoot\france_goldmaster_report.json"
    exit $GateExit
}

Write-Host "[3B France] Tous les gates requis ont des preuves PASS."
exit 0
