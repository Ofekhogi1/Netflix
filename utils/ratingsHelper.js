// Function to fetch ratings from OMDb API
async function fetchMovieRatings(title) {
  try {
    const apiKey = process.env.OMDB_API_KEY || 'trilogy';
    
    // Hebrew to English translation map
    const hebrewToEnglish = {
      'מוגלי': 'Mowgli',
      'אריה המלך': 'The Lion King',
      'ספיידרמן': 'Spider-Man',
      'באטמן': 'Batman',
      'הנוקמים': 'The Avengers',
      'משחקי הכס': 'Game of Thrones',
      'בית הנייר': 'Money Heist',
      'שוברי שורות': 'Breaking Bad'
    };
    
    // Translate Hebrew to English if needed
    let searchTitle = title;
    if (hebrewToEnglish[title]) {
      searchTitle = hebrewToEnglish[title];
      console.log(`🔄 Translating "${title}" to "${searchTitle}"`);
    }
    
    const url = `http://www.omdbapi.com/?t=${encodeURIComponent(searchTitle)}&apikey=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.Response === 'True') {
      const ratings = {
        imdbRating: data.imdbRating || null,
        rottenTomatoesRating: null
      };
      
      // Find Rotten Tomatoes rating
      if (data.Ratings && Array.isArray(data.Ratings)) {
        const rtRating = data.Ratings.find(r => r.Source === 'Rotten Tomatoes');
        if (rtRating) {
          ratings.rottenTomatoesRating = rtRating.Value;
        }
      }
      
      console.log(`✅ Found ratings for "${searchTitle}": IMDB ${ratings.imdbRating}, RT ${ratings.rottenTomatoesRating || 'N/A'}`);
      return ratings;
    }
    
    console.log(`⚠️  No ratings found for "${searchTitle}"`);
    return null;
  } catch (error) {
    console.error('Error fetching movie ratings:', error);
    return null;
  }
}

module.exports = fetchMovieRatings;
