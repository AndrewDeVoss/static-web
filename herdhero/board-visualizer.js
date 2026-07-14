import { CELL_TYPES } from './generate-board.js';

export function visualizeBoard(board) {
    // Create a container with fixed grid layout
    // Iterate through the cells of the board
    // In each cell, create a div with an image corresponding to the cell type
    const container = document.createElement('div');
    container.style.display = 'grid';
    container.style.gridTemplateColumns = `repeat(${board[0].length}, 50px)`;
    container.style.gridTemplateRows = `repeat(${board.length}, 50px)`;
    container.style.gap = '2px';

    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            const cellType = board[i][j];
            const imageFile = getRandomImageForCellType(cellType);
            if (imageFile) {
                const img = document.createElement('img');
                img.src = imageFile;
                img.style.width = '100%';
                img.style.height = '100%';
                container.appendChild(img);
            } else {
                const cellDiv = document.createElement('div');
                cellDiv.style.width = '50px';
                cellDiv.style.height = '50px';
                cellDiv.style.display = 'flex';
                cellDiv.style.alignItems = 'center';
                cellDiv.style.justifyContent = 'center';
                cellDiv.style.border = '1px solid #ccc';
                container.appendChild(cellDiv);
            }
        }
    }
    return container;
}

function getRandomImageForCellType(cellType) {
    let numChoices = 0;
    let randomChoice = 0;
    switch (cellType) {
        case CELL_TYPES.CAMO:
            numChoices = 5;
            randomChoice = Math.floor(Math.random() * numChoices) + 1;
            return `sprites/camo/camo-${randomChoice}.png`;
        case CELL_TYPES.EFFELANT:
            numChoices = 8;
            randomChoice = Math.floor(Math.random() * numChoices) + 1;
            return `sprites/effelant/effelant-${randomChoice}.png`;
        case CELL_TYPES.GRUMPY:
            numChoices = 6;
            randomChoice = Math.floor(Math.random() * numChoices) + 1;
            return `sprites/grumpy/grumpy-${randomChoice}.png`;
        case CELL_TYPES.PARTY:
            numChoices = 8;
            randomChoice = Math.floor(Math.random() * numChoices) + 1;
            return `sprites/party/party-${randomChoice}.png`;
        case CELL_TYPES.PETS:
            numChoices = 9;
            randomChoice = Math.floor(Math.random() * numChoices) + 1;
            return `sprites/pets/pets-${randomChoice}.png`;
        case CELL_TYPES.ROYAL:
            numChoices = 6;
            randomChoice = Math.floor(Math.random() * numChoices) + 1;
            return `sprites/royal/royal-${randomChoice}.png`;
        case CELL_TYPES.NORMAL:
            numChoices = 29;
            randomChoice = Math.floor(Math.random() * numChoices) + 1;
            return `sprites/normal/normal-${randomChoice}.png`;
        default:
            return null;
    }
}