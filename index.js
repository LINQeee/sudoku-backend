const WebSocket = require('ws')
const http = require('http')
const sudoku = require('sudoku-gen')

const server = http.createServer((req, res) => {
  if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('pong')
    return
  }

  res.writeHead(404)
  res.end('Not Found')
})
const wss = new WebSocket.Server({ server })

let solution = []

let board = generateSudoku('easy')
console.log(board)

function generateSudoku(difficulty) {
  const { puzzle, solution: sol } = sudoku.getSudoku(difficulty)
  solution = sol.split('').map((n) => parseInt(n))

  const arr = []
  for (let r = 0; r < 9; r++) {
    arr[r] = []
    for (let c = 0; c < 9; c++) {
      const ch = puzzle[r * 9 + c]
      arr[r][c] = {
        value: ch === '-' ? null : parseInt(ch),
        fixed: ch !== '-',
      }
    }
  }
  return arr
}

function broadcast(obj) {
  const msg = JSON.stringify(obj)
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(msg)
  }
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'state', board }))

  ws.on('message', (msg) => {
    let data
    try {
      data = JSON.parse(msg)
    } catch {
      return
    }

    if (data.type === 'update') {
      const { row, col, value } = data
      const correctValue = solution[row * 9 + col]

      if (!board[row][col].fixed) {
        const isCorrect = value === correctValue

        if (isCorrect) {
          board[row][col].value = value
        }

        broadcast({
          type: 'update',
          row,
          col,
          value,
          correct: isCorrect,
        })
      }
    }

    if (data.type === 'new') {
      board = generateSudoku(data.difficulty || 'easy')
      broadcast({ type: 'state', board })
    }
  })
})

server.listen(80, () => {
  console.log('Sudoku server running on ws://localhost:80')
})
