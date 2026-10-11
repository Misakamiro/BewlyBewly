# BewlyBewly(个人维护分支)

<p align="center" style="margin-bottom: 0px !important;">
<img width="300" alt="BewlyBewly icon" src="https://cdn.jsdelivr.net/gh/BewlyBewly/Imgs/logos/bewlybewly-vtuber-logo.png"><br/>
</p>

<p align="center">基于 <a href="https://github.com/hakadao/BewlyBewly">hakadao/BewlyBewly</a> <code>v0.41.1</code> 的个人维护分支</p>

上游项目已停止维护。本分支在其基础上继续修复问题、跟进 B 站接口变化并添加功能。所有改动均可在本仓库的提交历史与 Release 中查证。

> 界面介绍、完整功能列表与截图见[上游 README](https://github.com/hakadao/BewlyBewly#readme)。
> 本分支基于 MIT 许可证开源,感谢原作者 Hakadao 与所有上游贡献者。

## 📦 安装

**从 Release 安装(推荐)**

1. 到 [Releases](https://github.com/Misakamiro/BewlyBewly/releases) 下载最新版本的 `extension.zip`;
2. 解压到一个固定的空目录(不要解压到临时目录——之后挪动目录会让扩展失效);
3. 打开扩展管理页:Edge 为 `edge://extensions`,Chrome 为 `chrome://extensions`;
4. 打开「开发人员模式」,点击「加载解压缩的扩展」,选择第 2 步解压出的目录;
5. 刷新已经打开的 B 站页面。

> 更新版本时:用新版本覆盖解压目录的内容,然后在扩展管理页点一次「重新加载」。
> 本分支未上架任何扩展商店,商店里的同名扩展与本分支无关。

**从源码构建**

```bash
corepack pnpm install
corepack pnpm build          # 产物输出到 extension/
```

Firefox 使用 `corepack pnpm build-firefox`(产物在 `extension-firefox/`)。本分支不发布 Safari 版本。

> 注意:构建产物目录 `extension/` 与 `extension.zip` 都被 `.gitignore` 忽略,**不在仓库里**。从仓库克隆后必须自己构建,或直接从 Release 下载。

## ✨ 相对上游新增的功能

### 视频内推广标记与自动跳过(v0.41.8)

- 在播放器进度条上用琥珀色标出 UP 主的恰饭/自推广片段;
- 可开启自动跳过:播放进入片段时自动跳到段尾并弹出提示;
- 分段数据来自 [BilibiliSponsorBlock](https://github.com/hanydd/BilibiliSponsorBlock) 社区数据库(bsbsb.top),**匿名 GET、不携带任何 Cookie**;两个开关都关闭时不产生任何请求;
- 覆盖多 P 视频(按分 P `cid` 精确匹配)、站内切换视频、稍后再看与收藏夹播放页,以及在本扩展抽屉内打开的视频;
- 开关位置:设置 → 通用 → 「视频内推广标记(SponsorBlock)」。

## 🔧 版本变更

| 版本 | 类型 | 摘要 |
| --- | --- | --- |
| **0.41.15** | 修复 | 用户面板等级经验条进度算错;依赖漏洞清理 |
| 0.41.14 | 修复 | 主页顶栏与壁纸之间的横向断层(根因修复) |
| 0.41.13 | — | 仅内部撤回,未发布(见下方说明) |
| 0.41.12 | 修复 | 顶栏搜索框下方的投影弧带;顶栏切换器误触发 |
| 0.41.11 | 修复 | 顶栏渐变雾层的中途停靠点造成的断层线 |
| 0.41.10 | 修复 | 顶栏原生衬底条底边的硬边 |
| 0.41.9 | 安全 | Firefox 下推广请求可能向第三方携带 B 站 Cookie 凭证 |
| 0.41.8 | 功能 | 视频内推广标记与自动跳过 |
| 0.41.7 | 修复 | 重载扩展后的 "Extension context invalidated";passive 事件告警 |
| 0.41.6 | 修复 | 设置导入校验、过滤正则健壮性、清理死入口(产物 53 → 27 文件) |
| 0.41.5 | 安全 | Firefox 请求头改写改为 fail-closed |
| 0.41.4 | 重构 | 后台消息监听直接注册;移除 webext-bridge 运行时依赖 |
| 0.41.3 | 安全 | 容器 Cookie 仅限 B 站域、发送者/origin 校验、权限收敛 |
| 0.41.2 | 修复 | 首页推荐迁移到现行 WBI V8 接口;过滤广告与不完整卡片 |

### 0.41.15

- **修复用户面板的等级经验条**:此前用 `current_exp / next_exp` 计算进度,而 B 站 `level_info.current_exp` 是账号**累计**经验,导致 Lv2–Lv5 的进度条系统性偏大。现按本等级区间 `(current_exp - current_min) / (next_exp - current_min)` 计算,并收敛到 0–100;新旧两套顶栏共用同一个纯函数,由 9 个单测锁定。
- 升级 `dompurify` 到 3.4.16,并固定 `source-map-js` 传递依赖版本。`pnpm audit --prod` 由 5 项降为 1 项——仅剩 `vue` 的 SSR 传递依赖,它不随扩展产物发布(详见 `.github/workflows/ci.yml` 中的说明)。

### 0.41.14(主页顶栏断层,根因修复)

设置壁纸后,主页顶栏与壁纸之间存在一条横贯页面的分界线。根因是主页顶部叠了**两层不透明白色背景**——B 站原生顶栏衬底条 + bewly 的渐变雾层,壁纸实际从约 64px 处才开始显示。修复方式是在主页顶部把两者彻底透空:壁纸从页面最顶端完整显示,顶栏元素直接浮于其上。

> 0.41.10–0.41.12 分别处理过三个真实存在但**不同**的痕迹(衬底条硬边、雾层渐变拐点、搜索框投影弧带),均未命中用户所报的这条线,因此随 0.41.13 全部撤回后改做根因修复。0.41.13 是一次内部撤回,没有发布。

### 0.41.2 – 0.41.9

- **推荐流**:迁移到 B 站现行 WBI V8 接口(原 V2 接口已失效),过滤广告卡片与缺少 `owner`/`stat` 的不完整卡片,分页与刷新加入请求代数守卫;
- **安全**:Firefox 多账户容器的 Cookie 仅收集 B 站域,并按目标域名双重门禁(任何情况下都不向第三方域名携带 B 站凭证);后台消息与窗口消息增加来源校验;`web_accessible_resources` 收敛到实际注入的站点;移除 `tabs` 权限;
- **稳定性**:后台消息监听改为启动时直接注册,移除以 devDependency 身份混入产物的 webext-bridge;Firefox 请求头改写改为 fail-closed;扩展重载后旧页面静默停摆,不再刷 "Extension context invalidated";设置导入与过滤正则的健壮性;注入脚本 `toString` 伪装修复;移除 popup/options 死入口。

## 🔒 权限与隐私

| 项目 | 说明 |
| --- | --- |
| 新增权限 | `https://bsbsb.top/*` — 仅在开启推广标记/自动跳过时使用,匿名请求 |
| 移除权限 | `tabs`;`webRequest` 仅在 Firefox 构建中保留(多账户容器场景需要) |
| 第三方请求 | 开启推广功能时,视频页会把 BV 号匿名 GET 到 bsbsb.top;两个开关都关闭时不产生任何请求 |
| 已知遗留 | `@iconify/vue` 的字符串图标会在运行时请求 `api.iconify.design`,该域名未在 manifest 中声明(上游遗留) |

## 🧪 开发

```bash
corepack pnpm install      # 依赖(pnpm 9.5.0,由 packageManager 固定)
corepack pnpm dev          # 开发模式
corepack pnpm build        # 生产构建 → extension/
corepack pnpm test         # 单元测试(vitest)
corepack pnpm typecheck    # vue-tsc
corepack pnpm lint         # eslint
corepack pnpm knip         # 死代码检查
corepack pnpm audit --prod --audit-level=critical   # 生产依赖漏洞门禁
```

提交前请确认以上门禁全部通过。

## ⚠️ 适用范围

- 不发布 Safari 版本;
- Firefox 构建可用,但维护者不使用 Firefox,未在真实 Firefox 上做过完整回归;
- 关注、收藏夹、历史、稍后再看等登录态功能未做过系统性回归。

## 📄 许可证

[MIT](LICENSE) © 原项目作者 Hakadao 及上游贡献者。本分支的改动同样以 MIT 发布。
