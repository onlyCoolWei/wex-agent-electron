# macOS 签名与公证全流程指南

> 适用于 MoreAI Electron 应用的官网分发场景：Developer ID 签名 → Notarization 公证 → Staple → 发布。

---

## 目录

1. [前置条件](#1-前置条件)
2. [申请 Developer ID 证书](#2-申请-developer-id-证书)
3. [导入证书到 Keychain](#3-导入证书到-keychain)
4. [生成 App 专用密码](#4-生成-app-专用密码)
5. [配置环境变量](#5-配置环境变量)
6. [项目配置说明](#6-项目配置说明)
7. [执行构建打包](#7-执行构建打包)
8. [验证签名与公证](#8-验证签名与公证)
9. [上传到官网更新源](#9-上传到官网更新源)
10. [CI/CD 集成要点](#10-cicd-集成要点)
11. [常见问题排查](#11-常见问题排查)

---

## 1. 前置条件

| 项目                     | 要求                           |
| ------------------------ | ------------------------------ |
| Apple Developer Program  | 已加入（$99/年），账号状态正常 |
| macOS 版本               | 建议 13.0+（Ventura 或更高）   |
| Xcode Command Line Tools | `xcode-select --install`       |
| Node.js                  | 18+                            |
| pnpm                     | 已安装                         |

确认 Xcode CLI 工具已就绪：

```bash
xcode-select -p
# 应输出类似 /Library/Developer/CommandLineTools 或 /Applications/Xcode.app/Contents/Developer
```

---

## 2. 申请 Developer ID 证书

### 2.1 通过 Xcode 自动管理（推荐）

1. 打开 Xcode → Settings → Accounts
2. 登录你的 Apple Developer 账号
3. 选择对应 Team → Manage Certificates
4. 点击左下角 "+" → 选择 **Developer ID Application**
5. Xcode 会自动生成密钥对、提交 CSR、下载并安装证书到 Keychain

### 2.2 通过 Apple Developer 网站手动申请

如果你没有安装 Xcode（比如在 CI 机器上），可以手动操作：

**Step 1：生成 CSR（证书签名请求）**

```bash
# 打开 钥匙串访问 → 证书助理 → 从证书颁发机构请求证书
# 或用命令行：
openssl req -new -newkey rsa:2048 -nodes \
  -keyout developer_id.key \
  -out developer_id.csr \
  -subj "/emailAddress=你的AppleID邮箱/CN=Developer ID Application/C=CN"
```

**Step 2：在 Apple Developer 后台创建证书**

1. 登录 https://developer.apple.com/account/resources/certificates
2. 进入 Certificates, Identifiers & Profiles → Certificates
3. 点击 "+" 创建新证书
4. 选择 **Developer ID Application**（用于在 App Store 之外分发的应用签名）
5. 上传刚才生成的 `.csr` 文件
6. 下载生成的 `.cer` 证书文件

### 2.3 查看 Team ID

在 Apple Developer 后台 → Membership details 页面可以看到 10 位字符的 Team ID（如 `ABCDE12345`），后续配置需要用到。

---

## 3. 导入证书到 Keychain

### 3.1 本地开发机

双击下载的 `.cer` 文件，系统会自动打开钥匙串访问并导入。

验证证书已正确安装：

```bash
security find-identity -v -p codesigning
```

你应该能看到类似输出：

```
1) ABCDEF1234567890... "Developer ID Application: Your Name (TEAM_ID)"
```

> 记住这个完整的证书名称，electron-builder 会自动匹配 `Developer ID Application` 开头的证书进行签名。

### 3.2 CI 环境导入证书

在 CI 中需要从 `.p12` 文件导入：

**导出 .p12（在本地机器上操作一次）：**

1. 打开钥匙串访问
2. 找到 "Developer ID Application: ..." 证书
3. 右键 → 导出 → 选择 `.p12` 格式
4. 设置一个导出密码（CI 中需要用到）

**CI 中导入：**

```bash
# 创建临时 Keychain
security create-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
security default-keychain -s build.keychain
security unlock-keychain -p "$KEYCHAIN_PASSWORD" build.keychain

# 导入 .p12 证书
security import certificate.p12 \
  -k build.keychain \
  -P "$P12_PASSWORD" \
  -T /usr/bin/codesign

# 允许 codesign 访问
security set-key-partition-list -S apple-tool:,apple: -s -k "$KEYCHAIN_PASSWORD" build.keychain
```

---

## 4. 生成 App 专用密码

公证需要使用 App 专用密码（不是你的 Apple ID 登录密码）：

1. 访问 https://appleid.apple.com
2. 登录 → 安全 → App 专用密码
3. 点击 "生成 App 专用密码"
4. 输入标签名（如 `MoreAI Notarize`）
5. 记录生成的密码（格式如 `xxxx-xxxx-xxxx-xxxx`），只会显示一次

---

## 5. 配置环境变量

### 5.1 本地开发

在项目根目录创建 `.env.local`（已在 `.gitignore` 中，不会被提交）：

```bash
# .env.local
APPLE_ID=你的AppleID邮箱
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=你的TeamID
```

### 5.2 CI 环境

在 CI 平台（GitHub Actions / GitLab CI 等）的 Secrets 中配置同名变量即可。

### 环境变量说明

| 变量                          | 说明                     | 示例                  |
| ----------------------------- | ------------------------ | --------------------- |
| `APPLE_ID`                    | Apple Developer 账号邮箱 | `dev@example.com`     |
| `APPLE_APP_SPECIFIC_PASSWORD` | App 专用密码             | `abcd-efgh-ijkl-mnop` |
| `APPLE_TEAM_ID`               | 10 位开发者团队 ID       | `ABCDE12345`          |

---

## 6. 项目配置说明

项目中已经配置好了以下文件，这里做简要说明。

### 6.1 electron-builder.json（mac 部分）

```jsonc
{
  "mac": {
    "notarize": false, // 禁用内置公证/stapler，由 afterSign 仅做 notarytool 提交；避免 staple 失败（如 code 68）阻断构建
    "hardenedRuntime": true, // 启用 Hardened Runtime（公证必需）
    "entitlements": "build/entitlements.mac.plist", // 主进程 entitlements
    "entitlementsInherit": "build/entitlements.mac.plist", // 子进程继承
    "gatekeeperAssess": false, // 跳过本地 Gatekeeper 检查（公证后再验证）
    "extendInfo": {
      "NSCameraUsageDescription": "...", // 摄像头权限说明
      "NSMicrophoneUsageDescription": "...", // 麦克风权限说明
      "NSAudioCaptureUsageDescription": "...", // 系统音频权限说明
    },
  },
  "afterSign": "build/notarize.js", // 签名后自动触发公证
}
```

### 6.2 build/entitlements.mac.plist

Electron 在 Hardened Runtime 下运行所需的最小权限集：

| Entitlement                           | 用途                |
| ------------------------------------- | ------------------- |
| `cs.allow-jit`                        | V8 JIT 编译         |
| `cs.allow-unsigned-executable-memory` | Electron 运行时需要 |
| `cs.allow-dyld-environment-variables` | 动态库加载          |
| `device.camera`                       | 摄像头访问          |
| `device.audio-input`                  | 麦克风访问          |

### 6.3 build/notarize.js

`afterSign` hook 脚本，在 electron-builder 完成 Developer ID 签名后自动：

1. 读取环境变量（支持从 `.env.local` / `.env` 加载）
2. 调用 `@electron/notarize` 提交公证
3. 缺少环境变量时优雅跳过（不阻断构建）

---

## 7. 执行构建打包

### 7.1 完整构建命令

```bash
# 确保依赖已安装
pnpm install

# 构建 + 签名 + 公证（一条命令搞定）
pnpm electron:build:mac
```

这条命令会依次执行：

1. `BUILD_TARGET=electron pnpm build` — Vite 构建前端
2. `pnpm build:electron` — 编译 Electron 主进程 TypeScript
3. `electron-builder --mac` — 打包 + Developer ID 签名 + 触发 afterSign 公证

### 7.2 构建产物

构建完成后在 `release/` 目录下会生成：

```
release/
├── MoreAI-x.y.z-arm64.dmg          # Apple Silicon DMG（官网首装用）
├── MoreAI-x.y.z-arm64.dmg.blockmap
├── MoreAI-x.y.z.dmg                # Intel DMG
├── MoreAI-x.y.z.dmg.blockmap
├── MoreAI-x.y.z-arm64-mac.zip      # Apple Silicon ZIP（自动更新用）
├── MoreAI-x.y.z-arm64-mac.zip.blockmap
├── MoreAI-x.y.z-mac.zip            # Intel ZIP（自动更新用）
├── MoreAI-x.y.z-mac.zip.blockmap
├── latest-mac.yml                   # electron-updater 更新清单
└── mac/                             # 解压后的 .app
    └── MoreAI.app/
```

- **DMG** → 放官网下载页，用户双击安装
- **ZIP + latest-mac.yml** → 上传到 `https://moreai.cc/updates/`，供 electron-updater 自动更新

---

## 8. 验证签名与公证

构建完成后，务必执行以下验证。

### 8.1 验证代码签名

```bash
# 验证 .app 签名
codesign --verify --deep --strict --verbose=2 "release/mac/MoreAI.app"
codesign --verify --deep --strict --verbose=2 "release/mac-arm64/MoreAI.app"

# 期望输出：
# release/mac/MoreAI.app: valid on disk
# release/mac/MoreAI.app: satisfies its Designated Requirement
```

### 8.2 验证 Gatekeeper 评估

```bash
# 验证 .app
spctl -a -vv "release/mac/MoreAI.app"
spctl -a -vv "release/mac-arm64/MoreAI.app"
# 期望输出：
# release/mac/MoreAI.app: accepted
# source=Notarized Developer ID

# 验证 .dmg
spctl -a -vv --type install "release/MoreAI-x.y.z-arm64.dmg"
# 期望输出：
# release/MoreAI-x.y.z-arm64.dmg: accepted
# source=Notarized Developer ID
```

### 8.3 验证公证状态（Staple）

```bash
# 检查 staple 是否已附加
stapler validate "release/mac/MoreAI.app"
stapler validate "release/mac-arm64/MoreAI.app"

# 期望输出：
# The validate action worked!
```

> `@electron/notarize` 在公证成功后会自动执行 `stapler staple`，通常不需要手动操作。
> 如果验证失败，可以手动 staple：
>
> ```bash
> xcrun stapler staple "release/mac/MoreAI.app"
> xcrun stapler staple "release/MoreAI-x.y.z-arm64.dmg"
> ```

### 8.4 验证 Info.plist 权限声明

```bash
# 确认 Usage Description 已写入
/usr/libexec/PlistBuddy -c "Print NSCameraUsageDescription" \
  "release/mac/MoreAI.app/Contents/Info.plist"

/usr/libexec/PlistBuddy -c "Print NSMicrophoneUsageDescription" \
  "release/mac/MoreAI.app/Contents/Info.plist"

/usr/libexec/PlistBuddy -c "Print NSAudioCaptureUsageDescription" \
  "release/mac/MoreAI.app/Contents/Info.plist"
```

### 8.5 验证 Entitlements

```bash
codesign -d --entitlements - "release/mac/MoreAI.app"
# 应该能看到 plist 中定义的所有 entitlement key
```

---

## 9. 上传到官网更新源

自动更新配置使用 generic provider，更新源地址为 `https://moreai.cc/updates/`。

需要上传到服务器的文件：

```bash
# 必须上传（自动更新依赖）
release/MoreAI-x.y.z-arm64-mac.zip
release/MoreAI-x.y.z-arm64-mac.zip.blockmap
release/MoreAI-x.y.z-mac.zip
release/MoreAI-x.y.z-mac.zip.blockmap
release/latest-mac.yml

# 官网下载页提供
release/MoreAI-x.y.z-arm64.dmg
release/MoreAI-x.y.z.dmg
```

上传后确认 `https://moreai.cc/updates/latest-mac.yml` 可以正常访问。

---

## 10. CI/CD 集成要点

如果使用 GitHub Actions，核心步骤参考：

```yaml
# .github/workflows/build-mac.yml 关键片段
env:
  APPLE_ID: ${{ secrets.APPLE_ID }}
  APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
  APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}

steps:
  # 1. 导入签名证书（从 base64 编码的 .p12）
  - name: Import Code Signing Certificate
    env:
      P12_BASE64: ${{ secrets.MAC_CERTIFICATE_P12_BASE64 }}
      P12_PASSWORD: ${{ secrets.MAC_CERTIFICATE_PASSWORD }}
    run: |
      echo "$P12_BASE64" | base64 --decode > certificate.p12
      security create-keychain -p actions build.keychain
      security default-keychain -s build.keychain
      security unlock-keychain -p actions build.keychain
      security import certificate.p12 -k build.keychain -P "$P12_PASSWORD" -T /usr/bin/codesign
      security set-key-partition-list -S apple-tool:,apple: -s -k actions build.keychain
      rm certificate.p12

  # 2. 安装依赖 & 构建
  - run: pnpm install
  - run: pnpm electron:build:mac
```

CI 中需要配置的 Secrets：

| Secret                        | 说明                      |
| ----------------------------- | ------------------------- |
| `APPLE_ID`                    | Apple 开发者邮箱          |
| `APPLE_APP_SPECIFIC_PASSWORD` | App 专用密码              |
| `APPLE_TEAM_ID`               | Team ID                   |
| `MAC_CERTIFICATE_P12_BASE64`  | `.p12` 证书的 base64 编码 |
| `MAC_CERTIFICATE_PASSWORD`    | 导出 `.p12` 时设置的密码  |

生成 base64 编码：

```bash
base64 -i certificate.p12 | pbcopy
# 粘贴到 GitHub Secrets
```

---

## 11. 常见问题排查

### Q: 构建卡住，如何查看公证进度？

构建过程中 `afterSign` 会提交 Apple 公证，公证耗时取决于 Apple 服务端，有时会很慢甚至超时。可以用以下命令查看公证历史和状态：

```bash
# 查看所有公证提交记录（从 .env 读取凭据）
source .env && xcrun notarytool history \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_APP_SPECIFIC_PASSWORD" \
  --team-id "$APPLE_TEAM_ID"

# 查看某条公证的详细信息（替换 <submission-id> 为上面命令返回的 ID）
source .env && xcrun notarytool info <submission-id> \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_APP_SPECIFIC_PASSWORD" \
  --team-id "$APPLE_TEAM_ID"

# 查看公证失败的详细日志
source .env && xcrun notarytool log <submission-id> \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_APP_SPECIFIC_PASSWORD" \
  --team-id "$APPLE_TEAM_ID"
```

> 如果状态长时间停留在 `In Progress`，可能是 Apple 服务端拥堵。可以 `Ctrl+C` 终止构建，稍后重试。

### Q: 构建时报 "No identity found for signing"

证书未安装或名称不匹配。运行 `security find-identity -v -p codesigning` 确认有 `Developer ID Application` 证书。

### Q: 公证报错 "The software is not signed with a valid Developer ID certificate"

- 确认使用的是 **Developer ID Application** 证书（不是 Mac App Distribution）
- 确认 `hardenedRuntime: true` 已开启

### Q: 公证报错 "The signature does not include a secure timestamp"

electron-builder 默认会加 `--timestamp`，如果仍然报错，检查网络是否能访问 Apple 的时间戳服务器。

### Q: 公证成功但 staple 失败（code 68 / SSL error -1200）

若 `notarytool log <id>` 显示 `status: Accepted`，说明公证已通过，应用可以分发。staple 失败多为**本机连 Apple 票据服务**（api.apple-cloudkit.com）时出现 SSL/网络问题（如 VPN、代理、防火墙）。

- **可直接发布**：未 staple 的包在用户首次运行时会由 Gatekeeper 在线验证，行为正常。
- **需要本地附带票据时**：在能直连 Apple 的网络下（关 VPN/代理后）执行：
  ```bash
  xcrun stapler staple "release/mac/MoreAI.app"
  xcrun stapler staple "release/mac-arm64/MoreAI.app"
  xcrun stapler staple "release/MoreAI-x.y.z.dmg"
  xcrun stapler staple "release/MoreAI-x.y.z-arm64.dmg"
  ```

### Q: 公证成功但 spctl 验证失败

可能 staple 没有成功附加。手动执行：

```bash
xcrun stapler staple "release/mac/MoreAI.app"
xcrun stapler staple "release/MoreAI-x.y.z-arm64.dmg"
```

### Q: 用户打开 App 提示 "已损坏，无法打开"

通常是因为没有公证或 staple。让用户临时绕过（不推荐长期使用）：

```bash
xattr -cr /Applications/MoreAI.app
```

根本解决方案是确保公证 + staple 流程正确完成。

### Q: 摄像头/麦克风权限弹窗不出现

检查 Info.plist 中是否包含对应的 `UsageDescription` key（见 [8.4 节](#84-验证-infoplist-权限声明)）。

### Q: 屏幕录制权限

屏幕录制不需要 Info.plist key 或 entitlement，是纯运行时 TCC 授权。用户需要在 **系统设置 → 隐私与安全性 → 屏幕录制** 中手动勾选 MoreAI，授权后可能需要重启应用。

### Q: 辅助功能权限

同屏幕录制，是运行时 TCC 授权。在 **系统设置 → 隐私与安全性 → 辅助功能** 中勾选。应用内应做好未授权时的降级处理和引导提示。
