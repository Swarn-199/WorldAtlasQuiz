import React, {useState, useEffect, use} from 'react';
import {useNavigate} from 'react-router-dom';
const CUSTOM_FLAGS = {
  "Afghanistan": "https://flagpedia.net/data/flags/w1600/af.png",
  "Northern Cyprus": "https://img.freepik.com/premium-vector/northern-cyprus-flag-vector_671352-142.jpg"
};

const Game = () => {
    const navigate = useNavigate();
    const [masterList, setMasterList] = useState([]);
    const [unplayedTargets, setUnplayedTargets] = useState([]);
    const [question, setQuestion] = useState(null);
    const [score, setScore] = useState({ correct: 0, total: 0 });
    const [feedback, setFeedback] = useState('');
    const [timeLeft, setTimeLeft] = useState(5);

    const [loading, setLoading] = useState(true);
    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [gameMode, setGameMode] = useState(null);
    const [userProfile, setUserProfile] = useState(null);

    useEffect(() => {
      const currentUser = localStorage.getItem('username');
        if (currentUser) {
          fetch(`http://localhost:5000/user-stats/${currentUser}`)
            .then(res => res.json())
            .then(data => setUserProfile(data))
            .catch(err => console.error("Error fetching profile:", err));
        }
      }, [gameOver]);

    useEffect(() => {
        fetch('https://restcountries.com/v3.1/all?fields=name,flags,capital')
            .then(res => res.json())
            .then(data => {
                const validCountries = data.filter(c => 
                  c.flags && c.flags.png && c.name && 
                  c.name.common && c.name.common !== 'Northern Cyprus' && 
                  c.name.common !== 'Somaliland' && c.capital && c.capital.length > 0);
                setMasterList(validCountries);

                const shuffledDeck = [...validCountries].sort(() => 0.5 - Math.random());
                const twentyTargets = shuffledDeck.slice(0, 20);
                setUnplayedTargets(twentyTargets);

                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching countries:', err);
                setLoading(false);
            });
    },[]);

    const generateQuestion = (currentTargets = unplayedTargets, fullList = masterList, mode = gameMode) => {
        if (currentTargets.length === 0) {
            setFeedback('Game Over!');
            setGameOver(true);
            return;
        }

        setFeedback('');
        setTimeLeft(5);

        const correctCountry = currentTargets[0];
        const remainingTargets = currentTargets.slice(1);
        setUnplayedTargets(remainingTargets);

        const distractors = [...fullList]
            .filter(c => c.name.common !== correctCountry.name.common)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);

        const finalFour = [correctCountry, ...distractors].sort(() => 0.5 - Math.random());
        
        setQuestion({
          prompt: mode === 'capitals' ? correctCountry.name.common : (CUSTOM_FLAGS[correctCountry.name.common] || correctCountry.flags.png),
          answer: mode === 'capitals' ? correctCountry.capital[0] : correctCountry.name.common,
          options: mode === 'capitals' ? finalFour.map(c => c.capital[0]) : finalFour.map(c => c.name.common),
          flagUrl: CUSTOM_FLAGS[correctCountry.name.common] || correctCountry.flags.png
        });
    }
    
    // Put this inside your React component
    const saveStatsToDatabase = async (finalScore) => {
      // 1. Check if they are logged in. If they are a guest, we don't save anything!
      const currentUser = localStorage.getItem('username');
      if (!currentUser) return; 

      try {
        const res = await fetch('http://localhost:5000/save-game', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username: currentUser, 
            score: finalScore,
            mode: gameMode
          })
        });

        const data = await res.json();
        
        if (res.ok) {
          console.log("Stats securely saved to database!", data.updatedStats);
        }
      } catch (err) {
          console.error("Failed to connect to server:", err);
      }
    };

    const handleGuess = (guessedName) => {
      const isCorrect = (guessedName === question.answer);
      const newTotal = score.total + 1;
      const newCorrect = isCorrect ? score.correct + 1 : score.correct;

      if (isCorrect) {
        setScore({ correct: newCorrect, total: newTotal });
        setFeedback('Correct!');
      } else {
        setScore({ correct: newCorrect, total: newTotal });
        setFeedback(`Oops! That's ${question.answer}`);
      }

      //Check if the game is over!
      setTimeout(() => {
        if (newTotal >= 20) {
          console.log("20 rounds complete! Saving to database...");
          saveStatsToDatabase(newCorrect, gameMode); 
          setGameOver(true); 
          
        } else {
          generateQuestion();
        }
      }, 1500);
    };

    useEffect(() => {
      if (!gameStarted || gameOver || feedback || !question || timeLeft <= 0) return;
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    }, [gameStarted, timeLeft, feedback, gameOver, question]);

    useEffect(() => {
        if (gameStarted && timeLeft === 0 && !feedback && !gameOver && question) {
            setScore(prev => ({ ...prev, total: prev.total + 1}));
            setFeedback(`That's ${question.answer}`);
            setTimeout(() => {
            const newTotal = score.total + 1;
            if (newTotal >= 20) {
              saveStatsToDatabase(score.correct, gameMode);
              setGameOver(true);
            } else {
              generateQuestion();
            }
          }, 1500);
        }
    }, [gameStarted, timeLeft, feedback, gameOver, question, score]);

    const restartGame = () => {
      setScore({ correct: 0, total: 0 });
      setFeedback('');
      setGameOver(false);
      setGameStarted(false);
      setGameMode(null); // Boot them back to the select screen!
      setQuestion(null);
    
      const shuffledDeck = [...masterList].sort(() => 0.5 - Math.random());
      const twentyTargets = shuffledDeck.slice(0, 20);
    
    setUnplayedTargets(twentyTargets);
  };

    if (loading) {
        return <div style={{
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh', 
            backgroundColor: '#0a192f',
            color: 'white' }}>
                <h2>Loading Atlas Data...</h2>
        </div>;
    }

// Main Game UI
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100vw', minHeight: '100vh', backgroundColor: '#0a192f', color: 'white', padding: '40px', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Header & Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '800px', marginBottom: '30px' }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#315d7a94', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 'bold' }}
        >
          🌍 ← Back to Globe
        </button>

        
        {gameStarted && (
          <h2 style={{ margin: 0 }}>Score: {score.correct} / {score.total}</h2>
        )}
      </div>

      <h1 style={{ textAlign: 'center' }}>
        {!gameMode ? 'Select Your Challenge' : gameMode === 'capitals' ? '🏛️ Match the Capital!' : '🏳️ Match the Flag!'}
      </h1>

      {gameStarted && !gameOver && (
          <h2 style={{ margin: 0, color: timeLeft <= 2 ? '#f87171' : 'white', transition: 'color 0.3s ease' }}>
            ⏳ {timeLeft}s
          </h2>
      )}


      {!gameStarted && !gameOver && userProfile && (
        <div style={{
          position: 'absolute', top: '20px', right: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          padding: '20px', borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          color: 'white', minWidth: '200px', zIndex: 10
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#4ade80', borderBottom: '1px solid #4ade80', paddingBottom: '5px' }}>
            👤 {userProfile.username}
          </h3>
    
          <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <strong style={{ color: '#3b82f6' }}>🏳️ Flags:</strong><br/>
              Best: {userProfile.flagHighScore} | Total: {userProfile.totalFlagPoints}
            </div>
            <div>
              <strong style={{ color: '#10b981' }}>🏛️ Capitals:</strong><br/>
              Best: {userProfile.capitalHighScore} | Total: {userProfile.totalCapitalPoints}
            </div>
          </div>
        </div>
)}
      {/* --- PHASE 1: MODE SELECTION MENU --- */}
      {!gameMode && (
        <div style={{ display: 'flex', gap: '20px', marginTop: '40px', flexDirection: 'column' }}>
          <button 
            onClick={() => setGameMode('flags')}
            style={{ 
              padding: '20px 40px', fontSize: '20px', fontWeight: 'bold', 
              backgroundColor: '#113e87', color: 'white', border: 'none', 
              borderRadius: '10px', cursor: 'pointer', 
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}
          >
            🏳️ Guess the Flag name
          </button>
          <button 
            onClick={() => setGameMode('capitals')}
            style={{ 
              padding: '20px 40px', fontSize: '20px', fontWeight: 'bold', 
              backgroundColor: '#066161', color: 'white', border: 'none', 
              borderRadius: '10px', cursor: 'pointer', 
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}
          >
            🏛️ Guess the Capital
          </button>
        </div>
      )}

      {/* --- PHASE 2: THE RULES SCREEN --- */}
      {gameMode && !gameStarted && !gameOver && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: '40px', borderRadius: '15px', marginTop: '20px', width: '100%', maxWidth: '800px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize: '18px', lineHeight: '1.8', marginBottom: '40px', textAlign: 'left' }}>
            <p><strong>Rules:</strong></p>
            <ul style={{ paddingLeft: '20px' }}>
              <li>You will be shown 20 random {gameMode === 'flags' ? 'flags' : 'countries'} from around the globe.</li>
              <li>You must select the correct {gameMode === 'flags' ? 'country name' : 'capital city'} from the 4 options.</li>
              <li><strong>You only have 5 seconds per round!</strong></li>
              <li>If the timer hits zero, it counts as a wrong answer.</li>
              <br></br>
              <li><strong>NOTE: Use of AI or any cheating method is strictly prohibited. Haha, just kidding! Hope you enjoy the game!</strong></li>
            </ul>
          </div>

          <button 
            onClick={() => {
              setGameStarted(true);
              generateQuestion(unplayedTargets, masterList, gameMode);
            }} 
            style={{ padding: '15px 40px', fontSize: '20px', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)', transition: 'transform 0.1s' }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            START
          </button>
        </div>
      )}

      {/* --- PHASE 3: THE QUIZ AREA --- */}
      {gameStarted && question && !gameOver && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: '30px', borderRadius: '15px', marginTop: '20px', width: '100%', maxWidth: '500px' }}>
          
          {gameMode === 'flags' ? (
            <img 
              src={question.prompt} 
              alt="Guess the flag" 
              style={{ height: '200px', objectFit: 'contain', marginBottom: '30px', borderRadius: '8px', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }} 
            />
          ) : (
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', margin: '40px 0' }}>
               <img 
                 src={question.flagUrl} 
                 alt="Flag" 
                 style={{ height: '50px', borderRadius: '4px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }} 
               />
               <h2 style={{ fontSize: '48px', margin: 0, textAlign: 'center', color: 'white' }}>
                 {question.prompt}
               </h2>
             </div>
          )}

          <h3 style={{ height: '30px', margin: '0 0 20px 0', color: feedback.includes('✅') || feedback === 'Correct!' ? '#4ade80' : feedback.includes('⏳') ? '#fbbf24' : '#f87171' }}>
            {feedback}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', width: '100%' }}>
            {question.options.map((optionName, index) => (
              <button
                key={index}
                onClick={() => {
                  if (!feedback) handleGuess(optionName);
                }}
                style={{
                  padding: '15px', fontSize: '16px', cursor: feedback ? 'not-allowed' : 'pointer', backgroundColor: 'white', color: '#0a192f', border: 'none', borderRadius: '8px', fontWeight: 'bold', transition: 'background-color 0.2s'
                }}
              >
                {optionName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- PHASE 4: GAME OVER SCREEN --- */}
      {gameOver && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px' }}>
          <h2 style={{ color: '#4ade80' }}>Game Over!</h2>
          <h1>Final Score: {score.correct} out of 20</h1>
          <button 
            onClick={restartGame} 
            style={{ padding: '15px 30px', marginTop: '20px', fontSize: '18px', cursor: 'pointer', backgroundColor: '#e63946', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
          >
            Play Again 🔄
          </button>
        </div>
      )}
      
    </div>
  );
};

export default Game;