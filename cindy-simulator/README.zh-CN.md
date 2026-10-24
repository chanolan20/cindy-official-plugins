# 设备模拟器

需要 macOS 15.0 或更新版本；旧系统会在启动随包二进制之前明确返回 UNSUPPORTED_OS。

## 统一操作规则

iPhone、iPad、Apple TV 和 Vision Pro 共用主屏幕、截图、查看缩放及操作说明入口。
动作按钮单击执行；模式、开关和折叠姿态使用相同的选中高亮。临时拖动视角按钮保持
原来的模式。悬停提示说明操作和快捷键，触屏也可打开统一的操作说明，查看当前设备
支持的输入方式。窄窗口下工具栏换行时，画面会留出对应空间。

## Apple TV 与 Vision Pro

可在管理页或任务页新建设备，选择已安装的 tvOS 或 visionOS 运行时（后者标识为
`xrOS`）。项目构建目标分别选择 `tvOS Simulator` 或 `visionOS Simulator`，再按原流程
安装、启动对应 `.app`。两者均支持矩形实时画面、截图、本机 OCR、等待和日志。
跨平台切换设备不会搬运原平台的 App。

Apple TV 使用画面下方遥控器，或 `press` 的 `up`、`down`、`left`、`right`、`select`、
`back`、`menu`、`home`、`play-pause`；也可用方向键、回车、Esc 和空格。
`type_text auto/type` 支持至多 300 字符的 US 键盘逐字输入，也支持 keys；
tvOS 运行时不提供模拟器剪贴板，不支持粘贴及 Unicode 文本。
在实时画面内双指移动触控板会发送连续的原生 Siri Remote 触点；长滑可以跨过多个
选项，焦点移动由 tvOS 按触摸轨迹处理。单击确认当前焦点项，右键返回（macOS 也
支持 Control 点击）。点击位置不会直接选中电视画面上的坐标。使用 macOS 自然滚动
时，焦点跟随手指移动，横纵两轴均与网页滚动增量反向。桌面滚动事件包含系统加速和
惯性，也没有真实的抬指信号，因此时序和手感仍不等同于实体遥控器。
Vision Pro 参照[苹果 Device Hub 的操作](https://developer.apple.com/documentation/xcode/interacting-with-your-visionos-app-in-device-hub)：
点击、长按和拖动对应捏合操作，Shift 拖动控制远近，Control 拖动转向；工具栏提供
转向、平移、环绕、推拉和复位。直接拖动四个视角按钮可临时调整视角，保留当前指针模式；
单击按钮才切换画面拖动模式，悬停提示会说明两种操作。WASD/方向键水平移动，Q/E 下降/上升。触控板双指
滚动平移、捏合前后移动。Option 拖动或启用双手按钮后，横向缩放、纵向旋转。
键盘捕获开启时把文字、按键和粘贴传入设备；关闭时仅处理视角移动键。鼠标捕获发送相对移动和按键；Escape 退出捕获。
录屏按钮保存实时画面。捕获需要桌面查看器获得焦点且浏览器支持，拒绝时会提示。
标准游戏手柄在画面获得焦点时可导航：左摇杆移动、R2/L2 升降、右摇杆转向。
输入失败后先松开摇杆再继续；实体手柄验收尚未完成。

AI 可使用 `tap` 的截图坐标/OCR 文字、`press digital-crown`（或 `home`）、普通
拖动/滑动/缩放/双指平移，或 `gesture kind=spatial` 搭配
`action=drag|pinch|rotate|gaze|tilt|pan|orbit|dolly|move|reset`。
坐标使用截图视图点，空间相机平移单位为米、旋转单位为度。空间 `pan` 仅接收 `by=[右,上]`，
前后移动用 `move` 的 `[右,上,后]` 或 `dolly distance`；移动相机后重新截图。

屏幕旋转、折叠姿态、状态栏覆盖、触摸菜单粘贴、`scroll_to` 及 `heal` 仅用于 iOS。
tvOS/visionOS 所有查询模式均使用 OCR 文本列表（含 `mode=full` 和 `x,y` 点位查询），不提供无障碍树和元素 ID。
新增输入适配已验证 Xcode 27、tvOS/visionOS 27；其他版本尚未验证。
详见[原生协议及验证记录](native/platform-support.md)。正式版/Beta Cindy 整包安装及内嵌预览验收待完成。

[English](README.md)

截图在旧宿主上，或 JPEG 压缩后仍超过 130 KB 内联限制时，会返回文件路径。必须用读图工具打开后再选坐标，原分辨率文件仍保留。

查看器截图导出到 Mac 剪贴板或桌面时，确认写入返回 `executed`，写入命令发出后的失败返回 `unknown`；重试前检查目标。剪贴板临时图片的清理失败不覆盖导出结果。`environment.baguette` 来自二进制版本检测，兼容提示不再重复固定版号。

`describe_ui` 自动 OCR 失败会报错，只有识别成功才能返回空文字列表。任务绑定保存后，即使后续状态或画面读取失败（`taskStateError`），也保留已保存的 `boundUdid` 与 `execution: executed`。任务页启动、新建设备后的后续步骤失败也保留已完成结果；刷新任务状态，不要重复已完成的操作。新绑定状态不可读时，任务页会卸载旧设备画面。

录制等到完整首帧并确认画面后才执行动作；此前流故障或预算耗尽时返回 `captureError` 与 `execution: not_executed`。录屏流中断，或输出无法在清理时限内排空时，也返回 `captureError` 并保留动作结果，不生成联系表。诊断读取失败会随日志返回 `crashesError`；`crashes` 空列表只表示检查完成但未找到匹配报告。`crashes=false` 跳过该检查。

安装按包内容校验和比较，资源保留时间戳也不会漏过；安装登记或签名信息变化时整包安装。容器查询故障会报错，不作为 App 未安装的依据；自动安装会在写入前停止，日志查询也不扩大范围。后台安装完成写入前，设备保持占用。`method=touch` 拒绝搭配 `clear=true` 或 `keys`，以保留屏幕键盘；录帧会保留动作真实的执行状态。

Cindy 官方设备模拟器，适用于 Apple Silicon Mac，随包带 Baguette 0.2.10。它替代已下线的内置模拟器；原内置模拟器用户会在 Cindy 中看到一次指向这里的迁移提示（插件 ID 为 `cindy-simulator`）。插件 ID 与调用命令统一为 `cindy-simulator`（原为 `baguette-simulator` / `baguette`），继续沿用 `BaguetteCindy` 下的设备、设置和任务绑定。修改清单 ID 不会迁移市场条目或已安装插件身份；发布前需协调该切换，避免同时启用新旧两个 ID。名称为后续设备和平台扩展留出空间，不代表新增平台支持。需要 Cindy 0.1.83+、完整 Xcode 和已安装的 iOS runtime，首次运行不下载依赖。打包时通过 binary-dependencies.json 从固定哈希的官方归档收集九个可移植 USDZ 模型；原生可执行文件仍保留在 Git，仅支持 macOS。

iOS 模拟器任务默认使用。先 environment、devices，复用适合的已登录设备，必要时 `device action=boot`。App 仍由项目正常流程构建（独立设备用 `-destination 'generic/platform=iOS Simulator'`），再用 `app action=install`、`app action=launch` 安装和启动模拟器 .app。启动默认打开当前任务的模拟器页签；检查 viewer.previewOpened，不能把服务启动成功说成页面已显示。切换 session 后通过 `viewer action=open` 打开已有设备。

16 个 Agent 工具按意图分组：`environment`、`devices`、`device`（新建 / 启动 / 关机 / 改名 / 抹掉 / 删除）、`app`（安装 / 等待安装 / 信息 / 启动 / 结束 / 卸载 / 打开链接）、`screenshot`、`describe_ui`、`tap`、`gesture`、`type_text`、`press`、`wait_for`、`capture`、`set_state`、`logs`、`heal`、`viewer`。设计来自过去 Cindy 任务里模型实际做不好的地方：

- **真实触摸，不依赖窗口。** `tap` 与 `gesture`（滑动、拖放、双指缩放、双指平移、系统边缘手势、滚动到元素、双击、长按）走模拟器的 HID 触摸通道，Mac 锁屏也能用，App 收到的就是手指触摸。手册要求模型不要往 App 进程注入事件：那样会绕过触摸链路，过去出现过模拟器里“测过”、真机上点不动的假通过。
- **统一坐标。** 全部使用用户看到的视图点：截图按看到的方向摆正（横屏、折叠屏内屏），画出屏幕圆角与灵动岛，默认 1 像素 = 1 点，可叠加刻度网格或只截局部；`describe_ui` 返回带视图坐标与中心点的精简元素列表；`tap` 可按文字、identifier 与角色点元素。iPhone Duo 展开时，SpringBoard 的无障碍坐标比画面转了 90°（iOS 27.1 实测），插件会自动校正。
- **游戏。** 没有无障碍树的界面（游戏、引擎自绘），`describe_ui`、`tap text=…`、`wait_for text=…` 改用苹果本机 Vision 识别画面上的文字（画面不离开这台 Mac）。`type_text` 在普通 App 里粘贴，在常常不接受粘贴的游戏里逐键输入，并先把拼音等输入法切到英文。按坐标点击会绑定读坐标时的屏幕，屏幕转向后会拒绝而不是点错位置。
- **等待与转场。** `wait_for` 等元素出现或消失、画面（或某个区域）在容差内稳定（应对游戏背景动画）或日志出现某行，没等到时返回当时截图；`capture` 一边执行动作一边录帧，返回标注毫秒的联系表。
- **装对版本。** `app action=install` 遇到相同构建直接跳过，只改了少量文件时增量同步，否则整包安装，耗时长的返回 job；`app action=info` 比对已装可执行文件指纹与本地构建（`matchesLocal`），因为版本号相同不代表是同一次构建。
- **状态与诊断。** `set_state` 改方向、折叠姿态、外观、对比度、字号、网络条件、定位、干净状态栏与权限授权。所有步骤与读回共用请求截止时间。`applied` 列出已完成字段；失败或预算耗尽时停止后续步骤，`stateError` 返回失败字段 `field`、`code`、`message` 与 `execution`，先核对该字段，不整批重试。方向/姿态变化后的屏幕信息仅在剩余时间内确认成功时返回；`current` 中的 `null` 表示未确认。`logs` 读取 App 最近的统一日志并汇总本设备的崩溃报告。

手册（`manual/workflow/MANUAL.md`）给出完整工作流、构建方法、验证原则与异常恢复。同一台设备一次只执行一个操作，不同设备的普通输入可并行；保存共享应用记录的启动操作与全局操作复用全局锁。读取类操作（describe_ui、wait_for、logs）不等待输入。

明确关闭画面时会清除已有的重连地址，任务页轮询和工作进程重启不会把它重开；再次打开、启动设备或给任务分配设备后可以恢复。意外退出工作进程则保留重连地址，已打开的任务页可以自动接回。

两个界面：每个任务在右侧栏有自己的「设备模拟器」页签（只有画面和控制条，没有地址栏）；左侧导航的「模拟器」不跟对话，参考 Xcode Device Hub 做成左右分栏：左侧按「运行中」「已关闭」分组列出全部设备（超过六台显示搜索），每行显示机型、iOS 版本，以及空闲还是被任务在用；右侧显示选中设备的实时画面。**+** 可新建 iPhone 或 iPad，表单含名称、系统版本和机型（机型按所选系统版本筛选，名称在手动修改前跟随机型）。每行的 ⋯ 菜单或右键菜单提供启动 / 关闭、在当前任务中打开（仅当前面有任务且该任务还没在用这台设备时出现，伙伴对话也算）、改名、抹掉所有内容和设置…、删除…（后两项需确认；运行中的设备会先关机，删除同时清除它的任务绑定）。任务用哪台设备由 AI 打开模拟器时决定：devices 每行带 tasks、thisTask，可复用空闲设备或新建；启动设备、打开画面和启动 App 会把设备绑定到调用所属的任务（`~/Library/Application Support/BaguetteCindy/task-bindings.json`，权限 0600）。还没有设备或设备已关闭时，页签显示设备列表或「启动」，不留空白。宿主不支持任务页时回退到侧栏预览。

控制页由 Cindy 自己绘制：设备胶囊（状态圆点、设备名，点开可切换、添加、改名）、缩放控件（−、百分比菜单含适合窗口 / 实际大小 / 固定档位、+）和「更多」菜单（摇一摇、App 切换器、解除卡键、恢复画面、Baguette 高级工具、需确认的关闭设备）。主屏幕、截图、向左 / 向右旋转，以及折叠屏的合上 / 半展开 / 展开姿态浮在画面下方。快捷键与 Simulator 一致：⌘+ / ⌘− / ⌘0（适合窗口）/ ⌘1（实际大小）、Ctrl 滚轮缩放、⌘← / ⌘→ 旋转、⇧⌘H 主屏幕、⌘S 截图。缩放按设备记住；打开或重载只读取设备当前方向，不自动旋转；缩放保持中心，超出窗口时可滚动。截图按钮旁的小箭头可选截图存到桌面（提示里可「在访达中显示」）或剪贴板，选择会记住。内嵌的 Baguette 页面带边框渲染设备（`?handheld=0`；折叠屏保留 3D 视图），其工作台界面由注入样式隐藏。画面断开、闲置倒计时和设备已关闭都直接显示在画面位置，并提供恢复 / 继续使用 / 启动按钮；没有明确操作不会重启模拟器或 App。Agent 使用 press(button=release-input) 解除卡键。Unicode 粘贴会替换模拟器剪贴板；网页复制会替换 Mac 剪贴板。输入前观察焦点，之后核对结果；按键投递回调不代表 App 处理完成。

页面等逻辑页开始监听后，每项操作只发送一次；启动期间不会重放较慢的设备查询。查看器控制会等待工作进程的完整请求预算，包括截图保存到桌面或剪贴板。任务绑定、设备操作和安装轮询中的 UDID 不区分大小写，已有绑定继续可用。抹掉和删除直接返回操作结果；管理页随后独立刷新设备列表。

设备保存于 ~/Library/Application Support/BaguetteCindy/devices，Agent 截图与录帧在同级 screenshots、captures（一天后清理）。不会操作默认或 Cindy 内置设备；只有通过上面需确认的菜单项才会抹掉或删除设备。同 bundle ID 覆盖安装通常保留 App 数据，但登录态仍由 App 数据迁移、退出登录和服务端有效期决定。并发 Agent 不要交错操作同一设备。

heal 会重启 SpringBoard 并关闭 App，必须先让用户接受影响；卡键先尝试按键释放。`device action=shutdown` 关闭设备但保留数据，`viewer action=close` 只停止画面服务。`device action=erase|delete` 与 `app action=uninstall` 会删除数据，只在用户要求时使用。

## 自己控制设备

打开 **插件 → 设备模拟器**，可查看独立设备的实际状态、启动或关闭设备、打开画面、添加设备，以及全部关闭。关闭 **允许运行模拟器** 时先保存禁止启动状态，再关闭设备和画面服务；关机失败会明确显示，开关关闭期间工具不能重新启动设备。重新打开开关不会自动开机。设备数据和登录信息保留。

批量关机的设备枚举、每次关机、关闭查看器和状态复核共用一次请求截止时间。耗尽后不再派发后续步骤；结果保留 `completed`、逐设备 `outcomes` 与 `unprocessed`。`devicesError` 标明列表为未经复核的上次状态，不能据此认定全部关闭。工具与查看器的键盘/剪贴板输入复用既有设备锁：同一 UDID 的大小写变体仍互斥，不同设备可继续操作。

关闭设备（需确认）在「更多」菜单里；画面默认适应窗口。App 内双指缩放仍使用 Option 拖动或 Ctrl 滚轮，与画面大小分开。默认闲置 15 分钟关闭，可改为 30 分钟、1 小时或仅手动。画面窗口开着、或有其他工具或脚本在自己的命令行里点名这台设备（如 `simctl`、`xcodebuild -destination id=…`、Baguette 命令行）时不会因闲置关闭；设备输入和工具操作会重新计时，状态轮询不会。只要有设备或画面窗口开着，Cindy 就会保持插件工作进程运行。关机终止 App 和连接。全部独立设备共用闲置计时；修改闲置设置会重新计时。

设备胶囊菜单提供 **切换**、**添加设备** 和 **重命名**。添加时默认选中最新 iPhone 和它最新的已安装 iOS 版本（可改）；新设备保持关闭，切换到它才会启动。没有设备时，插件设置页提供一键 **创建第一台 iPhone**。改名保留 App 和数据；换机型或系统版本会新建独立设备，保留原设备。切换会先确认旧设备已关闭，再启动目标设备，并在同一预览显示进度；若还有其它运行中的独立设备，需先关闭。

插件在 `runtime-settings.json.apps.json` 记录各设备最近一次由插件成功启动的 App。从运行中的设备切换时，可把该 App 的模拟器应用包安装到目标设备并打开；系统 App 按标识符打开。不复制 App 数据、登录信息或凭证。没有记录时显示目标设备主屏；原设备已经关闭时，目标设备需已安装记录中的 App。不兼容或启动失败会显示实际设备状态，不保证两台设备有相同内容和登录态。

运行偏好保存在独立设备目录旁的 `runtime-settings.json`，本机使用该设备集合的入口共享。Worker 正常退出时尝试关机，但被强制终止可能来不及完成。在 Cindy 中停用插件 **之前**，先用设置页的运行开关关闭设备，并检查显示状态。预览关闭或断线不证明设备已经关闭。

## 安全与限制

Node Worker 有当前用户级本机权限。只调用固定可执行文件和命令形状，不提供任意 Shell 工具。控制页仅监听 127.0.0.1；剪贴板与控制请求校验来源、随机能力令牌和已打开的独立设备。能力令牌与画面端口一起保存在 `~/Library/Application Support/BaguetteCindy/viewer-session.json`（权限 0600），工作进程重启后已打开的页签可以自动接上；关闭运行开关时作废。不会提取账户令牌或转存到 Cindy。截图分析可能把画面送给模型；App 内操作可能造成外部业务副作用，仍须遵守任务授权。

画面的可选 OpenStreetMap 地图请求通过固定端点的 Node 代理发送；farm 页面使用本机字体回退，不请求远程字体。详见 VENDOR-REVIEW.md；这些功能不涉及同步模拟器账户。不会后台安装依赖。

上游 0.2.7 新增 App 偏好设置（UserDefaults）编辑卡片，可读取或改写任意已安装 App 的设置，并以注入 dylib 的方式重启 App。这些接口不使用独立设备目录，因此插件隐藏该卡片、在画面代理对相关接口返回 404，且不打包 `DefaultsLookups.dylib`。Handheld 模式为上游原有行为，仍只监听本机。

已知限制：iOS 27 上断开视频连接可能触发上游 SIGABRT。服务每分钟最多自动重启五次，独立控制页可手动恢复；这是缓解，不是原生崩溃根治。插件停用或 Cindy 退出时控制页也会停止，需要 Cindy 再次启动。设备数据跨任务保留，每个任务页签记住自己的设备。

## 构建与验证

原生 release 构建使用全程序 LTO 和 Swift -Osize、移除符号并临时签名，确保 Git 中二进制总量符合仓库限制。

在装有 Xcode 的 Apple Silicon Mac 上运行 sh native/build.sh，编译随包 Objective-C 源码并临时签名，不下载依赖；Baguette 和 HingeControl 基于 v0.2.10 重新编译，vendor-native.patch 只改版本号；运行 sh native/build-baguette.sh <已验证的源码压缩包> 可重建，之后运行 node native/inventory.mjs --write。本插件需要的独立设备目录与 3D 内存两处修复已合入上游（tddworks/baguette#122、#123）。运行 node .tests/baguette/real-simulator-smoke.mjs --foldable 可在临时设备目录中用真模拟器检查一次构建。

运行仓库契约和 .tests/cindy-simulator.test.mjs。审核 VENDOR-REVIEW.md、THIRD-PARTY-LICENSES.txt 和提案 #119：https://github.com/makecindy/cindy-official-plugins/issues/119。首发为空定向受众，不推送全体用户。最终包在合格 Cindy 客户端内的安装验证，必须与直接 Node/原生测试分开记录。

可选位置面板通过 Node Worker 向 OpenStreetMap 发送搜索词和地图瓦片请求，仅使用固定 HTTPS 端点 nominatim.openstreetmap.org 与 tile.openstreetmap.org。浏览器请求保持同源；拒绝重定向和任意上游 URL，不转发账号凭证。

画面代理的 HTTP 和 WebSocket 均要求令牌会话；控制页用片段中的令牌换取 HttpOnly 会话 Cookie。这不构成对同一 macOS 用户权限进程或直接访问上游 Baguette 监听端口的沙箱隔离。

## iPhone Duo 与 Xcode 兼容

普通设备保留 Xcode 26/27 路径。iPhone Duo 需要当前选用 Xcode 27.1，并已安装 iOS 27.1 runtime。上游预览页提供 Duo 3D 模型、内外屏、姿态按钮和折叠角度滑杆；切换姿态会改变模拟设备状态及前台 App 布局。模型直接读取 Xcode，不由插件下载。插件使用当前选定的 Xcode，不自动安装、切换或降级 Xcode。剪贴板写入优先使用 CoreDevice，旧环境或不支持时回退到独立设备集合的 simctl。

已在 Cindy 0.1.93 Beta / iOS 27.1 实测 Duo 预览、合拢/展开、触控和中文输入。Xcode 26 集成尚未复测，具体边界见 VERIFICATION.json。

## 上游与许可

本插件基于 tddworks 的开源项目 [Baguette](https://github.com/tddworks/baguette)（Apache-2.0）。Cindy 维护插件集成、Node Worker 以及 VENDOR-REVIEW.md 记录的本地补丁（`vendor-native.patch`、`vendor-web.patch`），与 tddworks 无隶属或背书关系。随包 HingeControl 含改编自 Meta idb 的代码（MIT）。完整许可证见 THIRD-PARTY-LICENSES.txt 与 `HingeControl/LICENSE.idb`；图标为 Cindy 自有的 iOS 模拟器图标。

设置无法读取时，仍可查看状态和关闭设备，但禁止启动和修改设置；恢复设置文件后才能恢复运行许可。切换设备自动安装源应用包时，可能替换目标上相同 bundleId 的已有 App；不会复制源 App 数据或登录凭证。

画面也允许文件和 App 安装（可能覆盖已有 App）、会替换 Mac 或模拟器剪贴板的复制粘贴，以及可能触发 App 行为的远程通知注入。打开前向用户说明这些能力；仅打开页面不会执行它们。任务绑定不可读时，设备归属查询会报错，不会报告为空闲。近期 App 记录不可读时禁止切换设备，正常画面和控制仍可用，设备菜单会提示记录问题。

已完成的设备结果在任务绑定或近期 App 记录未保存时保留 `taskBindingError` / `appContextError`。切换任务（包括失败的切换）同时保留这些错误与实际设备结果；删除设备分别尝试清理两类记录。一类清理失败不会跳过另一类。分配或切换设备前先检查记录和存储，不要为保存记录重复设备操作。任务页与管理页的轮询会等当前状态读取结束；用户操作和画面推送仍可取代旧读取的结果。
