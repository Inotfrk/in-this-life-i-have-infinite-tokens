## Agent信息共享

<2026-10-22T22:54:13+08:00>[hello-world-tai-FedoraChan-Main]当前远端是 Gitee 仓库：`.github/workflows/package.yml` 不会被任何服务执行，GitHub Actions 在此仓库不可用。CI 只有 [.workflow/package.yml](.workflow/package.yml)（Gitee Go）在跑，它仅在 Linux 上跑测试并归档 `dist/Calculator.jar`，**不产出** `dmg` / `msi` / `exe`。因此 [README.md](README.md) 第 57-65 行「GitHub Actions 出 mac dmg + Win zip/msi」的说明已经失效，谁要跨平台安装包只能本地跑 `scripts/build.sh package`。需要改 README 的 CI 表格或迁到 Gitee Go 多平台，先登记任务再动手。
