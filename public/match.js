let match = null

document.addEventListener('DOMContentLoaded', () => {
  match = JSON.parse(sessionStorage.getItem('currentMatch'))
  if (!match) return

  document.getElementById('matchHeader').textContent = `Match #${match.match_number}`
  document.getElementById('coralA').textContent = match.coralA
  document.getElementById('algaeA').textContent = match.algaeA
  document.getElementById('coralT').textContent = match.coralT
  document.getElementById('algaeT').textContent = match.algaeT
  document.getElementById('defense').textContent = match.defense
  document.getElementById('backLink').href = `/team/${match.team_id}`
})

function updateStat(field, delta) {
  fetch('/update-match-ajax', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ id: match.id, field, delta })
  })
    .then(res => res.json())
    .then(updated => {
      match[field] = updated[field]
      document.getElementById(field).textContent = match[field]
    })
    .catch(err => console.error('Failed to update stat:', err))
}
