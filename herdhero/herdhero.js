import { generateBoard, prettyPrintBoard } from './generate-board.js';
import { visualizeBoard } from './board-visualizer.js';
import { boardToBank } from './board-to-bank.js'
import { CELL_TYPES } from './generate-board.js';
import { pickColors } from './color-generator.js'

const boardContainer = document.getElementById('board-container');
const board = generateBoard(5, 5);
const bank = boardToBank(board);
const divToBankPieceLookup = new Map();
initializeBank(bank);


function initializeBank(bank) {
    const cellSize = 40;
    const colors = pickColors(bank.length);

    // Find the bank spot and style it to support rows
    const bankDiv = document.getElementById('bank');
    bankDiv.style.display = 'grid';
    bankDiv.style.gridTemplateRows = `repeat(${bank.length}, max-content)`;
    bankDiv.style.gap = '16px';
    bankDiv.style.padding = '2px';

    // Create rows of styled images
    for (let row of bank) {
        let rowDiv = document.createElement('div');
        divToBankPieceLookup.set(rowDiv, row);

        const color = colors.shift();
        rowDiv.style.display = 'grid';
        rowDiv.style.gridTemplateColumns = `repeat(${row.length}, ${cellSize}px)`;
        rowDiv.style.gridTemplateRows = `repeat(1, ${cellSize}px)`;
        rowDiv.style.gap = '2px';
        rowDiv.style.padding = '10px';
        rowDiv.style.border = `4px solid ${color}`;
        rowDiv.style.borderRadius = '5px'; 
        rowDiv.style.boxSizing = 'border-box';

        for (let cellType of row) {
            const imageFile = getRandomImageForCellType(cellType);
            if (imageFile) {
                const img = document.createElement('img');
                img.src = imageFile;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                rowDiv.appendChild(img);
            }
        }
        bankDiv.appendChild(rowDiv);
    }
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
