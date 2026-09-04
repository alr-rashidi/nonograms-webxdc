/**
 * nonograms - Main Game Controller & Interaction Engine
 * Full rectangular grid support, multi-color nonogram support, hints, undo/redo, auto-crossing
 */

class PanZoomController {
  constructor(viewportEl, containerEl) {
    this.viewport = viewportEl;
    this.container = containerEl;

    this.scale = 1.0;
    this.minScale = 0.25;
    this.maxScale = 4.5;

    this.translateX = 0;
    this.translateY = 0;

    this.isPanning = false;
    this.isPanMode = false;

    this.startPointerX = 0;
    this.startPointerY = 0;
    this.startTranslateX = 0;
    this.startTranslateY = 0;

    this.touchStartDist = 0;
    this.touchStartScale = 1.0;

    this.initEvents();
  }

  initEvents() {
    if (!this.viewport) return;

    // Mouse wheel zoom centered at cursor position + Shift+Scroll horizontal pan
    this.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.shiftKey) {
        const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
        this.translateX -= delta * 1.2;
        this.applyTransform();
        return;
      }
      const rect = this.viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1.15 : 0.86;
      this.zoomAt(this.scale * factor, mouseX, mouseY);
    }, { passive: false });

    // Click out of board clears crosshairs highlight
    this.viewport.addEventListener('click', (e) => {
      if (!e.target.closest('.board-cell') && window.gameEngine) {
        window.gameEngine.clearCrosshairs();
      }
    });

    // Touch 2-finger pinch & pan + 1-finger drag in pan mode or outside board
    let isMultiTouch = false;
    let isOutsideDrag = false;
    let touchStartFocalX = 0;
    let touchStartFocalY = 0;

    this.viewport.addEventListener('touchstart', (e) => {
      const isCell = !!e.target.closest('.board-cell');
      if (!isCell && window.gameEngine) {
        window.gameEngine.clearCrosshairs();
      }

      const vpRect = this.viewport.getBoundingClientRect();

      if (e.touches.length === 2) {
        isMultiTouch = true;
        isOutsideDrag = false;
        this.isPanning = true;
        if (window.gameEngine) {
          window.gameEngine.isDragging = false;
          window.gameEngine.dragAxis = null;
        }
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        this.touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        this.touchStartScale = this.scale;

        this.startTranslateX = this.translateX;
        this.startTranslateY = this.translateY;
        touchStartFocalX = ((t1.clientX + t2.clientX) / 2) - vpRect.left;
        touchStartFocalY = ((t1.clientY + t2.clientY) / 2) - vpRect.top;
        this.startPointerX = (t1.clientX + t2.clientX) / 2;
        this.startPointerY = (t1.clientY + t2.clientY) / 2;
        this.viewport.classList.add('is-panning');
      } else if (e.touches.length === 1) {
        isMultiTouch = false;
        if (this.isPanMode || !isCell) {
          this.isPanning = true;
          isOutsideDrag = !isCell;
          this.startPointerX = e.touches[0].clientX;
          this.startPointerY = e.touches[0].clientY;
          this.startTranslateX = this.translateX;
          this.startTranslateY = this.translateY;
          this.viewport.classList.add('is-panning');
        }
      }
    }, { passive: false });

    this.viewport.addEventListener('touchmove', (e) => {
      const vpRect = this.viewport.getBoundingClientRect();

      if (e.touches.length === 2 && isMultiTouch) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        if (this.touchStartDist > 0) {
          const scaleRatio = dist / this.touchStartDist;
          const newScale = Math.min(Math.max(this.touchStartScale * scaleRatio, this.minScale), this.maxScale);
          
          const curFocalX = ((t1.clientX + t2.clientX) / 2) - vpRect.left;
          const curFocalY = ((t1.clientY + t2.clientY) / 2) - vpRect.top;

          this.scale = newScale;
          this.translateX = curFocalX - (touchStartFocalX - this.startTranslateX) * (newScale / this.touchStartScale);
          this.translateY = curFocalY - (touchStartFocalY - this.startTranslateY) * (newScale / this.touchStartScale);
          this.applyTransform();
        }
      } else if (e.touches.length === 1 && !isMultiTouch && this.isPanning && (this.isPanMode || isOutsideDrag)) {
        e.preventDefault();
        const dx = e.touches[0].clientX - this.startPointerX;
        const dy = e.touches[0].clientY - this.startPointerY;
        this.translateX = this.startTranslateX + dx;
        this.translateY = this.startTranslateY + dy;
        this.applyTransform();
      }
    }, { passive: false });

    const handleTouchEndOrCancel = (e) => {
      if (isMultiTouch) {
        // Multi-touch pinch/pan ended or one finger lifted: stop panning immediately to avoid jump
        isMultiTouch = false;
        this.isPanning = false;
        isOutsideDrag = false;
        this.viewport.classList.remove('is-panning');
      } else if (!e.touches || e.touches.length === 0) {
        this.isPanning = false;
        isOutsideDrag = false;
        this.viewport.classList.remove('is-panning');
      }
    };

    this.viewport.addEventListener('touchend', handleTouchEndOrCancel, { passive: true });
    this.viewport.addEventListener('touchcancel', handleTouchEndOrCancel, { passive: true });

    // Mouse drag pan handler (middle click, Ctrl+drag, spacebar drag, or drag outside cells)
    const handleMouseDown = (e) => {
      const isMiddle = e.button === 1;
      const isSpace = e.code === 'Space' || e.spaceKey;
      const isCtrl = e.ctrlKey || e.metaKey;
      const isCell = !!e.target.closest('.board-cell');

      if (this.isPanMode || isSpace || isMiddle || isCtrl || (!isCell && e.button === 0)) {
        this.isPanning = true;
        this.startPointerX = e.clientX;
        this.startPointerY = e.clientY;
        this.startTranslateX = this.translateX;
        this.startTranslateY = this.translateY;
        this.viewport.classList.add('is-panning');
        if (isMiddle) {
          e.preventDefault();
        }
      }
    };

    const handleMouseMove = (e) => {
      if (this.isPanning) {
        const dx = e.clientX - this.startPointerX;
        const dy = e.clientY - this.startPointerY;
        this.translateX = this.startTranslateX + dx;
        this.translateY = this.startTranslateY + dy;
        this.applyTransform();
      }
    };

    const handleMouseUp = () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.viewport.classList.remove('is-panning');
      }
    };

    this.viewport.addEventListener('mousedown', handleMouseDown);
    this.viewport.addEventListener('auxclick', (e) => {
      if (e.button === 1) e.preventDefault();
    });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  zoomAt(targetScale, focalX, focalY) {
    const clampedScale = Math.min(Math.max(targetScale, this.minScale), this.maxScale);
    if (clampedScale === this.scale) return;

    this.translateX = focalX - (focalX - this.translateX) * (clampedScale / this.scale);
    this.translateY = focalY - (focalY - this.translateY) * (clampedScale / this.scale);
    this.scale = clampedScale;
    this.applyTransform();
  }

  zoomIn() {
    const rect = this.viewport.getBoundingClientRect();
    this.zoomAt(this.scale * 1.25, rect.width / 2, rect.height / 2);
  }

  zoomOut() {
    const rect = this.viewport.getBoundingClientRect();
    this.zoomAt(this.scale / 1.25, rect.width / 2, rect.height / 2);
  }

  resetView() {
    if (!this.viewport || !this.container) return;
    const vpRect = this.viewport.getBoundingClientRect();
    const boardEl = document.getElementById('nonogram-board');
    if (!boardEl) return;

    const unscaledW = boardEl.offsetWidth || 300;
    const unscaledH = boardEl.offsetHeight || 300;

    if (unscaledW === 0 || unscaledH === 0) return;

    // Check if sidebar layout is active (desktop or landscape mode)
    const sidebarEl = document.querySelector('.game-sidebar-container');
    const isSidebarActive = sidebarEl && window.getComputedStyle(sidebarEl).display !== 'contents';

    const paddingX = 40;
    const paddingY = isSidebarActive ? 40 : 200;
    const availW = Math.max(vpRect.width - paddingX, 100);
    const availH = Math.max(vpRect.height - paddingY, 100);

    const fitScale = Math.min(availW / unscaledW, availH / unscaledH);
    this.scale = Math.min(Math.max(fitScale, 0.4), 2.2);

    this.translateX = (vpRect.width - unscaledW * this.scale) / 2;
    this.translateY = (vpRect.height - unscaledH * this.scale) / 2;
    this.applyTransform();
  }

  applyTransform() {
    if (this.container) {
      this.container.style.transform = `translate3d(${this.translateX}px, ${this.translateY}px, 0) scale(${this.scale})`;
    }
  }

  setPanMode(enabled) {
    this.isPanMode = enabled;
    if (this.viewport) {
      this.viewport.classList.toggle('is-pan-mode', enabled);
    }
    if (window.gameEngine) {
      window.gameEngine.clearCrosshairs();
      if (enabled) {
        document.querySelectorAll('.control-mode-btn[data-mode]').forEach(btn => {
          btn.classList.remove('active');
        });
      } else {
        const activeMode = window.gameEngine.currentMode;
        document.querySelectorAll('.control-mode-btn[data-mode]').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.mode === activeMode);
        });
      }
    }
  }
}

class GameEngine {
  constructor() {
    this.puzzle = null;
    this.playerGrid = [];
    this.playerColorGrid = [];
    this.history = [];
    this.redoStack = [];
    this.currentMode = 'fill'; // 'fill', 'cross', 'question'
    this.currentColor = 0; // index into puzzle.palette
    this.mistakes = 0;
    this.maxMistakes = 3;
    this.hintsUsed = 0;
    this.timerSeconds = 0;
    this.timerInterval = null;
    this.isPaused = false;
    this.isGameOver = false;
    this.isWon = false;

    // Keyboard navigation cursor
    this.keyboardCursorR = 0;
    this.keyboardCursorC = 0;
    this.hasKeyboardFocus = false;

    // Line completion tracking for sound and animation feedback
    this.satisfiedRowsSet = new Set();
    this.satisfiedColsSet = new Set();

    // Pointer / Drag tracking
    this.isDragging = false;
    this.dragStartRow = -1;
    this.dragStartCol = -1;
    this.dragMode = 'fill';
    this.dragTargetState = CellState.FILLED;
    this.draggedCells = new Set();
    this.dragAxis = null;

    this.lastHoveredR = -1;
    this.lastHoveredC = -1;

    this.container = null;
    this.panZoomController = null;
  }

  init(containerEl) {
    this.container = containerEl;
    this.initPanZoom();
  }

  initPanZoom() {
    const viewportEl = document.getElementById('game-board-viewport');
    const panContainerEl = document.getElementById('board-pan-zoom-container');
    if (viewportEl && panContainerEl) {
      if (!this.panZoomController) {
        this.panZoomController = new PanZoomController(viewportEl, panContainerEl);
        this.bindZoomControls();
      } else {
        this.panZoomController.viewport = viewportEl;
        this.panZoomController.container = panContainerEl;
      }
    }
  }

  bindZoomControls() {
    document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
      if (this.panZoomController) {
        this.panZoomController.zoomIn();
        if (window.sounds) window.sounds.playClick();
      }
    });

    document.getElementById('zoom-out-btn')?.addEventListener('click', () => {
      if (this.panZoomController) {
        this.panZoomController.zoomOut();
        if (window.sounds) window.sounds.playClick();
      }
    });

    document.getElementById('zoom-reset-btn')?.addEventListener('click', () => {
      if (this.panZoomController) {
        this.panZoomController.resetView();
        if (window.sounds) window.sounds.playClick();
      }
    });

    window.addEventListener('resize', () => {
      if (this.panZoomController && document.getElementById('screen-game')?.classList.contains('active-screen')) {
        this.panZoomController.resetView();
      }
    });
  }

  loadPuzzle(puzzleData, restoreProgress = true) {
    this.puzzle = JSON.parse(JSON.stringify(puzzleData));
    const cols = this.puzzle.cols || this.puzzle.width || this.puzzle.size;
    const rows = this.puzzle.rows || this.puzzle.height || this.puzzle.size;
    this.puzzle.cols = cols;
    this.puzzle.rows = rows;

    // Initialize blank player grids
    this.playerGrid = Array.from({ length: rows }, () => Array(cols).fill(CellState.EMPTY));
    this.playerColorGrid = Array.from({ length: rows }, () => Array(cols).fill(0));
    this.autoCrossGrid = Array.from({ length: rows }, () => Array(cols).fill(false));
    this.currentColor = 0;

    this.history = [];
    this.redoStack = [];
    this.mistakes = 0;
    this.hintsUsed = 0;
    this.timerSeconds = 0;
    this.isPaused = false;
    this.isGameOver = false;
    this.isWon = false;
    this.satisfiedRowsSet = new Set();
    this.satisfiedColsSet = new Set();

    // Reset toolbar and header states
    document.getElementById('game-header-box')?.classList.remove('hidden');
    document.getElementById('game-normal-toolbar')?.classList.remove('hidden');
    document.getElementById('game-surrender-bar')?.classList.add('hidden');

    // Persist active game session immediately
    if (window.puzzleManager) {
      window.puzzleManager.saveActiveGame(this.puzzle);
    }

    // Check game mode setting
    const modeSetting = window.settingsManager ? window.settingsManager.get('gameMode') : 'hearts';
    this.maxMistakes = modeSetting === 'zen' ? Infinity : 3;

    // Restore saved progress if available
    if (restoreProgress && window.puzzleManager) {
      const saved = window.puzzleManager.getProgress(this.puzzle.id);
      if (saved && saved.playerGrid && saved.playerGrid.length === rows && saved.playerGrid[0].length === cols) {
        this.playerGrid = saved.playerGrid;
        if (saved.playerColorGrid && saved.playerColorGrid.length === rows) {
          this.playerColorGrid = saved.playerColorGrid;
        }
        if (saved.autoCrossGrid && saved.autoCrossGrid.length === rows) {
          this.autoCrossGrid = saved.autoCrossGrid;
        }
        if (typeof saved.timerSeconds === 'number') {
          this.timerSeconds = saved.timerSeconds;
        }
        if (typeof saved.mistakes === 'number') {
          this.mistakes = saved.mistakes;
        }
        if (typeof saved.hintsUsed === 'number') {
          this.hintsUsed = saved.hintsUsed;
        }
        if (Array.isArray(saved.history)) {
          this.history = saved.history;
        }
        if (Array.isArray(saved.redoStack)) {
          this.redoStack = saved.redoStack;
        }
      }
    }

    this.startTimer();
    this.renderPaletteBar();
    this.render();
    this.updateHUD();
    this.updateClueHighlights(true);
    this.initPanZoom();
    setTimeout(() => {
      if (this.panZoomController) {
        this.panZoomController.resetView();
      }
    }, 60);
  }

  saveCurrentProgress() {
    if (!this.puzzle || this.isWon || this.isGameOver || !window.puzzleManager) return;
    const hasMoves = this.history.length > 0 || this.playerGrid.some(row => row.some(v => v !== CellState.EMPTY));
    if (hasMoves) {
      window.puzzleManager.saveProgress(this.puzzle.id, {
        playerGrid: this.playerGrid,
        playerColorGrid: this.playerColorGrid,
        autoCrossGrid: this.autoCrossGrid,
        timerSeconds: this.timerSeconds,
        mistakes: this.mistakes,
        hintsUsed: this.hintsUsed,
        history: this.history,
        redoStack: this.redoStack,
        timestamp: Date.now()
      });
      window.puzzleManager.saveActiveGame(this.puzzle);
    }
  }

  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (!this.isPaused && !this.isGameOver && !this.isWon) {
        this.timerSeconds++;
        this.updateTimerDisplay();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  togglePause(forceState = null) {
    if (forceState !== null) {
      this.isPaused = forceState;
    } else {
      this.isPaused = !this.isPaused;
    }
    const pauseModal = document.getElementById('pause-modal');
    if (pauseModal) {
      pauseModal.classList.toggle('hidden', !this.isPaused);
    }
    const pauseBtn = document.getElementById('game-pause-btn');
    if (pauseBtn) {
      pauseBtn.classList.toggle('active', this.isPaused);
    }
  }

  resumeGame() {
    this.isPaused = false;
    const pauseModal = document.getElementById('pause-modal');
    if (pauseModal) {
      pauseModal.classList.add('hidden');
    }
    const resetModal = document.getElementById('reset-modal');
    if (resetModal) {
      resetModal.classList.add('hidden');
    }
    const surrenderModal = document.getElementById('surrender-modal');
    if (surrenderModal) {
      surrenderModal.classList.add('hidden');
    }
    const pauseBtn = document.getElementById('game-pause-btn');
    if (pauseBtn) {
      pauseBtn.classList.remove('active');
    }
  }

  setMode(mode, force = false) {
    if (!force && this.currentMode === mode && (!this.panZoomController || !this.panZoomController.isPanMode)) {
      if (this.panZoomController) {
        this.panZoomController.setPanMode(true);
      }
      return;
    }

    this.currentMode = mode;
    document.querySelectorAll('.control-mode-btn[data-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    if (this.panZoomController && this.panZoomController.isPanMode) {
      this.panZoomController.setPanMode(false);
    }
  }

  setColor(colorIndex) {
    if (!this.puzzle || !this.puzzle.palette || colorIndex >= this.puzzle.palette.length) return;
    this.currentColor = colorIndex;
    this.setMode('fill', true);
    
    document.querySelectorAll('.palette-color-swatch').forEach((swatch, idx) => {
      swatch.classList.toggle('active', idx === colorIndex);
    });
  }

  renderPaletteBar() {
    const paletteBar = document.getElementById('game-color-palette-bar');
    if (!paletteBar) return;

    if (!this.puzzle || this.puzzle.colorCount <= 1 || !this.puzzle.palette || this.puzzle.palette.length <= 1) {
      paletteBar.classList.add('hidden');
      paletteBar.innerHTML = '';
      return;
    }

    paletteBar.classList.remove('hidden');
    let html = `
      <div class="palette-swatches-list-vertical">
    `;

    this.puzzle.palette.forEach((hex, idx) => {
      const isActive = idx === this.currentColor;
      const r = parseInt((hex||'#000').slice(1,3)||'00', 16);
      const g = parseInt((hex||'#000').slice(3,5)||'00', 16);
      const b = parseInt((hex||'#000').slice(5,7)||'00', 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      const textColor = brightness > 140 ? '#000000' : '#ffffff';

      html += `
        <button class="palette-color-swatch ${isActive ? 'active' : ''}" 
                data-color-idx="${idx}"
                style="--swatch-color: ${hex}; background-color: ${hex}; color: ${textColor};"
                title="Color ${idx + 1}">
          <span class="swatch-number">${idx + 1}</span>
        </button>
      `;
    });

    html += `
      </div>
    `;

    paletteBar.innerHTML = html;

    // Attach swatch click events
    paletteBar.querySelectorAll('.palette-color-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.colorIdx, 10);
        this.setColor(idx);
      });
    });
  }

  render() {
    if (!this.container || !this.puzzle) return;
    const cols = this.puzzle.cols;
    const rows = this.puzzle.rows;
    const rowClues = this.puzzle.rowClues;
    const colClues = this.puzzle.colClues;
    const isMultiColor = this.puzzle.colorCount > 1 && this.puzzle.palette;

    const maxDim = Math.max(cols, rows);
    let baseCellPx = 36;
    if (maxDim <= 5) baseCellPx = 52;
    else if (maxDim <= 8) baseCellPx = 46;
    else if (maxDim <= 10) baseCellPx = 42;
    else if (maxDim <= 15) baseCellPx = 38;
    else if (maxDim <= 20) baseCellPx = 34;
    else if (maxDim <= 25) baseCellPx = 32;
    else if (maxDim <= 30) baseCellPx = 30;
    else if (maxDim <= 40) baseCellPx = 28;
    else baseCellPx = 26;

    const clueFontSize = `${Math.max(12, Math.round(baseCellPx * 0.70))}px`;

    let html = `
      <div class="nonogram-board-outer" id="nonogram-board" 
           style="--cell-size: ${baseCellPx}px; --clue-font-size: ${clueFontSize}; --grid-cols: ${cols}; --grid-rows: ${rows};">
        <div class="board-corner">
          <span class="corner-cols">${cols}</span>
          <span class="corner-rows">${rows}</span>
        </div>
        <div class="board-col-clues" id="board-col-clues" style="grid-template-columns: repeat(${cols + 1}, var(--cell-size, ${baseCellPx}px))">
          ${colClues.map((clueArr, c) => {
            const colLine = [];
            const pColColors = [];
            for (let r = 0; r < rows; r++) {
              colLine.push(this.playerGrid[r][c]);
              pColColors.push(this.playerColorGrid[r][c]);
            }
            const cColors = this.puzzle.colColors ? this.puzzle.colColors[c] : null;
            const analysis = window.NonogramEngine.getLineClueAnalysis(colLine, clueArr, cColors, pColColors);
            const lineClass = analysis.lineStatus === 'satisfied' ? 'line-satisfied' : (analysis.lineStatus === 'error' ? 'line-error' : '');
            return `
              <div class="clue-col ${lineClass}" data-col="${c}">
                ${clueArr.map((num, i) => {
                  const colorIdx = (cColors && cColors[i] !== undefined) ? cColors[i] : 0;
                  const colorHex = isMultiColor ? (this.puzzle.palette[colorIdx] || '#ffffff') : '';
                  const colorStyle = colorHex ? `color: ${colorHex}; text-shadow: 0 0 1px #000; font-weight: 700;` : '';
                  const isDone = analysis.completed[i];
                  const isErr = analysis.hasError && !isDone;
                  const numClass = isDone ? 'done' : (isErr ? 'error' : '');
                  return `
                    <span class="clue-num ${numClass}" style="${colorStyle}">${num}</span>
                  `;
                }).join('')}
              </div>
            `;
          }).join('')}
          <div class="clue-col-extra-spacer" style="border-left: 2.5px solid #000; background-color: var(--clue-bg);"></div>
        </div>
        <div class="board-row-clues" id="board-row-clues" style="grid-template-rows: repeat(${rows + 1}, var(--cell-size, ${baseCellPx}px))">
          ${rowClues.map((clueArr, r) => {
            const rColors = this.puzzle.rowColors ? this.puzzle.rowColors[r] : null;
            const pRowColors = this.playerColorGrid ? this.playerColorGrid[r] : null;
            const analysis = window.NonogramEngine.getLineClueAnalysis(this.playerGrid[r], clueArr, rColors, pRowColors);
            const lineClass = analysis.lineStatus === 'satisfied' ? 'line-satisfied' : (analysis.lineStatus === 'error' ? 'line-error' : '');
            return `
              <div class="clue-row ${lineClass}" data-row="${r}">
                ${clueArr.map((num, i) => {
                  const colorIdx = (rColors && rColors[i] !== undefined) ? rColors[i] : 0;
                  const colorHex = isMultiColor ? (this.puzzle.palette[colorIdx] || '#ffffff') : '';
                  const colorStyle = colorHex ? `color: ${colorHex}; text-shadow: 0 0 1px #000; font-weight: 700;` : '';
                  const isDone = analysis.completed[i];
                  const isErr = analysis.hasError && !isDone;
                  const numClass = isDone ? 'done' : (isErr ? 'error' : '');
                  return `
                    <span class="clue-num ${numClass}" style="${colorStyle}">${num}</span>
                  `;
                }).join('')}
              </div>
            `;
          }).join('')}
          <div class="clue-row-extra-spacer" style="border-top: 2.5px solid #000; background-color: var(--clue-bg);"></div>
        </div>
        <div class="board-grid" id="board-grid-cells" 
             style="grid-template-columns: repeat(${cols + 1}, var(--cell-size, ${baseCellPx}px)); grid-template-rows: repeat(${rows + 1}, var(--cell-size, ${baseCellPx}px))">
    `;

    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        if (r < rows && c < cols) {
          // Normal cell
          const val = this.playerGrid[r][c];
          const borderClasses = [];
          if ((r + 1) % 5 === 0 && r + 1 < rows) borderClasses.push('border-b-thick');
          if ((c + 1) % 5 === 0 && c + 1 < cols) borderClasses.push('border-r-thick');

          let cellContent = '';
          let cellClass = 'empty';
          let customStyle = '';

          if (this.isWon && val === CellState.FILLED) {
            const colIdx = this.playerColorGrid[r][c] || 0;
            const hex = isMultiColor ? (this.puzzle.palette[colIdx] || 'var(--accent)') : 'var(--accent)';
            customStyle = `background-color: ${hex}; border-color: #000000;`;
            cellClass = 'filled color-reveal';
          } else if (val === CellState.FILLED) {
            cellClass = 'filled';
            if (isMultiColor) {
              const colIdx = this.playerColorGrid[r][c] || 0;
              const hex = this.puzzle.palette[colIdx] || '#ffe600';
              customStyle = `background-color: ${hex}; border-color: #000000;`;
            }
          } else if (val === CellState.CROSSED) {
            cellClass = 'crossed';
            cellContent = `<span class="cross-icon">${window.ICONS && window.ICONS.cross ? window.ICONS.cross : '✕'}</span>`;
          } else if (val === CellState.QUESTION) {
            cellClass = 'question';
            cellContent = `<span class="question-icon">${window.ICONS && window.ICONS.question ? window.ICONS.question : '?'}</span>`;
          }

          html += `
            <div class="board-cell cell-${cellClass} ${borderClasses.join(' ')}"
                 data-r="${r}" data-c="${c}"
                 style="${customStyle}"
                 id="cell-${r}-${c}">
              ${cellContent}
            </div>
          `;
        } else if (r < rows && c === cols) {
          // Extra Column Cell
          html += `
            <div class="board-cell-extra cell-extra-col" id="cell-extra-col-${r}"></div>
          `;
        } else if (r === rows && c < cols) {
          // Extra Row Cell
          html += `
            <div class="board-cell-extra cell-extra-row" id="cell-extra-row-${c}"></div>
          `;
        } else {
          // Corner spacer cell
          html += `
            <div class="board-cell-extra spacer"></div>
          `;
        }
      }
    }

    html += `
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEvents();
    this.updateHUD();
  }

  attachEvents() {
    const gridEl = document.getElementById('board-grid-cells');
    if (!gridEl) return;

    if (this._boardCleanup) {
      this._boardCleanup();
      this._boardCleanup = null;
    }

    let touchHoldTimer = null;
    let touchMoved = false;
    let touchStartR = -1;
    let touchStartC = -1;

    const handlePointerDown = (e) => {
      if (this.isPaused || this.isGameOver || this.isWon) return;
      if (this.panZoomController && this.panZoomController.isPanMode) return;
      if (e.touches && e.touches.length > 1) {
        if (touchHoldTimer) clearTimeout(touchHoldTimer);
        this.isDragging = false;
        return;
      }
      if (e.button === 1) return; // Reserved for middle-click panning
      if (e.ctrlKey || e.metaKey) return; // Reserved for Ctrl+Drag panning

      const cell = e.target.closest('.board-cell');
      if (!cell) return;

      const r = parseInt(cell.dataset.r, 10);
      const c = parseInt(cell.dataset.c, 10);

      const isTouch = !!(e.touches && e.touches.length > 0);
      if (isTouch) {
        touchMoved = false;
        touchStartR = r;
        touchStartC = c;
        if (touchHoldTimer) clearTimeout(touchHoldTimer);

        // Long-press hold (300ms) to quickly toggle Cross
        touchHoldTimer = setTimeout(() => {
          if (!touchMoved && this.playerGrid && !this.isGameOver && !this.isWon) {
            const curState = this.playerGrid[r][c];
            const targetState = curState === CellState.CROSSED ? CellState.EMPTY : CellState.CROSSED;
            this.history.push({ r, c, fromState: curState, toState: targetState, fromColor: this.playerColorGrid[r][c], toColor: this.currentColor });
            this.redoStack = [];
            this.playerGrid[r][c] = targetState;
            this.autoCrossGrid[r][c] = false;
            this.updateCellDOM(r, c);
            this.updateAutoCrosses();
            this.updateClueHighlights();
            this.updateHUD();
            this.highlightCrosshairs(r, c);
            if (window.sounds) window.sounds.playCross();
            if (window.settingsManager && window.settingsManager.get('vibration') && navigator.vibrate) {
              try { navigator.vibrate(30); } catch(err) {}
            }
            this.isDragging = false;
          }
        }, 320);
      }

      e.preventDefault();

      this.isDragging = true;
      this.dragStartRow = r;
      this.dragStartCol = c;
      this.dragAxis = null;
      this.draggedCells.clear();

      const isRightClick = e.button === 2;
      let effectiveMode = this.currentMode;

      if (isRightClick) {
        effectiveMode = 'cross';
      }

      const currentState = this.playerGrid[r][c];
      const currentColor = this.playerColorGrid[r][c];

      if (effectiveMode === 'fill') {
        if (currentState === CellState.FILLED && currentColor === this.currentColor) {
          this.dragTargetState = CellState.EMPTY;
        } else {
          this.dragTargetState = CellState.FILLED;
        }
      } else if (effectiveMode === 'cross') {
        this.dragTargetState = currentState === CellState.CROSSED ? CellState.EMPTY : CellState.CROSSED;
      } else if (effectiveMode === 'question') {
        this.dragTargetState = currentState === CellState.QUESTION ? CellState.EMPTY : CellState.QUESTION;
      }

      this.dragMode = effectiveMode;
      this.applyCellAction(r, c);
      this.highlightCrosshairs(r, c);
    };

    const handlePointerMove = (e) => {
      if (!this.isDragging || this.isPaused || this.isGameOver || this.isWon) return;
      if (e.touches && e.touches.length > 1) {
        if (touchHoldTimer) clearTimeout(touchHoldTimer);
        this.isDragging = false;
        return;
      }
      let target = e.target;
      if (e.touches && e.touches.length > 0) {
        touchMoved = true;
        if (touchHoldTimer) {
          clearTimeout(touchHoldTimer);
          touchHoldTimer = null;
        }
        target = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
      }
      const cell = target ? target.closest('.board-cell') : null;
      if (!cell) return;

      const r = parseInt(cell.dataset.r, 10);
      const c = parseInt(cell.dataset.c, 10);

      // Drag straight-line lock (horizontal or vertical)
      if (!this.dragAxis && (r !== this.dragStartRow || c !== this.dragStartCol)) {
        if (Math.abs(r - this.dragStartRow) >= Math.abs(c - this.dragStartCol)) {
          this.dragAxis = 'col';
        } else {
          this.dragAxis = 'row';
        }
      }

      let dragCount = 1;

      if (this.dragAxis === 'row') {
        const startC = Math.min(this.dragStartCol, c);
        const endC = Math.max(this.dragStartCol, c);
        dragCount = endC - startC + 1;
        for (let currC = startC; currC <= endC; currC++) {
          this.applyCellAction(this.dragStartRow, currC);
          if (!this.isDragging) break;
        }
        if (this.isDragging) {
          this.highlightCrosshairs(this.dragStartRow, c);
        }
      } else if (this.dragAxis === 'col') {
        const startR = Math.min(this.dragStartRow, r);
        const endR = Math.max(this.dragStartRow, r);
        dragCount = endR - startR + 1;
        for (let currR = startR; currR <= endR; currR++) {
          this.applyCellAction(currR, this.dragStartCol);
          if (!this.isDragging) break;
        }
        if (this.isDragging) {
          this.highlightCrosshairs(r, this.dragStartCol);
        }
      } else {
        this.applyCellAction(r, c);
        if (this.isDragging) {
          this.highlightCrosshairs(r, c);
        }
      }
    };

    const handlePointerUp = () => {
      if (touchHoldTimer) {
        clearTimeout(touchHoldTimer);
        touchHoldTimer = null;
      }
      if (this.isDragging) {
        this.isDragging = false;
        this.dragAxis = null;
        this.checkWinCondition();
        this.updateClueHighlights();
      }
    };

    gridEl.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    gridEl.addEventListener('auxclick', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        const cell = e.target.closest('.board-cell');
        if (cell) {
          const r = parseInt(cell.dataset.r, 10);
          const c = parseInt(cell.dataset.c, 10);
          this.clearSingleCell(r, c);
        }
      }
    });

    gridEl.addEventListener('contextmenu', (e) => e.preventDefault());

    gridEl.addEventListener('touchstart', handlePointerDown, { passive: false });
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    this._boardCleanup = () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };

    gridEl.addEventListener('mouseover', (e) => {
      if (this.panZoomController && this.panZoomController.isPanMode) {
        this.clearCrosshairs();
        return;
      }
      const cell = e.target.closest('.board-cell');
      if (cell) {
        const r = parseInt(cell.dataset.r, 10);
        const c = parseInt(cell.dataset.c, 10);
        this.highlightCrosshairs(r, c);
      }
    });

    gridEl.addEventListener('mouseleave', () => {
      this.clearCrosshairs();
    });
  }

  setKeyboardCursor(r, c) {
    if (!this.puzzle) return;
    const rows = this.puzzle.rows;
    const cols = this.puzzle.cols;
    r = Math.max(0, Math.min(rows - 1, r));
    c = Math.max(0, Math.min(cols - 1, c));

    document.querySelectorAll('.cell-keyboard-focus').forEach(el => el.classList.remove('cell-keyboard-focus'));

    this.keyboardCursorR = r;
    this.keyboardCursorC = c;
    this.hasKeyboardFocus = true;

    const targetCell = document.getElementById(`cell-${r}-${c}`);
    if (targetCell) {
      targetCell.classList.add('cell-keyboard-focus');
    }
    this.highlightCrosshairs(r, c);
  }

  moveKeyboardCursor(dr, dc) {
    if (!this.puzzle || this.isPaused || this.isGameOver || this.isWon) return;
    if (!this.hasKeyboardFocus) {
      this.setKeyboardCursor(0, 0);
      return;
    }
    const newR = this.keyboardCursorR + dr;
    const newC = this.keyboardCursorC + dc;
    this.setKeyboardCursor(newR, newC);
  }

  applyActionAtKeyboardCursor(action = null) {
    if (!this.puzzle || this.isPaused || this.isGameOver || this.isWon) return;
    if (!this.hasKeyboardFocus) {
      this.setKeyboardCursor(0, 0);
    }
    const r = this.keyboardCursorR;
    const c = this.keyboardCursorC;
    if (r < 0 || r >= this.puzzle.rows || c < 0 || c >= this.puzzle.cols) return;

    const curState = this.playerGrid[r][c];
    const curColor = this.playerColorGrid[r][c];
    const act = action || this.currentMode;

    let targetState = CellState.EMPTY;
    if (act === 'fill') {
      if (curState === CellState.FILLED && curColor === this.currentColor) {
        targetState = CellState.EMPTY;
      } else {
        targetState = CellState.FILLED;
      }
    } else if (act === 'cross') {
      targetState = curState === CellState.CROSSED ? CellState.EMPTY : CellState.CROSSED;
    } else if (act === 'question') {
      targetState = curState === CellState.QUESTION ? CellState.EMPTY : CellState.QUESTION;
    } else if (act === 'clear') {
      targetState = CellState.EMPTY;
    }

    this.dragTargetState = targetState;
    this.dragMode = act;
    this.draggedCells.clear();
    this.applyCellAction(r, c);
    this.checkWinCondition();
    this.updateClueHighlights();
    this.setKeyboardCursor(r, c);
  }

  clearSingleCell(r, c) {
    if (this.isPaused || this.isGameOver || this.isWon) return;
    const oldState = this.playerGrid[r][c];
    const oldColor = this.playerColorGrid[r][c];
    if (oldState === CellState.EMPTY) return;

    this.history.push({ r, c, fromState: oldState, toState: CellState.EMPTY, fromColor: oldColor, toColor: 0 });
    this.redoStack = [];
    this.playerGrid[r][c] = CellState.EMPTY;
    this.autoCrossGrid[r][c] = false;
    this.updateCellDOM(r, c);
    this.updateAutoCrosses();
    this.updateClueHighlights();
    this.updateHUD();

    if (window.sounds) {
      if (typeof window.sounds.playPick === 'function') {
        window.sounds.playPick();
      } else {
        window.sounds.playErase();
      }
    }
  }

  highlightCrosshairs(r, c) {
    if (this.isPaused || this.isGameOver || this.isWon) {
      this.clearCrosshairs();
      return;
    }

    if (this.panZoomController && this.panZoomController.isPanMode) {
      this.clearCrosshairs();
      return;
    }

    this.updateExtraRowColCounter(r, c);

    if (!window.settingsManager || !window.settingsManager.get('highlightCrosshairs')) return;
    if (this.lastHoveredR === r && this.lastHoveredC === c) return;

    this.clearCrosshairs(true);

    this.lastHoveredR = r;
    this.lastHoveredC = c;

    const rowClue = document.querySelector(`.clue-row[data-row="${r}"]`);
    if (rowClue) rowClue.classList.add('crosshair-active');

    const colClue = document.querySelector(`.clue-col[data-col="${c}"]`);
    if (colClue) colClue.classList.add('crosshair-active');

    const cols = this.puzzle ? this.puzzle.cols : 0;
    const rows = this.puzzle ? this.puzzle.rows : 0;

    for (let i = 0; i < cols; i++) {
      const rowCell = document.getElementById(`cell-${r}-${i}`);
      if (rowCell) rowCell.classList.add('row-highlight');
    }
    for (let i = 0; i < rows; i++) {
      const colCell = document.getElementById(`cell-${i}-${c}`);
      if (colCell) colCell.classList.add('col-highlight');
    }
  }

  clearCrosshairs(preserveExtraCounter = false) {
    if (!preserveExtraCounter) {
      this.updateExtraRowColCounter(undefined, undefined);
    }

    if (this.lastHoveredR !== -1 || this.lastHoveredC !== -1) {
      const cols = this.puzzle ? this.puzzle.cols : 0;
      const rows = this.puzzle ? this.puzzle.rows : 0;

      if (this.lastHoveredR !== -1) {
        const rowClue = document.querySelector(`.clue-row[data-row="${this.lastHoveredR}"]`);
        if (rowClue) rowClue.classList.remove('crosshair-active');
        for (let i = 0; i < cols; i++) {
          const rowCell = document.getElementById(`cell-${this.lastHoveredR}-${i}`);
          if (rowCell) rowCell.classList.remove('row-highlight');
        }
      }
      if (this.lastHoveredC !== -1) {
        const colClue = document.querySelector(`.clue-col[data-col="${this.lastHoveredC}"]`);
        if (colClue) colClue.classList.remove('crosshair-active');
        for (let i = 0; i < rows; i++) {
          const colCell = document.getElementById(`cell-${i}-${this.lastHoveredC}`);
          if (colCell) colCell.classList.remove('col-highlight');
        }
      }
      this.lastHoveredR = -1;
      this.lastHoveredC = -1;
    }
  }

  updateExtraRowColCounter(hoveredR, hoveredC) {
    if (!this.puzzle) return;
    const cols = this.puzzle.cols;
    const rows = this.puzzle.rows;
    const isMultiColor = this.puzzle.colorCount > 1 && this.puzzle.palette;

    // Reset all extra cells first
    for (let r = 0; r < rows; r++) {
      const extraCell = document.getElementById(`cell-extra-col-${r}`);
      if (extraCell) {
        extraCell.textContent = '';
        extraCell.removeAttribute('style');
      }
    }
    for (let c = 0; c < cols; c++) {
      const extraCell = document.getElementById(`cell-extra-row-${c}`);
      if (extraCell) {
        extraCell.textContent = '';
        extraCell.removeAttribute('style');
      }
    }

    if (hoveredR === undefined || hoveredC === undefined) return;
    if (hoveredR < 0 || hoveredR >= rows || hoveredC < 0 || hoveredC >= cols) return;

    const val = this.playerGrid[hoveredR][hoveredC];
    if (val !== CellState.FILLED) return;

    const colorIdx = this.playerColorGrid[hoveredR][hoveredC] || 0;
    const colorHex = isMultiColor ? (this.puzzle.palette[colorIdx] || 'var(--accent)') : 'var(--accent)';

    // Compute text color (contrast)
    const rHex = parseInt((colorHex||'#000').slice(1,3)||'00', 16);
    const gHex = parseInt((colorHex||'#000').slice(3,5)||'00', 16);
    const bHex = parseInt((colorHex||'#000').slice(5,7)||'00', 16);
    const brightness = (rHex * 299 + gHex * 587 + bHex * 114) / 1000;
    const textColor = brightness > 140 ? '#000000' : '#ffffff';

    // Contiguous row segment containing hoveredC
    let left = hoveredC;
    while (left >= 0 && this.playerGrid[hoveredR][left] === CellState.FILLED && (this.playerColorGrid[hoveredR][left] || 0) === colorIdx) {
      left--;
    }
    let right = hoveredC;
    while (right < cols && this.playerGrid[hoveredR][right] === CellState.FILLED && (this.playerColorGrid[hoveredR][right] || 0) === colorIdx) {
      right++;
    }
    const rowCount = right - left - 1;

    // Contiguous col segment containing hoveredR
    let up = hoveredR;
    while (up >= 0 && this.playerGrid[up][hoveredC] === CellState.FILLED && (this.playerColorGrid[up][hoveredC] || 0) === colorIdx) {
      up--;
    }
    let down = hoveredR;
    while (down < rows && this.playerGrid[down][hoveredC] === CellState.FILLED && (this.playerColorGrid[down][hoveredC] || 0) === colorIdx) {
      down++;
    }
    const colCount = down - up - 1;

    const targetColor = isMultiColor ? colorHex : 'var(--clue-text)';

    // Update the extra col cell for row hoveredR
    const rowExtraCell = document.getElementById(`cell-extra-col-${hoveredR}`);
    if (rowExtraCell) {
      rowExtraCell.textContent = rowCount > 0 ? rowCount : '';
      rowExtraCell.style.color = targetColor;
      rowExtraCell.style.fontWeight = '900';
    }

    // Update the extra row cell for column hoveredC
    const colExtraCell = document.getElementById(`cell-extra-row-${hoveredC}`);
    if (colExtraCell) {
      colExtraCell.textContent = colCount > 0 ? colCount : '';
      colExtraCell.style.color = targetColor;
      colExtraCell.style.fontWeight = '900';
    }
  }

  applyCellAction(r, c) {
    const key = `${r},${c}`;
    if (this.draggedCells.has(key)) return;
    this.draggedCells.add(key);

    const oldState = this.playerGrid[r][c];
    const oldColor = this.playerColorGrid[r][c];
    const targetColor = this.currentColor;

    if (oldState === this.dragTargetState && (this.dragTargetState !== CellState.FILLED || oldColor === targetColor)) {
      return;
    }

    // Mistake detection for Hearts / Mistakes mode based on contradiction with displayed clues
    if (this.maxMistakes !== Infinity && (this.dragTargetState === CellState.FILLED || this.dragTargetState === CellState.CROSSED)) {
      const rowClues = this.puzzle.rowClues ? this.puzzle.rowClues[r] : [];
      const rowColors = this.puzzle.rowColors ? this.puzzle.rowColors[r] : null;
      const testRow = [...this.playerGrid[r]];
      const testRowColors = this.playerColorGrid ? [...this.playerColorGrid[r]] : null;
      testRow[c] = this.dragTargetState;
      if (testRowColors) {
        testRowColors[c] = (this.dragTargetState === CellState.FILLED) ? targetColor : 0;
      }

      const colClues = this.puzzle.colClues ? this.puzzle.colClues[c] : [];
      const colColors = this.puzzle.colColors ? this.puzzle.colColors[c] : null;
      const rowsCount = this.puzzle.rows;
      const testCol = [];
      const testColColors = this.playerColorGrid ? [] : null;
      for (let i = 0; i < rowsCount; i++) {
        testCol.push(i === r ? this.dragTargetState : this.playerGrid[i][c]);
        if (testColColors) {
          testColColors.push(i === r ? ((this.dragTargetState === CellState.FILLED) ? targetColor : 0) : (this.playerColorGrid[i] ? this.playerColorGrid[i][c] : 0));
        }
      }

      const rowCanSolve = window.NonogramEngine
        ? window.NonogramEngine.canSolveLine(testRow, testRowColors, rowClues, rowColors)
        : true;
      const colCanSolve = window.NonogramEngine
        ? window.NonogramEngine.canSolveLine(testCol, testColColors, colClues, colColors)
        : true;

      const isMistake = (!rowCanSolve || !colCanSolve);

      if (isMistake) {
        this.mistakes++;
        if (window.sounds) window.sounds.playError();
        if (window.settingsManager && window.settingsManager.get('vibration') && navigator.vibrate) {
          try { navigator.vibrate([100, 50, 100]); } catch (e) {}
        }

        // User entered a mistake: place what the user actually entered (for this first cell only)
        const userState = this.dragTargetState;
        const userColor = (userState === CellState.FILLED) ? targetColor : 0;

        // Save move to history
        this.history.push({
          r,
          c,
          fromState: oldState,
          toState: userState,
          fromColor: oldColor,
          toColor: userColor
        });
        this.redoStack = [];

        // Fill the cell with what the user entered
        this.playerGrid[r][c] = userState;
        this.playerColorGrid[r][c] = userColor;
        this.autoCrossGrid[r][c] = false;
        this.updateCellDOM(r, c);

        // Red border animation (mistake-glow)
        const cellEl = document.getElementById(`cell-${r}-${c}`);
        if (cellEl) {
          cellEl.classList.remove('mistake-glow');
          void cellEl.offsetWidth; // Trigger reflow
          cellEl.classList.add('mistake-glow');
          setTimeout(() => {
            if (cellEl) cellEl.classList.remove('mistake-glow');
          }, 1200);
        }

        // Stop user drag/click immediately so they don't drag the mistake into subsequent cells
        this.isDragging = false;
        this.draggedCells.clear();
        this.dragAxis = null;

        this.updateAutoCrosses();
        this.updateClueHighlights();
        this.updateHUD();

        if (this.mistakes >= this.maxMistakes) {
          this.triggerGameOver();
        } else {
          this.saveCurrentProgress();
        }
        return;
      }
    }

    // Save to history for undo
    this.history.push({
      r,
      c,
      fromState: oldState,
      toState: this.dragTargetState,
      fromColor: oldColor,
      toColor: targetColor
    });
    this.redoStack = [];

    this.playerGrid[r][c] = this.dragTargetState;
    if (this.dragTargetState === CellState.FILLED) {
      this.playerColorGrid[r][c] = targetColor;
    }
    this.autoCrossGrid[r][c] = false;

    this.updateCellDOM(r, c);

    // Audio feedback
    if (this.dragTargetState === CellState.FILLED) {
      if (window.sounds) window.sounds.playFill(r + c);
    } else if (this.dragTargetState === CellState.CROSSED) {
      if (window.sounds) window.sounds.playCross();
    } else {
      if (window.sounds) {
        if (typeof window.sounds.playPick === 'function') {
          window.sounds.playPick();
        } else {
          window.sounds.playErase();
        }
      }
    }

    this.updateAutoCrosses();
    this.updateHUD();
    this.saveCurrentProgress();
  }

  updateAutoCrosses() {
    const cols = this.puzzle.cols;
    const rows = this.puzzle.rows;
    const autoFill = window.settingsManager ? window.settingsManager.get('autoFillCrosses') : false;

    if (!this.autoCrossGrid) {
      this.autoCrossGrid = Array.from({ length: rows }, () => Array(cols).fill(false));
    }

    if (!autoFill) {
      // Clear any auto-crosses that exist
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (this.autoCrossGrid[r][c]) {
            this.playerGrid[r][c] = CellState.EMPTY;
            this.autoCrossGrid[r][c] = false;
            this.updateCellDOM(r, c);
          }
        }
      }
      return;
    }

    // Build the temp grid ignoring auto crosses (treating them as EMPTY)
    const tempGrid = Array.from({ length: rows }, (_, r) => 
      Array.from({ length: cols }, (_, c) => 
        this.autoCrossGrid[r][c] ? CellState.EMPTY : this.playerGrid[r][c]
      )
    );

    // Identify which lines are solved on tempGrid
    const rowSolved = Array(rows).fill(false);
    for (let r = 0; r < rows; r++) {
      const rColors = this.puzzle.rowColors ? this.puzzle.rowColors[r] : null;
      const pRowColors = this.playerColorGrid ? this.playerColorGrid[r] : null;
      if (window.NonogramEngine.isLineSolved(tempGrid[r], this.puzzle.rowClues[r], rColors, pRowColors)) {
        rowSolved[r] = true;
      }
    }

    const colSolved = Array(cols).fill(false);
    for (let c = 0; c < cols; c++) {
      const colLine = [];
      const pColColors = [];
      for (let r = 0; r < rows; r++) {
        colLine.push(tempGrid[r][c]);
        pColColors.push(this.playerColorGrid[r][c]);
      }
      const cColors = this.puzzle.colColors ? this.puzzle.colColors[c] : null;
      if (window.NonogramEngine.isLineSolved(colLine, this.puzzle.colClues[c], cColors, pColColors)) {
        colSolved[c] = true;
      }
    }

    // Set or unset auto crosses
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const shouldBeAutoCrossed = tempGrid[r][c] === CellState.EMPTY && (rowSolved[r] || colSolved[c]);

        if (shouldBeAutoCrossed) {
          if (!this.autoCrossGrid[r][c]) {
            this.playerGrid[r][c] = CellState.CROSSED;
            this.autoCrossGrid[r][c] = true;
            this.updateCellDOM(r, c);
          }
        } else {
          if (this.autoCrossGrid[r][c]) {
            this.playerGrid[r][c] = CellState.EMPTY;
            this.autoCrossGrid[r][c] = false;
            this.updateCellDOM(r, c);
          }
        }
      }
    }
  }

  updateCellDOM(r, c) {
    const cellEl = document.getElementById(`cell-${r}-${c}`);
    if (!cellEl) return;

    const val = this.playerGrid[r][c];
    const hadRowHl = cellEl.classList.contains('row-highlight');
    const hadColHl = cellEl.classList.contains('col-highlight');

    cellEl.className = 'board-cell';
    cellEl.removeAttribute('style');

    const cols = this.puzzle.cols;
    const rows = this.puzzle.rows;
    if ((r + 1) % 5 === 0 && r + 1 < rows) cellEl.classList.add('border-b-thick');
    if ((c + 1) % 5 === 0 && c + 1 < cols) cellEl.classList.add('border-r-thick');

    if (hadRowHl) cellEl.classList.add('row-highlight');
    if (hadColHl) cellEl.classList.add('col-highlight');

    if (val === CellState.FILLED) {
      cellEl.classList.add('cell-filled');
      const isMultiColor = this.puzzle.colorCount > 1 && this.puzzle.palette && this.puzzle.palette.length > 1;
      if (isMultiColor) {
        const colIdx = this.playerColorGrid[r][c] || 0;
        const hex = this.puzzle.palette[colIdx] || '#ffe600';
        cellEl.style.backgroundColor = hex;
        cellEl.style.borderColor = '#000000';
      }
      cellEl.innerHTML = '';
    } else if (val === CellState.CROSSED) {
      cellEl.classList.add('cell-crossed');
      cellEl.innerHTML = `<span class="cross-icon">${window.ICONS && window.ICONS.cross ? window.ICONS.cross : '✕'}</span>`;
    } else if (val === CellState.QUESTION) {
      cellEl.classList.add('cell-question');
      cellEl.innerHTML = `<span class="question-icon">${window.ICONS && window.ICONS.question ? window.ICONS.question : '?'}</span>`;
    } else {
      cellEl.classList.add('cell-empty');
      cellEl.innerHTML = '';
    }

    // Refresh extra counter
    if (this.lastHoveredR !== undefined && this.lastHoveredC !== undefined) {
      this.updateExtraRowColCounter(this.lastHoveredR, this.lastHoveredC);
    }
  }

  updateClueHighlights(silent = false) {
    if (!this.puzzle) return;
    const cols = this.puzzle.cols;
    const rows = this.puzzle.rows;

    // Update row clues
    for (let r = 0; r < rows; r++) {
      const clueRowEl = document.querySelector(`.clue-row[data-row="${r}"]`);
      if (!clueRowEl) continue;
      const rColors = this.puzzle.rowColors ? this.puzzle.rowColors[r] : null;
      const pRowColors = this.playerColorGrid ? this.playerColorGrid[r] : null;
      const analysis = window.NonogramEngine.getLineClueAnalysis(this.playerGrid[r], this.puzzle.rowClues[r], rColors, pRowColors);
      const spans = clueRowEl.querySelectorAll('.clue-num');
      spans.forEach((span, idx) => {
        const isDone = !!analysis.completed[idx];
        const isErr = !!analysis.hasError && !isDone;
        span.classList.toggle('done', isDone);
        span.classList.toggle('error', isErr);
      });
      const isSatisfied = analysis.lineStatus === 'satisfied';
      clueRowEl.classList.toggle('line-satisfied', isSatisfied);
      clueRowEl.classList.toggle('line-error', analysis.lineStatus === 'error');

      if (isSatisfied) {
        if (!this.satisfiedRowsSet.has(r)) {
          this.satisfiedRowsSet.add(r);
          if (!silent) {
            clueRowEl.classList.add('line-complete-flash');
            setTimeout(() => clueRowEl.classList.remove('line-complete-flash'), 1000);
            if (window.sounds && !this.isWon) {
              window.sounds.playLineComplete();
            }
          }
        }
      } else {
        this.satisfiedRowsSet.delete(r);
      }
    }

    // Update col clues
    for (let c = 0; c < cols; c++) {
      const clueColEl = document.querySelector(`.clue-col[data-col="${c}"]`);
      if (!clueColEl) continue;
      const colLine = [];
      const pColColors = [];
      for (let r = 0; r < rows; r++) {
        colLine.push(this.playerGrid[r][c]);
        pColColors.push(this.playerColorGrid[r][c]);
      }
      const cColors = this.puzzle.colColors ? this.puzzle.colColors[c] : null;
      const analysis = window.NonogramEngine.getLineClueAnalysis(colLine, this.puzzle.colClues[c], cColors, pColColors);
      const spans = clueColEl.querySelectorAll('.clue-num');
      spans.forEach((span, idx) => {
        const isDone = !!analysis.completed[idx];
        const isErr = !!analysis.hasError && !isDone;
        span.classList.toggle('done', isDone);
        span.classList.toggle('error', isErr);
      });
      const isSatisfied = analysis.lineStatus === 'satisfied';
      clueColEl.classList.toggle('line-satisfied', isSatisfied);
      clueColEl.classList.toggle('line-error', analysis.lineStatus === 'error');

      if (isSatisfied) {
        if (!this.satisfiedColsSet.has(c)) {
          this.satisfiedColsSet.add(c);
          if (!silent) {
            clueColEl.classList.add('line-complete-flash');
            setTimeout(() => clueColEl.classList.remove('line-complete-flash'), 1000);
            if (window.sounds && !this.isWon) {
              window.sounds.playLineComplete();
            }
          }
        }
      } else {
        this.satisfiedColsSet.delete(c);
      }
    }
  }

  undo() {
    if (this.history.length === 0 || this.isPaused || this.isGameOver || this.isWon) return;
    const move = this.history.pop();
    this.playerGrid[move.r][move.c] = move.fromState;
    this.playerColorGrid[move.r][move.c] = move.fromColor !== undefined ? move.fromColor : 0;
    this.redoStack.push(move);

    this.autoCrossGrid[move.r][move.c] = false;
    this.updateCellDOM(move.r, move.c);
    this.updateAutoCrosses();
    this.updateClueHighlights();
    this.updateHUD();
    this.saveCurrentProgress();
    if (window.sounds) window.sounds.playClick();
  }

  redo() {
    if (this.redoStack.length === 0 || this.isPaused || this.isGameOver || this.isWon) return;
    const move = this.redoStack.pop();
    this.playerGrid[move.r][move.c] = move.toState;
    this.playerColorGrid[move.r][move.c] = move.toColor !== undefined ? move.toColor : 0;
    this.history.push(move);

    this.autoCrossGrid[move.r][move.c] = false;
    this.updateCellDOM(move.r, move.c);
    this.updateAutoCrosses();
    this.updateClueHighlights();
    this.updateHUD();
    this.saveCurrentProgress();
    if (window.sounds) window.sounds.playClick();
  }

  useHint() {
    if (this.isPaused || this.isGameOver || this.isWon) return;

    const hint = window.NonogramEngine.findHint(
      this.playerGrid,
      this.puzzle,
      this.playerColorGrid
    );

    if (!hint) return;

    this.hintsUsed = (this.hintsUsed || 0) + 1;
    this.applyHint(hint);
    this.updateHUD();
    this.saveCurrentProgress();
    this.checkWinCondition();
  }

  applyHint(hint) {
    const { r, c, correctState, colorIndex } = hint;
    const oldState = this.playerGrid[r][c];
    const oldColor = this.playerColorGrid[r][c];
    const targetColor = colorIndex !== undefined ? colorIndex : 0;

    this.history.push({
      r,
      c,
      fromState: oldState,
      toState: correctState,
      fromColor: oldColor,
      toColor: targetColor
    });

    this.playerGrid[r][c] = correctState;
    if (correctState === CellState.FILLED) {
      this.playerColorGrid[r][c] = targetColor;
    }
    this.autoCrossGrid[r][c] = false;

    this.updateCellDOM(r, c);
    this.updateAutoCrosses();

    const cellEl = document.getElementById(`cell-${r}-${c}`);
    if (cellEl) {
      cellEl.classList.add('hint-glow');
      setTimeout(() => cellEl.classList.remove('hint-glow'), 1200);
    }

    if (window.sounds) window.sounds.playLineComplete();
    this.updateClueHighlights();
  }

  giveUp() {
    if (!this.puzzle || this.isWon || this.isGameOver) return;
    this.stopTimer();
    this.isPaused = false;
    document.getElementById('pause-modal')?.classList.add('hidden');
    document.getElementById('reset-modal')?.classList.add('hidden');
    document.getElementById('surrender-modal')?.classList.add('hidden');

    const solution = (window.NonogramEngine && typeof window.NonogramEngine.getPuzzleSolution === 'function')
      ? window.NonogramEngine.getPuzzleSolution(this.puzzle)
      : null;

    if (solution) {
      const cols = this.puzzle.cols;
      const rows = this.puzzle.rows;

      // Save user attempt grid
      this.surrenderUserGrid = JSON.parse(JSON.stringify(this.playerGrid));
      this.surrenderUserColorGrid = JSON.parse(JSON.stringify(this.playerColorGrid));

      // Build solution grid
      this.surrenderSolutionGrid = Array.from({ length: rows }, () => Array(cols).fill(CellState.EMPTY));
      this.surrenderSolutionColorGrid = Array.from({ length: rows }, () => Array(cols).fill(0));

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const val = solution[r][c];
          if (val > 0) {
            this.surrenderSolutionGrid[r][c] = CellState.FILLED;
            this.surrenderSolutionColorGrid[r][c] = val - 1;
          } else {
            this.surrenderSolutionGrid[r][c] = CellState.CROSSED;
          }
        }
      }

      this.isGameOver = true;
      this.clearCrosshairs();

      // Ensure toggle switch is checked (solution view)
      const toggleEl = document.getElementById('surrender-toggle-solution');
      if (toggleEl) {
        toggleEl.checked = true;
      }

      this.showSurrenderGrid(true);

      // Hide header, normal toolbar, and color palette bar, and show surrender bar
      document.getElementById('game-header-box')?.classList.add('hidden');
      document.getElementById('game-color-palette-bar')?.classList.add('hidden');
      document.getElementById('game-normal-toolbar')?.classList.add('hidden');
      document.getElementById('game-surrender-bar')?.classList.remove('hidden');
    }
  }

  showSurrenderGrid(showSolution) {
    if (!this.puzzle) return;
    if (showSolution && this.surrenderSolutionGrid) {
      this.playerGrid = JSON.parse(JSON.stringify(this.surrenderSolutionGrid));
      this.playerColorGrid = JSON.parse(JSON.stringify(this.surrenderSolutionColorGrid));
    } else if (!showSolution && this.surrenderUserGrid) {
      this.playerGrid = JSON.parse(JSON.stringify(this.surrenderUserGrid));
      this.playerColorGrid = JSON.parse(JSON.stringify(this.surrenderUserColorGrid));
    }
    this.render();
  }

  reset() {
    if (!this.puzzle) return;
    // Restore header and normal toolbar
    document.getElementById('game-header-box')?.classList.remove('hidden');
    document.getElementById('game-normal-toolbar')?.classList.remove('hidden');
    document.getElementById('game-surrender-bar')?.classList.add('hidden');
    const cols = this.puzzle.cols;
    const rows = this.puzzle.rows;
    this.playerGrid = Array.from({ length: rows }, () => Array(cols).fill(CellState.EMPTY));
    this.playerColorGrid = Array.from({ length: rows }, () => Array(cols).fill(0));
    this.autoCrossGrid = Array.from({ length: rows }, () => Array(cols).fill(false));
    this.history = [];
    this.redoStack = [];
    this.mistakes = 0;
    this.timerSeconds = 0;
    this.isGameOver = false;
    this.isWon = false;
    this.isPaused = false;
    this.satisfiedRowsSet = new Set();
    this.satisfiedColsSet = new Set();

    if (window.puzzleManager) {
      window.puzzleManager.clearProgress(this.puzzle.id);
      window.puzzleManager.clearActiveGame();
    }

    document.getElementById('victory-modal')?.classList.add('hidden');
    document.getElementById('gameover-modal')?.classList.add('hidden');
    document.getElementById('pause-modal')?.classList.add('hidden');
    document.getElementById('reset-modal')?.classList.add('hidden');
    document.getElementById('surrender-modal')?.classList.add('hidden');
    const pauseBtn = document.getElementById('game-pause-btn');
    if (pauseBtn) {
      pauseBtn.classList.remove('active');
    }

    const modeSetting = window.settingsManager ? window.settingsManager.get('gameMode') : 'hearts';
    this.maxMistakes = modeSetting === 'zen' ? Infinity : 3;
    this.startTimer();
    this.render();
    this.updateHUD();
    this.updateClueHighlights(true);
    if (this.panZoomController) {
      this.panZoomController.resetView();
    }
  }

  resumeAsZen() {
    if (!this.puzzle) return;
    this.isGameOver = false;
    this.isWon = false;
    this.isPaused = false;
    this.maxMistakes = Infinity;
    this.startTimer();
    this.render();
    this.updateHUD();
  }

  checkWinCondition() {
    if (this.isWon || this.isGameOver) return;

    const isSolved = window.NonogramEngine.isBoardSolvedWithClues(
      this.playerGrid,
      this.puzzle.rowClues,
      this.puzzle.colClues,
      this.puzzle.rowColors,
      this.puzzle.colColors,
      this.playerColorGrid
    );

    if (isSolved) {
      this.handleVictory();
    }
  }

  handleVictory() {
    this.isWon = true;
    this.stopTimer();
    if (window.sounds) window.sounds.playVictory();

    // Record stats in puzzle manager and clear in-progress state
    if (window.puzzleManager) {
      window.puzzleManager.recordCompletion(this.puzzle.id, this.timerSeconds, this.mistakes);
      window.puzzleManager.clearProgress(this.puzzle.id);
      window.puzzleManager.clearActiveGame();
    }
    try {
      localStorage.setItem('nonogram_last_screen', (window.app && window.app.gameOriginScreen) || 'home');
    } catch (e) {}

    // Color reveal on board
    this.render();

    // Trigger victory modal with confetti and solved preview
    setTimeout(() => {
      this.showVictoryModal();
    }, 400);
  }

  showVictoryModal() {
    const modal = document.getElementById('victory-modal');
    if (!modal) return;

    const puzzleTitle = document.getElementById('victory-puzzle-name');
    if (puzzleTitle) {
      puzzleTitle.textContent = this.puzzle.name;
    }

    // Render solved pixel art preview
    const previewContainer = document.getElementById('victory-puzzle-preview');
    if (previewContainer) {
      const cols = this.puzzle.cols;
      const rows = this.puzzle.rows;
      const sizeStyle = cols >= rows
        ? `width: 100%; height: ${(rows / cols * 100).toFixed(2)}%; aspect-ratio: ${cols} / ${rows}; max-width: 100%; max-height: 100%;`
        : `height: 100%; width: ${(cols / rows * 100).toFixed(2)}%; aspect-ratio: ${cols} / ${rows}; max-width: 100%; max-height: 100%;`;
      let html = `<div class="victory-pixel-art-grid" style="grid-template-columns: repeat(${cols}, minmax(0, 1fr)); grid-template-rows: repeat(${rows}, minmax(0, 1fr)); ${sizeStyle}">`;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const isFilled = this.playerGrid[r][c] === CellState.FILLED;
          if (isFilled) {
            const isMultiColor = this.puzzle.colorCount > 1 && this.puzzle.palette && this.puzzle.palette.length > 1;
            if (isMultiColor) {
              const colIdx = this.playerColorGrid[r][c] || 0;
              const color = this.puzzle.palette[colIdx] || '#000000';
              html += `<div class="victory-pixel filled" data-multicolor="true" style="background-color: ${color}"></div>`;
            } else {
              html += `<div class="victory-pixel filled"></div>`;
            }
          } else {
            html += `<div class="victory-pixel"></div>`;
          }
        }
      }
      html += `</div>`;
      previewContainer.innerHTML = html;
    }

    const timeEl = document.getElementById('victory-time-val');
    if (timeEl) {
      timeEl.textContent = this.formatTime(this.timerSeconds);
    }

    const mistakesStatItem = document.getElementById('victory-stat-mistakes');
    const mistakesEl = document.getElementById('victory-mistakes-val');
    const isZen = this.maxMistakes === Infinity;

    if (isZen) {
      if (mistakesStatItem) mistakesStatItem.classList.add('hidden');
    } else {
      if (mistakesStatItem) mistakesStatItem.classList.remove('hidden');
      if (mistakesEl) mistakesEl.textContent = this.mistakes;
    }

    const hintsStatItem = document.getElementById('victory-stat-hints');
    const hintsEl = document.getElementById('victory-hints-val');
    const hintsUsed = this.hintsUsed || 0;

    if (hintsUsed > 0) {
      if (hintsStatItem) hintsStatItem.classList.remove('hidden');
      if (hintsEl) hintsEl.textContent = hintsUsed;
    } else {
      if (hintsStatItem) hintsStatItem.classList.add('hidden');
    }

    // Handle "Next Puzzle" button in Victory Modal
    const nextBtn = document.getElementById('victory-next-btn');
    if (nextBtn) {
      const isRandom = this.puzzle && this.puzzle.id.startsWith('random_');
      const isDaily = this.puzzle && this.puzzle.id.startsWith('daily_');
      const isProgressive = document.getElementById('random-progressive-toggle')?.checked;

      if (isRandom && isProgressive) {
        nextBtn.style.display = '';
        nextBtn.className = 'primary-btn';
        nextBtn.textContent = window.i18n ? window.i18n.t('nextPuzzle') : 'Next Puzzle';
      } else if (isRandom || isDaily || (window.app && window.app.gameOriginScreen === 'home')) {
        nextBtn.style.display = 'none';
      } else {
        nextBtn.style.display = '';
        nextBtn.className = 'primary-btn';
        nextBtn.textContent = window.i18n ? window.i18n.t('nextLevel') : 'Next Puzzle';
      }
    }

    modal.classList.remove('hidden');
    this.launchConfetti();

    // WebXDC broadcast check
    const shouldBroadcast = window.settingsManager ? window.settingsManager.get('webxdcBroadcast') !== false : true;
    if (shouldBroadcast && window.webxdc && window.webxdc.sendUpdate) {
      const isRandom = this.puzzle && this.puzzle.id.startsWith('random_');
      const isFa = window.i18n ? window.i18n.getLang() === 'fa' : false;
      const pName = this.puzzle.name;
      const timeStr = this.formatTime(this.timerSeconds);
      const diffStr = this.puzzle.difficulty || 'medium';

      const mistakesStr = !isZen ? (isFa ? ` با ${this.mistakes} خطا` : ` with ${this.mistakes} mistakes`) : '';
      const hintsStr = hintsUsed > 0 ? (isFa ? ` و ${hintsUsed} راهنمایی` : ` and ${hintsUsed} hints`) : '';

      let infoText = '';
      if (isRandom) {
        if (isFa) {
          infoText = `🎉 ${window.webxdc.selfName || 'کاربر'} یک پازل تصادفی (${this.puzzle.cols}×${this.puzzle.rows}، سختی: ${diffStr}) را در زمان ${timeStr}${mistakesStr}${hintsStr} حل کرد!`;
        } else {
          const detailStr = (mistakesStr || hintsStr) ? ` (${[mistakesStr.trim(), hintsStr.replace(/^ and /, '')].filter(Boolean).join(', ')})` : '';
          infoText = `🎉 ${window.webxdc.selfName || 'Player'} solved a Random Puzzle (${this.puzzle.cols}x${this.puzzle.rows}, ${diffStr}) in ${timeStr}${detailStr}!`;
        }
      } else {
        if (isFa) {
          infoText = `🎉 ${window.webxdc.selfName || 'کاربر'} پازل "${pName}" (${this.puzzle.cols}×${this.puzzle.rows}) را در زمان ${timeStr}${mistakesStr}${hintsStr} حل کرد!`;
        } else {
          const detailStr = (mistakesStr || hintsStr) ? ` (${[mistakesStr.trim(), hintsStr.replace(/^ and /, '')].filter(Boolean).join(', ')})` : '';
          infoText = `🎉 ${window.webxdc.selfName || 'Player'} solved "${pName}" in ${timeStr}${detailStr}!`;
        }
      }

      const updatePayload = {
        payload: {
          type: 'solve_result',
          puzzleId: this.puzzle.id,
          numericId: this.puzzle.numericId,
          puzzleName: pName,
          cols: this.puzzle.cols,
          rows: this.puzzle.rows,
          isRandom: isRandom,
          difficulty: diffStr,
          time: this.timerSeconds,
          mistakes: isZen ? null : this.mistakes,
          hints: hintsUsed > 0 ? hintsUsed : 0
        },
        info: infoText
      };

      if (!isRandom) {
        updatePayload.href = `index.html?search=${this.puzzle.numericId || this.puzzle.id || ''}`;
      }

      window.webxdc.sendUpdate(updatePayload, `Solved ${pName}`);
    }
  }

  launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#38bdf8', '#8b5cf6', '#ec4899'];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.8) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 8,
        gravity: 0.35,
        alpha: 1
      });
    }

    let animId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rSpeed;
        p.alpha -= 0.009;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (alive) {
        animId = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    animate();
  }

  triggerGameOver() {
    this.isGameOver = true;
    this.stopTimer();

    // Clear saved puzzle progress on game over
    if (this.puzzle && this.puzzle.id && window.puzzleManager) {
      window.puzzleManager.clearProgress(this.puzzle.id);
      window.puzzleManager.clearActiveGame();
    }
    try {
      localStorage.setItem('nonogram_last_screen', (window.app && window.app.gameOriginScreen) || 'home');
    } catch (e) {}

    const modal = document.getElementById('gameover-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  updateHUD() {
    this.updateTimerDisplay();

    const isZen = this.maxMistakes === Infinity;
    const headerBox = document.getElementById('game-header-box');
    if (headerBox) {
      headerBox.classList.toggle('is-zen-mode', isZen);
    }
    const gameScreen = document.getElementById('screen-game');
    if (gameScreen) {
      gameScreen.classList.toggle('is-zen-mode', isZen);
    }

    // Mistakes / Hearts
    const heartsContainer = document.getElementById('game-hearts-container');
    if (heartsContainer) {
      if (isZen) {
        heartsContainer.innerHTML = '';
        heartsContainer.style.display = 'none';
      } else {
        heartsContainer.style.display = '';
        let heartsHtml = '';
        for (let i = 0; i < this.maxMistakes; i++) {
          const isLost = i < this.mistakes;
          if (isLost) {
            heartsHtml += `
              <span class="heart-icon lost" style="display: inline-block; vertical-align: middle; line-height: 1;">
                ${window.ICONS && window.ICONS.heartLost ? window.ICONS.heartLost : window.ICONS.heart}
              </span>
            `;
          } else {
            heartsHtml += `
              <span class="heart-icon active" style="display: inline-block; vertical-align: middle; line-height: 1;">
                ${window.ICONS && window.ICONS.heartActive ? window.ICONS.heartActive : window.ICONS.heartFilled}
              </span>
            `;
          }
        }
        heartsContainer.innerHTML = heartsHtml;
      }
    }

    // Hints
    const hintsCountEl = document.getElementById('hints-count-val');
    if (hintsCountEl) {
      hintsCountEl.textContent = this.hintsUsed || 0;
    }

    // Undo / Redo buttons
    const undoBtn = document.getElementById('game-undo-btn');
    if (undoBtn) undoBtn.classList.toggle('disabled', this.history.length === 0);

    const redoBtn = document.getElementById('game-redo-btn');
    if (redoBtn) redoBtn.classList.toggle('disabled', this.redoStack.length === 0);

    // Title and dimensions
    const titleEl = document.getElementById('game-active-puzzle-title');
    const titleBox = titleEl ? titleEl.closest('.game-header-title-box') : null;
    if (titleEl && this.puzzle) {
      const name = this.puzzle.name || '';
      titleEl.textContent = name;
      titleEl.setAttribute('title', name);
      if (titleBox) {
        titleBox.setAttribute('title', name);
      }
    }

    const dimEl = document.getElementById('game-active-puzzle-dimensions');
    if (dimEl && this.puzzle) {
      const title = this.puzzle.name || '';
      const hasDim = title.includes(`${this.puzzle.cols}x${this.puzzle.rows}`) || 
                     title.includes(`${this.puzzle.cols}×${this.puzzle.rows}`) ||
                     title.includes(`${this.puzzle.cols} x ${this.puzzle.rows}`) ||
                     title.includes(`${this.puzzle.cols} × ${this.puzzle.rows}`);
      if (hasDim) {
        dimEl.style.display = 'none';
      } else {
        dimEl.style.display = '';
        dimEl.textContent = `${this.puzzle.cols}×${this.puzzle.rows}`;
      }
    }
  }

  updateTimerDisplay() {
    const timerEl = document.getElementById('game-timer-display');
    if (timerEl) {
      timerEl.textContent = this.formatTime(this.timerSeconds);
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

const gameEngine = new GameEngine();
window.gameEngine = gameEngine;
