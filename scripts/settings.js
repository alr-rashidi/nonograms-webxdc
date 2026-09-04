/**
 * nonograms - Settings & Persistence Manager
 */

class SettingsManager {
  constructor() {
    this.defaults = {
      theme: 'auto', // 'auto', 'dark', or 'light'
      language: 'auto', // 'auto', 'fa', or 'en'
      sound: true,
      vibration: true,
      gameMode: 'hearts', // 'hearts' (3 lives) or 'zen' (infinite)
      autoCrossNumbers: true,
      autoFillCrosses: true,
      highlightCrosshairs: true,
      showResultPreview: true,
      showTimer: true,
      webxdcBroadcast: true,
      pixelFont: true,
      adultFilter: 'safe' // 'all', 'safe', 'adult'
    };
    this.settings = this.loadSettings();

    // Sanitize theme
    if (this.settings.theme !== 'auto' && this.settings.theme !== 'dark' && this.settings.theme !== 'light') {
      this.settings.theme = 'auto';
    }

    this.applyTheme(this.settings.theme);
    this.applyPixelFont(this.settings.pixelFont !== false);

    // Listen to system color scheme changes if set to auto
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (this.settings.theme === 'auto') {
          this.applyTheme('auto');
        }
      });
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('nonogram_settings');
      if (saved) {
        return { ...this.defaults, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load settings from storage', e);
    }
    return { ...this.defaults };
  }

  saveSettings() {
    try {
      localStorage.setItem('nonogram_settings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save settings to storage', e);
    }
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
    this.saveSettings();
    if (key === 'theme') {
      this.applyTheme(value);
    } else if (key === 'pixelFont') {
      this.applyPixelFont(value);
    }
  }

  applyPixelFont(enabled) {
    const isPixel = enabled !== false;
    document.documentElement.setAttribute('data-pixel-font', isPixel ? 'true' : 'false');
  }

  getResolvedTheme() {
    const t = this.settings.theme || 'auto';
    if (t === 'auto') {
      return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    return t === 'light' ? 'light' : 'dark';
  }

  applyTheme(theme) {
    const resolved = theme === 'auto' ? this.getResolvedTheme() : (theme === 'light' ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', resolved);
    if (window.app && typeof window.app.paintMiniThumbnails === 'function') {
      window.app.paintMiniThumbnails(document.getElementById('levels-grid-list'));
    }
  }
}

const settingsManager = new SettingsManager();
window.settingsManager = settingsManager;
