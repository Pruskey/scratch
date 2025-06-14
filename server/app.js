const express = require('express')
const path = require('path')
const sqlite3 = require('sqlite3').verbose()

const app = express()
const port = 8080

// Set correct paths
const viewsPath = path.join(__dirname, '..', 'views')
const publicPath = path.join(__dirname, '..', 'public')
const dbPath = path.join(__dirname, '..', 'database', 'database.db')

// Middleware
app.use(express.static(publicPath))
app.use(express.urlencoded({ extended: true }))

// SQLite database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error(err.message)
  console.log('Connected to the SQLite database.')
})

// Create table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  number INTEGER NOT NULL
)`)

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(viewsPath, 'index.html'))
})

app.get('/next', (req, res) => {
  res.sendFile(path.join(viewsPath, 'next.html'))
})

app.get('/home', (req, res) => {
  res.sendFile(path.join(viewsPath, 'homepage.html'))
})

app.get('/teams', (req, res) => {
  db.all('SELECT * FROM teams', [], (err, rows) => {
    if (err) {
      console.error(err.message)
      return res.status(500).send("Error retrieving teams")
    }
    res.json(rows)
  })
})

app.post('/add-team', (req, res) => {
  const name = req.body.name
  const number = parseInt(req.body.number)

  if (!name || isNaN(number)) {
    return res.status(400).send("Invalid team data")
  }

  db.run('INSERT INTO teams(name, number) VALUES(?, ?)', [name, number], (err) => {
    if (err) {
      console.error("Insert error:", err.message)
      return res.status(500).send("Failed to insert team")
    }
    res.redirect('/')
  })
})

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})
