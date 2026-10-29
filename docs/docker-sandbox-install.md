# Windows 上安装 Docker 沙箱的踩坑记录

本文件记录 **2026-10-29 在 `FAIRY` 这台 Windows 11 机器上装 Docker 沙箱的完整过程**，
包括每一项检查、每条命令的实际输出、失败原因和最终绕法。换机器时照着走一遍即可。

沙箱本身的日常用法见 [docker-sandbox.md](docker-sandbox.md)；本文只讲「怎么把 Docker 装出来」。

---

## 0. 结论先行

| 项目 | 结果 |
| --- | --- |
| 系统 | Windows 11 专业版，`10.0.26300`，x64，Hyper-V 检测为「已存在 hypervisor」 |
| 权限 | `FAIRY\Fairy` 在 Administrators 组，但进程默认**非提权**，每条安装命令都要 UAC |
| WSL | 初始完全未安装（`wsl.exe` 报「未安装用于 Linux 的 Windows 子系统」） |
| Docker Desktop | **4.97.0**，装到 `D:\Docker` |
| Docker 数据根 | `D:\DockerData\wsl`（**不能**放在安装目录下，见第 4 节） |
| docker CLI | 29.9.2 |
| WSL 包 | 2.7.14.0 |
| **待办** | 必须**重启一次**，WSL2 才能启动，引擎才会出现 |

---

## 1. 先探明现状（不要直接开装）

```powershell
docker --version                     # 未安装：CommandNotFoundException
wsl --version                        # 未安装：提示 wsl --install
wsl --status
winget --version                     # v1.29.380，可用
(Get-CimInstance Win32_ComputerSystem).HypervisorPresent        # True
([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
```

非提权时 `Get-WindowsOptionalFeature -Online` 会直接报
`The requested operation requires elevation`。改用不需要提权的 CIM 查询（`InstallState`：`1`=已启用，`2`=已禁用）：

```powershell
$r = foreach ($f in 'Microsoft-Windows-Subsystem-Linux','VirtualMachinePlatform','Microsoft-Hyper-V-All','Containers') {
  Get-CimInstance -ClassName Win32_OptionalFeature -Filter "Name='$f'" -ErrorAction SilentlyContinue |
    Select-Object Name,InstallState
}
$r | Format-Table -AutoSize
```

本次结果：WSL / VirtualMachinePlatform / Hyper-V 三项全是 `2`（禁用），即 **WSL2 完全没有就绪**。

磁盘也要先看，Docker Desktop + WSL 发行版大约 6–10 GB：

```powershell
Get-PSDrive -PSProvider FileSystem | Select-Object Name,@{n='FreeGB';e={[math]::Round($_.Free/1GB,1)}}
```

本次：C 盘只剩 15.7 GB，D 盘 284.5 GB —— **这就是决定「别装 C 盘」的依据**。

---

## 2. 启用 WSL2 依赖的 Windows 功能

需要管理员，且**必须重启**才生效。一条命令跑完两个功能：

```powershell
$p = Start-Process -FilePath cmd.exe -Verb RunAs -PassThru -Wait -ArgumentList '/c',
  'dism /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart & ' +
  'dism /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart'
$p.ExitCode      # 0
```

> 坑一：`dism` 的输出是 GBK，PowerShell 里读成乱码，别被吓到。
> 坑二：这里用 `&` 串起来，`.bat`/`cmd` 的 `&&` 在 PowerShell 里不合法。
> 坑三：`Start-Process -Verb RunAs` 必须带 `-Wait`，否则检查会跑在功能启用完成之前。

验证（不用提权）：

```powershell
Get-CimInstance -ClassName Win32_OptionalFeature -Filter "Name='VirtualMachinePlatform'" |
  Select-Object Name,InstallState      # 变成 1
```

同时会看到 `HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending` 存在，
说明系统在等重启。

---

## 3. 装 WSL 本体

Windows 11 自带的 `wsl.exe` 只是个桩，真正跑 WSL2 需要新版的 Microsoft.WSL 包：

```powershell
$p = Start-Process winget.exe -Verb RunAs -PassThru -Wait -ArgumentList
  'install --id Microsoft.WSL -e --accept-package-agreements --accept-source-agreements --silent --disable-interactivity'
```

安装后：

```powershell
wsl --version
```

本次输出：WSL `2.7.14.0`、内核 `6.18.33.2-2`、Windows `10.0.26300.9711`。

但 `wsl --status` 立刻报：

```
WSL2 无法启动，因为此计算机未启用虚拟机平台。请启用虚拟机平台可选组件并重启。
```

—— 功能状态已是「已启用」，只是**还没重启**。这一步无法绕过。

**不要**在这时候跑 `wsl --install -d Ubuntu`：会返回「操作成功」但实际上什么都没装
（因为 `--no-launch` 且虚拟机平台没生效），属于假成功。

---

## 4. 把 Docker Desktop 装到 D 盘（关键）

### 4.1 别用 `winget install Docker.DockerDesktop`

`winget` 只能装到默认的 `C:\Program Files\Docker`，而且**装完无法迁移**。
本次一开始就是这么装的，占掉 C 盘约 3.98 GB，只好卸载重来：

```powershell
Start-Process winget.exe -Verb RunAs -PassThru -Wait -ArgumentList
  'uninstall --id Docker.DockerDesktop --silent --disable-interactivity'
```

卸载后 `C:\Program Files\Docker` 目录仍残留（见 4.4）。

### 4.2 下载官方安装器并核对哈希

```powershell
winget show --id Docker.DockerDesktop -e      # 取 Installer URL 与 SHA256
curl.exe -L --fail --retry 3 -o D:\docker-installer\DockerDesktopInstaller.exe `
  'https://desktop.docker.com/win/main/amd64/244584/Docker%20Desktop%20Installer.exe'
(Get-FileHash D:\docker-installer\DockerDesktopInstaller.exe -Algorithm SHA256).Hash.ToLower()
# 2668273f82b342a058a28f9ab53ea7bddde10bb6d51307ce2ec54c2d36459744  ✅ 与 winget 清单一致
```

### 4.3 用安装器参数指定路径

```powershell
$argList = @(
  'install',
  '--quiet',
  '--accept-license',
  '--installation-dir=D:\Docker',
  '--wsl-default-data-root=D:\DockerData\wsl',   # 注意：不能写在安装目录里
  '--always-run-service'
)
$p = Start-Process 'D:\docker-installer\DockerDesktopInstaller.exe' -ArgumentList $argList -Verb RunAs -PassThru -Wait
$p.ExitCode       # 0
```

> **坑四：数据根不能等于安装目录。** 第一次写成 `--wsl-default-data-root=D:\Docker\wsl`，
> 安装器直接退出码 **-5**，日志 `C:\ProgramData\DockerDesktop\install-log-admin.txt` 里写得很清楚：
>
> ```
> System.ArgumentException: The data root 'D:\Docker\wsl' (--wsl-default-data-root) is inside the
> installation directory 'D:\Docker', which is replaced on every update. Updating would delete all
> Docker data stored there.
> ```
>
> 也就是说安装目录每次升级会被整体替换，数据根必须另起一处（本次用 `D:\DockerData\wsl`）。

验证：

```powershell
Test-Path 'D:\Docker\Docker Desktop.exe'    # True
(Get-ChildItem 'D:\Docker' -Recurse -File | Measure-Object Length -Sum).Sum / 1GB   # ≈ 3.22
```

### 4.4 仍然会落在 C 盘的部分

即使指定了 `--installation-dir`，这些还在 C 盘：

| 路径 | 内容 | 大小 | 能否搬 |
| --- | --- | --- | --- |
| `C:\Program Files\Docker\cli-plugins` | CLI 插件（buildx、compose、scout…） | ≈ 682 MB | 不能，安装器固定写入 |
| `C:\ProgramData\DockerDesktop` | 安装 / 运行日志 | 小 | 无需搬 |
| `%LOCALAPPDATA%\Docker` | 用户设置、`settings-store.json` | 小 | 不要手动搬 |

所以「不装 C 盘」实际能做到的是：**程序主体（3.2 GB）+ WSL 磁盘镜像（会持续增长）在 D 盘**，
固定的小尾巴留在 C 盘。想进一步压缩 C 盘占用，可以用 Docker Desktop 的
`Settings → Resources → Advanced → Disk image location` 再确认一次数据根指向 D 盘。

---

## 5. 第一次启动与验证

```powershell
Start-Process 'D:\Docker\Docker Desktop.exe'
```

**重启之前**引擎一定起不来，典型报错：

```powershell
& 'D:\Docker\resources\bin\docker.exe' version --format '{{.Server.Version}}'
# request returned 500 Internal Server Error ... /LinuxEngine/v1.56/version
```

`wsl --list --verbose` 也看不到 `docker-desktop` 发行版 —— 那个发行版是 Docker Desktop
在 WSL2 可用之后**自己创建**的，手动去 `wsl -d docker-desktop` 只会得到 `WSL_E_DISTRO_NOT_FOUND`。

重启后按这个顺序验证：

```powershell
wsl --status                                     # 默认版本 2
wsl --list --verbose                             # 出现 docker-desktop
docker version --format '{{.Server.Version}}'    # 打印服务端版本
docker run --rm hello-world                      # 打印 Hello from Docker!
```

---

## 6. 把 PATH 弄好

安装器会把 `D:\Docker\resources\bin` 写进系统 PATH，但**当前已开的终端不会刷新**。
新开一个终端，或者临时补一次：

```powershell
$env:Path = "D:\Docker\resources\bin;$env:Path"
docker --version      # Docker version 29.9.2, build a82e528
```

---

## 7. 常见报错对照表

| 报错 | 原因 | 处理 |
| --- | --- | --- |
| `无法将"docker"项识别为 cmdlet...` | PATH 未刷新 / 未安装 | 新开终端；检查 `D:\Docker\resources\bin` |
| 安装器退出码 `-5` + `data root ... is inside the installation directory` | 数据根写进了安装目录 | 数据根改到安装目录之外 |
| `The requested operation requires elevation` | 非提权进程查 OptionalFeature | 用 CIM 查询，或提权 |
| `WSL2 无法启动…未启用虚拟机平台` | 功能已启用但未重启 | 重启；不要试图跳过 |
| `WSL_E_DISTRO_NOT_FOUND`（`-d docker-desktop`） | 该发行版尚未创建 | 先重启并启动 Docker Desktop |
| `500 Internal Server Error ... /LinuxEngine/...` | 引擎未就绪（多半是 WSL2 没起来） | 重启 → 启动 Docker Desktop → 再查 |
| 安装成功但 C 盘还是少了好几个 G | 程序在 D，但 `cli-plugins` 固定写 C | 属正常现象，见 4.4 |

---

## 8. 复查用命令清单

```powershell
# 已安装版本
winget list --id Docker.DockerDesktop
winget list --id Microsoft.WSL

# 功能状态（1=启用 2=禁用）
$r = foreach ($f in 'Microsoft-Windows-Subsystem-Linux','VirtualMachinePlatform') {
  Get-CimInstance Win32_OptionalFeature -Filter "Name='$f'" | Select-Object Name,InstallState
}
$r

# 是否在等重启
Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending'

# 安装位置与占用
Test-Path 'D:\Docker\Docker Desktop.exe'
[math]::Round((Get-ChildItem 'D:\Docker' -Recurse -File | Measure-Object Length -Sum).Sum/1GB,2)
[math]::Round((Get-PSDrive C).Free/1GB,2)
```

---

## 9. 卸载（万一要重来）

```powershell
Start-Process winget.exe -Verb RunAs -PassThru -Wait -ArgumentList
  'uninstall --id Docker.DockerDesktop --silent --disable-interactivity'
Remove-Item 'C:\Program Files\Docker' -Recurse -Force      # 残留的 cli-plugins
Remove-Item 'D:\Docker','D:\DockerData' -Recurse -Force     # 程序与数据根
```

卸载不会删 `%LOCALAPPDATA%\Docker` 里的用户设置，重装时会沿用；
需要彻底重置时再删它。
