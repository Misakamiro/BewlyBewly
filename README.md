# BewlyBewly(个人维护分支)

<p align="center" style="margin-bottom: 0px !important;">
<img width="300" alt="BewlyBewly icon" src="https://cdn.jsdelivr.net/gh/BewlyBewly/Imgs/logos/bewlybewly-vtuber-logo.png"><br/>
</p>

<p align="center">基于 <a href="https://github.com/hakadao/BewlyBewly">hakadao/BewlyBewly</a> <code>v0.41.1</code> 的个人维护分支。原项目已停止维护,本分支在其基础上继续修复问题并添加功能。</p>

> 原项目的介绍、完整功能列表与截图请看 [原项目 README](https://github.com/hakadao/BewlyBewly#readme)。
> 分支基于 MIT 许可证开源,感谢原作者 Hakadao 与所有上游贡献者。

## 📦 安装

1. 下载本仓库 Release 中的 `extension.zip` 并解压(或直接使用仓库的 `extension/` 目录);
2. 打开浏览器扩展管理页(Edge:`edge://extensions`,Chrome:`chrome://extensions`);
3. 开启"开发人员模式" → "加载解压缩的扩展" → 选择解压后的目录。

Firefox 用户可自行以 `pnpm build-firefox` 构建。

## ✨ 相对原项目的新增功能

### 视频内推广标记与自动跳过(v0.41.8)

- 在 B 站视频播放器进度条上以琥珀色条标出 UP 主的恰饭/自推广片段;
- 可开启自动跳过:播放进入推广片段时自动跳到段尾,并弹出提示;
- 分段数据来自 [BilibiliSponsorBlock](https://github.com/hanydd/BilibiliSponsorBlock) 社区数据库(bsbsb.top),匿名 GET、不携带任何 Cookie;两个开关均关闭时不产生任何请求;
- 支持多 P 视频(按分 P cid 精确匹配)、站内切换视频、稍后再看/收藏夹播放页,以及在本扩展抽屉内打开的视频;
- 位置:设置 → 通用 → "视频内推广标记(SponsorBlock)"。

## 🔧 相对原项目的修复(按版本)

### v0.41.2(接手基线)

- 首页推荐迁移到 B 站现行 **WBI V8** 接口(原 V2 接口已失效);
- 过滤广告卡片与缺少 `owner`/`stat` 的不完整卡片;分页与刷新加入请求代数守卫,防止旧响应污染新列表。

### v0.41.3(安全加固)

- Firefox 多账户容器:Cookie 收集仅限 B 站域,凭证头不再以明文形式残留于网络请求;
- 后台消息代理增加发送者校验;窗口消息增加 origin 校验;
- `web_accessible_resources` 从 `<all_urls>` 收敛到实际注入的站点;移除未使用的 `tabs` 权限;
- 升级 vue-i18n / dompurify,生产依赖漏洞清零。

### v0.41.4(消息层重构)

- 后台消息监听器改为启动时直接注册(原先依赖 webext-bridge 的端口连接"偶然"生效,冷启动首条消息可能丢失);
- 完全移除 webext-bridge 运行时依赖(此前以 devDependency 身份被打进产物,依赖审计覆盖不到);
- Firefox 请求头改写改由凭证头自身触发,过滤范围从 `<all_urls>` 收敛到 B 站域名。

### v0.41.5 – v0.41.6(健壮性)

- Firefox 请求头改写改为 fail-closed(异常时凭证头仍被剥离),门控逻辑提取为纯函数并有测试;
- 设置导入增加校验(JSON 解析 + 自有属性检查);过滤正则非法时跳过而非崩溃;
- 修复 inject 脚本 `toString` 伪装失效;抽屉打开畸形 URL 时优雅降级;
- 移除未使用的 popup/options 演示页面(产物从 53 文件降至 27 文件)。

### v0.41.7(重载体验)

- 扩展重载/更新后,旧页面不再刷 "Extension context invalidated" 错误(检测 context 失效并静默停摆);
- 修复搜索框回车与横向滚动的 passive 事件告警(preventDefault 实际失效)。

### v0.41.9(Firefox 安全修复)

- 修复推广功能代理请求在 Firefox 下把含 B 站登录凭据的 Cookie 头带给第三方 bsbsb.top 的问题(双重域名门禁);
- 播放器重建 `<video>` 后自动重新挂接(清晰度切换/试看转正不再静默失效);
- 试看/预览场景下标记不再无限重画;站内切换防抖;支持稍后再看/收藏夹播放页。

## ⚠️ 与原项目的权限差异

- 新增:`https://bsbsb.top/*`(仅当开启推广标记/跳过功能时使用,匿名请求);
- 移除:`tabs`、`webRequest`(Chrome 构建保留 Firefox 专有的 `webRequest`/`webRequestBlocking`/`cookies`)。

## 🧪 开发

```bash
corepack pnpm install
corepack pnpm dev            # 开发模式
corepack pnpm build          # 生产构建(输出到 extension/)
corepack pnpm exec vitest run  # 单元测试(34 个)
```

## 📄 许可证

[MIT](LICENSE) © 原项目作者 Hakadao 及上游贡献者;本分支的改动同样以 MIT 发布。
