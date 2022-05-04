// import { makeAutoObservable } from "mobx";
import { Chess } from "chess.js";
import pgnParser from 'pgn-parser'
import { useState } from "react";

const STOCKFISH = window.STOCKFISH;

// Utils
const cpWinningChances = (cp) => 2 / (1 + Math.exp(-0.004 * cp)) - 1;
const winningChanceJudgements = (delta) => {
  if (.3 <= delta) return 'Blunder'
  if (.2 <= delta) return 'Mistake'
  if (.1 <= delta) return 'Inaccuracy'
  return 'None'
}

const useEngine = () => {
  const [loading, setLoading] = useState(false)
  const [advantagesState, setAdvantagesState] = useState([]);
  const [analysisState, setAnalysisState] = useState(null);
  const [playerWhite, setPlayerWhite] = useState(null);
  const [playerBlack, setPlayerBlack] = useState(null);

  // initialize engine
  const engine =
      typeof STOCKFISH === "function"
        ? STOCKFISH()
        : new Worker("stockfish.js");
  // initialize chess 
  const chess = new Chess();
  
  // Engine functions
  // engine command
  const uciCmd = (cmd) => engine.postMessage(cmd);
  // sets new position to engine
  const setPosition = (fen) => uciCmd(`position fen ${fen}`)
  // analysis move
  const goDepth = (depth) => uciCmd(`go depth ${depth}`);

  // move function
  function* handleMove(moves, depth) {
    for (let i = 0; i < moves.length; i++) {
      chess.move(moves[i]);

      setPosition(chess.fen())
      goDepth(depth)
      yield false;

      // stops engine when array ends
      if (i === moves.length - 1) uciCmd('quit');
    }
  }

  // converts pgn to moves
  const convertPgnToMoves = (pgn) => {
    const [res] = pgnParser.parse(pgn);
    setPlayerWhite(res?.headers?.find(h => h?.name === 'White')?.value);
    setPlayerBlack(res?.headers?.find(h => h?.name === 'Black')?.value)
    return res.moves.map(el => el.move)
  }

  // start analyzing
  const analyzeMoves = (pgn) => {
    const moves = convertPgnToMoves(pgn)
    // states to control engine
    let isEngineReady = false;
    let isEngineLoaded = false;
    let canMove = true;
    let turn = 'white';
    let prevCpScore = 0;
    let maxDepth = '14';
    // data
    let advantages = [];
    let analysis = {
      white: ['None'],
      black: ['None'],
    }

    setLoading(true)
    // initial commands to start engine
    uciCmd("uci");
    uciCmd("isready");

    // move function
    const handleMoveGenerator = handleMove(moves, maxDepth);

    engine.addEventListener('message', function (e) {
      const line = e.data;

      // checks engine is initialized or not
      if (line === 'readyok' && !isEngineReady && !isEngineLoaded) {
        uciCmd("ucinewgame")
        uciCmd('setoption name UCI_AnalyseMode value true')
        isEngineReady = true;
        isEngineLoaded = true;
      }

      if (isEngineReady && isEngineLoaded) {
        // If engine is ready runs first move
        if (canMove) {
          handleMoveGenerator.next()
          canMove = false;
        }

        const match = line.match(/^info .*\bscore (\w+) (-?\d+)/);
        const depth = line.match(/^info (depth \d+(\.\d)*)/)?.[1]?.split(' ')?.[1];
        
        // checks position command is executed
        if (match) {
          // gets the last depth data to use absolute score
          if (depth === maxDepth) {
            // centipawn score of move
            let cpScore = Number(match[2]);

            // Winning chance
            const winningChance = cpWinningChances(cpScore);
            const prevWinnigChance = cpWinningChances(prevCpScore);
            // calculates centipawn loss
            const diff = Math.abs(winningChance) - Math.abs(prevWinnigChance);

            // checking turn
            if (turn === 'white') {
              if (advantages.length > 1) {
                analysis.white = [...analysis.white, winningChanceJudgements(diff)];
              }

              advantages = [...advantages, winningChance.toFixed(2)];
              turn = 'black'
            } else {
              if (advantages.length > 1) {
                analysis.black = [...analysis.black, winningChanceJudgements(diff)];
              }

              advantages = [...advantages, winningChance.toFixed(2)];
              turn = 'white'
            }
            prevCpScore = cpScore;
          }
        }
        // After analyzing the last move
        if (line.includes('bestmove')) {
          const isEnd = handleMoveGenerator.next().done;
          if (isEnd) {
            setAdvantagesState(advantages);
            setAnalysisState(analysis);
            setLoading(false)
          };
        }
      }
    });
  }

  return {
    analyzeMoves,
    loading,
    analysis: analysisState,
    advantages: advantagesState,
    playerBlack,
    playerWhite
  }
}

export default useEngine;