import { generateBoard, prettyPrintBoard } from './generate-board.js';
import { visualizeBoard } from './board-visualizer.js';

const boardContainer = document.getElementById('board-container');
const board = generateBoard(5, 5);
boardContainer.appendChild(visualizeBoard(board));