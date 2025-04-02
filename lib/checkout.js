#!/usr/bin/env node

// 您的切换分支的逻辑
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// 读取.gitbranches文件
const gitBranchesPath = path.join(process.cwd(), ".gitbranches.json");
const gitBranchesData = JSON.parse(fs.readFileSync(gitBranchesPath, "utf8"));

// 检查并初始化子模块
function initSubmodules(repoPath) {
  try {
    console.log(`检查子模块状态: ${repoPath}`);

    // 检查是否有子模块配置但未初始化
    const gitmodulesPath = path.join(repoPath, ".gitmodules");
    if (fs.existsSync(gitmodulesPath)) {
      console.log(`发现 .gitmodules 文件，正在初始化子模块...`);

      try {
        // 初始化子模块
        execSync("git submodule init", {
          cwd: repoPath,
          stdio: "inherit",
        });

        // 更新子模块
        console.log(`正在更新子模块...`);
        execSync("git submodule update", {
          cwd: repoPath,
          stdio: "inherit",
        });

        console.log(`子模块初始化和更新完成`);
        return true;
      } catch (submoduleError) {
        // 检查是否是权限错误
        const errorMsg = submoduleError.message.toLowerCase();
        if (
          errorMsg.includes("permission denied") ||
          errorMsg.includes("could not read") ||
          errorMsg.includes("authentication failed") ||
          errorMsg.includes("authorization failed")
        ) {
          console.error(`\n错误: 子模块初始化失败，可能是没有仓库访问权限`);
          console.error(
            `请确认您有权限访问子模块仓库，或检查 SSH/HTTPS 凭证是否正确配置`
          );
          console.error(`详细错误: ${submoduleError.message}\n`);
        } else {
          console.error(`初始化子模块失败:`, submoduleError.message);
        }
        return false;
      }
    } else {
      console.log(`未发现 .gitmodules 文件，跳过子模块初始化`);
      return false;
    }
  } catch (error) {
    console.error(`初始化子模块失败:`, error.message);
    return false;
  }
}

// 初始化不存在的仓库
function initRepository(repoPath, remoteUrl, targetBranch) {
  // 保存当前工作目录
  const originalCwd = process.cwd();
  try {
    // 使用当前工作目录作为基准目录
    const baseDir = process.cwd();

    // 获取绝对路径
    const absolutePath = path.resolve(baseDir, repoPath);

    // 创建父目录（如果不存在）
    const parentDir = path.dirname(absolutePath);
    if (!fs.existsSync(parentDir)) {
      console.log(`创建父目录: ${parentDir}`);
      fs.mkdirSync(parentDir, { recursive: true });
    }

    console.log(`仓库 ${repoPath} 不存在，正在从 ${remoteUrl} 克隆...`);

    try {
      // 克隆仓库
      execSync(`git clone ${remoteUrl} "${absolutePath}"`, {
        stdio: "inherit",
      });
    } catch (cloneError) {
      // 检查是否是权限错误
      const errorMsg = cloneError.message.toLowerCase();
      if (
        errorMsg.includes("permission denied") ||
        errorMsg.includes("could not read") ||
        errorMsg.includes("authentication failed") ||
        errorMsg.includes("authorization failed")
      ) {
        console.error(`\n错误: 克隆仓库失败，可能是没有仓库访问权限`);
        console.error(`请确认您有权限访问仓库: ${remoteUrl}`);
        console.error(`请检查您的 SSH 密钥或 HTTPS 凭证是否正确配置`);
        console.error(`详细错误: ${cloneError.message}\n`);
      } else {
        console.error(`克隆仓库失败:`, cloneError.message);
      }
      return false;
    }

    // 切换到仓库目录
    process.chdir(absolutePath);

    // 切换到目标分支
    if (targetBranch) {
      console.log(`正在切换到分支: ${targetBranch}`);
      try {
        execSync(`git checkout ${targetBranch}`, { stdio: "inherit" });
      } catch (checkoutError) {
        console.error(
          `切换到分支 ${targetBranch} 失败:`,
          checkoutError.message
        );
        process.chdir(originalCwd);
        return false;
      }
    }

    // 初始化子模块
    initSubmodules(absolutePath);

    // 恢复原始工作目录
    process.chdir(originalCwd);
    console.log(`仓库 ${repoPath} 初始化完成`);
    return true;
  } catch (error) {
    console.error(`初始化仓库 ${repoPath} 失败:`, error.message);
    process.chdir(originalCwd); // 确保恢复工作目录
    return false;
  }
}

// 切换分支函数
function switchBranch(repoPath, targetBranch, remoteUrl) {
  // 保存当前工作目录
  const originalCwd = process.cwd();
  try {
    // 使用当前工作目录作为基准目录
    const baseDir = process.cwd();

    // 获取绝对路径，使用path.resolve来正确处理相对路径
    const absolutePath = path.resolve(baseDir, repoPath);

    // 检查路径是否存在
    if (!fs.existsSync(absolutePath)) {
      console.error(`${absolutePath} 目录不存在`);

      // 如果有远程URL，尝试初始化仓库
      if (remoteUrl) {
        console.log(`尝试初始化仓库: ${repoPath}`);
        return initRepository(repoPath, remoteUrl, targetBranch);
      }

      process.chdir(originalCwd);
      return false;
    }

    // 切换到仓库目录
    process.chdir(absolutePath);

    // 检查目录是否存在且是git仓库
    if (!fs.existsSync(path.join(absolutePath, ".git"))) {
      // 检查是否为子模块（.git是文件而非目录）
      if (
        fs.existsSync(path.join(absolutePath, ".git")) &&
        !fs.statSync(path.join(absolutePath, ".git")).isDirectory()
      ) {
        console.log(`${absolutePath} 是一个git子模块`);
      } else {
        console.error(`${absolutePath} 不是一个有效的git仓库`);

        // 如果有远程URL，尝试初始化仓库
        if (remoteUrl) {
          console.log(`尝试初始化仓库: ${repoPath}`);
          process.chdir(originalCwd);
          return initRepository(repoPath, remoteUrl, targetBranch);
        }

        process.chdir(originalCwd);
        return false;
      }
    }

    // 获取当前分支或tag
    let currentBranch;
    try {
      // 首先尝试获取当前tag
      currentBranch = execSync("git describe --tags --exact-match 2>/dev/null")
        .toString()
        .trim();
    } catch {
      // 如果不是tag，则获取分支名
      currentBranch = execSync("git rev-parse --abbrev-ref HEAD")
        .toString()
        .trim();
    }

    // 如果已经在目标分支上，跳过切换
    if (currentBranch === targetBranch) {
      console.log(`${repoPath}: 已经在 ${targetBranch} 分支上`);

      // 即使已经在目标分支上，也检查并初始化子模块
      initSubmodules(absolutePath);

      process.chdir(originalCwd);
      return true;
    }

    // 尝试切换到目标分支或tag
    execSync(`git checkout ${targetBranch}`, { stdio: "inherit" });
    console.log(`${repoPath}: 成功切换到 ${targetBranch}`);

    // 切换分支后初始化子模块
    initSubmodules(absolutePath);

    // 恢复原始工作目录
    process.chdir(originalCwd);
    return true;
  } catch (error) {
    console.error(`${repoPath} 切换分支失败:`, error.message);
    process.chdir(originalCwd); // 确保恢复工作目录
    return false;
  }
}

// 主函数
function main() {
  const repositories = gitBranchesData.repositories;
  let successCount = 0;
  let failCount = 0;
  const failedRepos = []; // 用于记录失败的仓库信息

  console.log("开始切换分支...");

  repositories.forEach((repo, index) => {
    console.log(
      `\n[${index + 1}/${repositories.length}] 处理仓库: ${repo.path}`
    );
    if (repo.path && repo.currentBranch) {
      const success = switchBranch(
        repo.path,
        repo.currentBranch,
        repo.remoteUrl
      );
      if (success) {
        successCount++;
      } else {
        failCount++;
        // 记录失败的仓库信息
        failedRepos.push({
          path: repo.path,
          branch: repo.currentBranch,
          remoteUrl: repo.remoteUrl || "未知",
        });
      }
    }
  });

  console.log("\n切换分支完成!");
  console.log(`成功: ${successCount} 个`);
  console.log(`失败: ${failCount} 个`);

  // 如果有失败的仓库，打印详细信息
  if (failedRepos.length > 0) {
    console.log("\n失败的仓库列表:");
    failedRepos.forEach((repo, index) => {
      console.log(`${index + 1}. 路径: ${repo.path}`);
      console.log(`   分支: ${repo.branch}`);
      console.log(`   远程地址: ${repo.remoteUrl}`);
    });
    console.log("\n可能的解决方案:");
    console.log("1. 检查仓库访问权限");
    console.log("2. 确认 SSH 密钥或 HTTPS 凭证配置正确");
    console.log("3. 检查网络连接");
    console.log("4. 手动克隆或初始化失败的仓库");
  }
}

// 执行主函数
main();
