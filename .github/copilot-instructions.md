# 仓库指令（Copilot 自动加载）

完整规则见 [AGENTS.md](../AGENTS.md)，每次对话都必须先读取并遵守。不可协商的要点：

- **权限**：可免询问读取 / 修改 agent 所在平台的配置文件与本仓库内的全部文件；**仓库以外文件的任何改动都要先取得同意**，破坏性 git 操作同样要先问。
- **分支**：`<账号段>-<电脑段>-<后缀>`，前两段固定按规则生成（账号段 = Gitee 账号名，电脑段 = `hostname`），后缀由用户自定义，本机基础分支后缀为 `Main`。
- **识别电脑**：用 `git rev-parse --show-toplevel` 的路径去匹配 [.agents/branch-registry.md](../.agents/branch-registry.md)，未命中即为新电脑，自动登记并创建 `...-Main`。
- **父子关系**：子分支从本机 `-Main` 切出并登记父分支，完成后合并回 `-Main`。
- **上传**：每次迭代完成并通过测试后 push 到本机当前分支；一个小功能完成后合并并 push `master`。
- **队列**：[TODO.md](../TODO.md) 是唯一待完成清单，夜间 / 空闲 agent 按其中协议领取 `queued` 任务执行。
