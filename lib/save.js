#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function getGitBranches(repoPath, rootPath) {
  try {
    let currentBranch;
    try {
      currentBranch = execSync("git describe --tags --exact-match", {
        cwd: repoPath,
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();
    } catch {
      currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: repoPath,
      })
        .toString()
        .trim();
    }

    const lastCommit = execSync('git log -1 --pretty=format:"%h|%an|%s"', {
      cwd: repoPath,
    })
      .toString()
      .trim();
    const [hash, author, message] = lastCommit.split("|");

    // 获取 Git 远程仓库地址
    let remoteUrl = "";
    try {
      remoteUrl = execSync("git config --get remote.origin.url", {
        cwd: repoPath,
      })
        .toString()
        .trim();
    } catch (error) {
      console.log(`无法获取 ${repoPath} 的远程仓库地址: ${error.message}`);
    }

    const relativePath = path.relative(rootPath, repoPath).replace(/\\/g, "/"); // 统一转换为正斜杠

    return {
      path: relativePath || ".",
      currentBranch,
      remoteUrl,
      lastCommit: { hash, author, message },
    };
  } catch (error) {
    console.error(`Error in ${repoPath}:`, error.message);
    return null;
  }
}

function getSubmodules(repoPath, visitedPaths = new Set()) {
  if (visitedPaths.has(repoPath)) return [];
  visitedPaths.add(repoPath);

  try {
    console.log(`正在检查子模块: ${repoPath}`);
    const submodulesOutput = execSync("git submodule status", {
      cwd: repoPath,
    }).toString();

    const directSubmodules = submodulesOutput
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/\s*([a-f0-9]+)\s+([^\s]+)/);
        return match ? path.join(repoPath, match[2]) : null;
      })
      .filter(Boolean);

    if (directSubmodules.length > 0) {
      console.log(`发现 ${directSubmodules.length} 个直接子模块在 ${repoPath}`);
    }

    const allSubmodules = [...directSubmodules];
    for (const submodulePath of directSubmodules) {
      const nested = getSubmodules(submodulePath, visitedPaths);
      allSubmodules.push(...nested);
    }
    return allSubmodules;
  } catch (error) {
    console.error(`Error getting submodules in ${repoPath}:`, error.message);
    return [];
  }
}

function main() {
  console.log("开始收集 Git 仓库信息...");
  const rootPath = process.cwd();
  const result = {
    timestamp: new Date().toISOString(),
    repositories: [],
  };

  console.log(`处理主仓库: ${rootPath}`);
  const mainRepo = getGitBranches(rootPath, rootPath);
  if (mainRepo) {
    result.repositories.push(mainRepo);
    console.log(
      `已添加主仓库信息: ${mainRepo.path} (${mainRepo.currentBranch})`
    );
  }

  console.log("开始查找子模块...");
  const submodules = getSubmodules(rootPath);
  console.log(`共找到 ${submodules.length} 个子模块`);

  // 用于跟踪已添加的仓库路径，避免重复
  const addedPaths = new Set([mainRepo ? mainRepo.path : ""]);

  if (submodules.length > 0) {
    console.log("开始处理子模块信息...");
    let processedCount = 0;
    let skippedCount = 0;

    submodules.forEach((submodulePath) => {
      processedCount++;
      console.log(
        `处理子模块 [${processedCount}/${submodules.length}]: ${submodulePath}`
      );
      
      const info = getGitBranches(submodulePath, rootPath);
      if (info) {
        // 检查是否已经添加过相同路径的仓库
        if (!addedPaths.has(info.path)) {
          result.repositories.push(info);
          addedPaths.add(info.path);
          console.log(`  - 已添加: ${info.path} (${info.currentBranch})`);
        } else {
          skippedCount++;
          console.log(`  - 跳过重复路径: ${info.path}`);
        }
      }
    });
    
    if (skippedCount > 0) {
      console.log(`跳过了 ${skippedCount} 个重复的子模块`);
    }
  }

  const outputPath = path.join(process.cwd(), ".gitbranches.json");
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`处理完成! 共收集了 ${result.repositories.length} 个仓库的信息`);
  console.log(`结果已保存到: ${outputPath}`);
}

main();
