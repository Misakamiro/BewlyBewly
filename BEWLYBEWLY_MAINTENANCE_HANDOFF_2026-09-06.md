# BewlyBewly 维护交接文档

更新时间：2026-09-06（Asia/Hong_Kong）
项目目录：`C:\Users\misakamiro\Documents\ChatGPT\哔哩哔哩插件`
维护分支：`codex/maintenance-v0.41.1`
源码基线：官方归档 `v0.41.1`，提交 `1e2f5f10a299bd53a1f9200004af07764e5946c7`

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
