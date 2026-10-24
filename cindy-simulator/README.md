# Device Simulator

[简体中文](README.zh-CN.md)

## Shared controls

iPhone, iPad, Apple TV and Vision Pro share Home, Screenshot, viewing zoom and
Controls help. Action buttons execute once; selected modes, toggles and foldable
postures use the same highlight. Temporary camera-button dragging preserves the
selected mode. Hover tips explain operations and shortcuts; the shared help
dialog is also available on touch screens and describes the current device's
input. Toolbar wrapping reserves space beneath the view on narrow screens.

## Apple TV and Vision Pro

Create either device in the management view or task tab using an installed tvOS
or visionOS runtime (`xrOS` in runtime identifiers). Build for `tvOS Simulator`
or `visionOS Simulator`, then install and launch the matching `.app` as usual.
Both support a live rectangular view, screenshots, local OCR, waits and logs.
Switching between platforms does not copy the previous platform's app.

Apple TV uses the on-screen remote or `press` with `up`, `down`, `left`, `right`,
`select`, `back`, `menu`, `home`, or `play-pause`; arrow keys, Return, Escape and
Space also work. `type_text auto/type` sends up to 300 US-keyboard characters; keys are also supported.
tvOS has no simulator clipboard: paste and Unicode text are not supported.
In the live display, two-finger trackpad motion sends a continuous native Siri
Remote touch contact. Longer swipes can cross multiple items; tvOS handles focus
movement from the touch trajectory. A primary click selects the focused item and
a right-click goes back (Control-click also works on macOS). Click position does
not select a TV screen coordinate. With macOS natural scrolling, focus follows
finger movement; both wheel axes are inverted from document-scrolling deltas.
The desktop wheel stream includes OS acceleration/momentum and lacks physical
finger-up events, so its timing and feel are not identical to a hardware remote.
Vision Pro follows [Apple's Device Hub controls](https://developer.apple.com/documentation/xcode/interacting-with-your-visionos-app-in-device-hub):
click/hold/drag to pinch and move, Shift-drag for depth, Control-drag to look,
and toolbar modes for tilt, pan, orbit, dolly and reset. Drag a camera-mode button
directly to adjust the view temporarily without changing the selected pointer mode;
click it to select how subsequent canvas drags behave. Hover tips explain both actions. WASD/arrows move
forward/back/left/right; Q/E move down/up. Two-finger scrolling pans and trackpad pinch
moves forward/back. Option-drag (or the two-hands button) scales horizontally
and rotates vertically. Keyboard capture sends text/keys and paste into the guest;
when disabled, only camera navigation keys are handled.
pointer capture forwards relative mouse motion/buttons. Escape releases capture.
The recording button saves the live view as a video. Capture requires a focused
desktop viewer and browser support; it reports failure if capture is denied.
Standard game controllers navigate while the display has focus: left stick
moves, R2/L2 raise/lower, and right stick turns. Release the sticks after an input
error before continuing. Physical-controller acceptance is still pending.

Agents use `tap` with screenshot coordinates/OCR text, `press digital-crown`
(or `home`), ordinary drag/swipe/pinch/pan, or `gesture kind=spatial` with
`action=drag|pinch|rotate|gaze|tilt|pan|orbit|dolly|move|reset`.
Coordinates are screenshot view points; spatial camera translation is in metres
and rotation in degrees. Spatial `pan` takes `by=[right,up]` (two axes only);
use `move` with `[right,up,back]` or `dolly distance` for depth.
Take another screenshot after moving the camera.

Orientation, posture, status-bar override, touch-menu paste, `scroll_to` and `heal` remain
iOS-only. tvOS/visionOS return OCR text lists in all query modes, including
`mode=full` and `x,y` hit tests, instead of accessibility trees/IDs. Input adapters
were exercised with Xcode 27 and tvOS/visionOS 27; other versions are unverified.
See [native protocol and verification notes](native/platform-support.md).
Stable/Beta Cindy package installation and embedded-preview acceptance are pending.

Screenshots fall back to a file path on older hosts or when JPEG compression still exceeds the 130 KB inline budget. Open that path with an image tool before choosing coordinates; the full-resolution file is preserved.

Viewer screenshot exports to the Mac clipboard or Desktop report confirmed writes as `executed` and command failures after dispatch as `unknown`; inspect the destination before retrying. Temporary clipboard-image cleanup cannot replace the export outcome. `environment.baguette` is the detected binary version; compatibility notes do not repeat a fixed version.

Failed automatic OCR in `describe_ui` returns an error; only successful recognition can report an empty text list. Task binding returns its saved `boundUdid` and `execution: executed` even if subsequent status or viewer reads fail (`taskStateError`). Task boot/create pages also preserve the completed step on a failed follow-up. Refresh task state; do not repeat the completed operation. A task page unloads its old screen when the new binding's status is unavailable.

Capture waits for a complete first frame and confirms the screen before starting the action. If the stream fails or the deadline expires first, it returns `captureError` with `execution: not_executed`. An interrupted recording or output that cannot drain within the cleanup deadline also returns `captureError`, retaining the action outcome without generating a contact sheet. Diagnostic read failures return `crashesError` alongside the logs; an empty `crashes` list means the scan completed without matching reports. `crashes=false` skips that scan.

Installation compares bundle content checksums, including resources whose timestamps were preserved. Registration or signing changes use a full install. Container lookup failures are errors, not evidence that the App is absent; automatic installation stops before writing, and log queries retain their scope. A background install keeps the device busy until its writes settle. `method=touch` rejects `clear=true` and `keys` to preserve the on-screen keyboard; capture results retain the action's execution state.

Cindy's official Device Simulator for Apple Silicon Macs, using bundled Baguette 0.2.10. It replaces the retired embedded simulator; Cindy shows previous users a one-time migration notice pointing here (plugin id `cindy-simulator`).
The plugin ID and command are `cindy-simulator` (formerly `baguette-simulator` / `baguette`). The existing `BaguetteCindy` device, settings and task-binding directory is retained. Changing the manifest ID does not migrate a marketplace listing or an installed plugin identity; coordinate that transition before release and avoid enabling both IDs together.
The name leaves room for future devices and platforms; it does not add platform support.
Requires macOS 15.0+, Apple Silicon, Cindy 0.1.83+, full Xcode and an installed iOS runtime. No first-run dependency download. Packaging collects nine portable USDZ model assets from the hash-pinned official release via `binary-dependencies.json`; the native executables remain tracked and macOS-only.

Use it by default for iOS Simulator tasks. Run `environment` and `devices`, reuse a suitable logged-in device, then `device action=boot` if needed. Build the App with the project's normal workflow (for a private device use `-destination 'generic/platform=iOS Simulator'`), then `app action=install` and `app action=launch` its Simulator `.app`. Launching opens the current task's simulator tab by default. Check `viewer.previewOpened`; a running process does not prove a visible preview. Reopen an existing device with `viewer action=open` after changing sessions.

The 16 Agent tools are grouped by intent: `environment`, `devices`, `device` (create / boot / shutdown / rename / erase / delete), `app` (install / install_status / info / launch / terminate / uninstall / open_url), `screenshot`, `describe_ui`, `tap`, `gesture`, `type_text`, `press`, `wait_for`, `capture`, `set_state`, `logs`, `heal` and `viewer`. Their design comes from what models actually struggled with in past Cindy tasks:

- **Real touches, no window.** `tap` and `gesture` (swipe, drag, pinch, two-finger pan, system edge gestures, scroll-to-element, double tap, long press) go through the simulator's HID touch path, so they work with the Mac locked and the App receives finger touches. The manual tells models not to inject events into the App process, which bypasses the touch chain and produced false passes before.
- **One coordinate space.** Everything is in view points as the user sees the screen. Screenshots are turned upright (landscape, foldable inner panel), drawn with the screen's corners and Dynamic Island, and by default 1 pixel = 1 point, optionally with a labelled grid or a cropped region; `describe_ui` returns a compact element list with view-space frames and centres; `tap` can target an element by text, identifier and role. On iPhone Duo's unfolded panel, SpringBoard's accessibility frames are turned a quarter from the framebuffer (measured on iOS 27.1); the plugin corrects for that.
- **Games.** Where there is no accessibility tree (games, engine-drawn UI), `describe_ui`, `tap text=…` and `wait_for text=…` work on text read off the screen with Apple's on-device Vision OCR (nothing leaves the Mac). `type_text` pastes in regular apps and types key by key in games, which often ignore paste, switching a Pinyin or similar input source to English first. Coordinate taps are pinned to the screen they were read on, so a screen turned since the last look is refused instead of tapped in the wrong place.
- **Waiting and transitions.** `wait_for` waits for an element to appear or disappear, the screen (or a region) to settle within a tolerance for animated scenes, or a log line, and returns the current screen when it does not happen; `capture` performs an action while recording frames and returns a time-labelled contact sheet.
- **Installing the right build.** `app action=install` skips an identical build, syncs only a few changed files into the installed bundle, or installs the whole bundle; long installs return a job. `app action=info` compares the installed executable fingerprint with a local build (`matchesLocal`), because the same version number does not mean the same build.
- **State and diagnostics.** `set_state` changes orientation, foldable posture, appearance, contrast, text size, network conditioning, location, a clean status bar and privacy grants. All steps and readbacks share the request deadline. `applied` lists completed fields; failure or expiry stops later steps and returns `stateError` with `field`, `code`, `message` and `execution`. Inspect that field before retrying; do not replay the entire request. Screen information after rotation/posture changes is returned only when confirmed within the remaining time; `null` in `current` means unconfirmed. `logs` reads an App's recent unified log and summarizes this device's crash reports.

The manual (`manual/workflow/MANUAL.md`) holds the full workflow, build recipe, verification principles and recovery. One operation runs at a time per device. Ordinary device input can run on different devices concurrently; app launches that save shared context and global operations reuse the global lock. Reads (`describe_ui`, `wait_for`, `logs`) never wait for input.

Two views: each task gets its own **Device Simulator** tab in the right sidebar (screen and controller only, no address bar), and **Simulators** in the left navigation manages every device regardless of task in a split view modelled on Xcode's Device Hub: a list grouped into Running and Shut Down (searchable past six devices) showing each device's model, iOS version and whether it is idle or in use by tasks, and the selected device's live screen on the right. **+** creates an iPhone or iPad from a sheet with Name, OS Version and Model (models filtered to the chosen runtime; the name follows the model until edited). Each row's ⋯ / context menu offers Start or Shut Down, Open in Current Task (only when a task is in front and does not already use it; companion chats count), Rename, Erase All Content and Settings… and Delete… (both confirmed; a running device is shut down first, and deleting also clears its task bindings). Which device a task uses is decided when the AI opens the simulator: `devices` rows carry `tasks` and `thisTask`, so it can reuse a free device or create one; booting, opening the viewer and launching an app bind the device to the calling task (`~/Library/Application Support/BaguetteCindy/task-bindings.json`, mode 0600). Without a task tab (no device yet, or the device is off) the tab offers the device list or Start instead of a blank page. Hosts without task views fall back to the sidebar preview.

The controller is Cindy's own: a device chip (status dot, name, device menu for switching, adding and renaming), a zoom control (−, a percentage menu with Fit to Window, Actual Size and fixed steps, +), and a More menu (Shake, App Switcher, release stuck keys, recover view, full Baguette tools, confirmed shutdown). Home, Screenshot, Rotate Left / Right and, on foldables, the Closed / Half Open / Flat posture float over the screen. Shortcuts follow Simulator: ⌘+ / ⌘− / ⌘0 (fit) / ⌘1 (actual size), Ctrl-wheel zoom, ⌘← / ⌘→ rotate, ⇧⌘H Home, ⌘S screenshot. Zoom is remembered per device; opening or reloading reads the guest orientation without rotating it; zoom keeps the centre and scrolls when larger than the window. The screenshot button's caret chooses where screenshots go: the Desktop (with a “Show in Finder” action) or the clipboard; the choice is remembered. The Baguette page inside renders the device with its bezel (`?handheld=0`; foldables keep the 3D view); its workbench chrome is hidden by an injected stylesheet. A lost view, the idle countdown and a shut-down device appear in place of the screen with Recover / Keep using / Start buttons; nothing restarts the simulator or app without an explicit action. Agent recovery uses `press` with `button=release-input`. Unicode paste replaces the simulator clipboard; browser Copy replaces the Mac clipboard. Observe the focused field before input and inspect the result afterwards. Keyboard delivery acknowledgements are not App completion acknowledgements.

Pages wait for the logic page to listen before sending each operation once; slow device queries are not replayed during startup. Viewer controls wait through the worker's request budget, including saving a screenshot to the Desktop or clipboard. Device UDIDs are case-insensitive across task bindings, device operations and installation polling; existing bindings remain usable. Erase and delete return their operation result directly; the management page refreshes its device list separately.

Devices live under `~/Library/Application Support/BaguetteCindy/devices`, Agent screenshots and captures under its siblings `screenshots` and `captures` (removed after a day). No default/Cindy embedded device access; devices are erased or deleted only from the confirmed menu items above. Reinstalling the same bundle ID normally preserves App data, but App migrations/logout/server session expiry still govern authentication. Concurrent agents must not interleave operations on one device.

`heal` explicitly restarts SpringBoard and terminates running apps: require user acceptance of that effect. Try releasing stuck keys first. `device action=shutdown` stops the selected simulator but retains its data. `viewer action=close` stops streaming, not the simulator. `device action=erase|delete` and `app action=uninstall` remove data and are used only when the user asks.

Explicitly closing the viewer retires its saved reconnect address; task-page polling and worker restart do not reopen it. A new open, boot or task assignment can show the screen again. Unexpected worker exits retain the saved address so an open task tab can reconnect.

## User controls

Open **Plugins → Device Simulator** to view actual private-device states, start or stop a device, open its live view, add a device, or stop all devices. Turning off **Allow simulators to run** first persists the restriction, then shuts down devices and stops the viewer. Failed shutdown remains visible; tools cannot restart a device while the switch is off. Turning it back on never boots a device. Data and login storage are preserved.

Batch shutdown shares one request deadline across enumeration, every device, viewer closure and verification. Expiry stops further dispatches; results retain `completed`, per-device `outcomes` and `unprocessed`. `devicesError` marks an unverified last-known list, so it cannot prove all devices stopped. Tool and viewer keyboard/clipboard inputs share the existing device lock: the same UDID remains exclusive regardless of case, while other devices can proceed.

Shut down (with confirmation) lives in the More menu; the screen fits the window by default. App pinch gestures remain Option-drag or Ctrl-wheel, separate from view size. The idle setting defaults to 15 minutes, with 30 minutes, 1 hour and manual-only options. A device is not stopped while a viewer window is open or another tool or script names it in its own command line (for example `simctl`, `xcodebuild -destination id=…` or the Baguette CLI); device input and tool operations restart the timer, status polling does not. Cindy keeps the plugin worker running while any device or viewer window is up. A device shutdown terminates its apps and connections. All private devices share this inactivity clock; changing the idle setting starts a new period.

The device chip menu provides **Switch**, **Add device** and **Rename**. Adding is prefilled with the newest iPhone and its newest installed iOS runtime (both editable); the new device stays shut down until you switch to it. Plugin settings offer a one-tap **Create your first iPhone** when no device exists. Renaming preserves apps and data. Changing model or runtime creates a separate device, keeping the original. Switching confirms the previous device is shut down before booting the target and shows progress in the same preview. Other running private devices must be stopped first.

The plugin remembers the last app it successfully launched on each device in `runtime-settings.json.apps.json`. When switching from a running device, it can install that app's simulator bundle on the target and launch it; system apps are launched by bundle ID. App data, logins and credentials are never copied. Without an app record, the target opens its home screen. If the source is already off, the recorded app must already exist on the target. Incompatible apps or failed startup are reported with the actual device state; switching does not promise identical content or login state.

Runtime preferences are stored beside the private device set in `runtime-settings.json`, shared by local users of that set. The worker attempts shutdown on normal exit, but forced termination can interrupt it. Use the settings run switch **before** disabling the plugin in Cindy, and verify the displayed device states. A closed/disconnected preview is never proof of shutdown.

## Security and limitations

The Node Worker runs with local user permissions. Executable paths and command shapes are fixed; there is no arbitrary shell tool. The controller listens only on 127.0.0.1; clipboard/control requests require a matching Origin, random capability (kept with the viewer port in `~/Library/Application Support/BaguetteCindy/viewer-session.json`, mode 0600, so an open tab reconnects after the Worker restarts; turning simulators off retires it) and an opened private device. No account tokens are extracted or copied into Cindy storage. Screenshot analysis may send images to the configured model. Actions inside apps can have external side effects and remain subject to the task’s authorization.

The viewer’s optional location map requests reach OpenStreetMap through the fixed-endpoint Node proxy; see VENDOR-REVIEW.md. The farm page uses local font fallbacks without remote font requests. These features do not synchronize simulator accounts. No background dependency installation occurs.

Upstream 0.2.7 adds an app UserDefaults editor (Defaults card) that can read or rewrite any installed app's preferences and relaunch apps with an injected dylib. Those routes ignore the private device set, so the plugin hides the card, returns 404 for them at the viewer proxy and does not bundle `DefaultsLookups.dylib`. Handheld mode is unchanged upstream behavior and stays loopback-only.

Known upstream limitation: stream disconnects can SIGABRT on iOS 27. The supervisor restarts at most five times per minute; the independent controller remains available for manual recovery. This is mitigation, not a native crash fix. Disabling the plugin or quitting Cindy stops the controller too; recovery after Worker exit requires Cindy to start it again. Device data persists across tasks; each task tab remembers its own device.

## Build and verification

Run `sh native/build.sh` on an Apple Silicon Mac with Xcode. This compiles the included Objective-C source and ad-hoc signs the helper. No dependency download. Baguette and HingeControl are rebuilt from v0.2.10 with `vendor-native.patch` (only the version constant); use `sh native/build-baguette.sh <verified-source-archive>` to reproduce the build, then `node native/inventory.mjs --write`. The release build uses whole-program LTO and Swift `-Osize`, strips symbols and ad-hoc signs the host executable to keep tracked binary content below the repository limit. The private device-set and 3D memory fixes this plugin needed were merged upstream (tddworks/baguette#122, #123). `node .tests/baguette/real-simulator-smoke.mjs --foldable` checks a build against real simulators in a throwaway device set.

Run the repository contracts and `.tests/cindy-simulator.test.mjs`. Review VENDOR-REVIEW.md, THIRD-PARTY-LICENSES.txt and the proposal [#119](https://github.com/makecindy/cindy-official-plugins/issues/119). Initial provisioning is an empty targeted audience, not all users. Final package installation in eligible Cindy must be recorded separately from direct Node/native tests.

The optional location panel sends search text and requested map tiles to OpenStreetMap through the Node Worker (fixed nominatim.openstreetmap.org and tile.openstreetmap.org HTTPS endpoints). Browser requests remain same-origin; redirects and arbitrary upstream URLs are rejected. No account credentials are forwarded.

The viewer proxy requires a capability session for HTTP and WebSocket access. The controller exchanges its fragment token for an HttpOnly session cookie. This is not a sandbox against processes with the same macOS user permissions or direct access to the upstream Baguette listener.

## iPhone Duo and Xcode compatibility

Ordinary devices retain the Xcode 26/27 paths. iPhone Duo requires the selected Xcode 27.1 and an installed iOS 27.1 runtime. The upstream viewer includes the Duo 3D model, inner/outer displays, pose buttons and hinge slider; changing the pose changes the simulated device and foreground app layout. The model is read from Xcode, not downloaded by this plugin. The plugin uses the selected Xcode; it does not install, switch or downgrade Xcode automatically. Clipboard writes prefer CoreDevice and fall back to private-set simctl on older or unsupported environments.

Duo preview, closed/open poses, touch and Unicode input were exercised on iOS 27.1 in Cindy 0.1.93 Beta. Xcode 26 integration remains unverified; See VERIFICATION.json for the exact boundary.

## Upstream and license

This plugin is built on [Baguette](https://github.com/tddworks/baguette) by tddworks, licensed under Apache-2.0. Cindy maintains the integration, the Node Worker and the local patches documented in VENDOR-REVIEW.md (`vendor-native.patch`, `vendor-web.patch`). It is not affiliated with or endorsed by tddworks. The bundled HingeControl includes code adapted from Meta's idb (MIT). Full license texts are in THIRD-PARTY-LICENSES.txt and `HingeControl/LICENSE.idb`; the icon is Cindy's own iOS Simulator icon.

If settings cannot be read, device status and shutdown remain available while startup and settings edits stay blocked. Restore the settings file before enabling operation. Device switching may replace an existing target app with the same bundleId when the source app bundle is installed; source app data and login credentials are not copied.

The live view also allows file and App installation (which may replace an existing App), copy/paste that replaces the Mac or simulator clipboard, and remote notification injection that can trigger App behavior. Tell the user about these capabilities before opening; opening alone performs none of them. Unreadable task bindings make device assignment queries fail instead of reporting devices as free. Unreadable recent App records block switching, while the working screen and its controls remain available; the device menu reports the record problem.

Completed device results retain `taskBindingError` / `appContextError` when task or recent App records cannot be saved. Switch jobs retain these errors alongside the actual device outcome, including failed switches; deletion attempts both record cleanups independently. Check records and storage before assigning or switching devices; do not repeat a device operation to repair bookkeeping. Task and management polling wait for the current status read to settle; user actions and viewer pushes can still supersede its result.
