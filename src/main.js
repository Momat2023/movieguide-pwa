import './style.css'
import { auth, loginWithGoogle, logout } from './firebase.js'
import { onAuthStateChanged } from 'firebase/auth'
import { GamificationManager } from './gamification.js'
import { MoodMatcher } from './mood-matcher.js'
import { NotificationManager } from './notifications.js'
import { SwipeMatcher } from './swipe-matcher.js' // NOUVEAU

const API_KEY = '904812e78d331be964b64b4e270697ed';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
let watchedMovies = JSON.parse(localStorage.getItem('watchedMovies')) || [];
let deferredPrompt;
let currentUser = null;
let currentFilter = 'all';
let currentSort = 'recent';

// Initialiser les systèmes
const gamification = new GamificationManager();
const moodMatcher = new MoodMatcher();
const notificationManager = new NotificationManager();
const swipeMatcher = new SwipeMatcher(API_KEY);

// PWA Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installPrompt = document.getElementById('installPrompt');
  if (installPrompt) {
    installPrompt.style.display = 'block';
  }
});

document.getElementById('installBtn')?.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response: ${outcome}`);
    deferredPrompt = null;
    const installPrompt = document.getElementById('installPrompt');
    if (installPrompt) {
      installPrompt.style.display = 'none';
    }
  }
});

document.getElementById('dismissBtn')?.addEventListener('click', () => {
  const installPrompt = document.getElementById('installPrompt');
  if (installPrompt) {
    installPrompt.style.display = 'none';
  }
});

// Auth State
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateAuthButton();
});

function updateAuthButton() {
  const authBtn = document.getElementById('authBtn');
  if (currentUser) {
    authBtn.textContent = '👤 ' + (currentUser.displayName?.split(' ')[0] || 'Mon Compte');
    authBtn.onclick = () => {
      if (confirm('Se déconnecter ?')) {
        logout();
      }
    };
  } else {
    authBtn.textContent = '👤 Connexion';
    authBtn.onclick = async () => {
      try {
        await loginWithGoogle();
        alert('✅ Connecté avec succès !');
      } catch (error) {
        console.error('Erreur connexion:', error);
        alert('❌ Erreur de connexion');
      }
    };
  }
}

// Navigation
document.getElementById('homeBtn').addEventListener('click', () => {
  toggleSection('home-section');
  fetchTrending();
});

document.getElementById('quizBtn').addEventListener('click', () => {
  toggleSection('quiz-section');
  startQuiz();
});

document.getElementById('swipeBtn').addEventListener('click', () => {
  toggleSection('swipe-section');
  startSwipeMode();
});

document.getElementById('searchBtn').addEventListener('click', () => {
  toggleSection('search-section');
  document.getElementById('searchInput').focus();
});

document.getElementById('watchlistBtn').addEventListener('click', () => {
  toggleSection('watchlist-section');
  displayWatchlist();
});

document.getElementById('watchedBtn').addEventListener('click', () => {
  toggleSection('watched-section');
  displayWatchedMovies();
});

document.getElementById('badgesBtn').addEventListener('click', () => {
  toggleSection('badges-section');
  displayBadges();
});

// Filtres et tri pour Films Vus
document.getElementById('filterAll')?.addEventListener('click', () => {
  setFilter('all');
});

document.getElementById('filterMovies')?.addEventListener('click', () => {
  setFilter('movie');
});

document.getElementById('filterSeries')?.addEventListener('click', () => {
  setFilter('tv');
});

document.getElementById('sortRecent')?.addEventListener('click', () => {
  setSort('recent');
});

document.getElementById('sortRating')?.addEventListener('click', () => {
  setSort('rating');
});

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    if (btn.id.includes('filter')) {
      btn.classList.remove('active');
    }
  });
  const filterBtn = document.getElementById('filter' + filter.charAt(0).toUpperCase() + filter.slice(1));
  if (filterBtn) {
    filterBtn.classList.add('active');
  }
  displayWatchedMovies();
}

function setSort(sort) {
  currentSort = sort;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    if (btn.id.includes('sort')) {
      btn.classList.remove('active');
    }
  });
  const sortBtn = document.getElementById('sort' + sort.charAt(0).toUpperCase() + sort.slice(1));
  if (sortBtn) {
    sortBtn.classList.add('active');
  }
  displayWatchedMovies();
}

// Search input
document.getElementById('searchInput').addEventListener('input', (e) => {
  const query = e.target.value.trim();
  if (query.length > 2) {
    searchMovies(query);
  } else if (query.length === 0) {
    document.getElementById('searchResults').innerHTML = '';
  }
});

// Modal close
document.querySelector('.close').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

window.addEventListener('click', (e) => {
  const modal = document.getElementById('modal');
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

function toggleSection(sectionId) {
  document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
  document.getElementById(sectionId).style.display = 'block';
}

// Fetch Trending
async function fetchTrending() {
  const container = document.getElementById('trendingGrid');
  container.innerHTML = '<div class="loader"></div>';
  
  try {
    const response = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}&language=fr-FR`);
    const data = await response.json();
    displayMovies(data.results, 'trendingGrid');
  } catch (error) {
    console.error('Erreur:', error);
    container.innerHTML = '<p>❌ Erreur de chargement. Vérifiez votre connexion.</p>';
  }
}

// Search Movies
async function searchMovies(query) {
  const container = document.getElementById('searchResults');
  container.innerHTML = '<div class="loader"></div>';
  
  try {
    const response = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&language=fr-FR&query=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    if (data.results.length === 0) {
      container.innerHTML = '<p>😢 Aucun résultat trouvé</p>';
      return;
    }
    
    displayMovies(data.results, 'searchResults');
  } catch (error) {
    console.error('Erreur:', error);
    container.innerHTML = '<p>❌ Erreur de recherche</p>';
  }
}

// Display Movies
function displayMovies(movies, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  const filtered = movies.filter(m => m.poster_path && (m.media_type !== 'person'));
  
  if (filtered.length === 0) {
    container.innerHTML = '<p>Aucun contenu disponible</p>';
    return;
  }
  
  filtered.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    
    const title = movie.title || movie.name || 'Titre indisponible';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    
    card.innerHTML = `
      <img src="${IMG_URL}${movie.poster_path}" alt="${title}" loading="lazy">
      <div class="movie-info">
        <div class="movie-title">${title}</div>
        <div class="movie-rating">⭐ ${rating}</div>
      </div>
    `;
    
    card.addEventListener('click', () => showDetails(movie.id, movie.media_type || 'movie'));
    container.appendChild(card);
  });
}

// Show Details
async function showDetails(id, type) {
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  
  modalBody.innerHTML = '<div class="loader"></div>';
  modal.style.display = 'block';
  
  try {
    const response = await fetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}&language=fr-FR&append_to_response=credits,videos`);
    const movie = await response.json();
    
    const isInWatchlist = watchlist.some(item => item.id === movie.id);
    const isWatched = watchedMovies.some(item => item.id === movie.id);
    const title = movie.title || movie.name;
    const releaseDate = movie.release_date || movie.first_air_date || 'Date inconnue';
    const overview = movie.overview || 'Aucune description disponible';
    
    modalBody.innerHTML = `
      ${movie.backdrop_path ? `<img src="${IMG_URL}${movie.backdrop_path}" class="modal-backdrop" alt="${title}">` : ''}
      <h2>${title}</h2>
      <p><strong>⭐ ${movie.vote_average?.toFixed(1) || 'N/A'}/10</strong> | 📅 ${releaseDate}</p>
      <p style="margin:1.5rem 0; line-height:1.6;">${overview}</p>
      ${movie.genres ? `<p><strong>Genres:</strong> ${movie.genres.map(g => g.name).join(', ')}</p>` : ''}
      
      <div style="margin-top:1.5rem; display:flex; gap:1rem; flex-wrap:wrap;">
        <button id="addToWatchlist" style="font-size:1rem; flex:1; min-width:150px;" ${isInWatchlist ? 'disabled' : ''}>
          ${isInWatchlist ? '✅ Dans ma liste' : '➕ Ajouter à ma liste'}
        </button>
        <button id="markWatched" style="font-size:1rem; flex:1; min-width:150px; background:linear-gradient(135deg, #28a745 0%, #20c997 100%);" ${isWatched ? 'disabled' : ''}>
          ${isWatched ? '✅ Déjà vu' : '✅ Marquer comme vu'}
        </button>
      </div>
    `;
    
    // Listener pour "Ajouter à ma liste"
    if (!isInWatchlist) {
      document.getElementById('addToWatchlist').addEventListener('click', () => {
        const genreIds = movie.genres ? movie.genres.map(g => g.id) : [];
        
        addToWatchlist({
          id: movie.id,
          title: title,
          poster: movie.poster_path,
          rating: movie.vote_average || 0,
          type: type,
          genres: genreIds
        });
        
        document.getElementById('addToWatchlist').textContent = '✅ Dans ma liste';
        document.getElementById('addToWatchlist').disabled = true;
      });
    }
    
    // Listener pour "Marquer comme vu"
    if (!isWatched) {
      document.getElementById('markWatched').addEventListener('click', () => {
        const genreIds = movie.genres ? movie.genres.map(g => g.id) : [];
        
        markAsWatched({
          id: movie.id,
          title: title,
          poster: movie.poster_path,
          backdrop: movie.backdrop_path,
          rating: movie.vote_average || 0,
          type: type,
          genres: genreIds,
          overview: overview,
          releaseDate: releaseDate,
          watchedAt: new Date().toISOString()
        });
        
        const btn = document.getElementById('markWatched');
        btn.textContent = '✅ Déjà vu';
        btn.disabled = true;
        btn.style.opacity = '0.7';
        btn.style.cursor = 'not-allowed';
      });
    }
    
  } catch (error) {
    console.error('Erreur:', error);
    modalBody.innerHTML = '<p>❌ Erreur de chargement des détails</p>';
  }
}

// Watchlist Management
function addToWatchlist(movie) {
  const exists = watchlist.some(item => item.id === movie.id);
  
  if (!exists) {
    watchlist.push({
      ...movie,
      addedAt: new Date().toISOString()
    });
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    updateWatchlistCount();
    
    // Enregistrer dans le système de gamification avec les genres
    const genreIds = movie.genres || [];
    gamification.addToWatchlist(movie.id, genreIds);
    
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
    
    showQuickNotification('✅ Film ajouté à votre watchlist !');
  }
}

function removeFromWatchlist(id) {
  watchlist = watchlist.filter(movie => movie.id !== id);
  localStorage.setItem('watchlist', JSON.stringify(watchlist));
  displayWatchlist();
  updateWatchlistCount();
}

function displayWatchlist() {
  const container = document.getElementById('watchlistGrid');
  updateWatchlistCount();
  
  if (watchlist.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding:2rem;">📭 Votre watchlist est vide.<br>Ajoutez des films pour les retrouver ici !</p>';
    return;
  }
  
  container.innerHTML = '';
  
  const reversedWatchlist = [...watchlist].reverse();
  
  reversedWatchlist.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
      <img src="${IMG_URL}${movie.poster}" alt="${movie.title}" loading="lazy">
      <div class="movie-info">
        <div class="movie-title">${movie.title}</div>
        <div class="movie-rating">⭐ ${movie.rating.toFixed(1)}</div>
        <button onclick="removeFromWatchlist(${movie.id})" style="margin-top:0.5rem; font-size:0.8rem; padding:0.4rem 1rem;">
          🗑️ Supprimer
        </button>
      </div>
    `;
    
    card.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        showDetails(movie.id, movie.type);
      }
    });
    
    container.appendChild(card);
  });
}

function updateWatchlistCount() {
  const watchlistCount = document.querySelectorAll('#watchlistCount');
  watchlistCount.forEach(el => {
    el.textContent = watchlist.length;
  });
}

// Watched Movies Management
function markAsWatched(movie) {
  const exists = watchedMovies.some(item => item.id === movie.id);
  
  if (!exists) {
    watchedMovies.push({
      ...movie,
      watchedAt: new Date().toISOString()
    });
    localStorage.setItem('watchedMovies', JSON.stringify(watchedMovies));
    updateWatchedCount();
    gamification.markAsWatched();
    
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
    
    showQuickNotification('✅ Film ajouté à vos films vus !');
  } else {
    showQuickNotification('ℹ️ Ce film est déjà dans vos films vus');
  }
}

function removeFromWatched(id) {
  watchedMovies = watchedMovies.filter(movie => movie.id !== id);
  localStorage.setItem('watchedMovies', JSON.stringify(watchedMovies));
  displayWatchedMovies();
  updateWatchedCount();
  showQuickNotification('🗑️ Film retiré de vos films vus');
}

function displayWatchedMovies() {
  const container = document.getElementById('watchedGrid');
  updateWatchedCount();
  
  if (watchedMovies.length === 0) {
    container.innerHTML = `
      <div class="empty-watched">
        <div class="empty-watched-icon">🎬</div>
        <p><strong>Aucun film vu pour le moment</strong></p>
        <p>Marquez des films comme vus pour les retrouver ici !</p>
      </div>
    `;
    return;
  }
  
  // Filtrer
  let filtered = [...watchedMovies];
  if (currentFilter !== 'all') {
    filtered = filtered.filter(m => m.type === currentFilter);
  }
  
  // Trier
  if (currentSort === 'recent') {
    filtered.sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt));
  } else if (currentSort === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  }
  
  // Statistiques
  const stats = calculateWatchedStats();
  const statsHTML = `
    <div class="watched-stats">
      <div class="watched-stat-item">
        <h3>${stats.total}</h3>
        <p>Total vus</p>
      </div>
      <div class="watched-stat-item">
        <h3>${stats.movies}</h3>
        <p>Films</p>
      </div>
      <div class="watched-stat-item">
        <h3>${stats.series}</h3>
        <p>Séries</p>
      </div>
      <div class="watched-stat-item">
        <h3>${stats.avgRating}</h3>
        <p>Note moyenne</p>
      </div>
      <div class="watched-stat-item">
        <h3>${stats.thisMonth}</h3>
        <p>Ce mois-ci</p>
      </div>
    </div>
  `;
  
  container.innerHTML = statsHTML;
  
  // Afficher les films
  const grid = document.createElement('div');
  grid.className = 'grid';
  
  filtered.forEach(movie => {
    const watchedDate = new Date(movie.watchedAt);
    const formattedDate = watchedDate.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
    
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.style.position = 'relative';
    
    card.innerHTML = `
      <div class="watched-badge">✅ VU</div>
      <img src="${IMG_URL}${movie.poster}" alt="${movie.title}" loading="lazy">
      <div class="movie-info">
        <div class="movie-title">${movie.title}</div>
        <div class="movie-rating">⭐ ${movie.rating.toFixed(1)}</div>
        <div class="watched-date">Vu le ${formattedDate}</div>
        <button onclick="removeFromWatched(${movie.id})" style="margin-top:0.5rem; font-size:0.8rem; padding:0.4rem 1rem; background:linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
          🗑️ Retirer
        </button>
      </div>
    `;
    
    card.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        showDetails(movie.id, movie.type);
      }
    });
    
    grid.appendChild(card);
  });
  
  container.appendChild(grid);
}

function calculateWatchedStats() {
  const total = watchedMovies.length;
  const movies = watchedMovies.filter(m => m.type === 'movie').length;
  const series = watchedMovies.filter(m => m.type === 'tv').length;
  
  const avgRating = watchedMovies.length > 0 
    ? (watchedMovies.reduce((sum, m) => sum + m.rating, 0) / watchedMovies.length).toFixed(1)
    : '0.0';
  
  const now = new Date();
  const thisMonth = watchedMovies.filter(m => {
    const watchedDate = new Date(m.watchedAt);
    return watchedDate.getMonth() === now.getMonth() && 
           watchedDate.getFullYear() === now.getFullYear();
  }).length;
  
  return { total, movies, series, avgRating, thisMonth };
}

function updateWatchedCount() {
  const watchedCount = document.getElementById('watchedCount');
  const watchedCountTitle = document.getElementById('watchedCountTitle');
  
  if (watchedCount) {
    watchedCount.textContent = watchedMovies.length;
  }
  if (watchedCountTitle) {
    watchedCountTitle.textContent = watchedMovies.length;
  }
}

// Badges
function displayBadges() {
  const container = document.getElementById('badgesContent');
  container.innerHTML = gamification.renderBadgesPage();
}

// Mood Matcher Quiz Functions
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
        <button onclick="shareQuizResult('${profile.type.replace(/'/g, "\\'")}', '${title.replace(/'/g, "\\'")}', 'instagram')" class="share-button">
          📸 Partager sur Instagram
        </button>
        <button onclick="shareQuizResult('${profile.type.replace(/'/g, "\\'")}', '${title.replace(/'/g, "\\'")}', 'twitter')" class="share-button twitter">
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
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text + '\n' + url).then(() => {
        showQuickNotification('📋 Texte copié ! Collez-le dans votre story Instagram');
      }).catch(() => {
        alert(text + '\n' + url);
      });
    } else {
      alert(text + '\n' + url);
    }
  }
  
  if ('vibrate' in navigator) {
    navigator.vibrate(100);
  }
}

function showQuickNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'streak-notification show';
  notification.textContent = message;
  notification.style.bottom = '20px';
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 500);
  }, 2500);
}

// Global functions for onclick handlers
window.removeFromWatchlist = removeFromWatchlist;
window.removeFromWatched = removeFromWatched;
window.beginQuiz = beginQuiz;
window.selectQuizOption = selectQuizOption;
window.shareQuizResult = shareQuizResult;

// Demander permission notifications après 10 secondes
setTimeout(() => {
  showNotificationPermissionBanner();
}, 10000);

// Vérifier les notifications planifiées toutes les heures
setInterval(() => {
  if (notificationManager.isEnabled()) {
    notificationManager.checkScheduledNotifications();
  }
}, 60 * 60 * 1000); // Chaque heure

// Analyser comportement au chargement
if (notificationManager.isEnabled()) {
  notificationManager.analyzeUserBehavior();
}

// Fonction pour afficher le banner de permission
function showNotificationPermissionBanner() {
  if (notificationManager.permission === 'granted' || 
      notificationManager.permission === 'denied' ||
      localStorage.getItem('notification_banner_dismissed')) {
    return;
  }
  
  const banner = document.createElement('div');
  banner.className = 'notification-permission-banner';
  banner.innerHTML = `
    <h3>🔔 Restez informé !</h3>
    <p>Activez les notifications pour recevoir des rappels, nouveautés et recommandations personnalisées.</p>
    <div class="buttons">
      <button onclick="enableNotifications()" style="background:linear-gradient(135deg, #28a745 0%, #20c997 100%);">
        ✅ Activer
      </button>
      <button onclick="dismissNotificationBanner()" class="dismiss-btn">
        Plus tard
      </button>
    </div>
  `;
  
  document.body.appendChild(banner);
}

async function enableNotifications() {
  const granted = await notificationManager.requestPermission();
  
  if (granted) {
    showQuickNotification('✅ Notifications activées avec succès !');
    notificationManager.showWelcomeNotification();
    document.querySelector('.notification-permission-banner')?.remove();
  } else {
    showQuickNotification('❌ Permission refusée. Activez-les dans les paramètres du navigateur.');
  }
}

function dismissNotificationBanner() {
  localStorage.setItem('notification_banner_dismissed', 'true');
  document.querySelector('.notification-permission-banner')?.remove();
}

// Notification contextuelle basée sur l'heure
function checkTimeBasedNotification() {
  const hour = new Date().getHours();
  const lastNotif = localStorage.getItem('last_time_notification');
  const today = new Date().toDateString();
  
  if (lastNotif !== today && notificationManager.isEnabled()) {
    if (hour === 20) { // 20h = heure du film
      notificationManager.notifyTimeBasedRecommendation(hour);
      localStorage.setItem('last_time_notification', today);
    }
  }
}

// Vérifier toutes les 30 minutes
setInterval(checkTimeBasedNotification, 30 * 60 * 1000);

// Notification badge débloqué (modifier dans gamification.js)
function unlockBadge(badge) {
  if (!badge || badge.earned || this.stats.earnedBadges.includes(badge.id)) return;
  
  badge.earned = true;
  this.stats.earnedBadges.push(badge.id);
  this.saveStats();
  this.showBadgeUnlock(badge);
  
  // NOUVEAU: Notification push
  if (window.notificationManager && window.notificationManager.isEnabled()) {
    window.notificationManager.notifyBadgeUnlocked(badge);
  }
}

// Afficher le panneau de gestion des notifications
function showNotificationSettings() {
  const panel = document.createElement('div');
  panel.className = 'notification-panel';
  panel.id = 'notificationPanel';
  
  const isEnabled = notificationManager.isEnabled();
  const stats = notificationManager.getEngagementStats();
  
  panel.innerHTML = `
    <h3>🔔 Notifications</h3>
    
    <div class="notification-toggle">
      <span>Activer les notifications</span>
      <div class="toggle-switch ${isEnabled ? 'active' : ''}" onclick="toggleNotifications()"></div>
    </div>
    
    <div class="notification-types">
      <div class="notification-type">
        <span>📋 Rappels watchlist</span>
        <input type="checkbox" checked>
      </div>
      <div class="notification-type">
        <span>🔥 Rappels streak</span>
        <input type="checkbox" checked>
      </div>
      <div class="notification-type">
        <span>🎬 Nouveaux films</span>
        <input type="checkbox" checked>
      </div>
      <div class="notification-type">
        <span>🏆 Badges débloqués</span>
        <input type="checkbox" checked>
      </div>
      <div class="notification-type">
        <span>🎭 Recommandations</span>
        <input type="checkbox" checked>
      </div>
    </div>
    
    <div class="notification-stats">
      <p><strong>📊 Statistiques</strong></p>
      <p>Total reçues : ${stats.total}</p>
      <p>Cette semaine : ${stats.lastSevenDays}</p>
    </div>
    
    <button onclick="closeNotificationPanel()" style="width:100%; margin-top:1rem;">
      Fermer
    </button>
  `;
  
  document.body.appendChild(panel);
  
  // Fermer si clic en dehors
  setTimeout(() => {
    document.addEventListener('click', function closePanel(e) {
      if (!panel.contains(e.target) && !e.target.closest('#notificationSettingsBtn')) {
        closeNotificationPanel();
        document.removeEventListener('click', closePanel);
      }
    });
  }, 100);
}

function toggleNotifications() {
  if (notificationManager.isEnabled()) {
    notificationManager.disableNotifications();
    showQuickNotification('🔕 Notifications désactivées');
  } else {
    enableNotifications();
  }
  
  const toggle = document.querySelector('.toggle-switch');
  if (toggle) {
    toggle.classList.toggle('active');
  }
}

function closeNotificationPanel() {
  document.getElementById('notificationPanel')?.remove();
}

// Exposer globalement
window.notificationManager = notificationManager;
window.enableNotifications = enableNotifications;
window.dismissNotificationBanner = dismissNotificationBanner;
window.showNotificationSettings = showNotificationSettings;
window.toggleNotifications = toggleNotifications;
window.closeNotificationPanel = closeNotificationPanel;

// Fonctions CineMatch Swipe
let currentSwipeCard = null;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
let isDragging = false;

async function startSwipeMode() {
  const container = document.getElementById('swipeContainer');
  
  container.innerHTML = `
    <div class="swipe-start">
      <div class="swipe-start-icon">💕🎬</div>
      <h2>CineMatch</h2>
      <p>Swipez pour découvrir vos goûts cinéma</p>
      <p style="font-size:1rem; color:rgba(255,255,255,0.6);">👈 Non merci | J'aime 👉</p>
      <button class="start-button" onclick="beginSwiping()">🚀 Commencer à swiper</button>
      ${swipeMatcher.preferences.totalSwipes > 0 ? `
        <button onclick="showSwipeProfile()" style="margin-top:1rem;">
          📊 Voir mon profil (${swipeMatcher.preferences.totalSwipes} swipes)
        </button>
      ` : ''}
    </div>
  `;
}

async function beginSwiping() {
  const container = document.getElementById('swipeContainer');
  container.innerHTML = '<div class="loader"></div>';
  
  const loaded = await swipeMatcher.loadMovies();
  
  if (!loaded) {
    container.innerHTML = '<p>❌ Erreur de chargement des films</p>';
    return;
  }
  
  displaySwipeCard();
}

function displaySwipeCard() {
  const movie = swipeMatcher.getCurrentMovie();
  
  if (!movie) {
    showNoMoreCards();
    return;
  }
  
  const container = document.getElementById('swipeContainer');
  const posterUrl = movie.poster_path ? `${swipeMatcher.IMG_URL}${movie.poster_path}` : '';
  
  const genreNames = (movie.genre_ids || [])
    .slice(0, 3)
    .map(id => swipeMatcher.getGenreName(id));
  
  container.innerHTML = `
    <div class="swipe-header">
      <h2>💕 CineMatch</h2>
      <div class="swipe-stats">
        <span>👍 ${swipeMatcher.preferences.totalLikes}</span>
        <span>📊 ${swipeMatcher.preferences.totalSwipes} swipes</span>
        <span>👎 ${swipeMatcher.preferences.totalDislikes}</span>
      </div>
    </div>
    
    <div class="swipe-card-container">
      <div class="swipe-card" id="swipeCard">
        <div class="swipe-overlay dislike">👎</div>
        <div class="swipe-overlay like">❤️</div>
        <img src="${posterUrl}" alt="${movie.title}" class="swipe-card-image">
        <div class="swipe-card-info">
          <div class="swipe-card-title">${movie.title}</div>
          <div class="swipe-card-rating">
            <span>⭐ ${movie.vote_average.toFixed(1)}/10</span>
            <span>•</span>
            <span>${movie.release_date?.split('-')[0] || 'N/A'}</span>
          </div>
          <div class="swipe-card-genres">
            ${genreNames.map(name => `<span class="genre-tag">${name}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>
    
    <div class="swipe-actions">
      <button class="swipe-button dislike" onclick="handleSwipeButton('left')">👎</button>
      <button class="swipe-button like" onclick="handleSwipeButton('right')">❤️</button>
    </div>
    
    <div style="text-align:center; margin-top:2rem;">
      <button onclick="showSwipeProfile()">📊 Voir mon profil</button>
    </div>
  `;
  
  currentSwipeCard = document.getElementById('swipeCard');
  setupSwipeGestures();
}

function setupSwipeGestures() {
  const card = currentSwipeCard;
  if (!card) return;
  
  // Mouse events
  card.addEventListener('mousedown', handleDragStart);
  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('mouseup', handleDragEnd);
  
  // Touch events
  card.addEventListener('touchstart', handleDragStart);
  document.addEventListener('touchmove', handleDragMove);
  document.addEventListener('touchend', handleDragEnd);
}

function handleDragStart(e) {
  if (swipeMatcher.isAnimating) return;
  
  isDragging = true;
  currentSwipeCard.classList.add('grabbing');
  
  if (e.type === 'mousedown') {
    startX = e.clientX;
    startY = e.clientY;
  } else {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }
}

function handleDragMove(e) {
  if (!isDragging) return;
  
  if (e.type === 'mousemove') {
    currentX = e.clientX - startX;
    currentY = e.clientY - startY;
  } else {
    currentX = e.touches[0].clientX - startX;
    currentY = e.touches[0].clientY - startY;
  }
  
  const rotation = currentX / 20;
  currentSwipeCard.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotation}deg)`;
  
  // Afficher overlay like/dislike
  if (currentX > 50) {
    currentSwipeCard.classList.add('tilting-right');
    currentSwipeCard.classList.remove('tilting-left');
  } else if (currentX < -50) {
    currentSwipeCard.classList.add('tilting-left');
    currentSwipeCard.classList.remove('tilting-right');
  } else {
    currentSwipeCard.classList.remove('tilting-left', 'tilting-right');
  }
}

async function handleDragEnd() {
  if (!isDragging) return;
  
  isDragging = false;
  currentSwipeCard.classList.remove('grabbing', 'tilting-left', 'tilting-right');
  
  const threshold = 100;
  
  if (Math.abs(currentX) > threshold) {
    const direction = currentX > 0 ? 'right' : 'left';
    await performSwipe(direction);
  } else {
    // Reset position
    currentSwipeCard.style.transform = '';
  }
}

async function handleSwipeButton(direction) {
  if (swipeMatcher.isAnimating) return;
  await performSwipe(direction);
}

async function performSwipe(direction) {
  const card = currentSwipeCard;
  card.classList.add(direction === 'right' ? 'swipe-right' : 'swipe-left');
  
  const isLike = await swipeMatcher.handleSwipe(direction);
  
  if ('vibrate' in navigator) {
    navigator.vibrate(isLike ? [50, 50, 50] : [100]);
  }
  
  setTimeout(() => {
    displaySwipeCard();
  }, 350);
}

function showNoMoreCards() {
  const container = document.getElementById('swipeContainer');
  
  container.innerHTML = `
    <div class="no-more-cards">
      <div class="no-more-cards-icon">🎉</div>
      <h2>Plus de films à swiper !</h2>
      <p>Vous avez swipé ${swipeMatcher.preferences.totalSwipes} films</p>
      <button onclick="showSwipeProfile()" style="margin-top:1rem;">
        📊 Voir mon profil complet
      </button>
      <button onclick="beginSwiping()" style="margin-top:1rem;">
        🔄 Continuer à swiper
      </button>
    </div>
  `;
}

async function showSwipeProfile() {
  const profile = swipeMatcher.getTasteProfile();
  
  if (!profile) {
    showQuickNotification('ℹ️ Swipez quelques films d\'abord !');
    return;
  }
  
  const container = document.getElementById('swipeContainer');
  
  const topGenresHTML = profile.topGenres.map(genre => `
    <div class="profile-genre-item">
      <span style="width:120px;">${swipeMatcher.getGenreName(genre.id)}</span>
      <div class="profile-genre-bar">
        <div class="profile-genre-fill" style="width:${genre.percentage}%;">
          ${genre.percentage}%
        </div>
      </div>
    </div>
  `).join('');
  
  const recommendations = await swipeMatcher.getRecommendations();
  
  container.innerHTML = `
    <div class="swipe-profile">
      <div class="profile-personality">
        <div class="profile-personality-emoji">${profile.personality.emoji}</div>
        <div class="profile-personality-type">${profile.personality.type}</div>
        <p style="color:rgba(255,255,255,0.8); margin-top:0.5rem;">${profile.personality.description}</p>
      </div>
      
      <div class="profile-stats-grid">
        <div class="profile-stat">
          <div class="profile-stat-value">${profile.totalSwipes}</div>
          <div class="profile-stat-label">Swipes</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value">${profile.likeRate}%</div>
          <div class="profile-stat-label">Taux d'approbation</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value">${profile.avgRating}</div>
          <div class="profile-stat-label">Note moyenne aimée</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value">${profile.selectivity}</div>
          <div class="profile-stat-label">Sélectivité</div>
        </div>
      </div>
      
      <div class="profile-genres">
        <h4>🎬 Vos genres préférés</h4>
        <div class="profile-genre-list">
          ${topGenresHTML}
        </div>
      </div>
      
      <div style="text-align:center; margin-top:2rem; display:flex; gap:1rem; justify-content:center; flex-wrap:wrap;">
        <button onclick="shareSwipeProfile('${profile.personality.type}', ${profile.totalSwipes})" class="share-button">
          📸 Partager mon profil
        </button>
        <button onclick="beginSwiping()">
          🔄 Continuer à swiper
        </button>
        <button onclick="startSwipeMode()">
          🏠 Accueil CineMatch
        </button>
      </div>
    </div>
    
    ${recommendations ? `
      <div class="swipe-recommendations">
        <h3>🎯 Recommandations pour vous</h3>
        <div class="grid" id="swipeRecommendationsGrid"></div>
      </div>
    ` : ''}
  `;
  
  if (recommendations) {
    displayMovies(recommendations, 'swipeRecommendationsGrid');
  }
}

function shareSwipeProfile(personality, totalSwipes) {
  const text = `Je suis un spectateur "${personality}" avec ${totalSwipes} films swipés sur CineTrack ! 💕🎬\n\nDécouvre ton profil cinéma :`;
  const url = window.location.href;
  
  if (navigator.share) {
    navigator.share({ title: 'Mon profil CineMatch', text, url });
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text + '\n' + url).then(() => {
      showQuickNotification('📋 Texte copié ! Partagez sur vos réseaux sociaux');
    });
  }
  
  if ('vibrate' in navigator) {
    navigator.vibrate(100);
  }
}

// Exposer globalement
window.beginSwiping = beginSwiping;
window.handleSwipeButton = handleSwipeButton;
window.showSwipeProfile = showSwipeProfile;
window.shareSwipeProfile = shareSwipeProfile;
// Initialize
fetchTrending();
updateWatchlistCount();
updateWatchedCount();
gamification.updateUI();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(() => {
    console.log('✅ Service Worker registered');
  }).catch((error) => {
    console.log('Service Worker registration failed:', error);
  });
}
