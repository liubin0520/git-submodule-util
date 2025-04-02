#!/usr/bin/env node

const { argv } = process;

if (argv.includes('checkout')) {
  require('../lib/checkout');
} else if (argv.includes('save')) {
  require('../lib/save');
} else if (argv.includes('pull')) {
  require('../lib/pull');
} else {
  console.log('可用命令:');
  console.log('  gsu checkout - 切换分支');
  console.log('  gsu save - 保存配置');
  console.log('  gsu pull - 拉取所有仓库和子模块的更新');
}