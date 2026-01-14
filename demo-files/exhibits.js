import {
  roll,
  createStatBlock,
  check,
  createDerivedStat,
  contest,
  rollTable,
  ParseError
} from '../dist/index.js'

// ============================================
// EXHIBIT 1: DICE TRAY
// ============================================

const diceState = {
  notation: '4d6dl1',
  lastResult: null
}

function renderDice(result) {
  const keptArea = document.getElementById('dice-kept')
  const droppedArea = document.getElementById('dice-dropped')
  const totalEl = document.getElementById('dice-total')
  const breakdownEl = document.getElementById('dice-breakdown')

  keptArea.innerHTML = ''
  droppedArea.innerHTML = ''

  // Show kept dice
  result.kept.forEach((value, i) => {
    const die = document.createElement('div')
    die.className = 'die kept'
    die.textContent = value
    die.style.animationDelay = `${i * 80}ms`
    die.title = `Kept die: ${value}`
    keptArea.appendChild(die)
  })

  // Show dropped dice (rolls that aren't in kept)
  const keptCopy = [...result.kept]
  result.rolls.forEach((value) => {
    const keptIndex = keptCopy.indexOf(value)
    if (keptIndex === -1) {
      const die = document.createElement('div')
      die.className = 'die dropped'
      die.textContent = value
      die.title = `Dropped die: ${value}`
      droppedArea.appendChild(die)
    } else {
      keptCopy.splice(keptIndex, 1)
    }
  })

  totalEl.textContent = result.total

  // Build breakdown
  const parts = []
  if (result.kept.length > 0) {
    parts.push(result.kept.join(' + '))
  }
  if (result.modifier !== 0) {
    parts.push(result.modifier > 0 ? `+ ${result.modifier}` : `- ${Math.abs(result.modifier)}`)
  }
  breakdownEl.textContent = parts.length > 1 ? parts.join(' ') : ''
}

function rollDice() {
  const notation = document.getElementById('dice-notation').value.trim()
  if (!notation) return

  try {
    const result = roll(notation)
    diceState.lastResult = result
    diceState.notation = notation
    renderDice(result)
  } catch (e) {
    if (e instanceof ParseError) {
      document.getElementById('dice-total').textContent = 'Error'
      document.getElementById('dice-breakdown').textContent = e.message
    }
  }
}

export function initDiceTray() {
  document.getElementById('dice-roll').addEventListener('click', rollDice)
  document.getElementById('dice-notation').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') rollDice()
  })

  document.querySelectorAll('[data-notation]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('dice-notation').value = btn.dataset.notation
      rollDice()
    })
  })

  // Initial roll
  rollDice()
}

// ============================================
// EXHIBIT 2: CHARACTER SHEET
// ============================================

export const heroStats = createStatBlock({
  strength: { base: 16, min: 1, max: 20 },
  dexterity: { base: 14, min: 1, max: 20 },
  constitution: { base: 12, min: 1, max: 20 },
  intelligence: { base: 10, min: 1, max: 20 },
  wisdom: { base: 13, min: 1, max: 20 },
  charisma: { base: 8, min: 1, max: 20 },
  health: { base: 75, min: 0, max: 100 }
})

// Add initial modifier
heroStats.addModifier('strength', {
  value: 4,
  source: "Bull's Strength",
  type: 'flat',
  duration: 3
})

// Create derived stats
createDerivedStat(heroStats, 'carryCapacity', (s) => s.get('strength') * 15)
createDerivedStat(heroStats, 'armorClass', (s) => 10 + Math.floor((s.get('dexterity') - 10) / 2))
createDerivedStat(heroStats, 'initiative', (s) => Math.floor((s.get('dexterity') - 10) / 2))

function calcModifier(value) {
  return Math.floor((value - 10) / 2)
}

function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

function renderCharacterSheet() {
  const statsGrid = document.getElementById('stats-grid')
  const derivedStats = document.getElementById('derived-stats')
  const modifiersList = document.getElementById('modifiers-list')

  // Render main stats
  const mainStats = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
  statsGrid.innerHTML = mainStats.map(stat => {
    const value = heroStats.get(stat)
    const mod = calcModifier(value)
    const mods = heroStats.getModifiers(stat) || []

    return `
      <div class="stat-card">
        <div class="stat-name">${stat.slice(0, 3).toUpperCase()}</div>
        <div class="stat-value" data-stat="${stat}">${value}</div>
        <div class="stat-modifier">${formatModifier(mod)}</div>
        ${mods.length > 0 ? `
          <div class="stat-modifiers">
            ${mods.map(m => `
              <span class="modifier-badge ${m.duration !== 'permanent' && m.duration <= 1 ? 'expiring' : ''}"
                    data-stat="${stat}" data-source="${m.source}"
                    title="${m.source}: ${m.type === 'multiply' ? '×' : '+'}${m.value}, ${m.duration === 'permanent' ? '∞' : m.duration + ' rounds'}">
                ${m.type === 'multiply' ? '×' : '+'}${m.value}${m.duration !== 'permanent' ? ' ⏱' + m.duration : ''}
              </span>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `
  }).join('')

  // Render derived stats
  derivedStats.innerHTML = `
    <div class="derived-stat" id="derived-carry">
      <div class="derived-stat-value">${heroStats.get('carryCapacity')} lbs</div>
      <div class="derived-stat-name">Carry Capacity</div>
      <div class="derived-stat-formula">STR × 15</div>
    </div>
    <div class="derived-stat" id="derived-ac">
      <div class="derived-stat-value">${heroStats.get('armorClass')}</div>
      <div class="derived-stat-name">Armor Class</div>
      <div class="derived-stat-formula">10 + DEX mod</div>
    </div>
    <div class="derived-stat" id="derived-init">
      <div class="derived-stat-value">${formatModifier(heroStats.get('initiative'))}</div>
      <div class="derived-stat-name">Initiative</div>
      <div class="derived-stat-formula">DEX mod</div>
    </div>
  `

  // Render health
  const health = heroStats.get('health')
  const maxHealth = 100
  const healthPercent = (health / maxHealth) * 100
  const healthBar = document.getElementById('health-bar')
  const healthText = document.getElementById('health-text')

  healthBar.style.width = `${healthPercent}%`
  healthBar.className = 'health-bar ' + (healthPercent > 60 ? 'high' : healthPercent > 30 ? 'medium' : 'low')
  healthText.textContent = `${health}/${maxHealth}`

  // Render active modifiers list
  const allModifiers = []
  mainStats.forEach(stat => {
    const mods = heroStats.getModifiers(stat) || []
    mods.forEach(m => {
      allModifiers.push({ stat, ...m })
    })
  })

  if (allModifiers.length === 0) {
    modifiersList.innerHTML = '<div class="text-muted">No active modifiers</div>'
  } else {
    modifiersList.innerHTML = allModifiers.map(m => `
      <div class="modifier-item">
        <span class="modifier-item-name">${m.source}</span>
        <span class="modifier-item-stat">${m.stat.slice(0, 3).toUpperCase()}</span>
        <span class="modifier-item-value">${m.type === 'multiply' ? '×' : '+'}${m.value}</span>
        <span class="modifier-item-duration">${m.duration === 'permanent' ? '∞ perm' : '⏱ ' + m.duration + ' left'}</span>
        <span class="modifier-item-remove" data-stat="${m.stat}" data-source="${m.source}">✕</span>
      </div>
    `).join('')
  }

  // Add click handlers for stat editing
  document.querySelectorAll('.stat-value[data-stat]').forEach(el => {
    el.addEventListener('click', () => {
      const stat = el.dataset.stat
      const current = heroStats.getBase(stat)
      const input = document.createElement('input')
      input.type = 'number'
      input.value = current
      input.min = 1
      input.max = 20
      el.innerHTML = ''
      el.appendChild(input)
      el.classList.add('editing')
      input.focus()
      input.select()

      const finish = () => {
        const newValue = parseInt(input.value) || current
        heroStats.set(stat, newValue)
        renderCharacterSheet()
      }

      input.addEventListener('blur', finish)
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') finish()
      })
    })
  })

  // Add click handlers for modifier badges (removal)
  document.querySelectorAll('.modifier-badge').forEach(el => {
    el.addEventListener('click', () => {
      heroStats.removeModifier(el.dataset.stat, el.dataset.source)
      renderCharacterSheet()
    })
  })

  // Add click handlers for modifier list removal
  document.querySelectorAll('.modifier-item-remove').forEach(el => {
    el.addEventListener('click', () => {
      heroStats.removeModifier(el.dataset.stat, el.dataset.source)
      renderCharacterSheet()
    })
  })
}

export function initCharacterSheet() {
  // Health controls
  document.querySelectorAll('[data-health]').forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = parseInt(btn.dataset.health)
      heroStats.modify('health', delta)
      renderCharacterSheet()
    })
  })

  document.getElementById('health-full').addEventListener('click', () => {
    heroStats.set('health', 100)
    renderCharacterSheet()
  })

  // Tick button
  document.getElementById('char-tick').addEventListener('click', () => {
    heroStats.tick()
    renderCharacterSheet()
  })

  // Reset button
  document.getElementById('char-reset').addEventListener('click', () => {
    heroStats.set('strength', 16)
    heroStats.set('dexterity', 14)
    heroStats.set('constitution', 12)
    heroStats.set('intelligence', 10)
    heroStats.set('wisdom', 13)
    heroStats.set('charisma', 8)
    heroStats.set('health', 100)
    heroStats.clearModifiers()
    renderCharacterSheet()
  })

  // Add modifier modal
  const modifierModal = document.getElementById('modifier-modal')

  document.getElementById('char-add-modifier').addEventListener('click', () => {
    modifierModal.classList.add('active')
  })

  document.getElementById('mod-cancel').addEventListener('click', () => {
    modifierModal.classList.remove('active')
  })

  document.getElementById('mod-add').addEventListener('click', () => {
    const stat = document.getElementById('mod-stat').value
    const name = document.getElementById('mod-name').value || 'Buff'
    const value = parseFloat(document.getElementById('mod-value').value) || 0
    const type = document.getElementById('mod-type').value
    const duration = parseInt(document.getElementById('mod-duration').value) || 0

    heroStats.addModifier(stat, {
      value,
      source: name,
      type,
      duration: duration === 0 ? 'permanent' : duration
    })

    modifierModal.classList.remove('active')
    renderCharacterSheet()
  })

  modifierModal.addEventListener('click', (e) => {
    if (e.target === modifierModal) {
      modifierModal.classList.remove('active')
    }
  })

  renderCharacterSheet()
}

// ============================================
// EXHIBIT 3: SKILL CHECK ARENA
// ============================================

export const goblinStats = createStatBlock({
  strength: { base: 8, min: 1, max: 20 },
  dexterity: { base: 14, min: 1, max: 20 },
  constitution: { base: 10, min: 1, max: 20 },
  intelligence: { base: 6, min: 1, max: 20 },
  wisdom: { base: 8, min: 1, max: 20 },
  charisma: { base: 6, min: 1, max: 20 }
})

function renderParticipantStats() {
  const heroStatsEl = document.getElementById('hero-stats')
  const goblinStatsEl = document.getElementById('goblin-stats')

  const stats = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']

  heroStatsEl.innerHTML = stats.map(s =>
    `<div><span>${s.slice(0,3).toUpperCase()}</span><span>${heroStats.get(s)}</span></div>`
  ).join('')

  goblinStatsEl.innerHTML = stats.map(s =>
    `<div><span>${s.slice(0,3).toUpperCase()}</span><span>${goblinStats.get(s)}</span></div>`
  ).join('')
}

function renderCheckResult(result, side = 'hero', isContest = false) {
  const diceEl = document.getElementById(`${side}-dice`)
  const modifierEl = document.getElementById(`${side}-modifier`)
  const totalEl = document.getElementById(`${side}-total`)
  const resultEl = document.getElementById(`${side}-result`)

  // Clear and animate dice
  diceEl.innerHTML = ''

  if (result.rolls) {
    result.rolls.forEach((roll, i) => {
      const die = document.createElement('div')
      die.className = 'arena-die rolling'
      die.textContent = roll
      die.style.animationDelay = `${i * 100}ms`

      // For advantage/disadvantage, mark winner/loser
      if (result.rolls.length === 2) {
        setTimeout(() => {
          if (roll === result.roll) {
            die.classList.add('winner')
            die.classList.remove('rolling')
          } else {
            die.classList.add('loser')
            die.classList.remove('rolling')
          }
        }, 600)
      } else {
        setTimeout(() => die.classList.remove('rolling'), 500)
      }

      diceEl.appendChild(die)
    })
  }

  modifierEl.textContent = `${result.modifier >= 0 ? '+' : ''}${result.modifier} (stat mod)${result.bonus ? ` +${result.bonus} (bonus)` : ''}`
  totalEl.textContent = `= ${result.total}`

  if (!isContest) {
    resultEl.textContent = result.success
      ? `✓ SUCCESS (${result.margin >= 0 ? '+' : ''}${result.margin})`
      : `✗ FAIL (${result.margin})`
    resultEl.className = `arena-result ${result.success ? 'success' : 'failure'}`
  }
}

function renderContestResult(heroResult, goblinResult, contestResult) {
  renderCheckResult({ ...heroResult, rolls: [contestResult.rolls.a], roll: contestResult.rolls.a, modifier: heroResult.modifier, total: contestResult.totals.a }, 'hero', true)
  renderCheckResult({ ...goblinResult, rolls: [contestResult.rolls.b], roll: contestResult.rolls.b, modifier: goblinResult.modifier, total: contestResult.totals.b }, 'goblin', true)

  const heroResultEl = document.getElementById('hero-result')
  const goblinResultEl = document.getElementById('goblin-result')

  setTimeout(() => {
    if (contestResult.winner === 'a') {
      heroResultEl.textContent = `🏆 WINNER (+${contestResult.margin})`
      heroResultEl.className = 'arena-result winner'
      goblinResultEl.textContent = ''
      goblinResultEl.className = 'arena-result'
    } else if (contestResult.winner === 'b') {
      goblinResultEl.textContent = `🏆 WINNER (+${contestResult.margin})`
      goblinResultEl.className = 'arena-result winner'
      heroResultEl.textContent = ''
      heroResultEl.className = 'arena-result'
    } else {
      heroResultEl.textContent = '= TIE'
      heroResultEl.className = 'arena-result tie'
      goblinResultEl.textContent = '= TIE'
      goblinResultEl.className = 'arena-result tie'
    }
  }, 700)
}

export function initSkillCheckArena() {
  document.getElementById('check-dc').addEventListener('input', (e) => {
    document.getElementById('dc-display').textContent = e.target.value
  })

  document.getElementById('roll-check').addEventListener('click', () => {
    const stat = document.getElementById('check-stat').value
    const dc = parseInt(document.getElementById('check-dc').value)
    const advantage = document.getElementById('check-advantage').checked
    const disadvantage = document.getElementById('check-disadvantage').checked

    const result = check(heroStats, stat, {
      difficulty: dc,
      advantage,
      disadvantage
    })

    renderCheckResult(result, 'hero', false)

    // Clear goblin side
    document.getElementById('goblin-dice').innerHTML = ''
    document.getElementById('goblin-modifier').textContent = ''
    document.getElementById('goblin-total').textContent = ''
    document.getElementById('goblin-result').textContent = ''
  })

  document.getElementById('run-contest').addEventListener('click', () => {
    const stat = document.getElementById('check-stat').value

    const contestResult = contest(heroStats, stat, goblinStats, stat)

    // Calculate modifiers for display
    const heroStatValue = heroStats.get(stat)
    const goblinStatValue = goblinStats.get(stat)
    const heroMod = Math.floor((heroStatValue - 10) / 2)
    const goblinMod = Math.floor((goblinStatValue - 10) / 2)

    renderContestResult(
      { modifier: heroMod },
      { modifier: goblinMod },
      contestResult
    )
  })

  // Initial check display
  renderParticipantStats()
  const initialCheck = check(heroStats, 'strength', { difficulty: 15 })
  renderCheckResult(initialCheck, 'hero', false)
}

// ============================================
// EXHIBIT 4: LOOT TABLE
// ============================================

const lootTable = [
  { weight: 50, value: { name: 'Gold Coins', icon: '🪙', rarity: 'COMMON' } },
  { weight: 25, value: { name: 'Health Potion', icon: '🧪', rarity: 'COMMON' } },
  { weight: 15, value: { name: 'Magic Scroll', icon: '📜', rarity: 'UNCOMMON' } },
  { weight: 8, value: { name: 'Enchanted Dagger', icon: '🗡️', rarity: 'RARE' } },
  { weight: 2, value: { name: 'Dragon Scale', icon: '💎', rarity: 'LEGENDARY' } }
]

const lootState = {
  history: [],
  spinning: false,
  currentRotation: 0
}

function renderWheel() {
  const wheel = document.getElementById('loot-wheel')
  const totalWeight = lootTable.reduce((sum, e) => sum + e.weight, 0)

  let gradientParts = []
  let currentAngle = 0

  const colors = [
    'var(--accent-yellow)',
    'var(--accent-green)',
    'var(--accent-blue)',
    'var(--accent-purple)',
    'var(--accent-red)'
  ]

  lootTable.forEach((entry, i) => {
    const sliceAngle = (entry.weight / totalWeight) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + sliceAngle

    gradientParts.push(`${colors[i]} ${startAngle}deg ${endAngle}deg`)
    currentAngle = endAngle
  })

  wheel.style.background = `conic-gradient(${gradientParts.join(', ')})`
}

function spinWheel() {
  if (lootState.spinning) return
  lootState.spinning = true

  const wheel = document.getElementById('loot-wheel')
  const result = rollTable(lootTable)

  // Calculate where this result should land (top = 0 degrees)
  const totalWeight = lootTable.reduce((sum, e) => sum + e.weight, 0)
  let targetAngle = 0
  let cumulative = 0

  for (const entry of lootTable) {
    const sliceAngle = (entry.weight / totalWeight) * 360
    if (entry.value.name === result.name) {
      // Land in the middle of this slice
      targetAngle = cumulative + sliceAngle / 2
      break
    }
    cumulative += sliceAngle
  }

  // Spin multiple times plus land at target
  const spins = 5 + Math.random() * 3
  const finalRotation = lootState.currentRotation + (spins * 360) + (360 - targetAngle)

  wheel.style.transform = `rotate(${finalRotation}deg)`
  lootState.currentRotation = finalRotation

  setTimeout(() => {
    lootState.spinning = false
    lootState.history.push(result)
    renderLootResult(result)
    renderLootHistory()
  }, 3000)
}

function renderLootResult(result) {
  document.getElementById('result-icon').textContent = result.icon
  document.getElementById('result-name').textContent = result.name

  const totalWeight = lootTable.reduce((sum, e) => sum + e.weight, 0)
  const entry = lootTable.find(e => e.value.name === result.name)
  const percent = ((entry.weight / totalWeight) * 100).toFixed(0)

  document.getElementById('result-rarity').textContent = `${result.rarity} - ${percent}% chance`
}

function renderLootHistory() {
  const historyEl = document.getElementById('loot-history')
  const statsEl = document.getElementById('loot-stats')

  // Show last 20 items
  const recent = lootState.history.slice(-20)
  historyEl.innerHTML = recent.map(item =>
    `<span class="loot-history-item" title="${item.name}">${item.icon}</span>`
  ).join('')

  // Calculate stats
  if (lootState.history.length > 0) {
    const counts = {}
    lootState.history.forEach(item => {
      counts[item.name] = (counts[item.name] || 0) + 1
    })

    const total = lootState.history.length
    statsEl.innerHTML = `
      <span>${total} spins</span>
      ${Object.entries(counts).map(([name, count]) =>
        `<span>${name}: ${((count / total) * 100).toFixed(0)}%</span>`
      ).join('')}
    `
  }
}

export function initLootTable() {
  document.getElementById('spin-wheel').addEventListener('click', spinWheel)

  document.getElementById('spin-10').addEventListener('click', async () => {
    for (let i = 0; i < 10; i++) {
      const result = rollTable(lootTable)
      lootState.history.push(result)
    }
    renderLootHistory()
    // Show the last result
    renderLootResult(lootState.history[lootState.history.length - 1])
  })

  document.getElementById('reset-history').addEventListener('click', () => {
    lootState.history = []
    renderLootHistory()
    document.getElementById('loot-stats').innerHTML = ''
  })

  // Initialize wheel
  renderWheel()

  // Pre-spin to show initial result
  lootState.history = [
    lootTable[0].value, // Gold
    lootTable[0].value, // Gold
    lootTable[1].value, // Potion
    lootTable[0].value, // Gold
    lootTable[1].value  // Potion
  ]
  renderLootResult(lootTable[1].value) // Show potion as current
  renderLootHistory()
}

// ============================================
// INITIALIZE ALL EXHIBITS
// ============================================

export function initAllExhibits() {
  initDiceTray()
  initCharacterSheet()
  initSkillCheckArena()
  initLootTable()
}
