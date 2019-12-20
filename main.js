const { app, BrowserWindow, Menu, dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const log  = require('electron-log')

let win
let menu

let hasRegistListner = false
// autoUpdater.autoDownload = false

function createWindow() {
    win = new BrowserWindow({
        width: 800,
        height: 600,
    })
    win.loadURL(`file://${__dirname}/index.html#v${app.getVersion()}`)
    win.webContents.openDevTools()
    win.on('close', () => {
        win = null
    })
    return win
}
// Logging
autoUpdater.logger = log
autoUpdater.logger.transports.file.level = 'info'
log.info('应用启动中...')

// Define the menu
let template = []
if (process.platform === 'darwin') {
    const name = app.getName()
    template.unshift({
        label: name,
        submenu: [
            {
                key: 'about',
                label: '关于' + name,
                role: 'about'
            },
            {
                key: 'check',
                label: '检查更新',
                click() {
                    // 应用启动检测更新，无更新时不注册此事件
                    if (!hasRegistListner) {
                        autoUpdater.on('update-not-available', (ev, info) => {
                            dialog.showMessageBox({
                                type: 'warning',
                                buttons: ['确定'],
                                message: '无可用更新',
                                title: '无可用更新',
                                detail: `Version ${app.getVersion()} 已是最新版本`
                            }, () => {})
                        })
                        hasRegistListner = true
                    }
                    autoUpdater.checkForUpdates()
                }
            },
            {
                key: 'checking',
                label: '检查更新中',
                visible: false,
                enabled: false,
            },
            {
                key: 'downloading',
                label: '下载更新中',
                enabled: false,
                visible: false,
            },
            {
                key: 'install',
                label: '重启安装更新',
                visible: false,
                click() {
                    autoUpdater.quitAndInstall()
                }
            },
            {
                label: '退出',
                accelerator: "Command+Q",
                click() {
                    app.quit()
                }
            }
        ]
    })
}

function sendStatusToWindow(text) {
    log.info(text)
    win.webContents.send('message', text)
}

app.on('ready', function() {
    menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
    createWindow()
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (win === null) {
        createWindow()
    }
})

autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('检测更新中...')
    showUpdateMenuItem('checking')
})
autoUpdater.on('update-available', (ev, info) => {
    sendStatusToWindow('有更新内容')
    sendStatusToWindow(JSON.stringify({ ev, info }, 4))
    dialog.showMessageBox({
        type: 'info',
        title: '更新提示',
        message: ev.releaseNotes,
        buttons: ['下载更新', '跳过'],
    }, (index) => {
        if (index === 0) {
            autoUpdater.downloadUpdate()
            showUpdateMenuItem('downloading')
        } else {
            showUpdateMenuItem('check')
        }
    })
})
autoUpdater.on('update-not-available', (ev, info) => {
    sendStatusToWindow('无可用更新')
    showUpdateMenuItem('no-update-available')
})
autoUpdater.on('error', (ev, err) => {
    sendStatusToWindow('auto-updater 检测更新发生异常')
    showUpdateMenuItem('error')
    dialog.showMessageBox({
        type: 'warning',
        buttons: ['确定'],
        message: '检测更新发生异常',
        title: '更新异常',
        detail: err,
    }, () => {})
})
autoUpdater.on('download-progress', (ev, progressObj) => {
    sendStatusToWindow('下载进度')
    sendStatusToWindow(JSON.stringify({ev, progressObj}, 4))
    showUpdateMenuItem('downloading')
})
autoUpdater.on('update-downloaded', (ev, info) => {
    sendStatusToWindow('更新下载完成')
    showUpdateMenuItem('update-available')
    dialog.showMessageBox({
        type: 'info',
        title: '更新下载完成',
        message: '更新下载完成, 立即更新?',
        buttons: ['立即更新', '稍等']
    }, (index) => {
        if (index === 0) {
            autoUpdater.quitAndInstall()
        }
    })
})

app.on('ready', function() {
    // autoUpdater.checkForUpdates()
    autoUpdater.checkForUpdatesAndNotify()
})

function flattenMenuItems (menu) {
    const object = menu.items || {}
    let items = []
    for (let index in object) {
      const item = object[index]
      items.push(item)
      if (item.submenu) items = items.concat(flattenMenuItems(item.submenu))
    }
    return items
}

function showUpdateMenuItem (state) {
    const items = flattenMenuItems(menu)
    const checkForUpdateItem = items.find(({key}) => key === 'check')
    const checkingForUpdateItem = items.find(({key}) => key === 'checking')
    const downloadingUpdateItem = items.find(({key}) => key === 'downloading')
    const installUpdateItem = items.find(({key}) => key === 'install')

    if (!checkForUpdateItem || !checkingForUpdateItem ||
        !downloadingUpdateItem || !installUpdateItem) return

    checkForUpdateItem.visible = false
    checkingForUpdateItem.visible = false
    downloadingUpdateItem.visible = false
    installUpdateItem.visible = false

    switch (state) {
      case 'idle':
      case 'error':
      case 'no-update-available':
        checkForUpdateItem.visible = true
        break
      case 'checking':
        checkingForUpdateItem.visible = true
        break
      case 'downloading':
        downloadingUpdateItem.visible = true
        break
      case 'update-available':
        // installUpdateItem.visible = true
        checkForUpdateItem.visible = true
        break
      default:
            checkForUpdateItem.visible = true
    }
}