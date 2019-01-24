const { app, BrowserWindow, Menu, dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const log  = require('electron-log')

let win
let menu

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
log.info('App starting...')

// Define the menu
let template = []
if (process.platform === 'darwin') {
    const name = app.getName()
    template.unshift({
        label: name,
        submenu: [
            {
                label: 'About ' + name,
                role: 'about'
            },
            {
                label: 'Restart and Install Update',
                visible: false,
                click() {
                    app.quitAndInstall()
                }
            },
            {
                label: 'Check for Update',
                click() {
                    autoUpdater.checkForUpdates()
                }
            },
            {
                label: 'Checking for Update',
                visible: false,
                enabled: false,
            },
            {
                label: 'Downloading Update',
                enabled: false,
                visible: false,
            },
            {
                label: 'Quit',
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

autoUpdater.on('check-for-update', () => {
    sendStatusToWindow('Checking for update...')
    showUpdateMenuItem('checking')
})
autoUpdater.on('update-available', (ev, info) => {
    sendStatusToWindow('Update available.')
    showUpdateMenuItem('downloading')
})
autoUpdater.on('update-not-available', (ev, info) => {
    sendStatusToWindow('Update not available.')
    showUpdateMenuItem('no-update-available')
    dialog.showMessageBox({
        type: 'warning',
        buttons: ['OK'],
        message: 'No update available.',
        title: 'No Update Available',
        detail: `Version ${app.getVersion()} is the latest version.`
    }, () => {})
})
autoUpdater.on('error', (ev, err) => {
    sendStatusToWindow('Error in auto-updater.')
    showUpdateMenuItem('error')
    dialog.showMessageBox({
        type: 'warning',
        buttons: ['OK'],
        message: 'There was an error checking for updates.',
        title: 'Update Error',
        detail: err,
    }, () => {})
})
autoUpdater.on('download-progress', (ev, progressObj) => {
    sendStatusToWindow('Download progress...')
    showUpdateMenuItem('downloading')
})
autoUpdater.on('update-downloaded', (ev, info) => {
    sendStatusToWindow('Update downloaded; will install in 5 seconds')
    showUpdateMenuItem('update-available')
})

// autoUpdater.on('update-downloaded', (ev, info) => {
//     setTimeout(() => {
//         autoUpdater.quitAndInstall()
//     }, 5000);
// })
app.on('ready', function() {
    // if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
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
    const checkForUpdateItem = items.find(({label}) => label === 'Check for Update')
    const checkingForUpdateItem = items.find(({label}) => label === 'Checking for Update')
    const downloadingUpdateItem = items.find(({label}) => label === 'Downloading Update')
    const installUpdateItem = items.find(({label}) => label === 'Restart and Install Update')

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
        installUpdateItem.visible = true
        break
    }
}