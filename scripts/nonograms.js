/**
 * nonograms - Logic & Math Engine
 * Supports arbitrary rectangular grids, multi-color nonograms, deductive solver, and hint system
 */

const CellState = {
  EMPTY: 0,
  FILLED: 1,
  CROSSED: 2,
  QUESTION: 3
};

class NonogramEngine {
  /**
   * Generates clue numbers for all rows and columns of a binary grid
   * @param {number[][]} grid - 2D array of 0 (empty) and 1 (filled)
   * @returns {{ rowClues: number[][], colClues: number[][] }}
   */
  static generateClues(grid) {
    const rows = grid.length;
    const cols = grid[0].length;

    const rowClues = [];
    for (let r = 0; r < rows; r++) {
      rowClues.push(this.getLineClues(grid[r]));
    }

    const colClues = [];
    for (let c = 0; c < cols; c++) {
      const colLine = [];
      for (let r = 0; r < rows; r++) {
        colLine.push(grid[r][c]);
      }
      colClues.push(this.getLineClues(colLine));
    }

    return { rowClues, colClues };
  }

  /**
   * Calculates clues for a single 1D line of 0s and 1s, optionally with color indices
   */
  static getLineClues(line, lineColorIndices = null) {
    const clues = [];
    let count = 0;
    let currentColor = -1;

    for (let i = 0; i < line.length; i++) {
      const isFilled = line[i] === 1 || line[i] === CellState.FILLED;
      const color = (lineColorIndices && lineColorIndices[i] !== undefined) ? lineColorIndices[i] : 0;

      if (isFilled) {
        if (count > 0 && currentColor === color) {
          count++;
        } else {
          if (count > 0) clues.push(count);
          count = 1;
          currentColor = color;
        }
      } else {
        if (count > 0) {
          clues.push(count);
          count = 0;
          currentColor = -1;
        }
      }
    }
    if (count > 0) {
      clues.push(count);
    }
    return clues.length > 0 ? clues : [0];
  }

  /**
   * Checks if a player's line matches target clues and colors
   */
  static isLineSolved(playerLine, targetClues, targetColors = null, lineColorIndices = null) {
    if (!targetClues || targetClues.length === 0) return true;
    
    // If clue is [0], line must have no filled cells
    if (targetClues.length === 1 && targetClues[0] === 0) {
      return !playerLine.some(v => v === CellState.FILLED || v === 1);
    }

    // Extract blocks and block colors from player line
    const blocks = [];
    const blockColors = [];
    let curLen = 0;
    let curColor = -1;

    for (let i = 0; i < playerLine.length; i++) {
      const isFilled = playerLine[i] === CellState.FILLED || playerLine[i] === 1;
      const colIdx = (lineColorIndices && lineColorIndices[i] !== undefined) ? lineColorIndices[i] : 0;

      if (isFilled) {
        if (curLen > 0 && curColor === colIdx) {
          curLen++;
        } else {
          if (curLen > 0) {
            blocks.push(curLen);
            blockColors.push(curColor);
          }
          curLen = 1;
          curColor = colIdx;
        }
      } else {
        if (curLen > 0) {
          blocks.push(curLen);
          blockColors.push(curColor);
          curLen = 0;
          curColor = -1;
        }
      }
    }
    if (curLen > 0) {
      blocks.push(curLen);
      blockColors.push(curColor);
    }

    if (blocks.length !== targetClues.length) return false;
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i] !== targetClues[i]) return false;
      if (targetColors && targetColors[i] !== undefined && blockColors[i] !== targetColors[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if the entire board matches row and column clues
   */
  static isBoardSolvedWithClues(playerGrid, rowClues, colClues, rowColors = null, colColors = null, playerColorGrid = null) {
    const rows = rowClues.length;
    const cols = colClues.length;

    // Check every row
    for (let r = 0; r < rows; r++) {
      const rColors = (rowColors && rowColors[r]) ? rowColors[r] : null;
      const pRowColors = playerColorGrid ? playerColorGrid[r] : null;
      if (!this.isLineSolved(playerGrid[r], rowClues[r], rColors, pRowColors)) {
        return false;
      }
    }

    // Check every col
    for (let c = 0; c < cols; c++) {
      const colLine = [];
      const pColColors = [];
      for (let r = 0; r < rows; r++) {
        colLine.push(playerGrid[r][c]);
        pColColors.push(playerColorGrid ? playerColorGrid[r][c] : 0);
      }
      const cColors = (colColors && colColors[c]) ? colColors[c] : null;
      if (!this.isLineSolved(colLine, colClues[c], cColors, pColColors)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Analyzes line clues to mark individual numbers as completed (green) or error (red)
   */
  static getLineClueAnalysis(line, clues, targetColors = null, lineColorIndices = null) {
    if (!clues || clues.length === 0) return { lineStatus: 'normal', completed: [], hasError: false };

    if (clues.length === 1 && clues[0] === 0) {
      const hasFilled = line.some(v => v === CellState.FILLED || v === 1);
      return {
        lineStatus: hasFilled ? 'error' : 'satisfied',
        completed: [!hasFilled],
        hasError: hasFilled
      };
    }

    const isSolved = this.isLineSolved(line, clues, targetColors, lineColorIndices);
    if (isSolved) {
      return {
        lineStatus: 'satisfied',
        completed: new Array(clues.length).fill(true),
        hasError: false
      };
    }

    // Extract player's filled blocks & colors
    const blocks = [];
    const blockColors = [];
    let curLen = 0;
    let curColor = -1;
    let totalFilled = 0;

    for (let i = 0; i < line.length; i++) {
      const isFilled = line[i] === CellState.FILLED || line[i] === 1;
      const colIdx = (lineColorIndices && lineColorIndices[i] !== undefined) ? lineColorIndices[i] : 0;

      if (isFilled) {
        totalFilled++;
        if (curLen > 0 && curColor === colIdx) {
          curLen++;
        } else {
          if (curLen > 0) {
            blocks.push(curLen);
            blockColors.push(curColor);
          }
          curLen = 1;
          curColor = colIdx;
        }
      } else {
        if (curLen > 0) {
          blocks.push(curLen);
          blockColors.push(curColor);
          curLen = 0;
          curColor = -1;
        }
      }
    }
    if (curLen > 0) {
      blocks.push(curLen);
      blockColors.push(curColor);
    }

    const totalClueSum = clues.reduce((a, b) => a + b, 0);
    const maxClue = Math.max(...clues, 0);

    // Check for explicit error conditions
    let hasError = false;
    if (totalFilled > totalClueSum) {
      hasError = true;
    } else if (blocks.some(b => b > maxClue)) {
      hasError = true;
    }

    if (!hasError) {
      const isPossible = this.canSolveLine(line, lineColorIndices, clues, targetColors);
      if (!isPossible) {
        hasError = true;
      }
    }

    // Do not mark individual clues as completed in uncompleted lines
    const completed = new Array(clues.length).fill(false);

    return {
      lineStatus: hasError ? 'error' : (completed.every(Boolean) ? 'satisfied' : 'normal'),
      completed,
      hasError
    };
  }

  /**
   * Helper solver to check if a partially-filled line can be completed
   */
  static canSolveLine(line, lineColorIndices, clues, targetColors) {
    const N = line.length;
    const K = clues.length;
    const memo = new Map();

    const CellStateEmptyValue = 0; // Empty / unpainted
    const CellStateFilledValue = 1; // Filled
    const CellStateCrossedValue = 2; // Crossed
    const CellStateQuestionValue = 3; // Question

    function solve(cellIdx, clueIdx) {
      const memoKey = cellIdx * (K + 1) + clueIdx;
      if (memo.has(memoKey)) return memo.get(memoKey);

      if (clueIdx === K) {
        // No more clues left. All remaining cells must NOT be filled.
        for (let i = cellIdx; i < N; i++) {
          if (line[i] === CellStateFilledValue || line[i] === 1) {
            memo.set(memoKey, false);
            return false;
          }
        }
        memo.set(memoKey, true);
        return true;
      }

      if (cellIdx >= N) {
        memo.set(memoKey, false);
        return false;
      }

      const len = clues[clueIdx];
      const color = targetColors ? targetColors[clueIdx] : 0;

      for (let start = cellIdx; start <= N - len; start++) {
        // 1. Any cells before start must NOT be filled (must be empty/crossed/question spacer)
        let canPlace = true;
        for (let i = cellIdx; i < start; i++) {
          if (line[i] === CellStateFilledValue || line[i] === 1) {
            canPlace = false;
            break;
          }
        }
        if (!canPlace) continue;

        // 2. The segment [start, start + len - 1] must be compatible with being filled with the target color
        for (let i = start; i < start + len; i++) {
          if (line[i] === CellStateCrossedValue || line[i] === 2) {
            canPlace = false;
            break;
          }
          if (line[i] === CellStateFilledValue || line[i] === 1) {
            const curCol = lineColorIndices ? (lineColorIndices[i] || 0) : 0;
            if (curCol !== color) {
              canPlace = false;
              break;
            }
          }
        }
        if (!canPlace) continue;

        // 3. Spacer constraint for consecutive same-colored clues
        const nextClueIdx = clueIdx + 1;
        let nextCellIdx = start + len;

        if (nextClueIdx < K) {
          const nextColor = targetColors ? targetColors[nextClueIdx] : 0;
          if (nextColor === color) {
            if (start + len < N) {
              if (line[start + len] === CellStateFilledValue || line[start + len] === 1) {
                continue;
              }
              nextCellIdx = start + len + 1;
            } else {
              continue;
            }
          }
        }

        if (solve(nextCellIdx, nextClueIdx)) {
          memo.set(memoKey, true);
          return true;
        }
      }

      memo.set(memoKey, false);
      return false;
    }

    return solve(0, 0);
  }

  /**
   * Fast line-solving deduction helper for nonograms
   * Finds all valid configurations of clues on a line of known cells
   */
  static getDeductionsForLine(knownLine, clues, targetColors = null) {
    const len = knownLine.length;
    const valids = [];
    const hasColors = targetColors && targetColors.length === clues.length;

    const recurse = (clueIdx, pos, current) => {
      if (clueIdx === clues.length) {
        for (let i = pos; i < len; i++) {
          if (knownLine[i] === CellState.FILLED || knownLine[i] === 1) return;
          current[i] = 0;
        }
        valids.push([...current]);
        return;
      }

      const blockLen = clues[clueIdx];
      let minRemaining = 0;
      for (let k = clueIdx + 1; k < clues.length; k++) {
        const gap = (hasColors && targetColors[k] !== targetColors[k - 1]) ? 0 : 1;
        minRemaining += clues[k] + gap;
      }

      const maxStart = len - minRemaining - blockLen;
      for (let start = pos; start <= maxStart; start++) {
        let possible = true;
        for (let i = pos; i < start; i++) {
          if (knownLine[i] === CellState.FILLED || knownLine[i] === 1) {
            possible = false;
            break;
          }
          current[i] = 0;
        }
        if (!possible) break;

        for (let i = start; i < start + blockLen; i++) {
          if (knownLine[i] === CellState.CROSSED || knownLine[i] === 2) {
            possible = false;
            break;
          }
          current[i] = 1;
        }

        if (possible && clueIdx < clues.length - 1) {
          const nextGap = (hasColors && targetColors[clueIdx] !== targetColors[clueIdx + 1]) ? 0 : 1;
          if (nextGap > 0) {
            const spaceIdx = start + blockLen;
            if (spaceIdx < len && (knownLine[spaceIdx] === CellState.FILLED || knownLine[spaceIdx] === 1)) {
              possible = false;
            } else if (spaceIdx < len) {
              current[spaceIdx] = 0;
            }
          }
        }

        if (possible) {
          const nextGap = (hasColors && clues.length > clueIdx + 1 && targetColors[clueIdx] !== targetColors[clueIdx + 1]) ? 0 : 1;
          recurse(clueIdx + 1, start + blockLen + nextGap, current);
        }
      }
    };

    if (clues.length === 1 && clues[0] === 0) {
      if (knownLine.some(x => x === CellState.FILLED || x === 1)) return [];
      return [new Array(len).fill(0)];
    }

    recurse(0, 0, new Array(len).fill(0));
    return valids;
  }

  /**
   * Finds a deductive hint for the player
   */
  static findHint(playerGrid, puzzle, playerColorGrid = null) {
    const rows = puzzle.rows || puzzle.height || puzzle.size;
    const cols = puzzle.cols || puzzle.width || puzzle.size;
    const rowClues = puzzle.rowClues;
    const colClues = puzzle.colClues;

    // 1. Look for lines that are already fully solved but have un-crossed empty cells
    for (let r = 0; r < rows; r++) {
      const line = playerGrid[r];
      const clues = rowClues[r];
      const rColors = puzzle.rowColors ? puzzle.rowColors[r] : null;
      const pRowColors = playerColorGrid ? playerColorGrid[r] : null;

      if (this.isLineSolved(line, clues, rColors, pRowColors)) {
        for (let c = 0; c < cols; c++) {
          if (line[c] === CellState.EMPTY || line[c] === CellState.QUESTION) {
            return {
              type: 'cross_remaining',
              r,
              c,
              correctState: CellState.CROSSED,
              reason: 'row_complete'
            };
          }
        }
      }
    }

    for (let c = 0; c < cols; c++) {
      const colLine = [];
      const pColColors = [];
      for (let r = 0; r < rows; r++) {
        colLine.push(playerGrid[r][c]);
        pColColors.push(playerColorGrid ? playerColorGrid[r][c] : 0);
      }
      const clues = colClues[c];
      const cColors = puzzle.colColors ? puzzle.colColors[c] : null;

      if (this.isLineSolved(colLine, clues, cColors, pColColors)) {
        for (let r = 0; r < rows; r++) {
          if (colLine[r] === CellState.EMPTY || colLine[r] === CellState.QUESTION) {
            return {
              type: 'cross_remaining',
              r,
              c,
              correctState: CellState.CROSSED,
              reason: 'col_complete'
            };
          }
        }
      }
    }

    // 2. Line Deductions on Rows
    for (let r = 0; r < rows; r++) {
      const line = playerGrid[r];
      const clues = rowClues[r];
      const rColors = puzzle.rowColors ? puzzle.rowColors[r] : null;
      const valids = this.getDeductionsForLine(line, clues, rColors);
      if (valids.length > 0) {
        for (let c = 0; c < cols; c++) {
          if (line[c] === CellState.EMPTY || line[c] === CellState.QUESTION) {
            if (valids.every(v => v[c] === 1)) {
              const targetColIdx = (rColors && rColors[0] !== undefined) ? rColors[0] : 0;
              return {
                type: 'deduction',
                r,
                c,
                correctState: CellState.FILLED,
                colorIndex: targetColIdx,
                reason: 'row_overlap'
              };
            }
            if (valids.every(v => v[c] === 0)) {
              return {
                type: 'deduction',
                r,
                c,
                correctState: CellState.CROSSED,
                reason: 'row_impossible'
              };
            }
          }
        }
      }
    }

    // 3. Line Deductions on Columns
    for (let c = 0; c < cols; c++) {
      const colLine = [];
      for (let r = 0; r < rows; r++) colLine.push(playerGrid[r][c]);
      const clues = colClues[c];
      const cColors = puzzle.colColors ? puzzle.colColors[c] : null;
      const valids = this.getDeductionsForLine(colLine, clues, cColors);
      if (valids.length > 0) {
        for (let r = 0; r < rows; r++) {
          if (colLine[r] === CellState.EMPTY || colLine[r] === CellState.QUESTION) {
            if (valids.every(v => v[r] === 1)) {
              const targetColIdx = (cColors && cColors[0] !== undefined) ? cColors[0] : 0;
              return {
                type: 'deduction',
                r,
                c,
                correctState: CellState.FILLED,
                colorIndex: targetColIdx,
                reason: 'col_overlap'
              };
            }
            if (valids.every(v => v[r] === 0)) {
              return {
                type: 'deduction',
                r,
                c,
                correctState: CellState.CROSSED,
                reason: 'col_impossible'
              };
            }
          }
        }
      }
    }

    // 4. Fallback: Find any unfilled cell from a row that has positive clue
    for (let r = 0; r < rows; r++) {
      if (rowClues[r].length > 0 && rowClues[r][0] > 0) {
        for (let c = 0; c < cols; c++) {
          if (playerGrid[r][c] === CellState.EMPTY) {
            return {
              type: 'reveal',
              r,
              c,
              correctState: CellState.FILLED,
              colorIndex: 0
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Generates a procedural random nonogram
   */
  static getLogicalSolution(puzzle) {
    const cols = puzzle.cols || puzzle.width || 10;
    const rows = puzzle.rows || puzzle.height || 10;
    const grid = Array.from({ length: rows }, () => Array(cols).fill(-1));
    
    let changed = true;
    let iters = 0;
    while (changed && iters < 50) {
      changed = false;
      iters++;
      
      for (let r = 0; r < rows; r++) {
        const res = this.solveLineDP(cols, puzzle.rowClues[r], null, grid[r]);
        if (!res) return null;
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] === -1 && res[c] !== -1) {
            grid[r][c] = res[c];
            changed = true;
          }
        }
      }
      
      for (let c = 0; c < cols; c++) {
        const colLine = [];
        for (let r = 0; r < rows; r++) colLine.push(grid[r][c]);
        const res = this.solveLineDP(rows, puzzle.colClues[c], null, colLine);
        if (!res) return null;
        for (let r = 0; r < rows; r++) {
          if (grid[r][c] === -1 && res[r] !== -1) {
            grid[r][c] = res[r];
            changed = true;
          }
        }
      }
    }
    return grid;
  }

  static generateRandomPuzzle(size = 10, difficulty = 'medium') {
    const density = difficulty === 'easy' ? 0.45 : (difficulty === 'hard' ? 0.6 : 0.5);
    const symmetric = (difficulty === 'easy');
    
    let grid = Array.from({ length: size }, () => Array(size).fill(0));
    const initGrid = () => {
      for (let r = 0; r < size; r++) {
        if (symmetric) {
          for (let c = 0; c <= Math.floor(size / 2); c++) {
            const val = Math.random() < density ? 1 : 0;
            grid[r][c] = val;
            grid[r][size - 1 - c] = val;
          }
        } else {
          for (let c = 0; c < size; c++) {
            grid[r][c] = Math.random() < density ? 1 : 0;
          }
        }
      }
    };
    initGrid();

    const isSimpleBigLine = (clues, lineSize) => {
      if (!clues || clues.length === 0) return false;
      const maxSingleBlock = Math.max(5, Math.ceil(lineSize * 0.65));
      for (const c of clues) {
        if (c >= maxSingleBlock) return true;
      }
      const sum = clues.reduce((a, b) => a + b, 0);
      const minSpace = sum + clues.length - 1;
      if (clues.length <= 2 && minSpace >= lineSize - 1 && sum >= lineSize * 0.75) {
        return true;
      }
      return false;
    };

    let attempts = 0;
    while (attempts < 800) {
      const { rowClues, colClues } = this.generateClues(grid);
      const puz = { cols: size, rows: size, rowClues, colClues };
      const logicalGrid = this.getLogicalSolution(puz);
      
      let uniquelySolvable = true;
      const ambiguous = [];
      if (logicalGrid) {
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (logicalGrid[r][c] === -1) {
              uniquelySolvable = false;
              ambiguous.push({r, c});
            }
          }
        }
      } else {
        uniquelySolvable = false;
      }

      if (uniquelySolvable) {
        // Ensure no completely empty rows/cols to avoid boring lines
        let hasEmptyLines = false;
        for (let r = 0; r < size; r++) if (!grid[r].some(v => v === 1)) hasEmptyLines = true;
        for (let c = 0; c < size; c++) {
          let hasFilled = false;
          for (let r = 0; r < size; r++) if (grid[r][c] === 1) hasFilled = true;
          if (!hasFilled) hasEmptyLines = true;
        }

        // Check for simple big rows/cols for medium and hard difficulty
        let hasSimpleBigLines = false;
        if (difficulty === 'medium' || difficulty === 'hard') {
          for (let r = 0; r < size; r++) {
            if (isSimpleBigLine(rowClues[r], size)) {
              hasSimpleBigLines = true;
              break;
            }
          }
          if (!hasSimpleBigLines) {
            for (let c = 0; c < size; c++) {
              if (isSimpleBigLine(colClues[c], size)) {
                hasSimpleBigLines = true;
                break;
              }
            }
          }
        }

        if (!hasEmptyLines && !hasSimpleBigLines) break; // Valid and interesting puzzle!
        
        // If it has empty lines or simple big lines, just restart from scratch
        initGrid();
        continue;
      }
      
      attempts++;
      
      if (ambiguous.length > 0) {
        const pick = ambiguous[Math.floor(Math.random() * ambiguous.length)];
        const newVal = grid[pick.r][pick.c] === 1 ? 0 : 1;
        grid[pick.r][pick.c] = newVal;
        if (symmetric) {
           grid[pick.r][size - 1 - pick.c] = newVal;
        }
      } else {
        // Logically inconsistent somehow, reset
        initGrid();
      }
    }

    const { rowClues, colClues } = this.generateClues(grid);

    return {
      id: `random_${size}x${size}_${Date.now()}`,
      numericId: Math.floor(Math.random() * 9000) + 1000,
      name: `Random ${size}×${size}`,
      cols: size,
      rows: size,
      width: size,
      height: size,
      size: size,
      colorCount: 1,
      palette: ['#000000'],
      colClues: colClues,
      colColors: [],
      rowClues: rowClues,
      rowColors: [],
      category: size <= 15 ? 'small' : (size <= 25 ? 'medium' : 'large'),
      difficulty: difficulty
    };
  }

  /**
   * Fast Dynamic Programming Nonogram Line Solver
   * Solves constraints in O(N * K)
   */
  static solveLineDP(len, clues, colors, currentLine) {
    if (colors && colors.length === 0) colors = null;
    const K = clues ? clues.length : 0;
    
    if (K === 0 || (K === 1 && clues[0] === 0)) {
      for (let i = 0; i < len; i++) if (currentLine && currentLine[i] > 0) return null;
      return Array(len).fill(0);
    }

    const memo = new Map();
    const canBeEmpty = Array(len).fill(false);
    const possibleColors = Array.from({ length: len }, () => new Set());

    const canPlaceEmpty = (idx) => !currentLine || currentLine[idx] <= 0;
    const canPlaceBlock = (start, bLen, cVal) => {
      if (start + bLen > len) return false;
      for (let k = start; k < start + bLen; k++) {
        if (currentLine && currentLine[k] === 0) return false;
        if (currentLine && currentLine[k] > 0 && currentLine[k] !== cVal) return false;
      }
      return true;
    };

    const solve = (idx, clueIdx) => {
      const key = `${idx},${clueIdx}`;
      if (memo.has(key)) return memo.get(key);

      if (idx === len) {
        return clueIdx === K;
      }
      if (clueIdx === K) {
        let ok = true;
        for (let i = idx; i < len; i++) {
          if (!canPlaceEmpty(i)) { ok = false; break; }
        }
        if (ok) {
           for(let i = idx; i < len; i++) canBeEmpty[i] = true;
        }
        memo.set(key, ok);
        return ok;
      }

      let res = false;
      
      if (canPlaceEmpty(idx)) {
        if (solve(idx + 1, clueIdx)) {
          canBeEmpty[idx] = true;
          res = true;
        }
      }
      
      const bLen = clues[clueIdx];
      const cVal = (colors && colors[clueIdx] !== undefined) ? (colors[clueIdx] + 1) : 1;
      
      if (canPlaceBlock(idx, bLen, cVal)) {
        let nextIdx = idx + bLen;
        let blockOk = false;
        
        if (clueIdx === K - 1) {
          blockOk = solve(nextIdx, clueIdx + 1);
        } else {
          const diffColor = colors && colors[clueIdx] !== colors[clueIdx + 1];
          if (diffColor) {
            blockOk = solve(nextIdx, clueIdx + 1);
          } else {
            if (nextIdx < len && canPlaceEmpty(nextIdx)) {
              if (solve(nextIdx + 1, clueIdx + 1)) {
                canBeEmpty[nextIdx] = true;
                blockOk = true;
              }
            }
          }
        }
        
        if (blockOk) {
          for (let k = idx; k < idx + bLen; k++) possibleColors[k].add(cVal);
          res = true;
        }
      }

      memo.set(key, res);
      return res;
    };

    if (!solve(0, 0)) return null;

    const result = Array(len).fill(-1);
    for (let i = 0; i < len; i++) {
      const emptyOk = canBeEmpty[i];
      const pColors = Array.from(possibleColors[i]);
      if (emptyOk && pColors.length === 0) result[i] = 0;
      else if (!emptyOk && pColors.length === 1) result[i] = pColors[0];
      else if (!emptyOk && pColors.length === 0) return null;
    }
    return result;
  }

  /**
   * Solves a puzzle accurately and caches the 2D solution grid (0 = empty, 1+ = color index + 1)
   */
  static getPuzzleSolution(puzzle) {
    if (!puzzle) return null;
    if (puzzle._solutionGrid) return puzzle._solutionGrid;
    if (puzzle.solution && Array.isArray(puzzle.solution) && puzzle.solution.length === puzzle.rows) {
      puzzle._solutionGrid = puzzle.solution;
      return puzzle.solution;
    }

    // Check localStorage cache
    try {
      if (typeof localStorage !== 'undefined' && puzzle.id) {
        const cached = localStorage.getItem('nono_sol_' + puzzle.id);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length === puzzle.rows) {
            puzzle._solutionGrid = parsed;
            return parsed;
          }
        }
      }
    } catch (_) {}

    const cols = puzzle.cols || puzzle.width || 10;
    const rows = puzzle.rows || puzzle.height || 10;
    const grid = Array.from({ length: rows }, () => Array(cols).fill(-1));

    const solveLine = (len, clues, colors, currentLine) => {
      return this.solveLineDP(len, clues, colors, currentLine);
    };

    const propagate = (g, initialDirtyRows = null, initialDirtyCols = null) => {
      let iters = 0;
      let dirtyRows = initialDirtyRows ? new Set(initialDirtyRows) : new Set(Array.from({length: rows}, (_, i) => i));
      let dirtyCols = initialDirtyCols ? new Set(initialDirtyCols) : new Set(Array.from({length: cols}, (_, i) => i));

      while ((dirtyRows.size > 0 || dirtyCols.size > 0) && iters < 60) {
        iters++;

        const qRows = Array.from(dirtyRows);
        dirtyRows.clear();
        for (const r of qRows) {
          const rClues = puzzle.rowClues ? puzzle.rowClues[r] : [0];
          const rColors = (puzzle.rowColors && puzzle.rowColors[r] && puzzle.rowColors[r].length > 0) ? puzzle.rowColors[r] : null;
          const res = solveLine(cols, rClues, rColors, g[r]);
          if (res === null) return false;
          for (let c = 0; c < cols; c++) {
            if (g[r][c] === -1 && res[c] !== -1) {
              g[r][c] = res[c];
              dirtyCols.add(c);
            } else if (g[r][c] !== -1 && res[c] !== -1 && g[r][c] !== res[c]) {
              return false;
            }
          }
        }

        const qCols = Array.from(dirtyCols);
        dirtyCols.clear();
        for (const c of qCols) {
          const colLine = [];
          for (let r = 0; r < rows; r++) colLine.push(g[r][c]);
          const cClues = puzzle.colClues ? puzzle.colClues[c] : [0];
          const cColors = (puzzle.colColors && puzzle.colColors[c] && puzzle.colColors[c].length > 0) ? puzzle.colColors[c] : null;
          const res = solveLine(rows, cClues, cColors, colLine);
          if (res === null) return false;
          for (let r = 0; r < rows; r++) {
            if (g[r][c] === -1 && res[r] !== -1) {
              g[r][c] = res[r];
              dirtyRows.add(r);
            } else if (g[r][c] !== -1 && res[r] !== -1 && g[r][c] !== res[r]) {
              return false;
            }
          }
        }
      }
      return true;
    };

    if (!propagate(grid)) {
      puzzle._solutionGrid = null;
      return null;
    }

    const isComplete = (g) => {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (g[r][c] === -1) return false;
        }
      }
      return true;
    };

    let dfsIters = 0;
    let bestGrid = null;
    let minUnknowns = rows * cols + 1;

    const countUnknowns = (g) => {
      let u = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (g[r][c] === -1) u++;
        }
      }
      return u;
    };

    const dfs = (g) => {
      dfsIters++;
      
      const unk = countUnknowns(g);
      if (unk < minUnknowns) {
        minUnknowns = unk;
        bestGrid = g.map(row => [...row]);
      }

      if (dfsIters > 300) return false; // Increased limit but capped to prevent UI freezing

      if (isComplete(g)) return true;

      let targetR = -1, targetC = -1;
      let maxNeighborAssigned = -1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (g[r][c] === -1) {
            let count = 0;
            for (let i = 0; i < cols; i++) if (g[r][i] !== -1) count++;
            for (let i = 0; i < rows; i++) if (g[i][c] !== -1) count++;
            if (count > maxNeighborAssigned) {
              maxNeighborAssigned = count;
              targetR = r;
              targetC = c;
            }
          }
        }
      }

      if (targetR === -1) return true;

      const candidates = [];
      if (puzzle.colorCount > 1 && puzzle.palette && puzzle.palette.length > 1) {
        for (let k = 1; k <= puzzle.colorCount; k++) candidates.push(k);
      } else {
        candidates.push(1);
      }
      candidates.push(0);

      for (const val of candidates) {
        const gCopy = g.map(row => [...row]);
        gCopy[targetR][targetC] = val;
        if (propagate(gCopy, [targetR], [targetC])) {
          if (dfs(gCopy)) {
            for (let r = 0; r < rows; r++) {
              for (let c = 0; c < cols; c++) g[r][c] = gCopy[r][c];
            }
            return true;
          }
        }
      }
      return false;
    };

    if (!isComplete(grid)) {
      const solved = dfs(grid);
      if (!solved && bestGrid) {
        // Restore the deepest/best grid found during search
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            grid[r][c] = bestGrid[r][c];
          }
        }
      }
    }

    // Clean up any remaining -1 with 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === -1) grid[r][c] = 0;
      }
    }

    puzzle._solutionGrid = grid;
    try {
      if (typeof localStorage !== 'undefined' && puzzle.id) {
        localStorage.setItem('nono_sol_' + puzzle.id, JSON.stringify(grid));
      }
    } catch (_) {}
    return grid;
  }

  /**
   * Asynchronously solves a puzzle off the main thread frame without blocking UI
   */
  static getPuzzleSolutionAsync(puzzle) {
    if (!puzzle) return Promise.resolve(null);
    if (puzzle._solutionGrid) return Promise.resolve(puzzle._solutionGrid);
    if (puzzle.solution && Array.isArray(puzzle.solution) && puzzle.solution.length === puzzle.rows) {
      puzzle._solutionGrid = puzzle.solution;
      return Promise.resolve(puzzle.solution);
    }

    try {
      if (typeof localStorage !== 'undefined' && puzzle.id) {
        const cached = localStorage.getItem('nono_sol_' + puzzle.id);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length === puzzle.rows) {
            puzzle._solutionGrid = parsed;
            return Promise.resolve(parsed);
          }
        }
      }
    } catch (_) {}

    return new Promise((resolve) => {
      if (!NonogramEngine._asyncQueue) {
        NonogramEngine._asyncQueue = [];
        NonogramEngine._isProcessingQueue = false;
      }
      
      NonogramEngine._asyncQueue.push({ puzzle, resolve });
      
      if (!NonogramEngine._isProcessingQueue) {
        NonogramEngine._processAsyncQueue();
      }
    });
  }

  static _processAsyncQueue() {
    if (!NonogramEngine._asyncQueue || NonogramEngine._asyncQueue.length === 0) {
      NonogramEngine._isProcessingQueue = false;
      return;
    }
    
    NonogramEngine._isProcessingQueue = true;
    const task = NonogramEngine._asyncQueue.shift();
    
    const scheduleSolve = (typeof requestIdleCallback === 'function')
      ? (cb) => requestIdleCallback(cb, { timeout: 150 })
      : (cb) => setTimeout(cb, 10);
      
    scheduleSolve(() => {
      try {
        const sol = NonogramEngine.getPuzzleSolution(task.puzzle);
        task.resolve(sol);
      } catch (e) {
        console.warn('[Async Solver Error]', e);
        task.resolve(null);
      }
      
      // Yield to event loop to keep UI ultra responsive
      setTimeout(() => {
        NonogramEngine._processAsyncQueue();
      }, 15);
    });
  }
}

window.CellState = CellState;
window.NonogramEngine = NonogramEngine;
