// Mood Matcher Quiz System
export class MoodMatcher {
  constructor() {
    this.currentQuestion = 0;
    this.answers = {};
    this.questions = [
      {
        id: 'mood',
        question: '🎭 Quelle est votre humeur ?',
        emoji: '😊',
        options: [
          { value: 'happy', label: '😊 Joyeux', genres: [35, 10751, 16] }, // Comédie, Famille, Animation
          { value: 'sad', label: '😢 Triste', genres: [18, 10749] }, // Drame, Romance
          { value: 'stressed', label: '😰 Stressé', genres: [35, 10402, 99] }, // Comédie, Musique, Documentaire
          { value: 'excited', label: '🤩 Excité', genres: [28, 12, 878] }, // Action, Aventure, SF
          { value: 'scared', label: '😱 Envie de frissons', genres: [27, 53] }, // Horreur, Thriller
          { value: 'romantic', label: '💕 Romantique', genres: [10749, 35, 18] } // Romance, Comédie, Drame
        ]
      },
      {
        id: 'energy',
        question: '⚡ Votre niveau d\'énergie ?',
        emoji: '🔋',
        options: [
          { value: 'high', label: '🚀 Plein d\'énergie', intensity: 'high' },
          { value: 'medium', label: '😌 Posé', intensity: 'medium' },
          { value: 'low', label: '😴 Fatigué', intensity: 'low' },
          { value: 'chill', label: '🛋️ Mode relax', intensity: 'chill' }
        ]
      },
      {
        id: 'duration',
        question: '⏰ Combien de temps ?',
        emoji: '⏱️',
        options: [
          { value: 'short', label: '⚡ Court (< 90min)', maxRuntime: 90 },
          { value: 'medium', label: '🎬 Normal (90-120min)', maxRuntime: 120 },
          { value: 'long', label: '🍿 Long (> 120min)', maxRuntime: 300 },
          { value: 'series', label: '📺 Série (épisodes)', type: 'tv' }
        ]
      },
      {
        id: 'company',
        question: '👥 Vous regardez ?',
        emoji: '🎭',
        options: [
          { value: 'alone', label: '�� Seul(e)', audience: 'solo' },
          { value: 'couple', label: '💑 En couple', audience: 'couple' },
          { value: 'friends', label: '👯 Entre amis', audience: 'group' },
          { value: 'family', label: '👨‍👩‍👧‍👦 En famille', genres: [10751, 16, 12] } // Famille, Animation, Aventure
        ]
      },
      {
        id: 'genre',
        question: '🎨 Préférence de genre ?',
        emoji: '🎪',
        options: [
          { value: 'action', label: '💥 Action/Aventure', genres: [28, 12] },
          { value: 'comedy', label: '😂 Comédie', genres: [35] },
          { value: 'drama', label: '🎭 Drame', genres: [18] },
          { value: 'scifi', label: '🚀 SF/Fantasy', genres: [878, 14] },
          { value: 'horror', label: '👻 Horreur/Thriller', genres: [27, 53] },
          { value: 'surprise', label: '🎲 Surprise-moi !', genres: [] }
        ]
      }
    ];
  }

  getQuestion(index) {
    return this.questions[index];
  }

  getTotalQuestions() {
    return this.questions.length;
  }

  answerQuestion(questionId, optionValue) {
    const question = this.questions.find(q => q.id === questionId);
    const option = question.options.find(o => o.value === optionValue);
    this.answers[questionId] = option;
    this.currentQuestion++;
  }

  async getRecommendation(apiKey) {
    // Analyser les réponses
    const moodAnswer = this.answers.mood;
    const energyAnswer = this.answers.energy;
    const durationAnswer = this.answers.duration;
    const companyAnswer = this.answers.company;
    const genreAnswer = this.answers.genre;

    // Construire les genres prioritaires
    let genreIds = [];
    
    if (moodAnswer && moodAnswer.genres) {
      genreIds.push(...moodAnswer.genres);
    }
    
    if (companyAnswer && companyAnswer.genres) {
      genreIds.push(...companyAnswer.genres);
    }
    
    if (genreAnswer && genreAnswer.genres && genreAnswer.genres.length > 0) {
      genreIds = genreAnswer.genres; // Override avec le genre choisi
    }

    // Supprimer les doublons
    genreIds = [...new Set(genreIds)];

    // Type de contenu (film ou série)
    const mediaType = durationAnswer.type === 'tv' ? 'tv' : 'movie';

    // Construire l'URL de recherche TMDB
    const BASE_URL = 'https://api.themoviedb.org/3';
    const genreParam = genreIds.length > 0 ? `&with_genres=${genreIds.join(',')}` : '';
    const sortParam = energyAnswer.intensity === 'high' ? 'popularity.desc' : 'vote_average.desc';
    
    try {
      const url = `${BASE_URL}/discover/${mediaType}?api_key=${apiKey}&language=fr-FR&sort_by=${sortParam}${genreParam}&vote_count.gte=100&page=1`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Filtrer par durée si c'est un film
        let filtered = data.results;
        if (mediaType === 'movie' && durationAnswer.maxRuntime) {
          filtered = filtered.filter(m => !m.runtime || m.runtime <= durationAnswer.maxRuntime);
        }
        
        // Choisir un film aléatoire parmi les 10 premiers
        const randomIndex = Math.floor(Math.random() * Math.min(10, filtered.length));
        const movie = filtered[randomIndex] || data.results[0];
        
        return {
          movie,
          profile: this.generateProfile(),
          mediaType
        };
      } else {
        throw new Error('Aucun résultat');
      }
    } catch (error) {
      console.error('Erreur recommandation:', error);
      return null;
    }
  }

  generateProfile() {
    const moodLabel = this.answers.mood.label.split(' ')[1];
    const energyLabel = this.answers.energy.label.split(' ')[1];
    const genreLabel = this.answers.genre.label.split(' ')[1] || 'Éclectique';
    
    const profiles = [
      { type: 'Action Hero', emoji: '🦸', description: 'Toujours prêt pour l\'action' },
      { type: 'Romantic Dreamer', emoji: '💕', description: 'Âme sensible en quête d\'amour' },
      { type: 'Comedy Lover', emoji: '😂', description: 'Le rire avant tout' },
      { type: 'Thriller Seeker', emoji: '🔍', description: 'Amateur de suspense' },
      { type: 'Fantasy Explorer', emoji: '🧙', description: 'Voyageur des mondes imaginaires' },
      { type: 'Drama Enthusiast', emoji: '🎭', description: 'Passionné d\'émotions fortes' },
      { type: 'Horror Brave', emoji: '👻', description: 'Sans peur face à l\'horreur' },
      { type: 'Chill Watcher', emoji: '😌', description: 'Spectateur décontracté' }
    ];
    
    // Sélectionner un profil basé sur les réponses
    let selectedProfile = profiles[Math.floor(Math.random() * profiles.length)];
    
    if (this.answers.mood.value === 'romantic') {
      selectedProfile = profiles[1];
    } else if (this.answers.mood.value === 'excited') {
      selectedProfile = profiles[0];
    } else if (this.answers.mood.value === 'scared') {
      selectedProfile = profiles[6];
    } else if (this.answers.energy.intensity === 'chill') {
      selectedProfile = profiles[7];
    }
    
    return {
      ...selectedProfile,
      mood: moodLabel,
      energy: energyLabel,
      preferredGenre: genreLabel,
      timestamp: new Date().toISOString()
    };
  }

  reset() {
    this.currentQuestion = 0;
    this.answers = {};
  }

  saveResult(result) {
    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    history.unshift({
      ...result,
      date: new Date().toISOString()
    });
    // Garder seulement les 20 derniers résultats
    if (history.length > 20) {
      history.pop();
    }
    localStorage.setItem('quiz_history', JSON.stringify(history));
  }

  getHistory() {
    return JSON.parse(localStorage.getItem('quiz_history') || '[]');
  }
}
