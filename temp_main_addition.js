// Ajoutez cet import en haut avec les autres
import { MoodMatcher } from './mood-matcher.js'

// Après const gamification = new GamificationManager();
const moodMatcher = new MoodMatcher();

// Ajoutez ce listener avec les autres navigations
document.getElementById('quizBtn').addEventListener('click', () => {
  toggleSection('quiz-section');
  startQuiz();
});

// Ajoutez ces fonctions avant // Initialize
function startQuiz() {
  moodMatcher.reset();
  const container = document.getElementById('quizContainer');
  
  container.innerHTML = `
    <div class="quiz-start">
      <div class="quiz-start-icon">🎭✨</div>
      <h2>Mood Matcher Quiz</h2>
      <p>Répondez à 5 questions rapides et découvrez le film parfait pour votre humeur du moment !</p>
      <p style="font-size:1rem; color:rgba(255,255,255,0.6);">⚡ Résultat en moins de 30 secondes</p>
      <button class="start-button" onclick="beginQuiz()">🚀 Commencer le Quiz</button>
    </div>
  `;
}

function beginQuiz() {
  displayQuizQuestion();
}

function displayQuizQuestion() {
  const question = moodMatcher.getQuestion(moodMatcher.currentQuestion);
  const container = document.getElementById('quizContainer');
  const total = moodMatcher.getTotalQuestions();
  const current = moodMatcher.currentQuestion;
  
  const progressDots = Array.from({ length: total }, (_, i) => {
    let className = 'progress-dot';
    if (i < current) className += ' completed';
    if (i === current) className += ' active';
    return `<div class="${className}"></div>`;
  }).join('');
  
  container.innerHTML = `
    <div class="quiz-header">
      <h2>Question ${current + 1}/${total}</h2>
      <div class="quiz-progress">${progressDots}</div>
    </div>
    
    <div class="quiz-question">
      <div class="question-emoji">${question.emoji}</div>
      <div class="question-text">${question.question}</div>
      <div class="quiz-options">
        ${question.options.map(option => `
          <div class="quiz-option" onclick="selectQuizOption('${question.id}', '${option.value}')">
            ${option.label}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function selectQuizOption(questionId, optionValue) {
  const options = document.querySelectorAll('.quiz-option');
  options.forEach(opt => opt.style.pointerEvents = 'none');
  
  event.target.classList.add('selected');
  
  setTimeout(async () => {
    moodMatcher.answerQuestion(questionId, optionValue);
    
    if (moodMatcher.currentQuestion < moodMatcher.getTotalQuestions()) {
      displayQuizQuestion();
    } else {
      await displayQuizResult();
    }
  }, 300);
}

async function displayQuizResult() {
  const container = document.getElementById('quizContainer');
  container.innerHTML = '<div class="loader" style="margin:3rem auto;"></div>';
  
  const result = await moodMatcher.getRecommendation(API_KEY);
  
  if (!result) {
    container.innerHTML = '<p>❌ Erreur lors de la génération de la recommandation</p>';
    return;
  }
  
  const movie = result.movie;
  const profile = result.profile;
  const title = movie.title || movie.name;
  const posterUrl = movie.poster_path ? `${IMG_URL}${movie.poster_path}` : '';
  
  moodMatcher.saveResult({ movie, profile });
  
  container.innerHTML = `
    <div class="quiz-result">
      <div class="result-profile">
        <div class="profile-emoji">${profile.emoji}</div>
        <div class="profile-type">Vous êtes : ${profile.type}</div>
        <div class="profile-description">${profile.description}</div>
        <div class="profile-traits">
          <span class="trait-badge">🎭 ${profile.mood}</span>
          <span class="trait-badge">⚡ ${profile.energy}</span>
          <span class="trait-badge">🎬 ${profile.preferredGenre}</span>
        </div>
      </div>
      
      <div class="result-movie">
        <h3>🎬 Film recommandé pour vous</h3>
        <div class="movie-recommendation">
          ${posterUrl ? `<img src="${posterUrl}" alt="${title}">` : ''}
          <div class="movie-details">
            <h4>${title}</h4>
            <p><strong>⭐ ${movie.vote_average?.toFixed(1) || 'N/A'}/10</strong></p>
            <p style="margin-top:1rem; line-height:1.6;">${movie.overview || 'Aucune description disponible'}</p>
            <button onclick="showDetails(${movie.id}, '${result.mediaType}')" style="margin-top:1rem;">
              📖 Voir les détails
            </button>
          </div>
        </div>
      </div>
      
      <div class="result-actions">
        <button onclick="shareQuizResult('${profile.type}', '${title}')" class="share-button">
          📸 Partager sur Instagram
        </button>
        <button onclick="shareQuizResult('${profile.type}', '${title}', 'twitter')" class="share-button twitter">
          🐦 Partager sur Twitter
        </button>
        <button onclick="startQuiz()">
          🔄 Refaire le quiz
        </button>
      </div>
    </div>
  `;
}

function shareQuizResult(profileType, movieTitle, platform = 'instagram') {
  const text = `Je suis "${profileType}" et mon film du moment : ${movieTitle} 🎬✨\n\nDécouvre le tien sur CineTrack !`;
  const url = window.location.href;
  
  if (platform === 'twitter') {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  } else if (platform === 'facebook') {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  } else {
    // Instagram - Copier dans le presse-papier
    navigator.clipboard.writeText(text + '\n' + url).then(() => {
      showQuickNotification('📋 Texte copié ! Collez-le dans votre story Instagram');
    });
  }
  
  if ('vibrate' in navigator) {
    navigator.vibrate(100);
  }
}

window.beginQuiz = beginQuiz;
window.selectQuizOption = selectQuizOption;
window.shareQuizResult = shareQuizResult;

