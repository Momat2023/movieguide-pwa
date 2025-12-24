import './style.css'
import { auth, loginWithGoogle, logout } from './firebase.js'
import { onAuthStateChanged } from 'firebase/auth'

const API_KEY = '904812e78d331be964b64b4e270697ed';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
let deferredPrompt;
let currentUser = null;

// PWA Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('installPrompt').style.display = 'block';
});

document.getElementById('installBtn')?.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response: ${outcome}`);
    deferredPrompt = null;
    document.getElementById('installPrompt').style.display = 'none';
  }
});

document.getElementById('dismissBtn')?.addEventListener('click', () => {
  document.getElementById('installPrompt').style.display = 'none';
});

// Auth State
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateAuthButton();
});

function updateAuthButton() {
  const authBtn = document.getElementById('authBtn');
  if (currentUser) {
    authBtn.textContent = '👤 ' + currentUser.displayName?.split(' ')[0] || 'Mon Compte';
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

document.getElementById('searchInput').addEventListener('input', (e) => {
  const query = e.target.value.trim();
  if (query.length > 2) {
    searchMovies(query);
  } else if (query.length === 0) {
    document.getElementById('searchResults').innerHTML = '';
  }
});

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
    const title = movie.title || movie.name;
    const releaseDate = movie.release_date || movie.first_air_date || 'Date inconnue';
    const overview = movie.overview || 'Aucune description disponible';
    
    modalBody.innerHTML = `
      ${movie.backdrop_path ? `<img src="${IMG_URL}${movie.backdrop_path}" class="modal-backdrop" alt="${title}">` : ''}
      <h2>${title}</h2>
      <p><strong>⭐ ${movie.vote_average?.toFixed(1) || 'N/A'}/10</strong> | 📅 ${releaseDate}</p>
      <p style="margin:1.5rem 0; line-height:1.6;">${overview}</p>
      ${movie.genres ? `<p><strong>Genres:</strong> ${movie.genres.map(g => g.name).join(', ')}</p>` : ''}
      <button id="addToWatchlist" style="margin-top:1.5rem; font-size:1rem;">
        ${isInWatchlist ? '✅ Dans ma liste' : '➕ Ajouter à ma liste'}
      </button>
    `;
    
    document.getElementById('addToWatchlist').addEventListener('click', () => {
      addToWatchlist({
        id: movie.id,
        title: title,
        poster: movie.poster_path,
        rating: movie.vote_average || 0,
        type: type
      });
      
      document.getElementById('addToWatchlist').textContent = '✅ Dans ma liste';
      document.getElementById('addToWatchlist').disabled = true;
    });
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
    
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
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
  
  watchlist.reverse().forEach(movie => {
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
    container.appendChild(card);
  });
}

function updateWatchlistCount() {
  document.getElementById('watchlistCount').textContent = watchlist.length;
}

window.removeFromWatchlist = removeFromWatchlist;

// Initialize
fetchTrending();
updateWatchlistCount();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(() => {
    console.log('✅ Service Worker registered');
  });
}

