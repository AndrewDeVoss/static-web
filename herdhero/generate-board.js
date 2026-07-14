export const CELL_TYPES = {
    CAMO: 'C',
    EFFELANT: 'E',
    GRUMPY: 'G',
    PARTY: 'P',
    PETS: 'T',
    ROYAL: 'R',
    NORMAL: 'N'
};

export function generateBoard(rows, cols) {
    let board = [];
    for (let i = 0; i < rows; i++) {
        let row = [];
        for (let j = 0; j < cols; j++) {
            row.push(null); // Random number between 0-9
        }
        board.push(row);
    }

    while (!isBoardComplete(board)) {
        continueBoard(board, rows, cols);
    }

    return board;
}

export function prettyPrintBoard(board) {
    return board.map(row => row.join(' ')).join('\n');
}

function isBoardComplete(board) { 
    for (let row of board) {
        for (let cell of row) {
            if (cell === null) {
                return false;
            }
        }
    }
    return true;
}

function continueBoard(board, rows, cols) {
    const camoP = .1;
    const effelantP = .2;
    const grumpyP = .3;
    const partyP = .4;
    const petsP = .5;
    const royalP = .6;

    let placed = false;
    while (!placed) {
        let random = Math.random();

        if (random < camoP) {
            placed = placeCamo(board, rows, cols);
        } else if (random < effelantP) {
            placed = placeEffelant(board, rows, cols);
        } else if (random < grumpyP) {
            placed = placeGrumpy(board, rows, cols);
        } else if (random < partyP) {
            placed = placeParty(board, rows, cols);
        } else if (random < petsP) {
            placed = placePets(board, rows, cols);
        } else if (random < royalP) {
            placed = placeRoyal(board, rows, cols);
        } else {
            placed = placeNormal(board, rows, cols);
        }
    }
}

function getRandomEmptyCell(board, rows, cols) {
    let emptyCells = [];
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (board[i][j] === null) {
                emptyCells.push([i, j]);
            }
        }
    }
    return emptyCells.length > 0 ? emptyCells[Math.floor(Math.random() * emptyCells.length)] : null;
}

function placeCamo(board, rows, cols) {
    return false;
}

function placeEffelant(board, rows, cols) {
    // Each effelant must be orthoganally adjacent to at least 3 cells of different types.
    // Find each null cell orthoganally adjacent to at least 3 different types
    // Shuffle the list of candidate cells and place an effelant in the first one.
    let effelantChar = 'E';
    let candidateCoords = [];
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (board[i][j] === null) {
                let differentTypes = new Set();
                for (let di = -1; di <= 1; di++) {
                    for (let dj = -1; dj <= 1; dj++) {
                        if (Math.abs(di) + Math.abs(dj) !== 1) continue; // Only orthogonal neighbors
                        let ni = i + di;
                        let nj = j + dj;
                        if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
                            if (board[ni][nj] !== null) {
                                differentTypes.add(board[ni][nj]);
                            }
                        }
                    }
                }
                if (differentTypes.size >= 3) {
                    candidateCoords.push([i, j]);
                }
            }
        }
    }

    if (candidateCoords.length > 0) {
        let [i, j] = candidateCoords[Math.floor(Math.random() * candidateCoords.length)];
        board[i][j] = effelantChar;
        return true;
    }

    return false;
}

function placeGrumpy(board, rows, cols) {
    // Each grumpy must not be adjacent to another grumpy. 
    // Find any cell not adjacent to a grumpy and place it there. 
    // If no such cell exists, return false.
    let grumpyChar = 'G';
    let candidateCoords = [];
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (board[i][j] === null) {
                let adjacentGrumpy = false;
                for (let di = -1; di <= 1; di++) {
                    for (let dj = -1; dj <= 1; dj++) {
                        if (di === 0 && dj === 0) continue; // Skip the cell itself
                        let ni = i + di;
                        let nj = j + dj;
                        if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
                            if (board[ni][nj] === 'G') {
                                adjacentGrumpy = true;
                                break;
                            }
                        }
                    }
                    if (adjacentGrumpy) break;
                }
                if (!adjacentGrumpy) {
                    candidateCoords.push([i, j]);
                }
            }
        }
    }

    if (candidateCoords.length > 0) {
        let [i, j] = candidateCoords[Math.floor(Math.random() * candidateCoords.length)];
        board[i][j] = grumpyChar;
        return true;
    }

    return false;
}

function placeParty(board, rows, cols) {
    // Each party must be in one group. 
    // If there is no party, any empty cell can start the party. 
    // If there is a party, any empty cell orthognally-adjacent to a party can join the party. 
    // If a party exists but no empty cell is adjacent to it, return false.
    const partyChar = 'P';
    let nullAdjacentToParty = [];
    let partyExists = false;
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (board[i][j] === 'P') {
                partyExists = true;
                // Check adjacent cells
                for (let di = -1; di <= 1; di++) {
                    for (let dj = -1; dj <= 1; dj++) {
                        if (Math.abs(di) + Math.abs(dj) !== 1) continue; // Only orthogonal neighbors
                        let ni = i + di;
                        let nj = j + dj;
                        if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
                            if (board[ni][nj] === null) {
                                nullAdjacentToParty.push([ni, nj]);
                            }
                        }
                    }
                }
            }
        }
    }

    if (!partyExists) {
        // Place the first party member
        let [i, j] = getRandomEmptyCell(board, rows, cols);
        if (i !== null && j !== null) {
            board[i][j] = partyChar;
            return true;
        }
    } else if (nullAdjacentToParty.length > 0) {
        // Place a party member adjacent to an existing party
        let [i, j] = nullAdjacentToParty[Math.floor(Math.random() * nullAdjacentToParty.length)];
        board[i][j] = partyChar;
        return true;
    }

    return false;
}

function placePets(board, rows, cols) {
    // Each pet must be on an outer cell.
    // Only check the cells that are on the outer edge of the board (first row, last row, first column, last column).
    // Shuffle candidates and choose one.
    const petChar = 'T';
    let candidateCoords = [];
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (board[i][j] === null && (i === 0 || i === rows - 1 || j === 0 || j === cols - 1)) {
                candidateCoords.push([i, j]);
            }
        }
    }

    if (candidateCoords.length > 0) {
        let [i, j] = candidateCoords[Math.floor(Math.random() * candidateCoords.length)];
        board[i][j] = petChar;
        return true;
    }

    return false;
}

function placeRoyal(board, rows, cols) {
    // Each royal must be orthogonally adjacent to at least 2 normal cells.
    // Each royal must not be orthogonally adjacent to a party cell.
    const royalChar = 'R';
    const partyChar = 'P';
    const normalChar = 'N';

    let candidateCoords = [];
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (board[i][j] === null) {
                let normalAdjacent = 0;
                let partyAdjacent = false;
                for (let di = -1; di <= 1; di++) {
                    for (let dj = -1; dj <= 1; dj++) {
                        if (Math.abs(di) + Math.abs(dj) !== 1) continue; // Only orthogonal neighbors
                        let ni = i + di;
                        let nj = j + dj;
                        if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
                            if (board[ni][nj] === normalChar) {
                                normalAdjacent++;
                            } else if (board[ni][nj] === partyChar) {
                                partyAdjacent = true;
                            }
                        }
                    }
                }
                if (normalAdjacent >= 2 && !partyAdjacent) {
                    candidateCoords.push([i, j]);
                }
            }
        }
    }

    if (candidateCoords.length > 0) {
        let [i, j] = candidateCoords[Math.floor(Math.random() * candidateCoords.length)];
        board[i][j] = royalChar;
        return true;
    }

    return false;
}

function placeNormal(board, rows, cols) {
    let [i, j] = getRandomEmptyCell(board, rows, cols);
    if (i !== null && j !== null) {
        board[i][j] = 'N';
    }

    return true;
}
