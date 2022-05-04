import { useRef, useMemo } from "react";
import useEngine from './useEngine'

const App = () => {
  const {
    analyzeMoves,
    loading,
    analysis,
    advantages,
    playerBlack,
    playerWhite
  } = useEngine();
  const pgnInput = useRef(null)
  
  const handleOnSubmit = (e) => {
    e.preventDefault();
    if (pgnInput?.current) {
      if (pgnInput.current.value) {
        const pgn = pgnInput.current.value;
        analyzeMoves(pgn);
      } else {
        alert('Input PGN file')
      }
    }
  }

  const generateAnalysisData = (data) => {
    let countMistakes = data.filter(val => val === 'Mistake')
    let countInaccuracy = data.filter(val => val === 'Inaccuracy')
    let countBlunder = data.filter(val => val === 'Blunder')
    return {
      mistakes: countMistakes?.length,
      inaccuracies: countInaccuracy?.length,
      blunders: countBlunder?.length,
    };
  }

  const whiteData = useMemo(() => {
    if (analysis) {
      if (analysis.white) {
        return generateAnalysisData(analysis.white);
      }
    }
  }, [analysis]);

  const blackData = useMemo(() => {
    if (analysis) {
      if (analysis.black) {
        return generateAnalysisData(analysis.black);
      }
    }
  }, [analysis]);
  
  return (
    <div className="container">
      <h1>Chess Game Analyzer</h1>
      {loading ? 
        <p className="loading">Analyzing...</p> :
        <>
          {whiteData && blackData && advantages && 
            <div className="results">
              <h2>Results</h2>

              <div className="flex">
                <div>
                  <h3 className="white">White ({playerWhite && playerWhite})</h3>
                  <p className="inaccuracy">Inaccuracy: {whiteData?.inaccuracies}</p>
                  <p className="mistake">Mistake: {whiteData?.mistakes}</p>
                  <p className="blunder">Blunder: {whiteData?.blunders}</p>
                </div>
                <div>
                  <h3 className="black">Black ({playerBlack && playerBlack})</h3>
                  <p className="inaccuracy">Inaccuracy: {blackData?.inaccuracies}</p>
                  <p className="mistake">Mistake: {blackData?.mistakes}</p>
                  <p className="blunder">Blunder: {blackData?.blunders}</p>
                </div>
              </div>

              <h2>Advantages of each move</h2>
              <div className="moves">
                {advantages && advantages.map((adv, index) => (
                    <div key={index}>
                      <span>{index + 1}. </span>
                      <p>{adv}</p>
                    </div>
                  ))
                }
              </div>
            </div>
          }

          <form onSubmit={handleOnSubmit}>
            <p>Paste the PGN text here: </p>
            <textarea ref={pgnInput}></textarea> <br />
            <input type='submit' value='Analyze' />
          </form>
        </>
      }
    </div>
  );
};

export default App;
