// Take a board and convert to bank (list of lists) 
export function boardToBank(board) {
  // Implementation for converting board to bank
  const bank = [];

  // TODO just starting with row-wise will do exploration later
  for (let i = 0; i < board.length; i++) {
    bank.push(board[i]);
  }
  
  return bank;
}