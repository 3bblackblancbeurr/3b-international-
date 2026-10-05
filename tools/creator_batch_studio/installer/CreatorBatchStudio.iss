#define AppName "Creator Batch Studio"
#define AppVersion "1.0.0"
#define AppPublisher "Outils Utiles"
#define AppExeName "CreatorBatchStudio.exe"

[Setup]
AppId={{9BBAE5B5-B1E7-4F6C-B859-3E8A9F4F02B3}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={localappdata}\Programs\Creator Batch Studio
DefaultGroupName=Creator Batch Studio
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\..\..\dist
OutputBaseFilename=CreatorBatchStudio-Setup-v{#AppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\{#AppExeName}
LicenseFile=..\LICENSE.txt
SetupLogging=yes
CloseApplications=yes
RestartApplications=no
VersionInfoVersion={#AppVersion}
VersionInfoCompany={#AppPublisher}
VersionInfoDescription={#AppName} Windows installer
VersionInfoProductName={#AppName}
VersionInfoProductVersion={#AppVersion}

[Files]
Source: "..\..\..\dist\CreatorBatchStudio.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\README.md"; DestDir: "{app}\docs"; Flags: ignoreversion
Source: "..\QUICK_START.md"; DestDir: "{app}\docs"; Flags: ignoreversion
Source: "..\FAQ.md"; DestDir: "{app}\docs"; Flags: ignoreversion
Source: "..\LICENSE.txt"; DestDir: "{app}\docs"; Flags: ignoreversion
Source: "..\..\..\dist\Pillow-LICENSE.txt"; DestDir: "{app}\docs"; Flags: ignoreversion

[Icons]
Name: "{group}\Creator Batch Studio"; Filename: "{app}\{#AppExeName}"
Name: "{group}\Guide de démarrage"; Filename: "{app}\docs\QUICK_START.md"
Name: "{group}\Désinstaller Creator Batch Studio"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Creator Batch Studio"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Créer un raccourci sur le Bureau"; GroupDescription: "Raccourcis :"; Flags: unchecked

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Lancer Creator Batch Studio"; Flags: nowait postinstall skipifsilent
