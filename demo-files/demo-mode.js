// ============================================
// VISUAL DEMO MODE
// ============================================

// Helper: wait for specified milliseconds
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Helper: scroll element into view
function scrollTo(element) {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  return wait(400) // Wait for scroll to settle
}

// Helper: get exhibit section by index (0-3)
function getExhibit(index) {
  return document.querySelectorAll('.exhibit')[index]
}

// Helper: highlight exhibit during demo
function highlightExhibit(exhibit) {
  document.querySelectorAll('.exhibit').forEach(e => e.classList.remove('demo-active'))
  exhibit?.classList.add('demo-active')
}

// Helper: update demo status text
function setStatus(text) {
  const statusEl = document.getElementById('demo-status')
  if (statusEl) statusEl.textContent = text
}

// Helper: programmatically set input value and trigger change
function setInputValue(selector, value) {
  const el = document.querySelector(selector)
  if (el) {
    el.value = value
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

// Helper: programmatically set checkbox
function setCheckbox(selector, checked) {
  const el = document.querySelector(selector)
  if (el && el.checked !== checked) {
    el.checked = checked
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

// Helper: click element by selector
function click(selector) {
  document.querySelector(selector)?.click()
}

// ============================================
// DEMO SEQUENCES
// ============================================

async function demoDiceTray() {
  const exhibit = getExhibit(0)
  await scrollTo(exhibit)
  highlightExhibit(exhibit)
  setStatus('Demonstrating Dice Tray...')

  // Roll d20
  setInputValue('#dice-notation', '1d20')
  await wait(300)
  click('#dice-roll')
  await wait(500)

  // Roll advantage (2d20kh1)
  click('[data-notation="2d20kh1"]')
  await wait(600)

  // Roll stat generation (4d6dl1)
  click('[data-notation="4d6dl1"]')
  await wait(600)

  // Roll exploding dice
  click('[data-notation="2d6!"]')
  await wait(600)

  // Roll fireball
  click('[data-notation="8d6"]')
  await wait(600)
}

async function demoCharacterSheet() {
  const exhibit = getExhibit(1)
  await scrollTo(exhibit)
  highlightExhibit(exhibit)
  setStatus('Demonstrating Character Sheet...')

  // Health changes
  click('[data-health="-10"]')
  await wait(400)
  click('[data-health="-10"]')
  await wait(400)
  click('[data-health="10"]')
  await wait(400)
  click('#health-full')
  await wait(500)

  // Add a modifier
  click('#char-add-modifier')
  await wait(300)

  // Fill modal
  setInputValue('#mod-stat', 'strength')
  setInputValue('#mod-name', 'Bull\'s Strength')
  setInputValue('#mod-value', '4')
  setInputValue('#mod-type', 'flat')
  setInputValue('#mod-duration', '3')
  await wait(300)

  click('#mod-add')
  await wait(500)

  // Tick to show duration countdown
  click('#char-tick')
  await wait(400)
  click('#char-tick')
  await wait(400)

  // Reset character
  click('#char-reset')
  await wait(400)
}

async function demoSkillCheckArena() {
  const exhibit = getExhibit(2)
  await scrollTo(exhibit)
  highlightExhibit(exhibit)
  setStatus('Demonstrating Skill Checks...')

  // Change stat
  setInputValue('#check-stat', 'dexterity')
  await wait(300)

  // Adjust DC
  setInputValue('#check-dc', '18')
  await wait(300)

  // Toggle advantage
  setCheckbox('#check-advantage', true)
  await wait(300)

  // Roll check
  click('#roll-check')
  await wait(800)

  // Reset advantage
  setCheckbox('#check-advantage', false)
  await wait(200)

  // Change to strength
  setInputValue('#check-stat', 'strength')
  setInputValue('#check-dc', '12')
  await wait(300)

  // Run contest
  click('#run-contest')
  await wait(800)

  // Another contest
  click('#run-contest')
  await wait(600)
}

async function demoLootTable() {
  const exhibit = getExhibit(3)
  await scrollTo(exhibit)
  highlightExhibit(exhibit)
  setStatus('Demonstrating Loot Table...')

  // Spin wheel
  click('#spin-wheel')
  await wait(1500) // Wait for spin animation

  // Spin again
  click('#spin-wheel')
  await wait(1500)

  // Spin x10 for stats demonstration
  click('#spin-10')
  await wait(800)

  // Reset history
  click('#reset-history')
  await wait(300)
}

// ============================================
// MAIN DEMO RUNNER
// ============================================

export async function runVisualDemo() {
  setStatus('Starting visual demo...')
  await wait(500)

  try {
    await demoDiceTray()
    await demoCharacterSheet()
    await demoSkillCheckArena()
    await demoLootTable()

    // Clear highlight and show completion
    document.querySelectorAll('.exhibit').forEach(e => e.classList.remove('demo-active'))
    setStatus('Demo complete!')

    // Scroll back to top
    await wait(500)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e) {
    console.error('Demo error:', e)
    setStatus('Demo encountered an error')
  }
}

// ============================================
// INITIALIZATION
// ============================================

export function initDemoMode() {
  // Reset page button
  document.getElementById('reset-page')?.addEventListener('click', () => {
    location.reload()
  })
}
