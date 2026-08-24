# openSiri 图标资产清单

迁移自 Easydict 后，所有品牌图标已从 openSiri 现有位图源派生。本文列出每个
图标槽位的**用途、规格、当前来源和是否需要手工重做**，供逐项替换。

## 权威品牌源

| 文件 | 规格 | 内容 |
| --- | --- | --- |
| `OpenSiri/App/Icons/blue-white-icon/blue-white-icon@2x.png` | 1024²  RGBA | 圆角矩形应用图标：白色环形标 + Siri 光谱渐变底 |
| `website/public/opensiri-logo-monochrome-v2.png` | 1024²  RGBA | 单色环形标，黑色、透明底（alpha 即形状遮罩） |
| `website/public/opensiri-logo-color-v2.png` | 1024²  RGBA | 彩色线条环形标，透明底 |

> 三份源均只有 1024²。凡目标尺寸大于 1024 的槽位都做了放大，见下表「需重做」列。

---

## 一、需要你手工提供（派生结果不够好）

### 1. 菜单栏图标 —— 优先级最高

| 项 | 内容 |
| --- | --- |
| 路径 | `OpenSiri/App/Assets.xcassets/menu-icon/square_menu_bar_icon.imageset/square.png`<br>`OpenSiri/App/Assets.xcassets/menu-icon/rounded_menu_bar_icon.imageset/rounded.png` |
| 规格 | square 40×40（@2x 槽位）、rounded 44×44（@2x 槽位） |
| 使用场景 | 常驻 macOS 顶部菜单栏。用户可在「设置 → 通用 → 菜单栏图标」二选一，由 `MenuBarIconType` 枚举驱动（`OpenSiri/App/OpenSiriApp.swift:124`） |
| 当前状态 | 已用单色环形标缩放填充 |
| **为什么要重做** | 环形标中间那道 S 曲线在 40 px 下笔画过细，menu bar 里发虚。菜单栏图标需要专门加粗笔画、放大留白的**小尺寸特调版本**，不是等比缩小 |
| 建议 | 提供 40×40 和 44×44 两张纯黑透明底 PNG（menu bar 会自动处理深浅色反转）；若想支持自动染色，在两个 `Contents.json` 的 `properties` 里加 `"template-rendering-intent": "template"` |

### 2. 应用图标（Icon Composer 包）

| 项 | 内容 |
| --- | --- |
| 路径 | `OpenSiri/App/Icons/OpenSiri-26.icon/`（`icon.json` + `Assets/opensiri-mark.png`） |
| 规格 | 图层画布 1024×1024 |
| 使用场景 | **这就是 App 真正的图标**——Dock、访达、聚焦、关于面板。由构建设置 `ASSETCATALOG_COMPILER_APPICON_NAME = "OpenSiri-26"` 指定 |
| 当前状态 | 单图层，整图直接使用权威品牌应用图标（渐变底 + 白环已合成）。已用 `actool` 编译验证通过，产出 `Assets.car` + `OpenSiri-26.icns` |
| **为什么要重做** | 单图层意味着浅色 / 深色 / 着色（tinted）三种外观用的是同一张图，不会随系统外观自适应。原 Easydict 包是 4 组 5 图层、逐图层分别调过三种外观的精修作品 |
| 建议 | 用 Xcode 自带的 **Icon Composer** 打开该 `.icon` 包，把环形标和渐变底拆成独立图层后逐项调三种外观 |

#### 踩过的两个坑（重做时注意）

1. **`linear-gradient` 只接受恰好 2 个颜色。** 写 7 段光谱会让 actool 抛
   `attempt to insert nil object from objects[0]`——异常信息本身毫无指向性，
   真正的原因印在它上一行：`Linear gradients require exactly 2 colors`。
   需要多段渐变就烘焙成 PNG 图层，别写进 `icon.json`。
2. **白色图层在亮色底上会被玻璃材质冲淡到几乎看不见。** 试过
   `glass: false`、`specular: false`、去掉 `translucency`、把阴影加到 0.5，
   白环依旧发灰。`fill-specializations` 指定的纯白会被 Icon Composer 的材质
   处理吃掉——所以最终改用整图烘焙。

调试用的最小复现环境（不必跑完整 Xcode 构建）：

```bash
xcrun actool --compile /tmp/icon-out --app-icon OpenSiri-26 --output-partial-info-plist /tmp/icon-out/p.plist --platform macosx --minimum-deployment-target 13.0 --target-device mac --include-all-app-icons OpenSiri/App/Icons/OpenSiri-26.icon
```

再用 `iconutil -c iconset /tmp/icon-out/OpenSiri-26.icns -o /tmp/preview.iconset` 导出各尺寸目视检查。

### 3. 大尺寸位图（源图仅 1024，已放大）

| 路径 | 目标尺寸 | 使用场景 |
| --- | --- | --- |
| `Assets.xcassets/logo.imageset/icon_ns_512x512@3x.png` | 1536² | 「关于」面板的产品图（`AboutTab.swift:19` 的 `Image(.logo)`） |
| `Assets.xcassets/blue-white-icon.imageset/blue-white-plain@2x.png` | 1760² | 划词后浮现的查询小圆钮（`EZPopButtonViewController.m:31`） |
| `Icons/*-icon/*-icon@3x.png` | 1536² | 散落源文件，见下文 |

**为什么要重做**：这三处目标尺寸超过 1024 源图，做了 LANCZOS 放大，边缘会有轻微
软化。给一份 ≥1760² 的圆角矩形应用图标源即可一次性解决全部。

---

## 二、已完成、无需手工介入

| 路径 | 尺寸 | 使用场景 | 派生方式 |
| --- | --- | --- | --- |
| `Assets.xcassets/white-black-icon.appiconset/` | 16²–1024²，共 10 张 | `Info.plist` 的 `CFBundleURLIconFile`（`opensiri://` URL scheme 图标），兼作旧系统 app icon 回退 | 从 1024 源**缩小**，无损 |
| `Assets.xcassets/logo.imageset/icon_ns_512x512@2x.png` | 1024² | 同上「关于」面板 | 等尺寸 |
| `Assets.xcassets/blue-white-icon.imageset/blue-white-plain@1x.png` | 880² | 同上查询小圆钮 | 缩小 |

> ⚠️ 注意：你此前替换过 `Icons/blue-white-icon/`，但代码里 `imageNamed:@"blue-white-icon"`
> 解析到的是 **`Assets.xcassets/blue-white-icon.imageset`**，不是 `Icons/` 目录。
> 那次替换对 App 没有生效，本次已一并修正。

---

## 三、可以直接删掉的历史包袱

这些是 Easydict 留下的散落文件，**代码和构建设置都不引用**：

| 路径 | 说明 |
| --- | --- |
| `Icons/black-white-icon/`、`cyan-white-icon/`、`white-black-icon/`、`white-blue-icon/`、`blue-white-icon/` | 早期菜单栏配色方案的源图。当前 `MenuBarIconType` 只有 square / rounded 两项，不读这些目录。已统一刷成 openSiri 图，但建议直接删除，只保留 `blue-white-icon@2x.png` 作为品牌源 |
| `Assets.xcassets/blue-white-icon_old.imageset/` | 上游遗留 |
| `Assets.xcassets/white-black-icon_old.appiconset/` | 上游遗留 |
| `Assets.xcassets/logo_old.imageset/` | 上游遗留 |

删除前用 `grep -rn '资源名' OpenSiri/` 复核一遍即可。

---

## 四、非品牌图标（未改动，也不需要改）

`Assets.xcassets` 下这些是功能性 UI 图形，与品牌无关，全部保持原样：

- `service-icon/` —— 各翻译服务商 logo（Google、DeepL、OpenAI 等），**属于各厂商商标，不可替换**
- `setting/`、`titlebar/`、`result_view/` —— 设置页、标题栏、结果卡片的功能图标
- `arrow-*`、`copy*`、`audio`、`magnifier*`、`fold_*` 等 —— 通用操作图标
