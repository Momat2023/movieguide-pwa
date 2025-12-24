import './style.css'
import { auth, loginWithGoogle, logout } from './firebase.js'
import { onAuthStateChanged } from 'firebase/auth'
import { GamificationManager } from './gamification.js'

const API_KEY = '904812e78d331be964b64b4e270697ed';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
let watchedMovies = JSON.parse(localStorage.getItem('watchedMovies')) || [];
let deferredPrompt;
let currentUser = null;
let currentFilter = 'all';
let currentSort = 'recent';

// Initialiser le système de gamification
const gamification = new GamificationManager();

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

// Badges
function displayBadges() {
  const container = document.getElementById('badgesContent');
  container.innerHTML = gamification.renderBadgesPage();
}

// Global functions for onclick handlers
window.removeFromWatchlist = removeFromWatchlist;
window.removeFromWatched = removeFromWatched;

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

