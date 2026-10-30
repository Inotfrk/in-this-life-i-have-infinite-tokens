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
| Docker CLI | 29.9.2 |
| WSL 包 | 2.7.14.0 |
| 代理 | `127.0.0.1:7890`（Docker Desktop 需手动配置，不读系统代理） |
| 沙箱实测 | 25 项求值 + 6 项界面测试全部通过 |
| 资源上限 | 容器默认 `--memory 2g --memory-swap 2g --cpus 2`，另套 `timeout`（见第 10 节） |
| **状态** | ✅ 已重启、引擎已启动、镜像已构建、测试全绿 |

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
| `failed to resolve reference ... dialing registry-1.docker.io:443 ... timeout` | Docker Desktop 没走本机代理 | 配代理，见第 8 节 |
| `scripts/build.sh: line 3: set: pipefail: invalid option name` | `.sh` 被检出成 CRLF | 加 `.gitattributes` 强制 LF，见第 9 节 |
| `UnsatisfiedLinkError: libXrender.so.1` | 基础镜像缺 X11 客户端库 | 装 `libxrender1` 等，见第 9 节 |

---

## 8. 代理：国内网络必配

本机通过本地代理（Clash 系，`127.0.0.1:7890`）访问外网，但 **Docker Desktop 不读系统代理**，
直接连 `registry-1.docker.io:443` 会超时：

```
failed to resolve reference "docker.io/library/hello-world:latest":
dialing registry-1.docker.io:443 ... A connection attempt failed ...
```

确认代理本身是通的（返回 `401` 就是正常的未认证响应，代表能连通）：

```powershell
curl.exe -sS -o NUL -w "%{http_code}`n" --max-time 20 https://registry-1.docker.io/v2/
Test-NetConnection 127.0.0.1 -Port 7890 -InformationLevel Quiet    # True
```

给 Docker Desktop 配代理：改 `%APPDATA%\Docker\settings-store.json`（先停掉 Docker）：

```powershell
docker desktop stop
$f = "$env:APPDATA\Docker\settings-store.json"
Copy-Item $f "$f.bak" -Force
$cfg = Get-Content $f -Raw -Encoding UTF8 | ConvertFrom-Json
$cfg | Add-Member ProxyHttpMode manual -Force
$cfg | Add-Member OverrideProxyHTTP  'http://127.0.0.1:7890' -Force
$cfg | Add-Member OverrideProxyHTTPS 'http://127.0.0.1:7890' -Force
$cfg | Add-Member OverrideProxyExclude 'localhost,127.0.0.1,*.local' -Force
$cfg | ConvertTo-Json -Depth 10 | Set-Content $f -Encoding UTF8
Start-Process 'D:\Docker\Docker Desktop.exe'
```

也可以走图形界面：`Settings → Resources → Proxies → Manual`，填同样的地址。
配好后 `docker pull hello-world` 立即成功。

> 代理软件换了端口时要同步改这里，否则只有 Docker 拉不到镜像、其他工具却正常。

### 8.1 git push 用哪个代理：与 Docker 无关的第二套配置

Docker Desktop 的代理只在 `settings-store.json` 里，**git 不读它**。git 走的是自己的配置，两套要分别配：

```powershell
# git 侧：命令级临时生效，不污染全局配置
git -c http.proxy=http://127.0.0.1:7890 push -u github HEAD
```

判断代理到底通没通，先只看「能不能读远端」，不要一上来就怪凭据：

```powershell
git -c http.proxy=http://127.0.0.1:7890 ls-remote --heads github
```

同一命令连跑 5 次，本机实测会出现 `OK / FAIL / FAIL / OK` 这种抖动，
报错是 `schannel: failed to receive handshake, SSL/TLS connection failed`。
这属于链路问题（代理出口被重置），不是仓库或账号问题；`git fetch` / `ls-remote` 偶然成功时，
说明**凭据本身是好的**，只是握手时好时坏。此时重试即可，不要急着重新登录。

换成 OpenSSL 后端**不能**解决握手抖动，只是把错误换了个说法：

```
-fatal: unable to access '...': TLS connect error: error:0A000126:
 SSL routines::unexpected eof while reading
```

#### 凭据问题：`Cannot prompt because user interactivity has been disabled`

在 agent / 非交互终端里，git 想弹窗要密码就会直接死：

```
fatal: Cannot prompt because user interactivity has been disabled.
fatal: unable to get password from user
```

这不是凭据没存，是**根本没机会问**。`gcm-diagnose.log` 里能直接看到是谁把交互关掉的：

```
GCM_INTERACTIVE=Never
GIT_TERMINAL_PROMPT=0
command line:	credential.interactive=never
GIT_ASKPASS=            ← 空值，没有备用取密码通道
SSH_ASKPASS=            ← 同上
```

`GIT_ASKPASS` / `SSH_ASKPASS` 都是空的，所以一旦需要密码就无路可走。

排查顺序：

```powershell
# 1. 有没有非交互令牌（有就直接用，最省事）
$env:GH_TOKEN; $env:GITHUB_TOKEN

# 2. 本机凭证管理器里到底存了什么
cmdkey /list | Select-String 'git:https://github.com'   # 本机曾只有 gitee 条目
git config --show-origin --get credential.helper        # 本例是 manager

# 3. 直接问 GCM 要 token，绕开 git 的交互判断
$gcm = 'D:\Appofmy\VSC\Git\ucrt64\bin\git-credential-manager.exe'
"protocol=https`nhost=github.com`n`n" | & $gcm get
```

#### 用 diagnose 区分「没网」还是「只有 github 不通」

`git-credential-manager diagnose` 会逐项自检，把结论摊开看，别猜：

| 诊断项 | 本机结果 | 说明 |
| --- | --- | --- |
| File system | `Success: True` | 临时目录可读写 |
| Networking | `Success: True` | `HEAD https://example.com` **成功** |
| Git | `Success: True` | `git 2.56.0.windows.3` 正常 |
| Credential storage | `Success: True` | 写/读/删测试凭据全部 OK |
| Microsoft authentication | `Success: True` | MSAL 缓存可持久化 |
| **GitHub API** | **`Success: False`** | `TaskCanceledException: 已取消一个任务` |

关键组合是**「Networking 通、GitHub API 不通」**：

```
Using 'https://github.com/' as API target.
Querying '/meta' endpoint...
System.Threading.Tasks.TaskCanceledException: 已取消一个任务。
```

`example.com` 能通说明本机出网没问题；只有 `github.com` 的 `/meta` 超时。
同时 `Credential storage: True` 说明**凭据库本身是好的**，不是存不进去。
两者合起来就把「凭据坏了」排除掉了，问题只在到 github.com 的这条链路上。

> 所以排查顺序是：先看 `Networking` 与 `GitHub API` 两项的组合，
> 再决定是修代理还是查凭据。像本例这种「能上网、就是 github 超时」，
> 直接给 git 指定能用的代理即可，不要浪费时间重登账号。

#### 顺带确认：`core.autocrlf=true` 会让 `.sh` 变 CRLF

日志里全局配置是：

```
file:D:/Appofmy/VSC/Git/etc/gitconfig	core.autocrlf=true
file:D:/Appofmy/VSC/Git/etc/gitconfig	http.sslbackend=schannel
```

这正是第 9.1 节「CRLF 让 `pipefail` 变成非法选项」的根因来源。
仓库用 [.gitattributes](../.gitattributes) 强制 `*.sh` 走 `eol=lf` 才能压住它；
`http.sslbackend=schannel` 则解释了为什么报错都是 `schannel: failed to receive handshake`。

---

## 9. 沙箱跑起来后才会暴露的两个问题

这两个问题在宿主机上永远看不到，只有真正进容器才出现，属于「沙箱的价值」：

### 9.1 `.sh` 换行符：CRLF 让 `pipefail` 变成非法选项

```
scripts/build.sh: line 3: set: pipefail: invalid option name
```

Windows 上 `git config core.autocrlf` 为 `true`，仓库里又没有 `.gitattributes`，
于是 `scripts/*.sh` 全被检出成 CRLF。Linux 里读到的是 `pipefail\r`，`set -o` 不认，脚本退出码 2。

修复：加 [.gitattributes](../.gitattributes) 强制 `*.sh`、`Dockerfile`、`*.yml` 用 LF，
再让索引与工作区重算一次：

```powershell
git add .gitattributes
git rm --cached -r . --quiet
git add -A          # 重新按 .gitattributes 写入索引与工作区
```

验证（`CRLF=False` 才算对）：

```powershell
foreach ($f in Get-ChildItem scripts -Filter *.sh) {
  $b = [System.IO.File]::ReadAllBytes($f.FullName); "$($f.Name): CRLF=$($b -contains 13)"
}
```

### 9.2 缺 X11 库：Swing 初始化直接崩

```
Exception in thread "main" java.lang.UnsatisfiedLinkError:
  /opt/java/openjdk/lib/libawt_xawt.so: libXrender.so.1: cannot open shared object file
  at java.desktop/java.awt.Toolkit.<clinit>(Toolkit.java:1393)
```

`xvfb` 只提供虚拟显示，**不含 X11 客户端库**。`eclipse-temurin:21-jdk-jammy` 是精简镜像，
缺少 AWT/Swing 依赖的 `.so`。要在 Dockerfile 里补：

```dockerfile
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        xvfb libxrender1 libxtst6 libxi6 libxext6 libx11-6 \
        fontconfig fonts-dejavu-core tzdata ca-certificates \
    && rm -rf /var/lib/apt/lists/*
```

`fontconfig` + `fonts-dejavu-core` 是为了让 Swing 有中文字体可用；
缺了不报错但会显示方块。

### 9.3 顺带确认：UiTest 在容器里是真跑而不是跳过

`UiTest` 开头有 `GraphicsEnvironment.isHeadless()` 判断，无显示就打印 `[SKIP]` 后退出。
沙箱日志里出现 6 条 `[PASS] 按键 ...` 才是真正执行过；看到 `[SKIP]` 说明 `xvfb-run` 没生效。

---

## 10. 2026-10-30 复现并修掉的三个坑

这一节是第二天实际使用时暴露的，机器**整机卡死重启过一次**，所以单独记下来。

### 10.1 整机卡死：没有内存上限

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 跑 `docker run` 之后整机失去响应，只能强制重启 | 本机 16 GB，Docker Desktop 默认上限约 8 GB，且不封 swap；构建异常时一路换页 | 每次运行都带 `--memory 2g --memory-swap 2g --cpus 2` |

`--memory-swap` **必须显式等于** `--memory`。只写 `--memory` 时容器仍可用一整块 swap，
表面上有上限，实际上照样能把机器拖死。

验证上限真的生效：

```powershell
docker container inspect calculator-sandbox -f 'mem={{.HostConfig.Memory}} swap={{.HostConfig.MemorySwap}}'
# 期望输出 mem=2147483648 swap=2147483648
```

runner 脚本已默认带上，并且 `meta.json` 里会记录当次运行的 `memory_limit`，
`memory_limit` 为 `0` 就说明这个容器没上限（下限只在创建时生效，要 `clean` 后重建）。

### 10.2 测试打完不退出：`xvfb-run` 挂在 PID 1

| 现象 | 原因 |
| --- | --- |
| 日志已经把 25 + 6 项全 `[PASS]` 打完，`docker run` 却一直不返回；`ps -ef` 里只剩 `xvfb-run` 和 `Xvfb` | 镜像的 `CMD` 直接是 `xvfb-run`，它成了 PID 1。`xvfb-run` 内部用 `trap clean_up EXIT` + `wait`，当它是 PID 1 又没 init 回收时，`wait` 永远等不到 |

对照实验（同一镜像、同一命令）：

| 条件 | 结果 |
| --- | --- |
| `docker run --memory 2g ... calculator-sandbox`（无 `--init`） | 挂住，2 分钟后仍在 `Up`，CPU 0%，内存 21 MB |
| `docker run --init --memory 2g ... calculator-sandbox` | 3 秒跑完，`exit=0` |

最终修法不是让每个人记得加 `--init`，而是把 init 写进镜像：

```dockerfile
RUN apt-get install -y ... tini
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["xvfb-run", "-a", "bash", "scripts/build.sh", "test"]
```

改完实测：**不带 `--init` 也是 3 秒退出、`exit=0`**。改 `CMD` 时顺手去掉了 `bash -lc`，
改为 exec 形式数组，这样 `xvfb-run` 能直接收到信号，不会被中间那层 shell 吞掉。

### 10.3 顺带修的：`/workspace` 属主是 root

`WORKDIR /workspace` 会以 root 建出目录，只写 `COPY --chown=dev:dev` 是不够的——
目录本身仍属 root，`dev` 用户执行 `mkdir build/` 直接 `Permission denied`。
只有 bind mount（宿主目录权限 777）时看不出问题，用镜像自带的代码跑才会踩到：

```
mkdir: cannot create directory '/workspace/build': Permission denied
```

修法是建完 `WORKDIR` 后补一行 `RUN chown dev:dev /workspace`。

---

## 11. 复查用命令清单

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

## 12. 卸载（万一要重来）

```powershell
Start-Process winget.exe -Verb RunAs -PassThru -Wait -ArgumentList
  'uninstall --id Docker.DockerDesktop --silent --disable-interactivity'
Remove-Item 'C:\Program Files\Docker' -Recurse -Force      # 残留的 cli-plugins
Remove-Item 'D:\Docker','D:\DockerData' -Recurse -Force     # 程序与数据根
```

卸载不会删 `%LOCALAPPDATA%\Docker` 里的用户设置，重装时会沿用；
需要彻底重置时再删它。
