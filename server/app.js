const express = require('express')
const path = require('path')
const sqlite3 = require('sqlite3').verbose()

const app = express()
const port = 8080

// paths
const viewsPath = path.join(__dirname, '..', 'views')
const publicPath = path.join(__dirname, '..', 'public')
const dbPath = path.join(__dirname, '..', 'database', 'database.db')

// middleware
app.use(express.static(publicPath))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error(err.message)
  console.log('Connected to the SQLite database.')
})

// tables
db.run(`CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  number INTEGER NOT NULL
)`)

db.run(`CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  coralA INTEGER DEFAULT 0,
  algaeA INTEGER DEFAULT 0,
  coralT INTEGER DEFAULT 0,
  algaeT INTEGER DEFAULT 0,
  defense BOOLEAN DEFAULT FALSE,
  FOREIGN KEY(team_id) REFERENCES teams(id)
)`)

// routes
app.get('/', (req, res) => {
  res.sendFile(path.join(viewsPath, 'homepage.html'))
})

app.get('/next', (req, res) => {
  res.sendFile(path.join(viewsPath, 'next.html'))
})

app.get('/index', (req, res) => {
  res.sendFile(path.join(viewsPath, 'index.html'))
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
    res.redirect('/index')
  })
})

// matches
app.get('/team/:id', (req, res) => {
  const teamId = req.params.id
  db.get('SELECT * FROM teams WHERE id = ?', [teamId], (err, team) => {
    if (err || !team) return res.status(404).send("Team not found")

    db.all('SELECT * FROM matches WHERE team_id = ?', [teamId], (err, matches) => {
      if (err) return res.status(500).send("Error retrieving matches")

      let html = `
      <style>
      body {
  text-align: center;
  color: rgb(255, 255, 255);
  font-family: Arial, sans-serif;
  background: linear-gradient(22deg, #8c03fc 0%, #38a773 100%);
  padding: 400px;
  list-style-type:none;
}

h1 {
  text-align: center;
}

button {
  transition-duration: 0.4s;
  color: black;
  background-color: white;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  margin-top: 10px;
}

button:hover {
  transition-duration: 0.4s;
  background-color: #38a773;
}
      </style>
      <h1>${team.name} (Team #${team.number})</h1>
        <h2>Matches</h2><ul>`
      matches.forEach(match => {
        html += `<li>Match #${match.match_number} 
          <button onclick="location.href='/match/${match.id}'">Scout</button></li>`
      })
      html += `</ul>
        <form method="POST" action="/create-match">
          <input type="hidden" name="team_id" value="${teamId}">
          <input type="number" name="match_number" placeholder="Match #" required>
          <button type="submit">Create Match</button>
        </form>
        <br><a href="/next">Back</a>`

      res.send(html)
    })
  })
})

app.post('/create-match', (req, res) => {
  const teamId = req.body.team_id
  const matchNumber = parseInt(req.body.match_number)

  db.run('INSERT INTO matches (team_id, match_number) VALUES (?, ?)', [teamId, matchNumber], function (err) {
    if (err) return res.status(500).send("Error creating match")
    res.redirect(`/match/${this.lastID}`)
  })
})

app.get('/match/:id', (req, res) => {
  const matchId = req.params.id
  db.get('SELECT * FROM matches WHERE id = ?', [matchId], (err, match) => {
    if (err || !match) return res.status(404).send("Match not found")
    res.send(`
      <!DOCTYPE html>
      <html><head><title>Loading</title></head><body>
        <script>
          sessionStorage.setItem('currentMatch', '${JSON.stringify(match)}');
          window.location.href = '/match-page';
        </script>
      </body></html>
    `)
  })
})

app.get('/match-page', (req, res) => {
  res.sendFile(path.join(viewsPath, 'match.html'))
})

app.post('/update-match', (req, res) => {
  const { id, action } = req.body
  const [field, operation] = action.split('_')
  const modifier = operation === 'inc' ? '+ 1' : '- 1'

  const query = `UPDATE matches SET ${field} = ${field} ${modifier} WHERE id = ?`
  db.run(query, [id], function (err) {
    if (err) return res.status(500).send("Failed to update match")
    res.redirect(`/match/${id}`)
  })
})

app.post('/update-match-ajax', (req, res) => {
  const { id, field, delta } = req.body
  const allowedFields = ['coralA', 'algaeA', 'coralT', 'algaeT', 'defense']

  if (!allowedFields.includes(field)) {
    return res.status(400).json({ error: 'Invalid input' })
  }

  if (field === 'defense') {
    //botao desgraçado
    const toggleQuery = `UPDATE matches SET defense = NOT defense WHERE id = ?`
    db.run(toggleQuery, [id], function (err) {
      if (err) return res.status(500).json({ error: 'Toggle failed' })
      db.get(`SELECT defense FROM matches WHERE id = ?`, [id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Fetch failed' })
        res.json({ defense: !!row.defense })
      })
    })
  } else {
    if (typeof delta !== 'number') {
      return res.status(400).json({ error: 'Invalid delta for numeric field' })
    }

    const query = `UPDATE matches SET ${field} = ${field} + ? WHERE id = ?`
    db.run(query, [delta, id], function (err) {
      if (err) return res.status(500).json({ error: 'Update failed' })

      db.get(`SELECT ${field} FROM matches WHERE id = ?`, [id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Fetch failed' })
        res.json({ [field]: row[field] })
      })
    })
  }
})

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})
