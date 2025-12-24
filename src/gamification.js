// Gamification System - Streaks & Badges
export class GamificationManager {
  constructor() {
    this.badges = this.initBadges();
    this.stats = this.loadStats();
    this.checkDailyStreak();
  }

  initBadges() {
    return [
      { id: 'first_movie', name: '🎬 Premier Film', description: 'Ajouter votre premier film', requirement: 1, type: 'watchlist', earned: false },
      { id: 'collector', name: '📚 Collectionneur', description: '10 films dans votre watchlist', requirement: 10, type: 'watchlist', earned: false },
      { id: 'cinephile', name: '🎭 Cinéphile', description: '50 films dans votre watchlist', requirement: 50, type: 'watchlist', earned: false },
      { id: 'legend', name: '👑 Légende', description: '100 films dans votre watchlist', requirement: 100, type: 'watchlist', earned: false },
      
      { id: 'first_watch', name: '👀 Premier Visionnage', description: 'Marquer un film comme vu', requirement: 1, type: 'watched', earned: false },
      { id: 'marathon', name: '🏃 Marathonien', description: 'Regarder 5 films en une journée', requirement: 5, type: 'daily_watch', earned: false },
      { id: 'night_owl', name: '🌙 Noctambule', description: 'Ajouter un film après minuit', requirement: 1, type: 'night', earned: false },
      
      { id: 'streak_3', name: '🔥 En Feu', description: '3 jours consécutifs', requirement: 3, type: 'streak', earned: false },
      { id: 'streak_7', name: '⚡ Inarrêtable', description: '7 jours consécutifs', requirement: 7, type: 'streak', earned: false },
      { id: 'streak_30', name: '💎 Diamant', description: '30 jours consécutifs', requirement: 30, type: 'streak', earned: false },
      { id: 'streak_100', name: '🏆 Légende Absolue', description: '100 jours consécutifs', requirement: 100, type: 'streak', earned: false },
      
      { id: 'genre_action', name: '💥 Fan d\'Action', description: '10 films d\'action', requirement: 10, type: 'genre_28', earned: false },
      { id: 'genre_comedy', name: '😂 Rigolo', description: '10 comédies', requirement: 10, type: 'genre_35', earned: false },
      { id: 'genre_horror', name: '👻 Sans Peur', description: '10 films d\'horreur', requirement: 10, type: 'genre_27', earned: false },
    ];
  }

  loadStats() {
    const defaultStats = {
      totalWatchlist: 0,
      totalWatched: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActivity: null,
      todayWatched: 0,
      lastWatchDate: null,
      earnedBadges: [],
      genreCounts: {}
    };
    
    const saved = localStorage.getItem('cinetrack_stats');
    return saved ? { ...defaultStats, ...JSON.parse(saved) } : defaultStats;
  }

  saveStats() {
    localStorage.setItem('cinetrack_stats', JSON.stringify(this.stats));
    this.updateUI();
  }

  checkDailyStreak() {
    const today = new Date().toDateString();
    const lastActivity = this.stats.lastActivity;
    
    if (!lastActivity) return;
    
    const lastDate = new Date(lastActivity);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Si dernière activité était hier, on continue le streak
    if (lastDate.toDateString() === yesterday.toDateString()) {
      // Streak continue
    } 
    // Si dernière activité était aujourd'hui, rien à faire
    else if (lastDate.toDateString() === today) {
      // Déjà actif aujourd'hui
    }
    // Sinon, le streak est cassé
    else {
      this.stats.currentStreak = 0;
      this.saveStats();
      this.showNotification('💔 Streak cassé ! Recommencez aujourd\'hui.', 'warning');
    }
  }

  recordActivity() {
    const today = new Date().toDateString();
    const lastActivity = this.stats.lastActivity;
    
    if (lastActivity === today) {
      // Déjà enregistré aujourd'hui
      return;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastActivity && new Date(lastActivity).toDateString() === yesterday.toDateString()) {
      // Streak continue
      this.stats.currentStreak++;
    } else {
      // Nouveau streak ou streak cassé
      this.stats.currentStreak = 1;
    }
    
    if (this.stats.currentStreak > this.stats.longestStreak) {
      this.stats.longestStreak = this.stats.currentStreak;
    }
    
    this.stats.lastActivity = today;
    this.checkStreakBadges();
    this.saveStats();
    
    // Vibration feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
  }

  addToWatchlist(movieId, genres = []) {
    this.stats.totalWatchlist++;
    
    // Compter les genres
    genres.forEach(genreId => {
      const key = `genre_${genreId}`;
      this.stats.genreCounts[key] = (this.stats.genreCounts[key] || 0) + 1;
    });
    
    this.recordActivity();
    this.checkBadge('first_movie', this.stats.totalWatchlist);
    this.checkBadge('collector', this.stats.totalWatchlist);
    this.checkBadge('cinephile', this.stats.totalWatchlist);
    this.checkBadge('legend', this.stats.totalWatchlist);
    this.checkGenreBadges();
    this.checkNightOwlBadge();
    this.saveStats();
  }

  markAsWatched() {
    this.stats.totalWatched++;
    
    const today = new Date().toDateString();
    if (this.stats.lastWatchDate !== today) {
      this.stats.todayWatched = 1;
      this.stats.lastWatchDate = today;
    } else {
      this.stats.todayWatched++;
    }
    
    this.recordActivity();
    this.checkBadge('first_watch', this.stats.totalWatched);
    this.checkBadge('marathon', this.stats.todayWatched);
    this.saveStats();
  }

  checkBadge(badgeId, currentValue) {
    const badge = this.badges.find(b => b.id === badgeId);
    if (!badge || badge.earned) return;
    
    if (currentValue >= badge.requirement) {
      this.unlockBadge(badge);
    }
  }

  checkStreakBadges() {
    ['streak_3', 'streak_7', 'streak_30', 'streak_100'].forEach(badgeId => {
      this.checkBadge(badgeId, this.stats.currentStreak);
    });
  }

  checkGenreBadges() {
    Object.keys(this.stats.genreCounts).forEach(genreKey => {
      const count = this.stats.genreCounts[genreKey];
      const badgeId = `genre_${genreKey.split('_')[1]}`;
      const badge = this.badges.find(b => b.id.includes(badgeId));
      if (badge) {
        this.checkBadge(badge.id, count);
      }
    });
  }

  checkNightOwlBadge() {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 6) {
      this.unlockBadge(this.badges.find(b => b.id === 'night_owl'));
    }
  }

  unlockBadge(badge) {
    if (!badge || badge.earned || this.stats.earnedBadges.includes(badge.id)) return;
    
    badge.earned = true;
    this.stats.earnedBadges.push(badge.id);
    this.saveStats();
    this.showBadgeUnlock(badge);
  }

  showBadgeUnlock(badge) {
    const notification = document.createElement('div');
    notification.className = 'badge-unlock-notification';
    notification.innerHTML = `
      <div class="badge-unlock-content">
        <div class="badge-icon">${badge.name.split(' ')[0]}</div>
        <div class="badge-info">
          <h3>Badge Débloqué !</h3>
          <p><strong>${badge.name}</strong></p>
          <p class="badge-desc">${badge.description}</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Son de notification (si possible)
    this.playUnlockSound();
    
    // Vibration
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }
    
    // Retirer après 5 secondes
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 500);
    }, 5000);
  }

  playUnlockSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not supported');
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `streak-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }

  getEarnedBadges() {
    return this.badges.filter(b => this.stats.earnedBadges.includes(b.id));
  }

  getProgress() {
    const total = this.badges.length;
    const earned = this.stats.earnedBadges.length;
    return {
      earned,
      total,
      percentage: Math.round((earned / total) * 100)
    };
  }

  updateUI() {
    // Mettre à jour le compteur de streak dans la navbar
    const streakDisplay = document.getElementById('streakDisplay');
    if (streakDisplay) {
      streakDisplay.innerHTML = `🔥 ${this.stats.currentStreak}`;
      
      if (this.stats.currentStreak >= 7) {
        streakDisplay.classList.add('hot-streak');
      } else {
        streakDisplay.classList.remove('hot-streak');
      }
    }
    
    // Mettre à jour le badge count
    const badgeCount = document.getElementById('badgeCount');
    if (badgeCount) {
      const progress = this.getProgress();
      badgeCount.textContent = `${progress.earned}/${progress.total}`;
    }
  }

  renderBadgesPage() {
    const progress = this.getProgress();
    const earned = this.getEarnedBadges();
    const locked = this.badges.filter(b => !this.stats.earnedBadges.includes(b.id));
    
    return `
      <div class="badges-container">
        <div class="badges-header">
          <h2>🏆 Badges & Réalisations</h2>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress.percentage}%"></div>
          </div>
          <p class="progress-text">${progress.earned}/${progress.total} badges débloqués (${progress.percentage}%)</p>
        </div>
        
        <div class="streak-info">
          <div class="stat-card">
            <div class="stat-icon">🔥</div>
            <div class="stat-content">
              <h3>${this.stats.currentStreak}</h3>
              <p>Streak Actuel</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">⚡</div>
            <div class="stat-content">
              <h3>${this.stats.longestStreak}</h3>
              <p>Record Streak</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📋</div>
            <div class="stat-content">
              <h3>${this.stats.totalWatchlist}</h3>
              <p>Films Ajoutés</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <h3>${this.stats.totalWatched}</h3>
              <p>Films Vus</p>
            </div>
          </div>
        </div>
        
        <div class="badges-section">
          <h3>✨ Badges Débloqués</h3>
          <div class="badges-grid">
            ${earned.length > 0 ? earned.map(b => `
              <div class="badge-card earned">
                <div class="badge-emoji">${b.name.split(' ')[0]}</div>
                <div class="badge-name">${b.name.substring(2)}</div>
                <div class="badge-description">${b.description}</div>
              </div>
            `).join('') : '<p class="no-badges">Aucun badge débloqué pour le moment</p>'}
          </div>
        </div>
        
        <div class="badges-section">
          <h3>🔒 Badges à Débloquer</h3>
          <div class="badges-grid">
            ${locked.map(b => `
              <div class="badge-card locked">
                <div class="badge-emoji">🔒</div>
                <div class="badge-name">${b.name.substring(2)}</div>
                <div class="badge-description">${b.description}</div>
                ${this.getBadgeProgress(b)}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  getBadgeProgress(badge) {
    let current = 0;
    
    switch(badge.type) {
      case 'watchlist':
        current = this.stats.totalWatchlist;
        break;
      case 'watched':
        current = this.stats.totalWatched;
        break;
      case 'streak':
        current = this.stats.currentStreak;
        break;
      case 'daily_watch':
        current = this.stats.todayWatched;
        break;
      default:
        if (badge.type.startsWith('genre_')) {
          const genreKey = badge.type;
          current = this.stats.genreCounts[genreKey] || 0;
        }
    }
    
    const percentage = Math.min((current / badge.requirement) * 100, 100);
    
    return `
      <div class="badge-progress">
        <div class="badge-progress-bar">
          <div class="badge-progress-fill" style="width: ${percentage}%"></div>
        </div>
        <span class="badge-progress-text">${current}/${badge.requirement}</span>
      </div>
    `;
  }
}

