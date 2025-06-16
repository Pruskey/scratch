document.addEventListener('DOMContentLoaded', () => {
  match = JSON.parse(sessionStorage.getItem('currentMatch'))
  if (!match) return

  document.getElementById('matchHeader').textContent = `Match #${match.match_number}`
  document.getElementById('coralA').textContent = match.coralA
  document.getElementById('algaeA').textContent = match.algaeA
  document.getElementById('coralT').textContent = match.coralT
  document.getElementById('algaeT').textContent = match.algaeT
  document.getElementById('defense').textContent = match.defense

  const defenseToggle = document.getElementById('myToggle')
  defenseToggle.checked = !!match.defense

  defenseToggle.addEventListener('change', () => {
    updateStat('defense')
      .then(updated => {
        match.defense = updated.defense
        defenseToggle.checked = updated.defense
        document.getElementById('defense').textContent = updated.defense
      })
      .catch(err => {
        console.error('Failed to update defense:', err)
        defenseToggle.checked = !defenseToggle.checked
      })
  })

  document.getElementById('backLink').href = `/team/${match.team_id}`
})

function updateStat(field, delta = 1) {
  const body = field === 'defense'
    ? { id: match.id, field }
    : { id: match.id, field, delta }

  return fetch('/update-match-ajax', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  .then(async (res) => {
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`HTTP ${res.status} - ${errorText}`)
    }
    return res.json()
  })
  .then(updated => {
    console.log('Update success:', updated)
    if (field !== 'defense') {
      match[field] = updated[field]
      document.getElementById(field).textContent = match[field]
    }
    return updated
  })
  .catch(err => {
    console.error('Update failed:', err)
    throw err
  })
}
