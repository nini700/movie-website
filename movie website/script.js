const API_KEY = 'yourApi';
let favorites = JSON.parse(localStorage.getItem('favorites')) || {};
let ratings = JSON.parse(localStorage.getItem('ratings')) || {};

const moviesGrid = document.getElementById('moviesGrid');
const favoritesGrid = document.getElementById('favoritesGrid');
const searchInput = document.getElementById('searchInput');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const modal = document.getElementById('movieModal');
const searchSection = document.getElementById('searchSection');
const favoritesSection = document.getElementById('favoritesSection');
const showSearchBtn = document.getElementById('showSearchBtn');
const showFavoritesBtn = document.getElementById('showFavoritesBtn');

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchMovies();
    }
});

searchInput.addEventListener('input', debounce(searchMovies, 500));

showSearchBtn.addEventListener('click', () => {
    showSearchBtn.classList.add('active');
    showFavoritesBtn.classList.remove('active');
    searchSection.classList.remove('hide');
    favoritesSection.classList.add('hide');
});

showFavoritesBtn.addEventListener('click', () => {
    showFavoritesBtn.classList.add('active');
    showSearchBtn.classList.remove('active');
    favoritesSection.classList.remove('hide');
    searchSection.classList.add('hide');
    displayFavorites();
});

modal.querySelector('.close').addEventListener('click', closeModal);

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function closeModal() {
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
        modal.style.opacity = '1';
    }, 300);
}

async function searchMovies() {
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        moviesGrid.innerHTML = '';
        return;
    }

    showLoading();
    clearResults();

    try {
        const response = await fetch(`https://www.omdbapi.com/?s=${searchTerm}&apikey=${API_KEY}`);
        const data = await response.json();

        if (data.Response === 'True') {
            await displayMovies(data.Search, moviesGrid);
        } else {
            showError(data.Error || 'No films found');
        }
    } catch (err) {
        showError('An error occurred while searching for films');
    }

    hideLoading();
}

async function displayMovies(movies, container) {
    container.innerHTML = '';
    
    const movieElements = await Promise.all(movies.map(async (movie) => {
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card';

        const posterUrl = movie.Poster === 'N/A' ? 
            'https://via.placeholder.com/300x450?text=No+Poster+Available' : 
            movie.Poster;

        const isFavorite = favorites[movie.imdbID];
        const rating = ratings[movie.imdbID] || 0;

        const details = await fetchMovieDetails(movie.imdbID);
        
        movieCard.innerHTML = `
            <img src="${posterUrl}" alt="${movie.Title}" onclick="showMovieDetails('${movie.imdbID}')">
            <button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite('${movie.imdbID}')">
                <i class="fas fa-heart"></i>
            </button>
            <div class="movie-info">
                <h3>${movie.Title}</h3>
                <p>${details.Year} • ${details.Runtime}</p>
                <div class="rating" data-movie-id="${movie.imdbID}">
                    ${generateStarRating(movie.imdbID, rating)}
                </div>
            </div>
        `;

        return movieCard;
    }));

    movieElements.forEach(element => container.appendChild(element));
}

function generateStarRating(movieId, rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<span class="star ${i <= rating ? 'fas' : 'far'} fa-star" 
                       onclick="rateMovie('${movieId}', ${i})"></span>`;
    }
    return stars;
}

async function fetchMovieDetails(imdbID) {
    try {
        const response = await fetch(`https://www.omdbapi.com/?i=${imdbID}&apikey=${API_KEY}`);
        return await response.json();
    } catch (err) {
        console.error('Error fetching movie details:', err);
        return {};
    }
}

async function showMovieDetails(imdbID) {
    try {
        const movie = await fetchMovieDetails(imdbID);

        if (movie.Response === 'True') {
            const rating = ratings[imdbID] || 0;
            const isFavorite = favorites[imdbID];

            const movieDetails = document.getElementById('movieDetails');
            movieDetails.innerHTML = `
                <img src="${movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/300x450?text=No+Poster+Available'}" 
                     alt="${movie.Title}">
                <div class="movie-details-info">
                    <h2>${movie.Title} (${movie.Year})</h2>
                    <p><strong>IMDb Rating:</strong> ${movie.imdbRating} / 10</p>
                    <p><strong>Your Rating:</strong> 
                        <div class="rating" data-movie-id="${imdbID}">
                            ${generateStarRating(imdbID, rating)}
                        </div>
                    </p>
                    <p><strong>Runtime:</strong> ${movie.Runtime}</p>
                    <p><strong>Genre:</strong> ${movie.Genre}</p>
                    <p><strong>Director:</strong> ${movie.Director}</p>
                    <p><strong>Cast:</strong> ${movie.Actors}</p>
                    <p><strong>Plot:</strong> ${movie.Plot}</p>
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                            onclick="toggleFavorite('${imdbID}')">
                        <i class="fas fa-heart"></i>
                        ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                    </button>
                </div>
            `;
            modal.style.display = 'block';
        }
    } catch (err) {
        showError('Error loading movie details');
    }
}

function toggleFavorite(movieId) {
    favorites[movieId] = !favorites[movieId];
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    document.querySelectorAll(`[onclick="toggleFavorite('${movieId}')"]`).forEach(btn => {
        btn.classList.toggle('active');
    });
}

function rateMovie(movieId, rating) {
    ratings[movieId] = rating;
    localStorage.setItem('ratings', JSON.stringify(ratings));
    
    document.querySelectorAll(`.rating[data-movie-id="${movieId}"]`).forEach(container => {
        container.innerHTML = generateStarRating(movieId, rating);
    });
}

async function displayFavorites() {
    const favoriteIds = Object.keys(favorites).filter(id => favorites[id]);
    favoritesGrid.innerHTML = '';
    
    if (favoriteIds.length === 0) {
        favoritesGrid.innerHTML = '<p class="error">No favorite movies yet!</p>';
        return;
    }

    const favoriteMovies = await Promise.all(
        favoriteIds.map(async (id) => {
            try {
                const response = await fetch(`https://www.omdbapi.com/?i=${id}&apikey=${API_KEY}`);
                const movie = await response.json();
                return movie.Response === 'True' ? movie : null;
            } catch (err) {
                console.error('Error loading favorite movie:', err);
                return null;
            }
        })
    );

    const validMovies = favoriteMovies.filter(movie => movie !== null);
    await displayMovies(validMovies, favoritesGrid);
}

function clearResults() {
    moviesGrid.innerHTML = '';
    error.style.display = 'none';
}

function showLoading() {
    loading.style.display = 'block';
}

function hideLoading() {
    loading.style.display = 'none';
}

function showError(message) {
    error.textContent = message;
    error.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {

    if (Object.keys(favorites).length > 0) {
        showFavoritesBtn.classList.add('has-favorites');
    }
});