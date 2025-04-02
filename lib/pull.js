#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

function main() {
  console.log("开始拉取更新...");
  
  try {
    // 先拉取主仓库
    console.log("正在更新主仓库...");
    execSync("git pull", { stdio: "inherit" });
    
    // 然后更新所有子模块
    console.log("\n正在更新子模块...");
    execSync(
      'git submodule foreach --recursive "git rev-parse --abbrev-ref HEAD | grep -q \'^HEAD$\' && echo \'Skipping pull for detached HEAD (tag)\' || git pull"',
      { stdio: "inherit", shell: true }
    );
    
    console.log("\n所有仓库更新完成!");
  } catch (error) {
    console.error("更新过程中发生错误:", error.message);
    process.exit(1);
  }
}

// 执行主函数
main();