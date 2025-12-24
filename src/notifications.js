// Push Notifications System
export class NotificationManager {
  constructor() {
    this.permission = Notification.permission;
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    this.scheduledNotifications = this.loadScheduled();
  }

  loadScheduled() {
    return JSON.parse(localStorage.getItem('scheduled_notifications') || '[]');
  }

  saveScheduled() {
    localStorage.setItem('scheduled_notifications', JSON.stringify(this.scheduledNotifications));
  }

  async requestPermission() {
    if (!this.isSupported) {
      console.log('Notifications not supported');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    }

    return false;
  }

  async showNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      console.log('Permission not granted');
      return;
    }

    const defaultOptions = {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [200, 100, 200],
      tag: 'cinetrack-notification',
      requireInteraction: false,
      ...options
    };

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, defaultOptions);
      } else {
        new Notification(title, defaultOptions);
      }
      
      this.saveNotificationStat(title, options.body);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  saveNotificationStat(title, body) {
    const stats = JSON.parse(localStorage.getItem('notification_stats') || '{}');
    const today = new Date().toDateString();
    
    if (!stats[today]) {
      stats[today] = { count: 0, types: {} };
    }
    
    stats[today].count++;
    const type = title.split(' ')[0];
    stats[today].types[type] = (stats[today].types[type] || 0) + 1;
    
    localStorage.setItem('notification_stats', JSON.stringify(stats));
  }

  // Notification contextuelle : Film ajouté récemment dans watchlist
  scheduleWatchlistReminder(movie, hoursDelay = 24) {
    const scheduledTime = Date.now() + (hoursDelay * 60 * 60 * 1000);
    
    this.scheduledNotifications.push({
      id: `watchlist_${movie.id}`,
      type: 'watchlist_reminder',
      movie,
      scheduledTime,
      title: '📋 Film en attente !',
      body: `"${movie.title}" attend toujours dans votre watchlist. C'est le moment ?`,
      data: { movieId: movie.id, type: movie.type }
    });
    
    this.saveScheduled();
  }

  // Notification : Encouragement streak
  scheduleStreakReminder() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(20, 0, 0, 0); // 20h le lendemain
    
    const stats = JSON.parse(localStorage.getItem('cinetrack_stats') || '{}');
    const streak = stats.currentStreak || 0;
    
    if (streak > 0) {
      this.scheduledNotifications.push({
        id: 'streak_reminder',
        type: 'streak',
        scheduledTime: tomorrow.getTime(),
        title: `🔥 Streak de ${streak} jours !`,
        body: `Ne cassez pas votre série ! Ajoutez un film aujourd'hui.`,
        data: { streak }
      });
      
      this.saveScheduled();
    }
  }

  // Notification : Nouveau film populaire dans le genre préféré
  notifyTrendingMatch(movie, userGenres) {
    const movieGenres = movie.genre_ids || [];
    const hasMatch = movieGenres.some(g => userGenres.includes(g));
    
    if (hasMatch) {
      this.showNotification('🔥 Nouveau film tendance !', {
        body: `"${movie.title || movie.name}" cartonne en ce moment. Note : ${movie.vote_average}/10`,
        icon: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : '/pwa-192x192.png',
        data: { movieId: movie.id, type: movie.media_type || 'movie' },
        actions: [
          { action: 'view', title: '👀 Voir', icon: '/pwa-192x192.png' },
          { action: 'dismiss', title: 'Plus tard', icon: '/pwa-192x192.png' }
        ]
      });
    }
  }

  // Notification : Rappel film non terminé
  notifyIncompleteWatch(movie) {
    this.showNotification('📺 Film en pause', {
      body: `Vous n'avez pas terminé "${movie.title}". Envie de continuer ?`,
      tag: 'incomplete-watch',
      data: { movieId: movie.id, type: movie.type }
    });
  }

  // Notification : Recommandation basée sur l'heure
  notifyTimeBasedRecommendation(hour) {
    let title, body, mood;
    
    if (hour >= 6 && hour < 12) {
      title = '☀️ Bon matin !';
      body = 'Commencez la journée avec un documentaire inspirant ?';
      mood = 'morning';
    } else if (hour >= 12 && hour < 18) {
      title = '🌤️ Bon après-midi !';
      body = 'Une comédie légère pour votre pause ?';
      mood = 'afternoon';
    } else if (hour >= 18 && hour < 22) {
      title = '�� Bonsoir !';
      body = 'C\'est l\'heure du film en famille ou entre amis !';
      mood = 'evening';
    } else {
      title = '🌙 Soirée cinéma ?';
      body = 'Un thriller ou un film d\'action pour finir la journée ?';
      mood = 'night';
    }
    
    this.showNotification(title, {
      body,
      tag: 'time-based-recommendation',
      data: { mood, hour },
      actions: [
        { action: 'quiz', title: '🎭 Mood Quiz', icon: '/pwa-192x192.png' },
        { action: 'browse', title: '🔍 Explorer', icon: '/pwa-192x192.png' }
      ]
    });
  }

  // Notification : Ami a regardé un film
  notifySocialActivity(friendName, movie) {
    this.showNotification('👥 Activité d\'ami', {
      body: `${friendName} a regardé "${movie.title}". Ça vous tente aussi ?`,
      tag: 'social-activity',
      data: { movieId: movie.id, type: movie.type }
    });
  }

  // Notification : Rappel quiz non fait depuis X jours
  notifyQuizReminder(daysSinceLastQuiz) {
    if (daysSinceLastQuiz >= 7) {
      this.showNotification('🎭 Quiz Mood Matcher', {
        body: `Cela fait ${daysSinceLastQuiz} jours ! Découvrez votre film parfait.`,
        tag: 'quiz-reminder',
        data: { action: 'quiz' }
      });
    }
  }

  // Notification : Badge débloqué
  notifyBadgeUnlocked(badge) {
    this.showNotification('🏆 Badge débloqué !', {
      body: `Félicitations ! Vous avez obtenu : ${badge.name}`,
      icon: '/pwa-512x512.png',
      tag: 'badge-unlocked',
      requireInteraction: true,
      data: { badge: badge.id }
    });
  }

  // Notification : Film de votre watchlist maintenant disponible
  notifyMovieAvailable(movie, platform) {
    this.showNotification('🎬 Film disponible !', {
      body: `"${movie.title}" est maintenant sur ${platform}`,
      tag: 'movie-available',
      data: { movieId: movie.id }
    });
  }

  // Vérifier et envoyer les notifications planifiées
  checkScheduledNotifications() {
    const now = Date.now();
    const toSend = this.scheduledNotifications.filter(n => n.scheduledTime <= now);
    
    toSend.forEach(notif => {
      this.showNotification(notif.title, {
        body: notif.body,
        tag: notif.type,
        data: notif.data
      });
    });
    
    // Supprimer les notifications envoyées
    this.scheduledNotifications = this.scheduledNotifications.filter(n => n.scheduledTime > now);
    this.saveScheduled();
  }

  // Analyser le comportement pour notifications intelligentes
  analyzeUserBehavior() {
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    const watchedMovies = JSON.parse(localStorage.getItem('watchedMovies') || '[]');
    const stats = JSON.parse(localStorage.getItem('cinetrack_stats') || '{}');
    const lastVisit = localStorage.getItem('last_visit');
    const now = Date.now();
    
    // Si dernière visite > 3 jours
    if (lastVisit) {
      const daysSinceVisit = (now - parseInt(lastVisit)) / (1000 * 60 * 60 * 24);
      
      if (daysSinceVisit >= 3 && daysSinceVisit < 7) {
        this.showNotification('😢 Vous nous manquez !', {
          body: `${watchlist.length} films vous attendent dans votre watchlist.`,
          tag: 'reengagement'
        });
      }
    }
    
    // Si watchlist > 10 films et aucun film vu depuis 7 jours
    if (watchlist.length > 10) {
      const lastWatched = watchedMovies[0]?.watchedAt;
      if (lastWatched) {
        const daysSinceWatch = (now - new Date(lastWatched).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceWatch >= 7) {
          this.showNotification('📋 Watchlist débordante !', {
            body: `${watchlist.length} films en attente. Commencez par le plus ancien ?`,
            tag: 'watchlist-full'
          });
        }
      }
    }
    
    // Rappel streak
    if (stats.currentStreak >= 3) {
      this.scheduleStreakReminder();
    }
    
    // Mise à jour dernière visite
    localStorage.setItem('last_visit', now.toString());
  }

  // Notification d'engagement initial
  async showWelcomeNotification() {
    const hasShown = localStorage.getItem('welcome_notification_shown');
    if (!hasShown) {
      await this.showNotification('🎬 Bienvenue sur CineTrack !', {
        body: 'Activez les notifications pour ne rien manquer : nouveaux films, rappels, badges...',
        tag: 'welcome',
        requireInteraction: true
      });
      localStorage.setItem('welcome_notification_shown', 'true');
    }
  }

  // Désactiver les notifications
  disableNotifications() {
    localStorage.setItem('notifications_disabled', 'true');
    this.scheduledNotifications = [];
    this.saveScheduled();
  }

  // Réactiver les notifications
  enableNotifications() {
    localStorage.removeItem('notifications_disabled');
  }

  isEnabled() {
    return !localStorage.getItem('notifications_disabled') && this.permission === 'granted';
  }

  // Stats d'engagement
  getEngagementStats() {
    const stats = JSON.parse(localStorage.getItem('notification_stats') || '{}');
    const total = Object.values(stats).reduce((sum, day) => sum + day.count, 0);
    const lastSevenDays = Object.entries(stats)
      .slice(-7)
      .reduce((sum, [, day]) => sum + day.count, 0);
    
    return { total, lastSevenDays, byDay: stats };
  }
}

// Gérer les actions sur les notifications (service worker)
export function handleNotificationClick(event) {
  event.notification.close();
  
  const data = event.notification.data;
  const action = event.action;
  
  let url = '/';
  
  if (action === 'view' && data.movieId) {
    url = `/?movie=${data.movieId}&type=${data.type}`;
  } else if (action === 'quiz') {
    url = '/?quiz=true';
  } else if (action === 'browse') {
    url = '/?section=trending';
  } else if (data.movieId) {
    url = `/?movie=${data.movieId}&type=${data.type}`;
  }
  
  event.waitUntil(
    clients.openWindow(url)
  );
}
