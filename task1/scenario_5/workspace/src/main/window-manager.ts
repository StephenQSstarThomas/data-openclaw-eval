import { BrowserWindow, screen, app } from 'electron';
import path from 'path';

export interface WindowConfig {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  title?: string;
}

const DEFAULT_CONFIG: WindowConfig = {
  width: 1200,
  height: 800,
  minWidth: 800,
  minHeight: 600,
  title: 'KnowledgeVault',
};

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  createMainWindow(config: WindowConfig = {}): BrowserWindow {
    const merged = { ...DEFAULT_CONFIG, ...config };
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    this.mainWindow = new BrowserWindow({
      width: Math.min(merged.width!, width),
      height: Math.min(merged.height!, height),
      minWidth: merged.minWidth,
      minHeight: merged.minHeight,
      title: merged.title,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      show: false,
    });

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // 开发模式加载 dev server，生产模式加载打包文件
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    return this.mainWindow;
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  minimize(): void { this.mainWindow?.minimize(); }
  maximize(): void {
    if (this.mainWindow?.isMaximized()) {
      this.mainWindow.unmaximize();
    } else {
      this.mainWindow?.maximize();
    }
  }
  close(): void { this.mainWindow?.close(); }
}

export const windowManager = new WindowManager();
