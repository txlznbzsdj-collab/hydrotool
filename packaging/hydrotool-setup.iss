; HydroTool Windows 安装程序 — Inno Setup 脚本
; 双击安装，安装后桌面快捷方式直接打开图形界面

#define MyAppName "HydroTool"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "HydroTool Contributors"
#define MyAppURL "https://github.com/txlznbzsdj-collab/hydrotool"
#define MyAppExeName "hydrotool.exe"

[Setup]
AppId={{B8F4A3D2-1C5E-4F7A-9B0C-3D6E8F1A2B4C}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=dist\Output
OutputBaseFilename=hydrotool-setup-{#MyAppVersion}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "附加快捷方式:"

[Files]
Source: "dist\hydrotool.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Parameters: "serve"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Parameters: "serve"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Parameters: "serve"; Description: "启动 HydroTool 图形界面"; \
  Flags: postinstall nowait skipifsilent unchecked
