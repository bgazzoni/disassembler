const longWordContainer = document.getElementById('long-word');
const wordSlotsContainer = document.getElementById('word-slots');
const toggleLanguageButton = document.getElementById('toggle-language');

let currentLevel = 0; // Track the current game level
let gameData = []; // Store the loaded game data
let currentLanguage = 'english'; // Default language

// Load the JSON file based on the current language
function loadGameData() {
  const jsonFile = currentLanguage === 'english' ? 'words-en.json' : 'words-pt.json';
  fetch(jsonFile)
    .then(response => response.json())
    .then(data => {
      gameData = data;
      initializeGame();
    })
    .catch(error => console.error('Error loading JSON:', error));
}

// Function to initialize the game
function initializeGame() {
  const level = gameData[currentLevel];
  if (!level) {
    console.error('No more levels available.');
    return;
  }

  const { longWord, smallWords } = level;

  // Clear the long word and word slots
  longWordContainer.innerHTML = '';
  wordSlotsContainer.innerHTML = '';

  // Create draggable tiles for the long word
  longWord.split('').forEach((letter, index) => {
    const tile = createTile(letter, index, 'long-word');
    longWordContainer.appendChild(tile);
  });

  // Create dashed letter slots for each small word
  smallWords.forEach((length, wordIndex) => {
    const wordSlot = document.createElement('div');
    wordSlot.classList.add('word-slot');

    for (let i = 0; i < length; i++) {
      const letterSlot = document.createElement('div');
      letterSlot.classList.add('letter-slot');
      wordSlot.appendChild(letterSlot);
    }

    wordSlotsContainer.appendChild(wordSlot);
  });
}

// Function to create a draggable tile
function createTile(letter, index, source) {
  const tile = document.createElement('div');
  tile.classList.add('tile');
  tile.textContent = letter;
  tile.draggable = true;
  tile.dataset.index = index; // Store the original index for returning tiles
  tile.dataset.source = source; // Track where the tile is from

  tile.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', letter);
    e.dataTransfer.setData('source', source);
    e.dataTransfer.setData('index', index);
  });

  return tile;
}

// Add keyboard input functionality
document.addEventListener('keydown', (e) => {
  const key = e.key.toUpperCase(); // Get the typed key (uppercase)
  if (/^[A-Z]$/.test(key)) { // Check if the key is a letter (A-Z)
    handleTypedLetter(key);
  } else if (e.key === 'Backspace') { // Check if the key is Backspace
    handleBackspace();
  }
});

// Function to handle typed letters
function handleTypedLetter(letter) {
  // Find the first tile in the long word that matches the typed letter
  const tileToMove = Array.from(longWordContainer.querySelectorAll('.tile')).find(
    tile => tile.textContent === letter && !tile.classList.contains('placeholder')
  );

  if (tileToMove) {
    // Find the first vacant letter slot in the small words (top to bottom)
    const vacantSlot = Array.from(wordSlotsContainer.querySelectorAll('.letter-slot')).find(
      slot => !slot.textContent
    );

    if (vacantSlot) {
      // Remove the tile from the long word and replace it with a placeholder
      const index = tileToMove.dataset.index;
      const placeholder = createPlaceholder(index);
      longWordContainer.insertBefore(placeholder, longWordContainer.children[index]);
      tileToMove.remove();

      // Create a new tile for the vacant slot
      const newTile = createTile(letter, index, 'word-slot');
      vacantSlot.appendChild(newTile);
      vacantSlot.classList.add('filled'); // Mark the slot as filled

      // Validate the word if all slots in the small word are filled
      validateWord(vacantSlot.parentElement);

      // Check if the player has won
      checkWinCondition();
    }
  }
}

// Function to handle backspace
function handleBackspace() {
  // Find the last filled letter slot in the small words (from bottom to top)
  const filledSlots = Array.from(wordSlotsContainer.querySelectorAll('.letter-slot.filled'));
  const lastFilledSlot = filledSlots[filledSlots.length - 1];

  if (lastFilledSlot) {
    // Get the tile in the last filled slot
    const tileToMove = lastFilledSlot.querySelector('.tile');
    if (tileToMove) {
      const index = tileToMove.dataset.index;

      // Remove the tile from the small word slot
      tileToMove.remove();

      // Clear the slot
      lastFilledSlot.textContent = "";
      lastFilledSlot.classList.remove('filled');

      // Return the tile to the long word
      const placeholder = longWordContainer.querySelector(`.placeholder[data-index="${index}"]`);
      if (placeholder) {
        longWordContainer.insertBefore(tileToMove, placeholder);
        placeholder.remove();
      }

      // Revert the tile's background color to light blue
      tileToMove.style.backgroundColor = "#b0c2e8";

      // Re-validate the word if necessary
      validateWord(lastFilledSlot.parentElement);

      // Check if the player has won
      checkWinCondition();
    }
  }
}

// Allow word slots to accept dropped tiles
wordSlotsContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
});

wordSlotsContainer.addEventListener('drop', async (e) => {
  e.preventDefault();
  const letter = e.dataTransfer.getData('text/plain');
  const source = e.dataTransfer.getData('source');
  const index = e.dataTransfer.getData('index');

  // Find the closest letter slot
  const letterSlot = e.target.closest('.letter-slot');
  if (letterSlot && !letterSlot.textContent) {
    // Remove the tile from its source
    if (source === 'long-word') {
      const tileToRemove = longWordContainer.querySelector(`.tile[data-index="${index}"]`);
      if (tileToRemove) {
        // Replace the tile with a greyed-out placeholder
        const placeholder = createPlaceholder(index);
        longWordContainer.insertBefore(placeholder, longWordContainer.children[index]);
        tileToRemove.remove(); // Remove the tile completely
      }
    } else if (source === 'word-slot') {
      // Remove the tile from its original word slot
      const tileToRemove = document.querySelector(`.word-slot .tile[data-index="${index}"]`);
      if (tileToRemove) {
        tileToRemove.remove(); // Remove the tile from its original position
      }
    }

    // Create a new tile for the letter slot
    const newTile = createTile(letter, index, 'word-slot');
    letterSlot.appendChild(newTile);
    letterSlot.classList.add('filled'); // Mark the slot as filled

    // Validate the word if all slots in the small word are filled
    await validateWord(letterSlot.parentElement); // Wait for validation to complete

    // Check if the player has won
    checkWinCondition();
  }
});

// Allow long word container to accept dropped tiles
longWordContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
});

longWordContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  const letter = e.dataTransfer.getData('text/plain');
  const source = e.dataTransfer.getData('source');
  const index = e.dataTransfer.getData('index');

  // Find the closest tile position in the long word
  if (source === 'word-slot') {
    // Remove the tile from the small word's dashed space
    const tileToRemove = document.querySelector(`.word-slot .tile[data-index="${index}"]`);
    if (tileToRemove) {
      // Move the tile back to the long word
      const placeholder = longWordContainer.querySelector(`.placeholder[data-index="${index}"]`);
      if (placeholder) {
        // Reset the tile's background color to light blue
        tileToRemove.style.backgroundColor = "#b0c2e8";
        longWordContainer.insertBefore(tileToRemove, placeholder);
        placeholder.remove(); // Remove the placeholder
      }

      // Revert the letter slot to its original appearance
      const originalSlot = tileToRemove.parentElement;
      originalSlot.textContent = ""; // Clear the content
      originalSlot.style.border = "2px solid #b0c2e840"; // Revert to solid border
      originalSlot.style.backgroundColor = "#b0c2e812"; // Revert background
      originalSlot.classList.remove('filled'); // Mark the slot as unfilled
    }
  }
});

// Function to create a greyed-out placeholder
function createPlaceholder(index) {
  const placeholder = document.createElement('div');
  placeholder.classList.add('placeholder');
  placeholder.dataset.index = index; // Store the original index
  return placeholder;
}

// Function to validate a word using the appropriate API
async function validateWord(wordSlot) {
  // Check if all letter slots in the word slot are filled
  const isComplete = Array.from(wordSlot.children).every(letterSlot => letterSlot.textContent);

  if (isComplete) {
    // Get the word from the tiles in the word slot
    const word = Array.from(wordSlot.children)
      .map(letterSlot => letterSlot.textContent)
      .join('');

    // Check if the word is valid
    const isValid = await isWordValid(word);

    // Change the tile colors based on validation
    Array.from(wordSlot.children).forEach(letterSlot => {
      const tile = letterSlot.querySelector('.tile');
      if (tile) {
        if (isValid) {
          tile.style.backgroundColor = "#4CAF50"; // Green for valid words
        } else {
          tile.style.backgroundColor = "#f44336"; // Red for invalid words
        }
      }
    });
  }
}

// Function to check if a word is valid
// Function to check if a word is valid
async function isWordValid(word) {
  try {
    if (currentLanguage === 'english') {
      // Use DictionaryAPI.dev for English words
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const data = await response.json();
      return Array.isArray(data); // If the word exists, the API returns an array
    } else if (currentLanguage === 'portuguese') {
      // Use Dicionário Aberto API with a CORS proxy for Portuguese words
      const proxyUrl = 'https://cors-anywhere.herokuapp.com/'; // CORS proxy
      const apiUrl = `https://dicionario-aberto.net/search-json/${word}`;
      const response = await fetch(proxyUrl + apiUrl);
      const data = await response.json();
      return data.entry && data.entry.word === word.toLowerCase(); // Check if the word exists
    }
  } catch (error) {
    console.error('Error validating word:', error);
    return false;
  }
}

// Function to check if the player has won
async function checkWinCondition() {
  // Check if all small words are filled
  const allWordsFilled = Array.from(wordSlotsContainer.children).every(wordSlot =>
    Array.from(wordSlot.children).every(letterSlot => letterSlot.textContent)
  );

  if (allWordsFilled) {
    // Get all the words from the small word slots
    const words = Array.from(wordSlotsContainer.children).map(wordSlot =>
      Array.from(wordSlot.children)
        .map(letterSlot => letterSlot.textContent)
        .join('')
    );

    // Validate all words using the appropriate API
    const validationResults = await Promise.all(words.map(word => isWordValid(word)));

    // Check if all words are valid
    const allWordsValid = validationResults.every(isValid => isValid);

    if (allWordsValid) {
      alert('Congratulations! You solved the puzzle!');
      nextLevel(); // Move to the next level
    }
  }
}

// Function to move to the next level
function nextLevel() {
  currentLevel++;
  if (currentLevel >= gameData.length) {
    alert('Congratulations! You completed all levels!');
    currentLevel = 0; // Restart from the first level
  }
  initializeGame();
}

// Reset the game
document.getElementById('reset-button').addEventListener('click', () => {
  initializeGame();
});

// Toggle between English and Portuguese
toggleLanguageButton.addEventListener('click', () => {
  currentLanguage = currentLanguage === 'english' ? 'portuguese' : 'english';
  toggleLanguageButton.textContent = currentLanguage === 'english'
    ? 'Switch to Portuguese'
    : 'Switch to English';
  loadGameData(); // Reload game data for the new language
});

// Load initial game data
loadGameData();