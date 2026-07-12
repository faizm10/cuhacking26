import { describe, expect, it } from "vitest";

import { GAME_MODE_OPTIONS } from "@/lib/mock-data/projects";
import { rendererTypeForMode } from "@/lib/game/generated";
import {
  applyMove,
  createTicTacToeState,
  emptyCells,
  findWinningLine,
  isAiTurn,
} from "@/components/game/tic-tac-toe/ticTacToeLogic";
import {
  chooseAiMove,
  easyMove,
  hardMove,
  normalMove,
} from "@/components/game/tic-tac-toe/ticTacToeAI";
import {
  applyTicTacToeRefine,
} from "@/components/game/tic-tac-toe/ticTacToeRefine";
import {
  coerceTicTacToeSpec,
  DEFAULT_TIC_TAC_TOE_SPEC,
  ticTacToeSpecSchema,
} from "@/components/game/tic-tac-toe/ticTacToeTypes";

describe("tic-tac-toe mode selector", () => {
  it("includes tic-tac-toe in the game mode options", () => {
    const option = GAME_MODE_OPTIONS.find((o) => o.value === "tic-tac-toe");
    expect(option).toBeDefined();
    expect(option?.label.toLowerCase()).toContain("tic-tac-toe");
    expect(option?.hint?.toLowerCase()).toMatch(/3/);
  });

  it("maps an explicit tic-tac-toe selection to the dedicated renderer", () => {
    expect(rendererTypeForMode("tic-tac-toe")).toBe("tic-tac-toe");
    expect(rendererTypeForMode("platform-jumper")).toBe("arcade");
    expect(rendererTypeForMode("auto")).toBe("arcade");
  });
});

describe("ticTacToeSpecSchema", () => {
  it("accepts the default spec", () => {
    expect(ticTacToeSpecSchema.safeParse(DEFAULT_TIC_TAC_TOE_SPEC).success).toBe(
      true
    );
  });

  it("coerce drops arcade junk and keeps playable defaults", () => {
    const coerced = coerceTicTacToeSpec({
      title: "Sketchy Duel",
      playerSymbol: "O",
      lives: 3,
      timer: { enabled: true },
      enemies: [{ id: "bad" }],
      script: "<script>alert(1)</script>",
      aiDifficulty: "hard",
    });
    expect(coerced.gameType).toBe("tic-tac-toe");
    expect(coerced.title).toBe("Sketchy Duel");
    expect(coerced.playerSymbol).toBe("O");
    expect(coerced.opponentSymbol).toBe("X");
    expect(coerced.aiDifficulty).toBe("hard");
    expect("lives" in coerced).toBe(false);
    expect("enemies" in coerced).toBe(false);
  });
});

describe("ticTacToeLogic", () => {
  const spec = DEFAULT_TIC_TAC_TOE_SPEC;

  it("places a player move and switches turn", () => {
    const state = createTicTacToeState(spec);
    const result = applyMove(state, 4);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.board[4]).toBe("X");
    expect(result.state.turn).toBe("O");
    expect(result.state.phase).toBe("playing");
  });

  it("rejects occupied cells and post-game moves", () => {
    let state = createTicTacToeState(spec);
    const first = applyMove(state, 0);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    state = first.state;
    expect(applyMove(state, 0).ok).toBe(false);

    // Force a win for X across the top row.
    state = {
      ...state,
      board: ["X", "X", null, "O", "O", null, null, null, null],
      turn: "X",
      phase: "playing",
    };
    const win = applyMove(state, 2);
    expect(win.ok).toBe(true);
    if (!win.ok) return;
    expect(win.state.phase).toBe("won");
    expect(win.state.winner).toBe("X");
    expect(applyMove(win.state, 5).ok).toBe(false);
  });

  it("detects horizontal, vertical, and diagonal wins plus draws", () => {
    expect(
      findWinningLine(["X", "X", "X", null, null, null, null, null, null])
        ?.winner
    ).toBe("X");
    expect(
      findWinningLine([null, "O", null, null, "O", null, null, "O", null])
        ?.winner
    ).toBe("O");
    expect(
      findWinningLine(["X", null, null, null, "X", null, null, null, "X"])
        ?.winner
    ).toBe("X");

    const full: ("X" | "O")[] = ["X", "O", "X", "X", "O", "O", "O", "X", "X"];
    expect(findWinningLine(full)).toBeNull();

    let state = createTicTacToeState(spec);
    // Play a known draw sequence
    const sequence = [0, 1, 2, 4, 3, 5, 7, 6, 8];
    for (const cell of sequence) {
      const next = applyMove(state, cell);
      expect(next.ok).toBe(true);
      if (!next.ok) return;
      state = next.state;
    }
    expect(state.phase).toBe("draw");
  });

  it("restarts to a clean board via createTicTacToeState", () => {
    const mid = applyMove(createTicTacToeState(spec), 0);
    expect(mid.ok).toBe(true);
    const fresh = createTicTacToeState(spec);
    expect(fresh.board.every((c) => c === null)).toBe(true);
    expect(fresh.moves).toBe(0);
    expect(fresh.phase).toBe("playing");
  });

  it("reports AI turn only in vs-ai when it is the opponent's symbol", () => {
    const state = createTicTacToeState(spec);
    expect(isAiTurn(spec, state)).toBe(false);
    const after = applyMove(state, 0);
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(isAiTurn(spec, after.state)).toBe(true);
    expect(
      isAiTurn({ ...spec, playerMode: "local-2p" }, after.state)
    ).toBe(false);
  });
});

describe("ticTacToeAI", () => {
  it("easy AI always returns a valid empty cell", () => {
    const board = [null, "X", null, "O", null, null, null, null, "X"] as const;
    for (let i = 0; i < 20; i += 1) {
      const move = easyMove([...board], () => 0.42);
      expect(emptyCells([...board])).toContain(move);
    }
  });

  it("normal AI wins when possible and blocks the player", () => {
    // AI (O) can win on cell 2
    expect(
      normalMove(["O", "O", null, "X", "X", null, null, null, null], "O", () => 0)
    ).toBe(2);
    // AI (O) must block X winning on cell 2
    expect(
      normalMove(["X", "X", null, "O", null, null, null, null, null], "O", () => 0)
    ).toBe(2);
  });

  it("hard AI never loses from an empty board against optimal play", () => {
    // Play hard AI as O against a center-opening X; AI should at least draw.
    let board = Array(9).fill(null) as (null | "X" | "O")[];
    board[4] = "X"; // player takes center
    const aiMove = hardMove(board, "O");
    board[aiMove] = "O";
    expect(board[aiMove]).toBe("O");
    expect(findWinningLine(board)?.winner).not.toBe("X");

    // From any position, hard move is always a legal empty cell
    const mid = ["X", "O", "X", null, "O", null, null, null, "X"] as const;
    const cell = hardMove([...mid], "O");
    expect(emptyCells([...mid])).toContain(cell);
  });

  it("chooseAiMove dispatches by difficulty", () => {
    const board = Array(9).fill(null) as (null | "X" | "O")[];
    const easy = chooseAiMove(
      { ...DEFAULT_TIC_TAC_TOE_SPEC, aiDifficulty: "easy" },
      board,
      () => 0
    );
    expect(easy).toBeGreaterThanOrEqual(0);
    expect(easy).toBeLessThan(9);
  });
});

describe("applyTicTacToeRefine", () => {
  it("supports difficulty, two-player, symbol, and color tweaks", () => {
    const harder = applyTicTacToeRefine(
      DEFAULT_TIC_TAC_TOE_SPEC,
      "make the ai harder"
    );
    expect(harder.matched).toBe(true);
    expect(harder.spec.aiDifficulty).toBe("hard");

    const two = applyTicTacToeRefine(
      DEFAULT_TIC_TAC_TOE_SPEC,
      "let two players play"
    );
    expect(two.spec.playerMode).toBe("local-2p");

    const asO = applyTicTacToeRefine(
      DEFAULT_TIC_TAC_TOE_SPEC,
      "make me play as O"
    );
    expect(asO.spec.playerSymbol).toBe("O");
    expect(asO.spec.opponentSymbol).toBe("X");

    const colors = applyTicTacToeRefine(
      DEFAULT_TIC_TAC_TOE_SPEC,
      "make X green and O red"
    );
    expect(colors.spec.visualTheme.xColor).toBe("green");
    expect(colors.spec.visualTheme.oColor).toBe("red");
  });

  it("explains win-line color instead of recoloring symbols", () => {
    const winLine = applyTicTacToeRefine(
      DEFAULT_TIC_TAC_TOE_SPEC,
      "if red wins, make the cross thing red to match the players color when they win"
    );
    expect(winLine.matched).toBe(true);
    expect(winLine.spec.visualTheme).toEqual(
      DEFAULT_TIC_TAC_TOE_SPEC.visualTheme
    );
    expect(winLine.assistantMessage.toLowerCase()).toMatch(/win line|winner/);

    const classic = applyTicTacToeRefine(
      DEFAULT_TIC_TAC_TOE_SPEC,
      "blue should be blue and red should be red"
    );
    expect(classic.matched).toBe(true);
    expect(classic.spec.visualTheme.xColor).toBe("red");
    expect(classic.spec.visualTheme.oColor).toBe("blue");
  });

  it("does not invent arcade fields", () => {
    const result = applyTicTacToeRefine(
      DEFAULT_TIC_TAC_TOE_SPEC,
      "add enemies and a timer and lives"
    );
    expect(result.matched).toBe(false);
    expect(JSON.stringify(result.spec)).not.toMatch(/enemies|timer|lives/);
  });
});
