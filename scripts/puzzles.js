/**
 * nonograms - Curated Puzzle Library & Pack Manager
 * Loads, parses, and provides all nonogram puzzles with 100% offline support
 */

class PuzzleManager {
  constructor() {
    this.puzzles = [];
    this.puzzleMap = new Map();
    this.statsKey = 'nonograms_puzzle_stats_v2';
    this.stats = this.loadStats();
    this.completedSet = new Set();
    this._rebuildCompletedSet();
    this.isLoaded = false;
    this._progressCache = new Map();
    this._filterCache = new Map();
    this.categoryBuckets = {
      all: [],
      small: [],
      medium: [],
      large: [],
      color: [],
      adult: []
    };
  }

  _rebuildCompletedSet() {
    this.completedSet.clear();
    for (const [id, s] of Object.entries(this.stats)) {
      if (s && s.completed) {
        this.completedSet.add(id);
      }
    }
  }

  _indexPuzzle(p) {
    this.puzzleMap.set(p.id, p);
    if (p.numericId !== undefined) {
      this.puzzleMap.set(p.numericId, p);
      this.puzzleMap.set(String(p.numericId), p);
    }
  }

  /**
   * Parse a semicolon-delimited nonogram line
   */
  static parsePuzzleLine(line) {
    const trimmed = (line || '').trim();
    if (!trimmed || trimmed.startsWith('#')) return null;

    const parts = trimmed.split(';');
    if (parts.length < 8) {
      const maybeId = parts[0] ? parts[0].trim() : 'نامشخص';
      console.warn(`[پازل نامعتبر] خط نادیده گرفته شد (پارامترهای ناکافی). آیدی: ${maybeId}`);
      return null;
    }

    const id = parts[0].trim();
    if (!id || isNaN(parseInt(id, 10))) {
      console.warn(`[پازل نامعتبر] خط نادیده گرفته شد (فرمت آیدی نامعتبر یا خالی). متن خط: "${line}"`);
      return null;
    }

    const authorId = (parts[1] || '').trim();
    const title = (parts[2] || (`Puzzle #${id}`)).trim();
    const authorName = (parts[3] || '').trim();
    const isAdult = parts[4] === '1';
    const cols = parseInt(parts[5], 10);
    const rows = parseInt(parts[6], 10);
    const colorCount = parseInt(parts[7] || '1', 10);
    
    if (isNaN(cols) || isNaN(rows) || cols <= 0 || rows <= 0) {
      console.warn(`[پازل نامعتبر] نادیده گرفته شد به دلیل ابعاد نامعتبر (ستون: ${cols}، سطر: ${rows}). آیدی پازل: nono_${id}`);
      return null;
    }

    // Parse palette
    let palette = ['#000000'];
    if (parts[8] && parts[8].trim()) {
      palette = parts[8].split(',').map(c => {
        const clean = c.trim().replace(/^#/, '');
        return '#' + (clean || '000000');
      });
    }

    let idx = 9;
    // Column number clues
    const colClues = [];
    for (let c = 0; c < cols; c++) {
      const raw = (parts[idx++] || '').trim();
      if (!raw || raw === '0') {
        colClues.push([0]);
      } else {
        colClues.push(raw.split(',').map(n => parseInt(n.trim(), 10) || 0));
      }
    }

    // Column colors (if multi-color)
    const colColors = [];
    if (colorCount > 1) {
      for (let c = 0; c < cols; c++) {
        const raw = (parts[idx++] || '').trim();
        if (!raw) {
          colColors.push([]);
        } else {
          colColors.push(raw.split(',').map(n => parseInt(n.trim(), 10) || 0));
        }
      }
    } else {
      if (idx < parts.length && parts[idx] === '') idx++;
    }

    // Row number clues
    const rowClues = [];
    for (let r = 0; r < rows; r++) {
      const raw = (parts[idx++] || '').trim();
      if (!raw || raw === '0') {
        rowClues.push([0]);
      } else {
        rowClues.push(raw.split(',').map(n => parseInt(n.trim(), 10) || 0));
      }
    }

    // Row colors (if multi-color)
    const rowColors = [];
    if (colorCount > 1) {
      for (let r = 0; r < rows; r++) {
        const raw = (parts[idx++] || '').trim();
        if (!raw) {
          rowColors.push([]);
        } else {
          rowColors.push(raw.split(',').map(n => parseInt(n.trim(), 10) || 0));
        }
      }
    }

    // Extract pre-computed solution grid if present in the puzzle record
    let solutionGrid = null;
    const lastPart = parts.slice().reverse().find(p => p && p.trim());
    if (lastPart && lastPart.includes(',')) {
      const sRows = lastPart.trim().split(',');
      if (sRows.length === rows) {
        solutionGrid = sRows.map(rStr => rStr.split('').map(ch => parseInt(ch, 10) || 0));
      }
    }

    const maxDim = Math.max(cols, rows);
    let category = 'medium';
    if (colorCount > 1) {
      category = 'color';
    } else if (maxDim <= 15) {
      category = 'small';
    } else if (maxDim <= 25) {
      category = 'medium';
    } else {
      category = 'large';
    }

    let difficulty = 'medium';
    if (maxDim <= 15) difficulty = 'easy';
    else if (maxDim <= 25) difficulty = 'medium';
    else difficulty = 'hard';

    return {
      id: `nono_${id}`,
      numericId: parseInt(id, 10),
      name: title,
      author: authorName,
      authorId: authorId,
      isAdult: isAdult,
      cols: cols,
      rows: rows,
      width: cols,
      height: rows,
      size: maxDim,
      colorCount: colorCount,
      palette: palette,
      colClues: colClues,
      colColors: colColors,
      rowClues: rowClues,
      rowColors: rowColors,
      category: category,
      difficulty: difficulty,
      _solutionGrid: solutionGrid,
      solution: solutionGrid
    };
  }

  /**
   * Fetch binary ArrayBuffer reliably across web, local file://, and WebXDC runtimes
   */
  static fetchBinary(url) {
    return new Promise((resolve, reject) => {
      // 1. Try standard fetch first
      if (typeof fetch === 'function') {
        fetch(url)
          .then(res => {
            if (res.ok) return res.arrayBuffer();
            throw new Error(`HTTP ${res.status}`);
          })
          .then(buf => resolve(buf))
          .catch(() => {
            // Fallback to XMLHttpRequest for Android file:// WebViews
            PuzzleManager._xhrBinary(url, resolve, reject);
          });
      } else {
        PuzzleManager._xhrBinary(url, resolve, reject);
      }
    });
  }

  static _xhrBinary(url, resolve, reject) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = () => {
        if ((xhr.status === 200 || xhr.status === 0) && xhr.response) {
          resolve(xhr.response);
        } else {
          reject(new Error(`XHR failed: ${xhr.status}`));
        }
      };
      xhr.onerror = err => reject(err);
      xhr.send(null);
    } catch (e) {
      reject(e);
    }
  }

  /**
   * Decompress gzip or plain Uint8Array to string across all browser and webxdc engines
   */
  static async decompressU8(u8) {
    if (!u8 || u8.length === 0) return '';
    const isGzip = u8.length >= 2 && u8[0] === 0x1f && u8[1] === 0x8b;

    if (isGzip) {
      // 1. Highest priority: pure JS pako (works 100% in all Webxdc, Android WebViews, iOS)
      if (typeof window !== 'undefined' && window.pako && typeof window.pako.ungzip === 'function') {
        try {
          return window.pako.ungzip(u8, { to: 'string' });
        } catch (e) {
          console.warn('[Puzzles] pako decompression warning:', e);
        }
      }

      // 2. Modern browser DecompressionStream API
      if (typeof DecompressionStream !== 'undefined') {
        try {
          const ds = new DecompressionStream('gzip');
          const writer = ds.writable.getWriter();
          writer.write(u8);
          writer.close();
          return await new Response(ds.readable).text();
        } catch (e) {
          console.warn('[Puzzles] DecompressionStream error:', e);
        }
      }
    }

    // 3. Fallback: standard UTF-8 decoder (if already transparently decompressed)
    try {
      return new TextDecoder('utf-8').decode(u8);
    } catch (e) {
      return '';
    }
  }

  /**
   * Initialize and load all nonogram puzzles from external files
   */
  async init() {
    let loadedGz = false;

    // Show loading UI when starting to open puzzles.gz
    const isFa = (typeof window !== 'undefined' && window.i18n && typeof window.i18n.getLang === 'function')
      ? window.i18n.getLang() === 'fa'
      : true;

    if (typeof window !== 'undefined' && typeof window.showPuzzleLoading === 'function') {
      window.showPuzzleLoading(
        window.i18n ? window.i18n.t('loadingPuzzles') : (isFa ? 'در حال بارگذاری پازل‌ها...' : 'Loading Puzzles...'),
        window.i18n ? window.i18n.t('openingPuzzlesGz') : (isFa ? 'در حال باز کردن puzzles.gz...' : 'Opening puzzles.gz...')
      );
    }

    // Primary: Attempt to fetch and decompress puzzles.gz from assets/ or root
    const gzSources = [
      './assets/puzzles.gz',
      'assets/puzzles.gz',
      './puzzles.gz',
      'puzzles.gz',
      './assets/puzzles.txt.gz',
      'assets/puzzles.txt.gz',
      './puzzles.txt.gz'
    ];

    try {
      for (const src of gzSources) {
        try {
          const fileName = src.split('/').pop();
          if (typeof window !== 'undefined' && typeof window.updatePuzzleLoadingStatus === 'function') {
            window.updatePuzzleLoadingStatus(
              isFa ? `در حال خواندن فایل ${fileName}...` : `Opening ${fileName}...`
            );
          }

          const buffer = await PuzzleManager.fetchBinary(src);
          if (buffer && buffer.byteLength > 0) {
            if (typeof window !== 'undefined' && typeof window.updatePuzzleLoadingStatus === 'function') {
              window.updatePuzzleLoadingStatus(
                isFa ? 'در حال استخراج و تحلیل پازل‌ها...' : 'Decompressing & parsing puzzles...'
              );
            }

            const u8 = new Uint8Array(buffer);
            const decompressedText = await PuzzleManager.decompressU8(u8);

            if (decompressedText && decompressedText.trim().length > 100) {
              this.puzzles = [];
              this.puzzleMap.clear();
              this.loadFromText(decompressedText, false, true);
              loadedGz = true;
              console.log(`[Puzzles] Successfully loaded ${this.puzzles.length} puzzles from ${src}`);

              if (typeof window !== 'undefined' && typeof window.updatePuzzleLoadingStatus === 'function') {
                window.updatePuzzleLoadingStatus(
                  isFa ? `${this.puzzles.length} پازل آماده شد!` : `${this.puzzles.length} puzzles ready!`
                );
              }
              break;
            }
          }
        } catch (err) {
          // Continue to next candidate source
        }
      }
    } finally {
      this.isLoaded = true;
      if (typeof window !== 'undefined' && typeof window.hidePuzzleLoading === 'function') {
        window.hidePuzzleLoading(350);
      }
    }
  }

  loadFromText(text, warnDuplicates = false, overwrite = false) {
    if (!text) return;
    const lines = text.split('\n');
    let addedAny = false;
    for (const line of lines) {
      const p = PuzzleManager.parsePuzzleLine(line);
      if (p) {
        if (!this.puzzleMap.has(p.id)) {
          this.puzzles.push(p);
          this._indexPuzzle(p);
          addedAny = true;
        } else if (overwrite) {
          const idx = this.puzzles.findIndex(existing => existing.id === p.id);
          if (idx !== -1) {
            this.puzzles[idx] = p;
          } else {
            this.puzzles.push(p);
          }
          this._indexPuzzle(p);
          addedAny = true;
        } else if (warnDuplicates) {
          console.warn(`[پازل تکراری] پازل به دلیل شناسه تکراری نادیده گرفته شد. آیدی: ${p.id}`);
        }
      }
    }
    if (addedAny) {
      this._rebuildBuckets();
      this._filterCache.clear();
    }
  }

  _rebuildBuckets() {
    const buckets = {
      all: this.puzzles,
      small: [],
      medium: [],
      large: [],
      color: [],
      adult: []
    };
    for (let i = 0; i < this.puzzles.length; i++) {
      const p = this.puzzles[i];
      if (p.isAdult) buckets.adult.push(p);
      if (p.colorCount > 1) buckets.color.push(p);
      if (p.size <= 15) buckets.small.push(p);
      else if (p.size <= 25) buckets.medium.push(p);
      else buckets.large.push(p);
    }
    this.categoryBuckets = buckets;
  }

  getAllPuzzles() {
    return this.puzzles;
  }

  getPuzzleById(id) {
    if (!id) return null;
    return this.puzzleMap.get(id) || this.puzzleMap.get(String(id)) || null;
  }

  getPuzzlesByCategory(category = 'all', searchQuery = '', adultFilter = 'safe', colorFilter = 'all', statusFilter = 'all') {
    const q = (searchQuery || '').trim().toLowerCase();
    const isDefaultFilter = adultFilter === 'all' && colorFilter === 'all' && statusFilter === 'all' && !q;

    // Ultra-fast path: If standard category with no extra filters, return pre-computed bucket in 0.001ms
    if (isDefaultFilter && this.categoryBuckets[category]) {
      return this.categoryBuckets[category];
    }

    const cacheKey = `${category}|${q}|${adultFilter}|${colorFilter}|${statusFilter}|${this.puzzles.length}`;
    if (this._filterCache.has(cacheKey)) {
      return this._filterCache.get(cacheKey);
    }
    
    // Choose the smallest starting candidate list
    let sourcePool = this.puzzles;
    if (category && category !== 'all' && category !== 'completed' && this.categoryBuckets[category]) {
      sourcePool = this.categoryBuckets[category];
    }

    const qRaw = q.startsWith('#') ? q.slice(1).trim() : q;

    const result = sourcePool.filter(puzzle => {
      // Adult Content Filter
      if (adultFilter === 'safe' && puzzle.isAdult) {
        return false;
      }
      if (adultFilter === 'adult' && !puzzle.isAdult) {
        return false;
      }

      // Color Filter
      if (colorFilter === 'monochrome' && puzzle.colorCount > 1) {
        return false;
      }
      if (colorFilter === 'multicolor' && (!puzzle.colorCount || puzzle.colorCount <= 1)) {
        return false;
      }

      // Status Filter (Solved / Unsolved / All)
      if (statusFilter === 'completed' || statusFilter === 'solved') {
        if (!this.completedSet.has(puzzle.id)) return false;
      } else if (statusFilter === 'unsolved') {
        if (this.completedSet.has(puzzle.id)) return false;
      }

      // Category match (if not already filtered by sourcePool)
      if (sourcePool === this.puzzles) {
        if (category === 'completed') {
          if (!this.completedSet.has(puzzle.id)) return false;
        } else if (category && category !== 'all') {
          if (category === 'small' && puzzle.size > 15) return false;
          if (category === 'medium' && (puzzle.size <= 15 || puzzle.size > 25)) return false;
          if (category === 'large' && puzzle.size <= 25) return false;
          if (category === 'color' && puzzle.colorCount <= 1) return false;
          if (category === 'adult' && !puzzle.isAdult) return false;
        }
      }

      // Search match
      if (!q) return true;

      const isHashQuery = q.startsWith('#');
      const numPart = q.replace(/^(#\s*|nono_)/i, '').trim();
      const isPureNumeric = /^\d+$/.test(numPart);

      if (isHashQuery && isPureNumeric) {
        const targetId = parseInt(numPart, 10);
        return puzzle.numericId === targetId || puzzle.id === `nono_${numPart}` || puzzle.id === numPart;
      }

      if (isPureNumeric) {
        const targetId = parseInt(numPart, 10);
        if (puzzle.numericId === targetId || puzzle.id === `nono_${numPart}` || puzzle.id === numPart) {
          return true;
        }
        // Also allow title/author match (do NOT substring-match numericId like 219 for 21)
        const nameMatch = (puzzle.name || '').toLowerCase().includes(q);
        const authorMatch = (puzzle.author || '').toLowerCase().includes(q);
        return nameMatch || authorMatch;
      }

      // General string query (e.g. "cat", "15x15", "nature")
      const qLower = q.toLowerCase();
      const nameMatch = (puzzle.name || '').toLowerCase().includes(qLower);
      const authorMatch = (puzzle.author || '').toLowerCase().includes(qLower);
      const dimMatch = `${puzzle.cols}x${puzzle.rows}`.includes(qLower) || `${puzzle.cols}×${puzzle.rows}`.includes(qLower);
      const idMatch = puzzle.id === qLower || `nono_${puzzle.numericId}` === qLower;
      return nameMatch || authorMatch || dimMatch || idMatch;
    });

    this._filterCache.set(cacheKey, result);
    return result;
  }

  getDailyPuzzle(dateString = null) {
    const date = dateString ? new Date(dateString) : new Date();
    const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    
    // Hash the date key to select a puzzle from the library
    let hash = 0;
    for (let i = 0; i < dateKey.length; i++) {
      hash = (hash * 31 + dateKey.charCodeAt(i)) % 1000000;
    }

    if (this.puzzles.length === 0) return null;

    // Filter for Hard daily puzzles (size >= 15 or difficulty === 'hard')
    const hardPuzzles = this.puzzles.filter(p => p.cols >= 15 || p.rows >= 15 || p.difficulty === 'hard');
    const pool = hardPuzzles.length > 0 ? hardPuzzles : this.puzzles;

    const index = Math.abs(hash) % pool.length;
    const base = pool[index];

    return {
      ...base,
      id: `daily_${dateKey}`,
      isDaily: true,
      dailyDate: dateKey,
      name: `Daily Challenge (${base.name})`
    };
  }

  loadStats() {
    try {
      const raw = localStorage.getItem(this.statsKey);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  saveStats() {
    this._filterCache.clear();
    try {
      localStorage.setItem(this.statsKey, JSON.stringify(this.stats));
    } catch (e) {
      // Ignore storage limit
    }
  }

  getStats(puzzleId) {
    return this.stats[puzzleId] || { completed: false, bestTime: null, plays: 0, mistakes: 0 };
  }

  recordCompletion(puzzleId, timeSeconds, mistakes = 0) {
    this.completedSet.add(puzzleId);
    if (!this.stats[puzzleId]) {
      this.stats[puzzleId] = {
        completed: true,
        bestTime: timeSeconds,
        plays: 1,
        mistakes: mistakes,
        lastCompleted: Date.now()
      };
    } else {
      const cur = this.stats[puzzleId];
      cur.completed = true;
      cur.plays = (cur.plays || 0) + 1;
      if (cur.bestTime === null || timeSeconds < cur.bestTime) {
        cur.bestTime = timeSeconds;
      }
      cur.lastCompleted = Date.now();
    }
    this.saveStats();
    this.clearProgress(puzzleId);
    this.clearActiveGame();
  }

  // --- Saved In-Progress Puzzle State Management ---
  saveProgress(puzzleId, progressData) {
    if (!puzzleId) return;
    this._progressCache.set(puzzleId, progressData);
    try {
      localStorage.setItem(`nonogram_progress_${puzzleId}`, JSON.stringify(progressData));
    } catch (e) {}
  }

  getProgress(puzzleId) {
    if (!puzzleId) return null;
    if (this._progressCache.has(puzzleId)) {
      return this._progressCache.get(puzzleId);
    }
    try {
      const raw = localStorage.getItem(`nonogram_progress_${puzzleId}`);
      const parsed = raw ? JSON.parse(raw) : null;
      this._progressCache.set(puzzleId, parsed);
      return parsed;
    } catch (e) {
      this._progressCache.set(puzzleId, null);
      return null;
    }
  }

  clearProgress(puzzleId) {
    if (!puzzleId) return;
    this._progressCache.delete(puzzleId);
    try {
      localStorage.removeItem(`nonogram_progress_${puzzleId}`);
    } catch (e) {}
  }

  saveActiveGame(puzzleOrId) {
    if (!puzzleOrId) return;
    try {
      if (typeof puzzleOrId === 'object' && puzzleOrId.id) {
        localStorage.setItem('nonogram_active_game_id', puzzleOrId.id);
        localStorage.setItem('nonogram_active_puzzle_data', JSON.stringify(puzzleOrId));
      } else {
        localStorage.setItem('nonogram_active_game_id', puzzleOrId);
        const p = this.getPuzzleById(puzzleOrId);
        if (p) {
          localStorage.setItem('nonogram_active_puzzle_data', JSON.stringify(p));
        }
      }
    } catch (e) {}
  }

  getActiveGameId() {
    try {
      return localStorage.getItem('nonogram_active_game_id');
    } catch (e) {
      return null;
    }
  }

  getActivePuzzle() {
    try {
      const raw = localStorage.getItem('nonogram_active_puzzle_data');
      if (raw) {
        const p = JSON.parse(raw);
        if (p && p.id) return p;
      }
    } catch (e) {}
    const activeId = this.getActiveGameId();
    if (activeId) {
      return this.getPuzzleById(activeId);
    }
    return null;
  }

  clearActiveGame() {
    try {
      localStorage.removeItem('nonogram_active_game_id');
      localStorage.removeItem('nonogram_active_puzzle_data');
      if (localStorage.getItem('nonogram_last_screen') === 'game') {
        localStorage.setItem('nonogram_last_screen', 'home');
      }
    } catch (e) {}
  }
}

/**
 * Global helpers to control the Puzzles Loading Screen
 */
window.showPuzzleLoading = function(titleMsg, statusMsg) {
  const overlay = document.getElementById('puzzles-loading-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden', 'fade-out');
  if (titleMsg) {
    const titleEl = document.getElementById('puzzles-loading-title');
    if (titleEl) titleEl.textContent = titleMsg;
  }
  if (statusMsg) {
    const statusEl = document.getElementById('puzzles-loading-status');
    if (statusEl) statusEl.textContent = statusMsg;
  }
};

window.updatePuzzleLoadingStatus = function(statusMsg) {
  const statusEl = document.getElementById('puzzles-loading-status');
  if (statusEl && statusMsg) {
    statusEl.textContent = statusMsg;
  }
};

window.hidePuzzleLoading = function(delayMs = 0) {
  const overlay = document.getElementById('puzzles-loading-overlay');
  if (!overlay) return;
  setTimeout(() => {
    overlay.classList.add('fade-out');
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.classList.remove('fade-out');
    }, 380);
  }, delayMs);
};

// Re-assign PuzzleManager to window
window.PuzzleManager = PuzzleManager;
window.puzzleManager = new PuzzleManager();
