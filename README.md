# Git Submodule Util (GSU)

一个用于管理Git仓库及其子模块分支的命令行工具。

## 功能特点

- 自动保存当前仓库及所有子模块的分支信息
- 一键切换所有仓库到指定分支
- 自动初始化和更新子模块
- 支持自动克隆缺失的仓库

## 安装

```bash
npm install -D git-submodule-util

```json
scripts: {
  "checkout": "gsu checkout"
  "save": "gsu save"
  "pull": "gsu pull"
}
```