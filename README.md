# 紫藤炼金工坊 · Codex Dream Skin

本仓库保存当前主题、背景图和针对 Dream Skin **1.5.20** 的渲染补丁。

紫色正文与次要文字（`#5c4e7a`）、左亮右暗的偏白遮罩、侧栏奶白底、聊天气泡磨砂，以及标题栏、输出内容面板和输入框的材质调整均保留。输入框上方的排队／引导消息行单独增加浅色磨砂底；输入框内的“与 Codex 协作”提示不加白条。

## 安装

先安装并运行 Dream Skin 1.5.20，再在本仓库目录运行：

```powershell
.\install.ps1 -Check
.\install.ps1
```

脚本使用 Dream Skin 自带的 Node，校验版本、渲染脚本语法和 Safe CSS，然后备份并安装。安装会激活此主题，并将此主题整体透明度设置为 84。运行中的注入器通常自动载入；如果未刷新，重新启动 Dream Skin 注入器。

仅导入 `custom-wisteria-alchemy-shop` 文件夹可安装基础主题。标题栏、输出面板、渐变遮罩和引导消息行需要渲染补丁，普通 Safe CSS 无法表达这些规则。补丁仅在本主题启用时生效，不修改 Codex 的 `app.asar`。

## 恢复

安装输出中会显示备份目录：

```powershell
.\install.ps1 -Restore 'C:\Users\你的用户名\AppData\Local\CodexDreamSkin\skin-backups\备份时间'
```

Dream Skin 升级可能覆盖补丁。脚本对其他版本会停止，需先核对新版本结构；当前选择器基于 Codex Windows 26.1007.2314.0。代码校验不等于屏幕效果验证，显示效果仍应在实际应用中确认。
