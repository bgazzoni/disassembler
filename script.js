const longWordContainer = document.getElementById('long-word');
const wordSlotsContainer = document.getElementById('word-slots');
const toggleLanguageButton = document.getElementById('toggle-language');

let currentLevel = 0; // Track the current game level
let gameData = []; // Store the loaded game data
let currentLanguage = 'english'; // Default language

// Function to check if the device is touch-enabled
function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}

// Show the keyboard only on mobile devices
if (isTouchDevice() && window.innerWidth <= 768) {
  document.getElementById('keyboard').style.display = 'flex';
}

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
      } else {
        // If no placeholder exists, append the tile to the long word container
        longWordContainer.appendChild(tileToMove);
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

  console.log('Tile dropped back into long word:', { letter, source, index });

  // Handle tiles dragged from small words back to the long word
  if (source === 'word-slot') {
    // Find the tile being dragged
    const tileToMove = document.querySelector(`.word-slot .tile[data-index="${index}"]`);
    console.log('Tile to move:', tileToMove);

    if (tileToMove) {
      // Log the state of the long word container before re-insertion
      console.log('Long word container before re-insertion:', longWordContainer.innerHTML);

      // Remove the tile from the small word slot
      tileToMove.remove();

      // Find the placeholder in the long word container
      const placeholder = longWordContainer.querySelector(`.placeholder[data-index="${index}"]`);
      console.log('Placeholder found:', placeholder);

      if (placeholder) {
        // Update the tile's data-source to "long-word"
        tileToMove.dataset.source = 'long-word';

        // Insert the tile back into its original position
        longWordContainer.insertBefore(tileToMove, placeholder);
        placeholder.remove(); // Remove the placeholder
      } else {
        // If no placeholder exists, find the correct position to insert the tile
        const tiles = Array.from(longWordContainer.children);
        let insertBeforeNode = null;

        // Find the correct position based on the tile's original index
        for (let i = 0; i < tiles.length; i++) {
          const tile = tiles[i];
          if (tile.dataset.index > index) {
            insertBeforeNode = tile;
            break;
          }
        }

        console.log('Insert before node:', insertBeforeNode);

        // Update the tile's data-source to "long-word"
        tileToMove.dataset.source = 'long-word';

        // Insert the tile at the correct position
        if (insertBeforeNode) {
          longWordContainer.insertBefore(tileToMove, insertBeforeNode);
        } else {
          longWordContainer.appendChild(tileToMove);
        }
      }

      // Log the re-inserted tile's class list and styles
      console.log('Re-inserted tile class list:', tileToMove.classList);
      console.log('Re-inserted tile styles:', tileToMove.style);

      // Log the re-inserted tile's parent element
      console.log('Re-inserted tile parent:', tileToMove.parentElement);

      // Log the state of the long word container after re-insertion
      console.log('Long word container after re-insertion:', longWordContainer.innerHTML);

      // Force re-render the long word container
      forceRerender(longWordContainer);

      // Revert the small word slot to its original state
      const originalSlot = tileToMove.parentElement;
      if (originalSlot) {
        originalSlot.textContent = ''; // Clear the content
        originalSlot.classList.remove('filled'); // Mark the slot as unfilled
      }
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
async function isWordValid(word) {
  try {
    if (currentLanguage === 'english') {
      // Use DictionaryAPI.dev for English words
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const data = await response.json();
      return Array.isArray(data); // If the word exists, the API returns an array
    } else if (currentLanguage === 'portuguese') {
      // Use Dicio.com.br for Portuguese words
      const proxyUrl = 'https://api.allorigins.win/raw?url='; // CORS proxy
      const apiUrl = `https://www.dicio.com.br/${word.toLowerCase()}/`;
      const response = await fetch(proxyUrl + encodeURIComponent(apiUrl), {
        method: 'HEAD' // Use HEAD request to fetch only headers
      });

      // Extract the final URL after redirects
      const finalUrl = response.url;

      // Check if the final URL contains "ocorreu-um-erro"
      if (finalUrl.includes("ocorreu-um-erro")) {
        console.log(`"${word}" is invalid.`);
        return false;
      } else {
        console.log(`"${word}" is valid.`);
        return true;
      }
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
      // Add a 200ms delay before showing the alert
      setTimeout(() => {
        alert('Congratulations! You solved the puzzle!');
        nextLevel(); // Move to the next level
      }, 200); // 200ms delay
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

// Add event listeners to the keyboard buttons
document.querySelectorAll('.key').forEach(key => {
  key.addEventListener('click', () => {
    const letter = key.dataset.key;
    if (letter) {
      handleTypedLetter(letter);
    }
  });
});

// Add event listener for the backspace button
document.getElementById('backspace').addEventListener('click', () => {
  handleBackspace();
});

// Load initial game data
loadGameData();