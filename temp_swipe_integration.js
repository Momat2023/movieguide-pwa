// Ajoutez cet import en haut du fichier
import { SwipeMatcher } from './swipe-matcher.js'

// Après const notificationManager
const swipeMatcher = new SwipeMatcher(API_KEY);

// Ajouter la navigation
document.getElementById('swipeBtn').addEventListener('click', () => {
  toggleSection('swipe-section');
  startSwipeMode();
});

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

