"use strict";

/* =========================================
   BLOCKS BY KHAKIMOV
   8x8 Block Puzzle Game
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  const SIZE = 8;
  const PIECES_PER_ROUND = 3;

  const board = document.getElementById("gameBoard");
  const piecesContainer = document.getElementById("piecesContainer");
  const boardPreview = document.getElementById("boardPreview");
  const boardWrapper = document.getElementById("boardWrapper");

  const scoreValue = document.getElementById("scoreValue");
  const bestScoreValue = document.getElementById("bestScoreValue");
  const comboValue = document.getElementById("comboValue");
  const levelValue = document.getElementById("levelValue");

  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const piecesLeftText = document.getElementById("piecesLeftText");
  const dragStatusText = document.getElementById("dragStatusText");

  const soundButton = document.getElementById("soundButton");
  const soundIcon = document.getElementById("soundIcon");
  const themeButton = document.getElementById("themeButton");
  const themeIcon = document.getElementById("themeIcon");
  const pauseButton = document.getElementById("pauseButton");

  const restartButton = document.getElementById("restartButton");
  const hintButton = document.getElementById("hintButton");

  const startModal = document.getElementById("startModal");
  const pauseModal = document.getElementById("pauseModal");
  const gameOverModal = document.getElementById("gameOverModal");
  const hintModal = document.getElementById("hintModal");

  const startButton = document.getElementById("startButton");
  const resumeButton = document.getElementById("resumeButton");
  const playAgainButton = document.getElementById("playAgainButton");
  const closeHintButton = document.getElementById("closeHintButton");
  const understandButton = document.getElementById("understandButton");

  const finalScoreValue = document.getElementById("finalScoreValue");
  const finalBestValue = document.getElementById("finalBestValue");
  const newRecordMessage = document.getElementById("newRecordMessage");

  const toastMessage = document.getElementById("toastMessage");
  const toastIcon = document.getElementById("toastIcon");
  const toastText = document.getElementById("toastText");

  const dragClone = document.getElementById("dragClone");

  let gameBoard = [];
  let currentPieces = [];
  let selectedPieceIndex = null;
  let hoveredPosition = null;
  let isDragging = false;
  let isPaused = false;
  let gameStarted = false;
  let score = 0;
  let bestScore = Number(localStorage.getItem("blocksBestScore")) || 0;
  let combo = 0;
  let level = 1;
  let soundEnabled = localStorage.getItem("blocksSound") !== "off";
  let darkTheme = localStorage.getItem("blocksTheme") === "dark";
  let audioContext = null;
  let toastTimer = null;

  const colors = [
    "purple",
    "yellow",
    "green",
    "pink",
    "blue",
    "orange"
  ];

  const SHAPES = [
    [[0, 0]],

    [[0, 0], [0, 1]],
    [[0, 0], [1, 0]],

    [[0, 0], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [2, 0]],

    [[0, 0], [0, 1], [1, 0], [1, 1]],

    [[0, 0], [0, 1], [0, 2], [0, 3]],
    [[0, 0], [1, 0], [2, 0], [3, 0]],

    [[0, 0], [0, 1], [0, 2], [1, 1]],
    [[0, 1], [1, 0], [1, 1], [1, 2]],

    [[0, 0], [1, 0], [1, 1], [1, 2]],
    [[0, 0], [0, 1], [1, 0], [2, 0]],

    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[0, 1], [1, 0], [1, 1], [2, 0]],

    [[0, 0], [0, 1], [0, 2], [1, 0]],
    [[0, 0], [0, 1], [0, 2], [1, 2]],

    [[0, 0], [1, 0], [2, 0], [2, 1]],
    [[0, 1], [1, 1], [2, 0], [2, 1]],

    [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]],
    [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]]
  ];

  function createEmptyBoard() {
    return Array.from({ length: SIZE }, () =>
      Array(SIZE).fill(null)
    );
  }

  function createBoardHTML() {
    board.innerHTML = "";

    for (let row = 0; row < SIZE; row++) {
      for (let column = 0; column < SIZE; column++) {
        const cell = document.createElement("div");

        cell.className = "board-cell";
        cell.dataset.row = row;
        cell.dataset.column = column;
        cell.setAttribute("role", "gridcell");

        cell.addEventListener("pointerenter", () => {
          if (isDragging && selectedPieceIndex !== null) {
            showPreview(row, column);
          }
        });

        cell.addEventListener("pointermove", () => {
          if (isDragging && selectedPieceIndex !== null) {
            showPreview(row, column);
          }
        });

        cell.addEventListener("pointerup", () => {
          if (isDragging) {
            placeSelectedPiece();
          }
        });

        board.appendChild(cell);
      }
    }
  }

  function getCells() {
    return [...board.querySelectorAll(".board-cell")];
  }

  function getCell(row, column) {
    return board.querySelector(
      `.board-cell[data-row="${row}"][data-column="${column}"]`
    );
  }

  function renderBoard() {
    getCells().forEach((cell) => {
      const row = Number(cell.dataset.row);
      const column = Number(cell.dataset.column);
      const color = gameBoard[row][column];

      cell.className = "board-cell";

      if (color) {
        cell.classList.add("is-filled", `cell-${color}`);
      }
    });
  }

  function randomShape() {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];

    return {
      shape: shape.map(([row, column]) => [row, column]),
      color: colors[Math.floor(Math.random() * colors.length)]
    };
  }

  function renderPieces() {
    piecesContainer.innerHTML = "";

    currentPieces.forEach((piece, index) => {
      if (!piece) return;

      const slot = document.createElement("div");
      slot.className = "piece-slot";
      slot.dataset.pieceIndex = index;
      slot.draggable = true;
      slot.tabIndex = 0;
      slot.setAttribute("role", "button");
      slot.setAttribute("aria-label", `Blok ${index + 1}`);

      const shapeElement = document.createElement("div");
      shapeElement.className = "piece-shape";

      const maxRow = Math.max(...piece.shape.map((item) => item[0]));
      const maxColumn = Math.max(...piece.shape.map((item) => item[1]));

      shapeElement.style.gridTemplateRows =
        `repeat(${maxRow + 1}, 1fr)`;

      shapeElement.style.gridTemplateColumns =
        `repeat(${maxColumn + 1}, 1fr)`;

      piece.shape.forEach(([row, column]) => {
        const block = document.createElement("span");

        block.className = `piece-block piece-${piece.color}`;
        block.style.gridRow = row + 1;
        block.style.gridColumn = column + 1;

        shapeElement.appendChild(block);
      });

      slot.appendChild(shapeElement);
      piecesContainer.appendChild(slot);

      slot.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        selectPiece(index, event);
      });

      slot.addEventListener("dragstart", (event) => {
        selectPiece(index, event);
      });

      slot.addEventListener("dragend", () => {
        if (isDragging) {
          cancelDragging();
        }
      });

      slot.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectPiece(index, event);
        }
      });
    });

    const remaining = currentPieces.filter(Boolean).length;
    piecesLeftText.textContent = `${remaining} ta blok`;
  }

  function selectPiece(index, event) {
    if (isPaused || !gameStarted || !currentPieces[index]) return;

    selectedPieceIndex = index;
    isDragging = true;

    document.body.classList.add("is-dragging");
    dragStatusText.textContent =
      "Shaklni maydonga olib boring va qo‘yib yuboring";

    const slot = piecesContainer.querySelector(
      `[data-piece-index="${index}"]`
    );

    if (slot) {
      slot.classList.add("is-selected");
    }

    createDragClone(currentPieces[index]);

    if (event && event.clientX && event.clientY) {
      moveDragClone(event.clientX, event.clientY);
    }

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp, {
      once: true
    });

    playSound(520, 0.06);
  }

  function createDragClone(piece) {
    dragClone.innerHTML = "";
    dragClone.className = `drag-clone drag-clone--${piece.color}`;

    const maxRow = Math.max(...piece.shape.map((item) => item[0]));
    const maxColumn = Math.max(...piece.shape.map((item) => item[1]));

    dragClone.style.gridTemplateRows =
      `repeat(${maxRow + 1}, 1fr)`;

    dragClone.style.gridTemplateColumns =
      `repeat(${maxColumn + 1}, 1fr)`;

    piece.shape.forEach(([row, column]) => {
      const block = document.createElement("span");

      block.className = "drag-clone-block";
      block.style.gridRow = row + 1;
      block.style.gridColumn = column + 1;

      dragClone.appendChild(block);
    });

    dragClone.classList.add("is-visible");
  }

  function moveDragClone(x, y) {
    dragClone.style.left = `${x}px`;
    dragClone.style.top = `${y - 55}px`;
  }

  function handlePointerMove(event) {
    if (!isDragging) return;

    moveDragClone(event.clientX, event.clientY);

    const cell = document.elementFromPoint(
      event.clientX,
      event.clientY
    );

    if (!cell || !cell.classList.contains("board-cell")) {
      clearPreview();
      return;
    }

    const row = Number(cell.dataset.row);
    const column = Number(cell.dataset.column);

    showPreview(row, column);
  }

  function handlePointerUp(event) {
    if (!isDragging) return;

    const cell = document.elementFromPoint(
      event.clientX,
      event.clientY
    );

    if (cell && cell.classList.contains("board-cell")) {
      const row = Number(cell.dataset.row);
      const column = Number(cell.dataset.column);

      hoveredPosition = { row, column };
      placeSelectedPiece();
    } else {
      cancelDragging();
    }
  }

  function showPreview(row, column) {
    if (selectedPieceIndex === null) return;

    const piece = currentPieces[selectedPieceIndex];
    if (!piece) return;

    clearPreview();

    const valid = canPlace(piece.shape, row, column);
    hoveredPosition = { row, column };

    piece.shape.forEach(([shapeRow, shapeColumn]) => {
      const targetRow = row + shapeRow;
      const targetColumn = column + shapeColumn;
      const cell = getCell(targetRow, targetColumn);

      if (!cell) return;

      cell.classList.add(
        valid ? "is-preview-valid" : "is-preview-invalid"
      );
    });
  }

  function clearPreview() {
    getCells().forEach((cell) => {
      cell.classList.remove(
        "is-preview-valid",
        "is-preview-invalid"
      );
    });

    hoveredPosition = null;
  }

  function canPlace(shape, startRow, startColumn) {
    return shape.every(([row, column]) => {
      const targetRow = startRow + row;
      const targetColumn = startColumn + column;

      return (
        targetRow >= 0 &&
        targetRow < SIZE &&
        targetColumn >= 0 &&
        targetColumn < SIZE &&
        !gameBoard[targetRow][targetColumn]
      );
    });
  }

  function placeSelectedPiece() {
    if (
      selectedPieceIndex === null ||
      !hoveredPosition ||
      !currentPieces[selectedPieceIndex]
    ) {
      cancelDragging();
      return;
    }

    const piece = currentPieces[selectedPieceIndex];
    const { row, column } = hoveredPosition;

    if (!canPlace(piece.shape, row, column)) {
      showToast("Bu joyga joylashtirib bo‘lmaydi", "✕");
      playSound(150, 0.12);
      cancelDragging();
      return;
    }

    piece.shape.forEach(([shapeRow, shapeColumn]) => {
      gameBoard[row + shapeRow][column + shapeColumn] =
        piece.color;
    });

    currentPieces[selectedPieceIndex] = null;

    cancelDragging();
    renderBoard();

    score += piece.shape.length;
    combo++;

    const clearedLines = clearCompletedLines();

    if (clearedLines > 0) {
      const lineBonus = clearedLines * 10;
      const comboBonus = Math.max(0, combo - 1) * 5;

      score += lineBonus + comboBonus;

      showToast(
        `${clearedLines} ta chiziq tozalandi! +${lineBonus}`,
        "✨"
      );

      playSound(760, 0.16);
    } else {
      playSound(620, 0.08);
    }

    updateScore();
    renderBoard();

    if (currentPieces.every((piece) => piece === null)) {
      currentPieces = [
        randomShape(),
        randomShape(),
        randomShape()
      ];

      renderPieces();
    }

    checkGameOver();
  }

  function cancelDragging() {
    isDragging = false;
    selectedPieceIndex = null;
    hoveredPosition = null;

    document.body.classList.remove("is-dragging");
    dragClone.classList.remove("is-visible");

    document.querySelectorAll(".piece-slot").forEach((slot) => {
      slot.classList.remove("is-selected");
    });

    clearPreview();
    document.removeEventListener("pointermove", handlePointerMove);

    dragStatusText.textContent =
      "Shaklni bosib ushlab, maydonga olib boring";
  }

  function clearCompletedLines() {
    const fullRows = [];
    const fullColumns = [];

    for (let row = 0; row < SIZE; row++) {
      if (gameBoard[row].every(Boolean)) {
        fullRows.push(row);
      }
    }

    for (let column = 0; column < SIZE; column++) {
      let isFull = true;

      for (let row = 0; row < SIZE; row++) {
        if (!gameBoard[row][column]) {
          isFull = false;
          break;
        }
      }

      if (isFull) {
        fullColumns.push(column);
      }
    }

    fullRows.forEach((row) => {
      for (let column = 0; column < SIZE; column++) {
        gameBoard[row][column] = null;
      }
    });

    fullColumns.forEach((column) => {
      for (let row = 0; row < SIZE; row++) {
        gameBoard[row][column] = null;
      }
    });

    return fullRows.length + fullColumns.length;
  }

  function hasAnyMove() {
    for (let piece of currentPieces) {
      if (!piece) continue;

      for (let row = 0; row < SIZE; row++) {
        for (let column = 0; column < SIZE; column++) {
          if (canPlace(piece.shape, row, column)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  function checkGameOver() {
    if (!hasAnyMove()) {
      setTimeout(endGame, 300);
    }
  }

  function updateScore() {
    scoreValue.textContent = score;
    bestScoreValue.textContent = bestScore;
    comboValue.textContent = combo;

    level = Math.floor(score / 100) + 1;
    levelValue.textContent = level;

    const currentLevelScore = score % 100;
    const progress = Math.min(currentLevelScore, 100);

    progressFill.style.width = `${progress}%`;
    progressText.textContent =
      `Keyingi bosqichgacha: ${100 - currentLevelScore} ball`;

    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem("blocksBestScore", bestScore);
      bestScoreValue.textContent = bestScore;
    }
  }

  function startNewGame() {
    gameBoard = createEmptyBoard();
    currentPieces = [
      randomShape(),
      randomShape(),
      randomShape()
    ];

    score = 0;
    combo = 0;
    level = 1;
    isPaused = false;
    gameStarted = true;

    closeAllModals();
    createBoardHTML();
    renderBoard();
    renderPieces();
    updateScore();

    dragStatusText.textContent =
      "Shaklni bosib ushlab, maydonga olib boring";

    showToast("O‘yin boshlandi!", "🎮");
  }

  function endGame() {
    if (!gameStarted) return;

    gameStarted = false;
    isPaused = false;

    const wasNewRecord = score >= bestScore && score > 0;

    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem("blocksBestScore", bestScore);
    }

    finalScoreValue.textContent = score;
    finalBestValue.textContent = bestScore;

    newRecordMessage.classList.toggle(
      "is-hidden",
      !wasNewRecord
    );

    openModal(gameOverModal);
    playSound(120, 0.35);
  }

  function togglePause() {
    if (!gameStarted) return;

    isPaused = !isPaused;

    if (isPaused) {
      cancelDragging();
      openModal(pauseModal);
    } else {
      closeModal(pauseModal);
    }
  }

  function openModal(modal) {
    modal.classList.remove("is-hidden");
  }

  function closeModal(modal) {
    modal.classList.add("is-hidden");
  }

  function closeAllModals() {
    [
      startModal,
      pauseModal,
      gameOverModal,
      hintModal
    ].forEach(closeModal);
  }

  function showToast(message, icon = "✓") {
    clearTimeout(toastTimer);

    toastIcon.textContent = icon;
    toastText.textContent = message;
    toastMessage.classList.add("is-visible");

    toastTimer = setTimeout(() => {
      toastMessage.classList.remove("is-visible");
    }, 2200);
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;

    localStorage.setItem(
      "blocksSound",
      soundEnabled ? "on" : "off"
    );

    soundIcon.textContent = soundEnabled ? "🔊" : "🔇";

    showToast(
      soundEnabled ? "Ovoz yoqildi" : "Ovoz o‘chirildi",
      soundEnabled ? "🔊" : "🔇"
    );
  }

  function toggleTheme() {
    darkTheme = !darkTheme;

    document.body.classList.toggle("dark-theme", darkTheme);
    themeIcon.textContent = darkTheme ? "☀" : "☾";

    localStorage.setItem(
      "blocksTheme",
      darkTheme ? "dark" : "light"
    );
  }

  function playSound(frequency = 440, duration = 0.08) {
    if (!soundEnabled) return;

    try {
      if (!audioContext) {
        audioContext = new (
          window.AudioContext ||
          window.webkitAudioContext
        )();
      }

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      gain.gain.setValueAtTime(
        0.0001,
        audioContext.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.08,
        audioContext.currentTime + 0.01
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + duration
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      // Audio ishlamasa, o‘yin to‘xtab qolmasligi uchun xatoni e’tiborsiz qoldiramiz
    }
  }

  function giveHint() {
    if (!gameStarted || isPaused) return;

    let found = null;

    for (let pieceIndex = 0; pieceIndex < currentPieces.length; pieceIndex++) {
      const piece = currentPieces[pieceIndex];

      if (!piece) continue;

      for (let row = 0; row < SIZE; row++) {
        for (let column = 0; column < SIZE; column++) {
          if (canPlace(piece.shape, row, column)) {
            found = { pieceIndex, row, column };
            break;
          }
        }

        if (found) break;
      }

      if (found) break;
    }

    if (!found) {
      showToast("Hozircha mos joy topilmadi", "⚠");
      return;
    }

    const slot = piecesContainer.querySelector(
      `[data-piece-index="${found.pieceIndex}"]`
    );

    if (slot) {
      slot.classList.add("hint-animation");

      setTimeout(() => {
        slot.classList.remove("hint-animation");
      }, 1200);
    }

    getCells().forEach((cell) => {
      const row = Number(cell.dataset.row);
      const column = Number(cell.dataset.column);

      if (
        found.row === row &&
        found.column === column
      ) {
        cell.classList.add("hint-cell");

        setTimeout(() => {
          cell.classList.remove("hint-cell");
        }, 1200);
      }
    });

    showToast("Yashil blokni shu joyga qo‘yib ko‘ring", "💡");
  }

  /* =========================================
     EVENTLAR
  ========================================= */

  soundButton.addEventListener("click", toggleSound);
  themeButton.addEventListener("click", toggleTheme);
  pauseButton.addEventListener("click", togglePause);

  restartButton.addEventListener("click", startNewGame);
  playAgainButton.addEventListener("click", startNewGame);

  hintButton.addEventListener("click", () => {
    openModal(hintModal);
  });

  closeHintButton.addEventListener("click", () => {
    closeModal(hintModal);
  });

  understandButton.addEventListener("click", () => {
    closeModal(hintModal);
  });

  startButton.addEventListener("click", startNewGame);

  resumeButton.addEventListener("click", () => {
    isPaused = false;
    closeModal(pauseModal);
  });

  [startModal, pauseModal, gameOverModal, hintModal].forEach(
    (modal) => {
      modal.addEventListener("click", (event) => {
        if (event.target === modal && modal === hintModal) {
          closeModal(modal);
        }
      });
    }
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      cancelDragging();
      closeModal(hintModal);
    }

    if (event.key.toLowerCase() === "p") {
      togglePause();
    }
  });

  board.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      showToast("Blokni pastdagi paneldan tanlang", "💡");
    }
  });

  /* =========================================
     DASTLABKI HOLAT
  ========================================= */

  document.body.classList.toggle("dark-theme", darkTheme);
  soundIcon.textContent = soundEnabled ? "🔊" : "🔇";
  themeIcon.textContent = darkTheme ? "☀" : "☾";
  bestScoreValue.textContent = bestScore;

  gameBoard = createEmptyBoard();
  createBoardHTML();
  renderBoard();

  // Foydalanuvchi avval "O‘yinni boshlash" tugmasini bosadi
  openModal(startModal);
});
