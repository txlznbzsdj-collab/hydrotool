; HydroTool Windows 安装程序 — Inno Setup 脚本
; 用 GitHub Actions 自动编译：iscc packaging/hydrotool-setup.iss

#define MyAppName "HydroTool"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "HydroTool Contributors"
#define MyAppURL "https://github.com/txlznbzsdj-collab/hydrotool"
#define MyAppExeName "hydrotool.exe"

[Setup]
AppId={{B8F4A3D2-1C5E-4F7A-9B0C-3D6E8F1A2B4C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=LICENSE
OutputDir=dist\Output
OutputBaseFilename=hydrotool-setup-{#MyAppVersion}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin

[Languages]
Name: "chinese"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "快捷方式:"
Name: "addtopath"; Description: "添加到 PATH 环境变量（可在命令行直接运行 hydrotool）"; GroupDescription: "环境变量:"

[Files]
Source: "dist\hydrotool.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion
; 注意：用户需自行安装 ADB/Fastboot，或我们后续打包进去

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\命令提示符 (HydroTool)"; Filename: "cmd.exe"; Parameters: "/K ""{app}\{#MyAppExeName}"""
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "运行 HydroTool"; Flags: postinstall nowait skipifsilent

[UninstallRun]
Filename: "{app}\{#MyAppExeName}"; Parameters: "--version"

[Registry]
; 添加到 PATH
Root: HKCU; Subkey: "Environment"; ValueType: expandsz; ValueName: "PATH"; \
  ValueData: "{olddata};{app}"; Tasks: addtopath; Check: NeedsAddPath('{app}')

[Code]
function NeedsAddPath(Param: string): boolean;
var
  OrigPath: string;
begin
  if not RegQueryStringValue(HKCU, 'Environment', 'PATH', OrigPath) then
  begin
    Result := True;
    exit;
  end;
  Result := Pos(Param, OrigPath) = 0;
end;
