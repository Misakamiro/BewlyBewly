# BewlyBewly 维护交接文档

更新时间：2026-09-06（Asia/Hong_Kong）
项目目录：`C:\Users\misakamiro\Documents\ChatGPT\哔哩哔哩插件`
维护分支：`codex/maintenance-v0.41.1`
源码基线：官方归档 `v0.41.1`，提交 `1e2f5f10a299bd53a1f9200004af07764e5946c7`
> **2026-09-14 更新**：第 1–9 节为 v0.41.2 交接时的历史记录。接手维护者已完成五轮全面审计与四层自动化测试，当前维护版本为 **0.41.7（已验收合格，见第 15 节）**，全部改动均已提交到本分支。**以最后一节为准。**

## 1. 当前结论

当前维护版本为 **BewlyBewly `0.41.2`**。首页推荐已迁移到当前哔哩哔哩 WBI V8 接口，生产 ZIP 已构建并通过真实 Edge 页面验证。

当前没有提交或推送。工作树保留本次维护改动，不能使用 `git reset --hard`、`git clean`、批量 restore 或覆盖用户已有文件。

用户之前删除的 `0.42` 工作树不应恢复，也不应把它作为源码或修复依据。

## 2. 已完成源码改动

### 首页推荐接口

文件：`src/background/messageListeners/api/video.ts`

- 旧接口 `/x/web-interface/index/top/feed/rcmd` 改为 `/x/web-interface/wbi/index/top/feed/rcmd`。
- 参数更新为 `fresh_type=4`、`feed_version=V8`、`homepage_ver=1`、`ps=30`、`fresh_idx=1`。
- 移除旧 `plat` 参数。

### 推荐卡片兼容过滤

文件：`src/utils/recommendation.ts`、`src/contentScripts/views/Home/components/ForYou.vue`

- 过滤 `goto === 'ad'` 的广告卡片。
- 过滤 `owner === null` 或 `stat === null` 的不完整卡片。
- API 返回 `undefined`、缺少 `data`、非零错误码时停止继续递归请求。
- `fresh_idx` 只在成功响应后递增。
- 保留登录错误码 `62011` 的登录提示逻辑。

### 数据模型

文件：`src/models/video/forYou.ts`

- 允许 `owner`、`stat`、`rcmd_reason` 和新版扩展字段为空或变化。
- 增加 `Goto.AD`。

### 背景页请求工具

文件：`src/background/utils.ts`

- 新增 `serializeParams`：修复 `0`/`false`/`''` 等假值参数被丢弃的问题。
- 新增 `cloneHeaders`：防止逐请求写入 Cookie 时污染 API 定义中共享的 headers 对象。

（此小节为 2026-09-13 补记，原清单遗漏了该文件。）

### 测试与构建链

- 新增 `src/tests/recommendationCompatibility.spec.ts`，覆盖 WBI endpoint、参数和异常卡片过滤。
- `package.json` 版本从 `0.41.1` 更新为 `0.41.2`。
- `scripts/prepare.ts` 将硬编码的 `npx esno` 改为 `pnpm exec esno`，修复 Windows/Codex Node 环境的生产构建问题。
- `.gitignore` 与 `eslint.config.mjs` 忽略 `.evidence`，避免浏览器证据目录参与源码 lint。

## 3. 已完成验证

使用项目自带 Node 运行时时，如果当前 PowerShell 找不到 Node，先执行：

```powershell
$env:PATH='C:\Users\misakamiro\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;'+$env:PATH
$env:NODE_PATH='C:\Users\misakamiro\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
```

源码门禁：

```text
pnpm exec vitest run  -> 3 个测试文件，5 个测试通过
pnpm typecheck        -> 通过
pnpm lint             -> 通过
pnpm build            -> 通过
pnpm pack:zip         -> 通过
```

生产产物：

```text
manifest name       : BewlyBewly
manifest version    : 0.41.2
manifest_version    : 3
CSP                 : script-src 'self'; object-src 'self'
extension.zip bytes : 16,126,448
extension.zip SHA256: DB196BCD36AAB10C9F8963780EBB3F62DE15B89ECC1B0F40753C8FF30EF4454C
```

交付文件：`C:\Users\misakamiro\Documents\ChatGPT\哔哩哔哩插件\extension.zip`

ZIP 解压后独立加载冒烟也通过，检测到 `#bewly`、版本 `0.41.2`、透明度 `1`。

## 4. 真实浏览器证据

最新最终浏览器报告：

`C:\Users\misakamiro\Documents\ChatGPT\哔哩哔哩插件\.evidence\final-2026-08-15T13-49-42-875Z`

浏览器：Microsoft Edge `151.0.4129.86`。

已验证页面：

- 哔哩哔哩首页
- 热门页
- 番剧首页
- 搜索页
- 动态页
- 用户空间页
- 真实视频播放页
- 真实番剧播放页

关键结果：

- 首页挂载 `BewlyBewly 0.41.2`。
- 扩展发出的 WBI 推荐请求连续返回 `HTTP 200 / code 0`。
- 首页有实际推荐视频卡片。
- 视频播放器约 `972 x 593`，番剧播放器约 `980 x 597`。
- 未发现扩展自身的 `TypeError`、`ReferenceError` 或加载错误。
- B 站自身 `404`、`bili-user access_key`、`COLS response timeout` 等噪声已与扩展错误区分，不能归因于本次源码改动。

认证态功能仍未使用用户真实登录会话验证：正在关注、订阅剧集、通知、收藏夹读写、历史记录、稍后再看、登录二维码轮询和 APP 推荐授权。继续维护时不要把这些说成已经完成。

## 5. Edge 启动内存调查与清理结果

证据目录：

`C:\Users\misakamiro\Documents\ChatGPT\哔哩哔哩插件\.evidence\edge-memory-audit-20260815-220644`

调查目标是确认旧 `0.42` 时出现的 Edge 扩展审查数据库异常是否仍会导致启动瞬时高内存。

### 发现的扩展记录

当前 Edge `Default` Profile 原先存在三个未打包 Bewly 记录：

```text
aafnihhaeomgdknbpaacmdlonjjoeien -> 当前 0.41.2，路径为本维护仓库 extension，保留
ediffboekdmdpjejafllcdhamfpckapf -> 旧 0.41.1，路径 extension_3，已移除
fjglbbmboamlmehekhadbaofkgjllaah -> 旧 Downloads extension，禁用，已移除
```

旧 `fjglbbmboamlmehekhadbaofkgjllaah` 的安全审查遥测约 28 个文件哈希、约 5.4 KB，不是数百 MB 级数据库。

### 清理动作

清理前备份：

`C:\Users\misakamiro\Documents\ChatGPT\哔哩哔哩插件\.evidence\edge-memory-audit-20260815-220644\pre-clean-backup-20260815-230123`

备份包含 Preferences、Secure Preferences、Local State、扩展 LevelDB 目录、旧 Bewly 本地扩展设置和 SHA-256 清单，共 57 个文件，约 15.66 MB。

通过 Edge 管理页和 `--uninstall-extension` 对未打包残留没有实际移除效果，因此在 Edge 完全退出且备份完成后，精确移除了：

- 两个旧 Bewly ID 的 `Secure Preferences` 记录。
- 对应保护 MAC 条目。
- 旧安全审查遥测条目。
- 两个旧 ID 的 `Local Extension Settings` 目录，并移动到备份隔离区。

当前 `0.41.2` 的扩展设置和保护 MAC 保留，Edge 启动后没有重新生成旧 ID 或旧遥测。

### 45 秒冷启动峰值

采样为同一 Edge `Default` Profile，约 100 ms 一次。

| 场景 | Working Set 峰值 | Private 峰值 |
|---|---:|---:|
| 清理前第一次全扩展启动 | 2.56 GB | 1.83 GB |
| 清理前稳定全扩展启动 | 1.14 GB | 706 MB |
| 清理后第一次全扩展启动 | 1.15 GB | 703 MB |
| 清理后第二次全扩展启动 | 1.16 GB | 710 MB |
| 只加载当前 0.41.2 | 663 MB | 378 MB |
| 只加载旧 0.41.1 | 664 MB | 371 MB |
| 只加载其他扩展 | 232 MB | 122 MB |
| 禁用全部扩展 | 570 MB | 321 MB |

结论：

- 当前 `0.41.2` 单独启动没有复现 1 GB 以上异常峰值。
- 旧 Bewly 记录清理前后，全扩展稳定峰值几乎不变。
- 原先一次性的 `2.56 GB / 1.83 GB` 峰值没有稳定重现，不能说清理动作修复了它。
- 当前约 `1.15 GB / 0.70 GB` 的全扩展启动峰值属于 Edge Profile 组合行为，后续应调查 Edge 会话恢复、其他扩展或内置服务，不应继续把问题归因于 `0.41.2` 首页推荐代码。

测试结束后 Edge 进程数为 `0`。

## 6. 用户目录与交付边界

用户原始成品目录没有覆盖：

`C:\Users\misakamiro\Downloads\Compressed\extension\`

该目录仍为原始 `0.41.1`，本维护交付使用仓库根目录生成的 `extension.zip`。

不要把源码构建目录、Edge 证据、备份目录或旧扩展本地设置复制回 Downloads 原始目录，除非用户明确要求。

## 7. 当前 Git 状态

当前工作树预期包含以下维护改动：

```text
M  .gitignore
M  eslint.config.mjs
M  package.json
M  scripts/prepare.ts
M  src/background/messageListeners/api/video.ts
M  src/contentScripts/views/Home/components/ForYou.vue
M  src/models/video/forYou.ts
?? src/tests/recommendationCompatibility.spec.ts
?? src/utils/recommendation.ts
```

`src/auto-imports.d.ts` 已确认与 HEAD blob 哈希一致，不是有效源码改动。

没有创建提交，也没有 push。

## 8. 下一次任务启动检查

1. 确认当前目录和分支：

   ```powershell
   Set-Location 'C:\Users\misakamiro\Documents\ChatGPT\哔哩哔哩插件'
   git status --short --branch
   ```

2. 不要 reset、clean、stash、批量 restore 或恢复 `0.42`。

3. 若继续调查 Edge 内存，先确认 Edge 已完全退出，再复制 `Preferences` 和 `Secure Preferences`，不要直接解析正在写入的 live 文件。

4. 若用户要求再次打包，使用：

   ```powershell
   $env:PATH='C:\Users\misakamiro\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;'+$env:PATH
   $env:NODE_PATH='C:\Users\misakamiro\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
   pnpm exec vitest run
   pnpm typecheck
   pnpm lint
   pnpm build
   pnpm pack:zip
   ```

5. 打包后重新核对 `manifest.json` 版本、ZIP SHA-256 和 ZIP 解压加载，不要只报告构建日志成功。

## 9. 建议下一次使用的技能

- 继续排查 Edge/浏览器性能：`diagnose` 或 `systematic-debugging`。
- 需要真实页面回归：`playwright` 或 `browse`。
- 修改推荐或接口行为：`test-driven-development`，先补失败测试再改实现。
- 准备交付前：`verification-before-completion`。

## 10. 2026-09-13 全面审计与安全加固（接手维护者执行）

### 结论

当前维护版本 **BewlyBewly `0.41.3`**。v0.41.2 的交接改动与本次加固改动均已提交到 `codex/maintenance-v0.41.1`（`2098519e` 为交接改动提交，本节所在提交即加固提交）。仍然禁止 `git reset --hard`、`git clean`、批量 restore；不要覆盖 `C:\Users\misakamiro\Downloads\Compressed\extension\`；不要恢复旧 `0.42` 工作树。

### 安全修复

- Firefox 多账户容器 Cookie 收集改为只取 `bilibili.com` 域（`src/background/utils.ts` 的 `FIREFOX_CONTAINER_COOKIE_DOMAIN` / `getFirefoxContainerCookies`），不再把容器内其他站点的 Cookie 发给 B 站；`src/background/index.ts` 把自定义头转换为 `Cookie` 后不再把 `firefox-multi-account-cookie` 留在网络上。原实现为 P1（整罐跨站 Cookie 明文外发，仅 Firefox 构建受影响）。
- 后台消息监听器（`apiListenerFactory`）新增 `isTrustedMessageSender` 校验：仅接受扩展自身上下文与 bilibili.com/hdslb.com 来源。浏览器本身已阻止普通网页直接调 `runtime.sendMessage`（无 `externally_connectable`、无 `onMessageExternal`），此为纵深防御。
- `openLinkInBackground` 增加 URL scheme 校验，仅允许 http/https。
- 新增 `src/tests/backgroundSecurity.spec.ts` 覆盖上述校验。

### 推荐流行为修复

- `ForYou.vue`（web 与 app 两分支）：整页被过滤器滤空时不再立即终止推荐流，改为连续 3 个滤空页才停止（`MAX_CONSECUTIVE_FILTERED_EMPTY_PAGES`）；接口本身返回空列表仍立即终止。

### manifest 收敛

- `web_accessible_resources` 的 matches 从 `<all_urls>` 收敛为内容脚本实际注入的 10 个 bilibili/hdslb 站点（防任意网站探测扩展资源做指纹识别），`src/manifest.ts` 中提取为 `contentScriptMatches` 复用。
- 移除 `tabs` 权限：全仓库只用过 `tabs.create`（该 API 无需 `tabs` 权限），移除后消除"读取浏览记录"类安装警告。

### 依赖

- `vue-i18n` 9.13.1 → 9.14.5，`dompurify` 3.1.5 → 3.4.15。
- `package.json` 新增 pnpm overrides 强制传递依赖补丁版本：`nanoid >=3.3.18`、`postcss >=8.5.23`。
- 结果：`pnpm audit --prod` **0 漏洞**（此前 34 个）。开发依赖仍有约 139 个告警，全部在构建工具链（vite 5 等）中，不随产物发布，暂不处理。
- 本机 node_modules 曾因 virtual-store 参数不匹配无法 update，已用 `CI=true corepack pnpm install` 按 lockfile 重建，属正常可复现操作。

### 构建链修复

- `scripts/prepare.ts` 不再 shell 出去调用 `pnpm exec esno`（execSync 走 cmd.exe，PATH 上没有 pnpm 时构建必败），改为直接 `import { writeManifest } from './manifest'`；`scripts/manifest.ts` 去掉尾部自执行、变为纯导出模块。构建链现在不依赖 PATH 上存在 npx/pnpm。
- `.gitignore` 与 `eslint.config.mjs` 增加 `.mimosa`（Mimosa 钩子状态目录，曾被 eslint 误扫出 1200+ 错误）。
- 本机环境统一用 `corepack pnpm <cmd>`（9.5.0，与 packageManager 一致）代替 `pnpm`；无需再配置第 8 节的 PowerShell PATH。

### 验证记录（2026-09-13）

```text
pnpm audit --prod    -> No known vulnerabilities found
pnpm exec vitest run -> 4 个测试文件，11 个测试通过
pnpm typecheck       -> 通过
pnpm lint            -> 通过
pnpm build           -> 通过
pnpm build-firefox   -> 通过（Firefox 权限保留，验证后已清理 extension-firefox/）
pnpm pack:zip        -> 通过
```

生产产物：

```text
manifest name       : BewlyBewly
manifest version    : 0.41.3
manifest_version    : 3
permissions         : storage, declarativeNetRequest（已移除 tabs）
WAR matches         : 10 个 bilibili/hdslb 站点
extension.zip bytes : 16,130,626
extension.zip SHA256: 5FFCB09153959EBCB8D8CA8C58C814CB2887DF0437100DB2BEF916A281561870
```

ZIP 解压冒烟通过：manifest 0.41.3，`dist/contentScripts`、`dist/inject`、`dist/background` 三入口与 `assets/rules.json` 齐全，WBI 端点已进入 background bundle。**真实浏览器回归未重做**：本节验证为静态/单测/构建级，Edge 实机加载验证停留在 v0.41.2（第 4 节）；下次交付前建议按第 8 节流程重跑浏览器冒烟。

### 已知遗留

- Iconify 运行时第三方请求：`@iconify/vue` 字符串图标会在 B 站页面运行时拉取 api.iconify.design（未在 manifest 声明），隐私/可用性问题，本次未修。
- 登录态功能（关注/订阅/通知/收藏夹/历史/稍后再看/扫码登录/APP 推荐授权）仍未用真实会话验证，不要声称已完成。
- `src/utils/appSign.ts` 曾在审计中被误判为死代码，实际被 `src/utils/authProvider.ts` 的 TV 登录签名使用，**不能删除**。
- git 提交身份为仓库局部配置 `misakamiro <misakamiro@local>`（占位邮箱），如需正式身份请修改 `git config user.email` 后续提交使用。
- 顶栏双实现、列表加载逻辑重复、设置水合 `setTimeout(200ms)` 等结构性债务已在审计中记录，未在本次处理。

## 11. 2026-09-14 第二轮审计与修复（v0.41.4）

第二轮全量审计（门禁重跑 + 安全/架构双重复扫 + 加固 diff 专审）后修复以下问题：

### 消息监听器注册（第二轮 P1-可靠性发现）

- `src/background/messageListeners/api/index.ts` 与 `tabs.ts` 改为在 `setupXxxMsgLstnrs()` 中直接把处理器注册到 `runtime.onMessage`，删除了原先"只有 onConnect 端口连上才安装真正监听器"的偶然注册模式（该模式依赖 webext-bridge 打开的端口：若移除相关 import 会使整个 API 代理静默失效，且后台冷启动后首条消息可能丢失）。
- 移除 webext-bridge 运行时依赖：`src/logic/common-setup.ts` 删除 `getCurrentContext`（其唯一产物 `$app.context` 全仓库零引用），`shim.d.ts` 删除对应类型增强，`package.json` 移除 `webext-bridge` devDependency。该包此前是"devDependency 却随内容脚本 bundle 发布"，`pnpm audit --prod` 覆盖不到。构建产物已确认 contentScripts/background 两个 bundle 中 `webext-bridge` 与 `onConnect` 均 0 命中。

### Firefox 请求头处理（第二轮 P2 残留）

- `src/background/index.ts` 的 webRequest 监听器不再以 `details.documentUrl` 存在与否为门（原实现下 documentUrl 缺失时自定义头会原样上网），改为：携带 `firefox-multi-account-cookie` 的请求一律处理；无该头且无文档的请求（顶级导航）不动。
- 过滤器从 `<all_urls>` 收敛为 `*://*.bilibili.com/*` + `*://*.hdslb.com/*`，不再触碰用户其他浏览流量。
- 头处理逻辑提取为纯函数 `rewriteBilibiliRequestHeaders`（`src/background/utils.ts`）并有单元测试锁定。

### 信任边界补齐（第二轮 P3）

- `tabs.ts` 的 `handleMessage` 补上 `isTrustedMessageSender` 校验（此前仅 API 监听器有）。
- 新增 `src/utils/trust.ts` 的 `isTrustedWebPageOrigin`，`IframeDrawer.vue` 与 `App.vue` 的 window message 监听补 origin 校验（仅接受 bilibili/hdslb 来源）。
- `src/background/utils.ts` 显式导入 webextension-polyfill 的 `browser`（后台 bundle 由 tsup 构建、无 AutoImport，原先裸用全局 `browser` 仅在 Firefox 原生全局下成立）。

### 测试

- `backgroundSecurity.spec.ts` 新增 webRequest 头转换、`isSafeOpenUrl`、`isTrustedWebPageOrigin` 三组测试，总计 15 个测试。

### 验证记录（2026-09-14）

```text
pnpm exec vitest run -> 4 个测试文件，15 个测试通过
pnpm typecheck       -> 通过
pnpm lint            -> 通过
pnpm build           -> 通过
pnpm build-firefox   -> 通过（验证后已清理 extension-firefox/）
pnpm pack:zip        -> 通过
pnpm audit --prod    -> No known vulnerabilities found
```

生产产物：

```text
manifest version    : 0.41.4
extension.zip bytes : 16,124,891
extension.zip SHA256: 7BA845E5DA205D5F8190ADA5522979543B9BACEED50D70F5F5676FC98013040D
bundle 检查          : 两个 bundle 中 webext-bridge 与 onConnect 均 0 命中
```

### 仍然遗留

- **Edge 实机浏览器回归停留在 v0.41.2（见第 4 节）**；0.41.3/0.41.4 均为静态/单测/构建级验证。0.41.4 改动了消息注册与 Firefox 头处理两条运行时路径，交付前务必做一次真实浏览器冒烟（Firefox 构建尤其需要）。
- Iconify 运行时第三方请求、access_key GET 传参、Firefox 对 B 站页面请求的 Origin/Referer 改写语义（现收敛到 B 站域内）等上游遗留仍在。
- git 提交身份仍为占位 `misakamiro <misakamiro@local>`。

## 12. 2026-09-14 第三轮审查收尾修复（v0.41.5）

第三轮全量审查确认 v0.41.4 全部修复有效、无可达回归后,把仅剩的两个 P3 理论项修掉:

- `src/background/index.ts` webRequest 监听器 fail-closed:documentUrl 畸形导致解析异常时不再放弃改写(改为按扩展自身请求处理,凭证头仍被转换剥离);`details.requestHeaders` 缺失时直接放弃改写,杜绝返回空数组清空全部请求头的理论边角。
- 门控逻辑提取为纯函数 `shouldRewriteBilibiliRequestHeaders`(`src/background/utils.ts`),4 个用例锁定(凭证头必改写、带文档改写、无文档跳过、requestHeaders 缺失跳过)。
- `isTrustedMessageSender` 白名单加入 `safari-web-extension:`(消除 Safari 构建未来启用扩展页面时的休眠回归)。

验证(2026-09-14):vitest 19/19、typecheck、lint、build、build-firefox、pack:zip 全绿。

```text
manifest version    : 0.41.5
extension.zip bytes : 16,124,901
extension.zip SHA256: 38FF5F807A1461B2B87AF24CD5F93FE0F347E8BEB309523041549D5AA5EE47C2
```

Edge 实机冒烟已于 2026-09-14 由用户完成并确认正常(首页推荐出卡片、滚动加载、右键后台打开等运行时路径),0.41.2 以来改动的 Chromium 侧路径至此有真实浏览器验证。Firefox 实测未做:用户不使用 Firefox,已接受;Firefox 头处理路径仅有构建级验证。

## 13. 2026-09-14 第四轮审查遗留 P3 清理(v0.41.6)

第四轮审查报告的 6 项 P3 处理结果:5 项已修,1 项(DNR 三方 POST 改写)确认为上游设计且无干净收窄方式,记录为接受。

- **设置导入校验**(`About.vue`):`JSON.parse` 包 try/catch,非对象/数组拒绝;合并改为 own-property 检查(堵住 `__proto__` 等原型链键);失败时 toast 提示;文件选择监听器改 `{ once: true }`(顺带修复取消对话框后监听器累积、重复导入的既有小毛病)。
- **useFilter 正则健壮性**:`/.../` 正则关键词编译包 try/catch,非法正则跳过并 `console.warn`,不再让单个坏关键词弄崩整个过滤链。病态正则导致的自身卡顿属于该特性固有语义,记录为接受。
- **inject 脚本 toString 伪装修复**:`fn.toString = origin[key].toString.bind(origin[key])`,`history.pushState.toString()` 重新返回 `[native code]`。
- **openIframeDrawer**:`new URL` 全部纳入 try,URL 畸形时退回新标签页打开,点击处理不再崩溃。
- **移除 popup/options 死入口**:删除 `src/options`、`src/popup` 六个文件与 `storageDemo` 导出;`vite.config.ts` 去掉 `rollupOptions.input`;`vite-mv3-hmr.ts` 移除对应 entry 遍历(dev-only,是移除入口后 dev server 的崩溃点);`scripts/prepare.ts` 去掉 stubIndexHtml;`knip.json` 移除对应 entry;`package.json` 构建链移除 `build:web`(其唯一产出就是这两个死页面;`dev:web` HMR 服务保留)。ZIP 从 53 文件/16,124,901 字节降至 27 文件/16,042,385 字节,已逐项核对仅减少死页面产物。
- **DNR 一项的接受说明**:规则对第三方 POST 改写 Origin/Referer 属上游设计;B 站写操作均需 body 中的 `bili_jct`(跨站页面不可得),单独改写不构成可利用攻击;DNR 无法精确表达"仅扩展自身请求",强行收窄可能弄坏 Chrome 的 API 调用,故保留原样。

验证(2026-09-14):vitest 19/19、typecheck、lint、knip、build、build-firefox、pack:zip 全绿。

```text
manifest version    : 0.41.6
extension.zip bytes : 16,042,385
extension.zip SHA256: 7F0B907F2D0C4E345A21144899FF9924F5D7FD42804BB7C5776DD6BF903E8808（最终规范打包）
```

注意：jszip-cli 输出非确定性——同一 extension/ 目录每次重新 pack:zip 会得到不同的 SHA（字节数一致）。核对交付物时以"manifest 版本 + 字节数 + 文件清单"为准，哈希只对当次打包的 zip 本身有效。
```

注:本版移除了构建产物中的死页面,建议交付前在 Edge 重载一次确认设置页"导入设置"按钮仍正常(该组件本轮有改动)。

## 14. 2026-09-14 重载报错诊断与修复(v0.41.7)

用户在 Edge 重载扩展后看到两类报错,诊断结论:均非 0.41.2 以来任何改动引入,属重载固有现象 + 上游既有问题,本轮顺手加固修复。

- **"Extension context invalidated" ×4**:重载扩展后,重载前打开的 B 站标签页里仍存活旧内容脚本,它们向已被替换的后台发消息就会抛此错——重载未打包扩展的固有现象,非代码 bug。加固:新增 `isBackgroundMessagingAvailable()`(`src/utils/api.ts`),以 `browser.runtime.id` 检测 context 失效,失效后消息通道静默返回 undefined、仅提示一次;`src/utils/tabs.ts` 同样接入。此后重载扩展,旧页面不会再刷此类错误。
- **"Unable to preventDefault inside passive event listener" ×1**:上游两处既有问题——`HorizontalScrollView.vue` 的 wheel 监听未声明 `{ passive: false }` 就调用 preventDefault;`SearchBar.vue` 的 Enter 处理被误加 `.passive` 修饰(使搜索回车的 preventDefault 实际失效)。两处均已修复。

验证(2026-09-14):vitest 19/19、typecheck、lint、build、build-firefox、pack:zip 全绿。

```text
manifest version    : 0.41.7
extension.zip bytes : 16,042,663
extension.zip SHA256: D5AED82A3FC9BE8AECEE4DA1B73DD4E2084785D9781AEEBB10C022E327FFC771
```

交付后建议:Edge 重载 0.41.7,点错误面板"全部清除",正常浏览一段后不应再出现上述两类报错;搜索框回车不再产生 passive 告警。

## 15. 2026-09-14 验收审查与自动化测试(验收合格)

按"全面审查 → 全部通过则全面自动化测试 → 双通过即验收合格"的流程执行第五轮审查与四层自动化测试,结论:**验收合格**。

### 审查结果(第五轮,双维度)

- **安全维度:ACCEPT** — v0.41.7 diff 逐项验证正确(守卫不可能误判健康 context;后台 bundle 不经过守卫;模块级 flag 每次页面加载重置;SearchBar 回车无双触发),全库新鲜眼扫描无新 P0-P2。
- **架构维度:ACCEPT** — 无回归,提交信息与 diff 相符,版本标记一致,遗留债务无恶化。
- 已知接受项(不阻塞):部分消费端 `.then` 中 `res.code` 未判空(孤儿页面上错误签名从 rejection 变为 TypeError,同一错误类别);文档横幅日期笔误已随手修正。

### 自动化测试结果(四层)

1. **静态套件**:vitest **21/21**(新增 context 失效守卫的"失效锁存"与"健康路径"两个测试)、typecheck、lint、knip、`pnpm audit --prod` 0 漏洞 — 全绿。
2. **构建矩阵**:Chromium ✓ / Firefox 0.41.7 ✓(Firefox 专属权限完整)/ Safari 0.41.7 ✓;`pack:zip` ✓。
3. **测试中发现并修复**:Edge 会向加载中的未打包扩展目录写入 `_metadata/generated_indexed_rulesets`(DNR 索引,浏览器运行时产物),曾被打进 zip;`pack:zip` 已加 `-i "_metadata/**"` 排除。zip 恢复 27 文件/16,042,663 字节,SHA256 `6DEBA441583F1326A6584B7688D88EC6D2A9C16244CC07B63BCE01215C9817AB`(以本次打包为准,jszip-cli 非确定性见第 13 节注记)。
4. **真实浏览器端到端**(playwright + Edge,独立 profile,加载 `extension/`):**9/9 PASS** —
   - T1 首页 `#bewly` 挂载、opacity 1
   - T2 版本 0.41.7 匹配
   - T3 WBI 推荐接口 12/12 全部 HTTP 200 / code 0
   - T4 推荐卡片 110 个视频链接
   - T5 滚动分页卡片 110 → 278(验证 ForYou 递归与滤空兜底)
   - T6 搜索框回车正确跳转 search.bilibili.com(验证 `.passive` 修复)
   - T7 视频页播放器正常
   - T8a 无 "Extension context invalidated"
   - T8b 无扩展归属的控制台错误(唯一 pageerror 为 B 站自家 log-reporter 的 COLS timeout,见第 4 节既有噪声)
   - 证据:`.evidence/acceptance-2026-09-14T*/`(report.json + 3 张截图),脚本 `.evidence/acceptance-v0417.cjs`

### 验收结论

**BewlyBewly 0.41.7 验收合格**,作为本维护分支的交付基线。
