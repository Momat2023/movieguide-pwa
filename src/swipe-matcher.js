// CineMatch - Tinder-Style Swipe System
export class SwipeMatcher {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.BASE_URL = 'https://api.themoviedb.org/3';
    this.IMG_URL = 'https://image.tmdb.org/t/p/w500';
    this.currentIndex = 0;
    this.movies = [];
    this.preferences = this.loadPreferences();
    this.swipeHistory = this.loadSwipeHistory();
    this.currentMovie = null;
    this.isAnimating = false;
  }

  loadPreferences() {
    const saved = localStorage.getItem('swipe_preferences');
    return saved ? JSON.parse(saved) : {
      likedGenres: {},
      dislikedGenres: {},
      likedActors: [],
      avgRatingLiked: 0,
      totalSwipes: 0,
      totalLikes: 0,
      totalDislikes: 0
    };
  }

  savePreferences() {
    localStorage.setItem('swipe_preferences', JSON.stringify(this.preferences));
  }

  loadSwipeHistory() {
    const saved = localStorage.getItem('swipe_history');
    return saved ? JSON.parse(saved) : [];
  }

  saveSwipeHistory() {
    // Garder seulement les 100 derniers swipes
    if (this.swipeHistory.length > 100) {
      this.swipeHistory = this.swipeHistory.slice(-100);
    }
    localStorage.setItem('swipe_history', JSON.stringify(this.swipeHistory));
  }

  async loadMovies(page = 1) {
    try {
      // Charger des films populaires variés
      const response = await fetch(
        `${this.BASE_URL}/movie/popular?api_key=${this.apiKey}&language=fr-FR&page=${page}`
      );
      const data = await response.json();
      
      // Filtrer les films déjà swipés
      const newMovies = data.results.filter(movie => 
        !this.swipeHistory.some(h => h.movieId === movie.id) &&
        movie.poster_path
      );
      
      this.movies = [...this.movies, ...newMovies];
      
      if (this.movies.length < 10 && page < 5) {
        await this.loadMovies(page + 1);
      }
      
      return this.movies.length > 0;
    } catch (error) {
      console.error('Error loading movies:', error);
      return false;
    }
  }

  getCurrentMovie() {
    if (this.currentIndex >= this.movies.length) {
      return null;
    }
    this.currentMovie = this.movies[this.currentIndex];
    return this.currentMovie;
  }

  getNextMovie() {
    this.currentIndex++;
    return this.getCurrentMovie();
  }

  async handleSwipe(direction) {
    if (!this.currentMovie || this.isAnimating) return;
    
    this.isAnimating = true;
    const isLike = direction === 'right';
    
    // Enregistrer le swipe
    this.swipeHistory.push({
      movieId: this.currentMovie.id,
      title: this.currentMovie.title,
      poster: this.currentMovie.poster_path,
      liked: isLike,
      timestamp: new Date().toISOString(),
      genres: this.currentMovie.genre_ids || []
    });
    
    // Mettre à jour les préférences
    this.updatePreferences(this.currentMovie, isLike);
    
    this.preferences.totalSwipes++;
    if (isLike) {
      this.preferences.totalLikes++;
    } else {
      this.preferences.totalDislikes++;
    }
    
    this.savePreferences();
    this.saveSwipeHistory();
    
    // Passer au film suivant
    const nextMovie = this.getNextMovie();
    
    // Si plus de films, recharger
    if (!nextMovie) {
      await this.loadMovies(Math.floor(Math.random() * 10) + 1);
    }
    
    setTimeout(() => {
      this.isAnimating = false;
    }, 300);
    
    return isLike;
  }

  updatePreferences(movie, liked) {
    const genres = movie.genre_ids || [];
    const rating = movie.vote_average || 0;
    
    genres.forEach(genreId => {
      if (liked) {
        this.preferences.likedGenres[genreId] = 
          (this.preferences.likedGenres[genreId] || 0) + 1;
      } else {
        this.preferences.dislikedGenres[genreId] = 
          (this.preferences.dislikedGenres[genreId] || 0) + 1;
      }
    });
    
    // Moyenne des notes aimées
    if (liked) {
      const currentAvg = this.preferences.avgRatingLiked || 0;
      const totalLiked = this.preferences.totalLikes || 0;
      this.preferences.avgRatingLiked = 
        (currentAvg * totalLiked + rating) / (totalLiked + 1);
    }
  }

  getTasteProfile() {
    const totalSwipes = this.preferences.totalSwipes;
    if (totalSwipes === 0) {
      return null;
    }
    
    // Trouver les genres préférés
    const topGenres = Object.entries(this.preferences.likedGenres)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genreId, count]) => ({
        id: parseInt(genreId),
        count,
        percentage: Math.round((count / this.preferences.totalLikes) * 100)
      }));
    
    // Taux d'acceptation
    const likeRate = Math.round((this.preferences.totalLikes / totalSwipes) * 100);
    
    // Profil de personnalité basé sur les swipes
    let personality = this.determinePersonality(likeRate, topGenres);
    
    return {
      personality,
      likeRate,
      totalSwipes,
      topGenres,
      avgRating: this.preferences.avgRatingLiked.toFixed(1),
      selectivity: this.getSelectivityLevel(likeRate)
    };
  }

  determinePersonality(likeRate, topGenres) {
    if (likeRate > 70) {
      return { type: 'Optimiste', emoji: '😊', description: 'Vous aimez presque tout !' };
    } else if (likeRate > 50) {
      return { type: 'Équilibré', emoji: '😌', description: 'Vous savez ce que vous voulez' };
    } else if (likeRate > 30) {
      return { type: 'Sélectif', emoji: '🤔', description: 'Vous avez des goûts précis' };
    } else {
      return { type: 'Exigeant', emoji: '👑', description: 'Seuls les meilleurs vous satisfont' };
    }
  }

  getSelectivityLevel(likeRate) {
    if (likeRate > 70) return 'Facile à plaire';
    if (likeRate > 50) return 'Modéré';
    if (likeRate > 30) return 'Difficile';
    return 'Très exigeant';
  }

  async getRecommendations() {
    const profile = this.getTasteProfile();
    if (!profile || profile.topGenres.length === 0) {
      return null;
    }
    
    const topGenreIds = profile.topGenres.map(g => g.id).join(',');
    
    try {
      const response = await fetch(
        `${this.BASE_URL}/discover/movie?api_key=${this.apiKey}&language=fr-FR&sort_by=vote_average.desc&with_genres=${topGenreIds}&vote_count.gte=100&page=1`
      );
      const data = await response.json();
      
      return data.results.slice(0, 10);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return null;
    }
  }

  getLikedMovies() {
    return this.swipeHistory.filter(s => s.liked);
  }

  getDislikedMovies() {
    return this.swipeHistory.filter(s => !s.liked);
  }

  resetPreferences() {
    this.preferences = {
      likedGenres: {},
      dislikedGenres: {},
      likedActors: [],
      avgRatingLiked: 0,
      totalSwipes: 0,
      totalLikes: 0,
      totalDislikes: 0
    };
    this.swipeHistory = [];
    this.savePreferences();
    this.saveSwipeHistory();
  }

  getGenreName(genreId) {
    const genres = {
      28: 'Action',
      12: 'Aventure',
      16: 'Animation',
      35: 'Comédie',
      80: 'Crime',
      99: 'Documentaire',
      18: 'Drame',
      10751: 'Famille',
      14: 'Fantasy',
      36: 'Histoire',
      27: 'Horreur',
      10402: 'Musique',
      9648: 'Mystère',
      10749: 'Romance',
      878: 'Science-Fiction',
      10770: 'Téléfilm',
      53: 'Thriller',
      10752: 'Guerre',
      37: 'Western'
    };
    return genres[genreId] || 'Inconnu';
  }
}
