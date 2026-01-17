import * as Library from '../dist/index.js'
if (!window.Library) window.Library = Library

import {
  roll,
  createStatBlock,
  check,
  createDerivedStat,
  contest,
  rollTable,
  ParseError,
  ValidationError
} from '../dist/index.js'
import { heroStats, goblinStats } from './demo.js'

// ============================================
// DEMO INTEGRITY TESTS
// These tests verify the demo itself is correctly structured.
// They are IDENTICAL across all @motioneffector demos.
// Do not modify, skip, or weaken these tests.
// ============================================

function registerIntegrityTests() {
  // ─────────────────────────────────────────────
  // STRUCTURAL INTEGRITY
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Library is loaded', () => {
    if (typeof window.Library === 'undefined') {
      throw new Error('window.Library is undefined - library not loaded')
    }
  })

  testRunner.registerTest('[Integrity] Library has exports', () => {
    const exports = Object.keys(window.Library)
    if (exports.length === 0) {
      throw new Error('window.Library has no exports')
    }
  })

  testRunner.registerTest('[Integrity] Test runner exists', () => {
    const runner = document.getElementById('test-runner')
    if (!runner) {
      throw new Error('No element with id="test-runner"')
    }
  })

  testRunner.registerTest('[Integrity] Test runner is first section after header', () => {
    const main = document.querySelector('main')
    if (!main) {
      throw new Error('No <main> element found')
    }
    const firstSection = main.querySelector('section')
    if (!firstSection || firstSection.id !== 'test-runner') {
      throw new Error('Test runner must be the first <section> inside <main>')
    }
  })

  testRunner.registerTest('[Integrity] Run All Tests button exists with correct format', () => {
    const btn = document.getElementById('run-all-tests')
    if (!btn) {
      throw new Error('No button with id="run-all-tests"')
    }
    const text = btn.textContent.trim()
    if (!text.includes('Run All Tests')) {
      throw new Error(`Button text must include "Run All Tests", got: "${text}"`)
    }
    const icon = btn.querySelector('.btn-icon')
    if (!icon || !icon.textContent.includes('▶')) {
      throw new Error('Button must have play icon (▶) in .btn-icon element')
    }
  })

  testRunner.registerTest('[Integrity] At least one exhibit exists', () => {
    const exhibits = document.querySelectorAll('.exhibit')
    if (exhibits.length === 0) {
      throw new Error('No elements with class="exhibit"')
    }
  })

  testRunner.registerTest('[Integrity] All exhibits have unique IDs', () => {
    const exhibits = document.querySelectorAll('.exhibit')
    const ids = new Set()
    exhibits.forEach(ex => {
      if (!ex.id) {
        throw new Error('Exhibit missing id attribute')
      }
      if (ids.has(ex.id)) {
        throw new Error(`Duplicate exhibit id: ${ex.id}`)
      }
      ids.add(ex.id)
    })
  })

  testRunner.registerTest('[Integrity] All exhibits registered for walkthrough', () => {
    const exhibitElements = document.querySelectorAll('.exhibit')
    const registeredCount = testRunner.exhibits.length
    if (registeredCount < exhibitElements.length) {
      throw new Error(
        `Only ${registeredCount} exhibits registered for walkthrough, ` +
        `but ${exhibitElements.length} .exhibit elements exist`
      )
    }
  })

  testRunner.registerTest('[Integrity] CSS loaded from demo-files/', () => {
    const links = document.querySelectorAll('link[rel="stylesheet"]')
    const hasExternal = Array.from(links).some(link =>
      link.href.includes('demo-files/')
    )
    if (!hasExternal) {
      throw new Error('No stylesheet loaded from demo-files/ directory')
    }
  })

  testRunner.registerTest('[Integrity] No inline style tags', () => {
    const styles = document.querySelectorAll('style')
    if (styles.length > 0) {
      throw new Error(`Found ${styles.length} inline <style> tags - extract to demo-files/demo.css`)
    }
  })

  testRunner.registerTest('[Integrity] No inline onclick handlers', () => {
    const withOnclick = document.querySelectorAll('[onclick]')
    if (withOnclick.length > 0) {
      throw new Error(`Found ${withOnclick.length} elements with onclick - use addEventListener`)
    }
  })

  // ─────────────────────────────────────────────
  // NO AUTO-PLAY VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Output areas are empty on load', () => {
    const outputs = document.querySelectorAll('.exhibit-output, .output, [data-output], .dice-kept-area, .arena-dice-container, .loot-history')
    outputs.forEach(output => {
      // Allow placeholder text but not actual content
      const hasPlaceholder = output.dataset.placeholder ||
        output.classList.contains('placeholder') ||
        output.querySelector('.placeholder')

      const text = output.textContent.trim()
      const children = output.children.length

      // If it has content that isn't a placeholder, that's a violation
      if ((text.length > 50 || children > 1) && !hasPlaceholder) {
        throw new Error(
          `Output area appears pre-populated: "${text.substring(0, 50)}..." - ` +
          `outputs must be empty until user interaction`
        )
      }
    })
  })

  testRunner.registerTest('[Integrity] No setTimeout calls on module load', () => {
    // This test verifies by checking a flag set during load
    // The test-runner.js must set window.__demoLoadComplete = true after load
    // Any setTimeout from module load would not have completed
    if (window.__suspiciousTimersDetected) {
      throw new Error(
        'Detected setTimeout/setInterval during page load - ' +
        'demos must not auto-run'
      )
    }
  })

  // ─────────────────────────────────────────────
  // REAL LIBRARY VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Library functions are callable', () => {
    const lib = window.Library
    const exports = Object.keys(lib)

    // At least one export must be a function
    const hasFunctions = exports.some(key => typeof lib[key] === 'function')
    if (!hasFunctions) {
      throw new Error('Library exports no callable functions')
    }
  })

  testRunner.registerTest('[Integrity] No mock implementations detected', () => {
    // Check for common mock patterns in window
    const suspicious = [
      'mockParse', 'mockValidate', 'fakeParse', 'fakeValidate',
      'stubParse', 'stubValidate', 'testParse', 'testValidate'
    ]
    suspicious.forEach(name => {
      if (typeof window[name] === 'function') {
        throw new Error(`Detected mock function: window.${name} - use real library`)
      }
    })
  })

  // ─────────────────────────────────────────────
  // VISUAL FEEDBACK VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] CSS includes animation definitions', () => {
    const sheets = document.styleSheets
    let hasAnimations = false

    try {
      for (const sheet of sheets) {
        // Skip cross-origin stylesheets
        if (!sheet.href || sheet.href.includes('demo-files/')) {
          const rules = sheet.cssRules || sheet.rules
          for (const rule of rules) {
            if (rule.type === CSSRule.KEYFRAMES_RULE ||
                (rule.style && (
                  rule.style.animation ||
                  rule.style.transition ||
                  rule.style.animationName
                ))) {
              hasAnimations = true
              break
            }
          }
        }
        if (hasAnimations) break
      }
    } catch (e) {
      // CORS error - assume external sheet has animations
      hasAnimations = true
    }

    if (!hasAnimations) {
      throw new Error('No CSS animations or transitions found - visual feedback required')
    }
  })

  testRunner.registerTest('[Integrity] Interactive elements have hover states', () => {
    const buttons = document.querySelectorAll('button, .btn')
    if (buttons.length === 0) return // No buttons to check

    // Check that enabled buttons have pointer cursor (disabled buttons should have not-allowed)
    const enabledBtn = Array.from(buttons).find(btn => !btn.disabled)
    if (!enabledBtn) return // All buttons are disabled, skip check

    const styles = window.getComputedStyle(enabledBtn)
    if (styles.cursor !== 'pointer') {
      throw new Error('Buttons should have cursor: pointer')
    }
  })

  // ─────────────────────────────────────────────
  // WALKTHROUGH REGISTRATION VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Walkthrough demonstrations are async functions', () => {
    testRunner.exhibits.forEach(exhibit => {
      if (typeof exhibit.demonstrate !== 'function') {
        throw new Error(`Exhibit "${exhibit.name}" has no demonstrate function`)
      }
      // Check if it's async by seeing if it returns a thenable
      const result = exhibit.demonstrate.toString()
      if (!result.includes('async') && !result.includes('Promise')) {
        console.warn(`Exhibit "${exhibit.name}" demonstrate() may not be async`)
      }
    })
  })

  testRunner.registerTest('[Integrity] Each exhibit has required elements', () => {
    const exhibits = document.querySelectorAll('.exhibit')
    exhibits.forEach(exhibit => {
      // Must have a title
      const title = exhibit.querySelector('.exhibit-title, h2, h3')
      if (!title) {
        throw new Error(`Exhibit ${exhibit.id} missing title element`)
      }

      // Must have an interactive area
      const interactive = exhibit.querySelector(
        '.exhibit-interactive, .exhibit-content, [data-interactive]'
      )
      if (!interactive) {
        throw new Error(`Exhibit ${exhibit.id} missing interactive area`)
      }
    })
  })
}

// ============================================
// LIBRARY-SPECIFIC TESTS
// ============================================

// Dice tests
testRunner.registerTest('roll: basic 1d20', () => {
  const result = roll('1d20')
  if (result.total < 1 || result.total > 20) throw new Error(`Expected 1-20, got ${result.total}`)
})

testRunner.registerTest('roll: 2d6 returns correct structure', () => {
  const result = roll('2d6')
  if (!result.rolls || result.rolls.length < 2) throw new Error('Expected at least 2 rolls')
  if (result.total !== result.rolls.reduce((a, b) => a + b, 0)) throw new Error('Total mismatch')
})

testRunner.registerTest('roll: modifier 2d6+5', () => {
  const result = roll('2d6+5')
  if (result.modifier !== 5) throw new Error(`Expected modifier 5, got ${result.modifier}`)
})

testRunner.registerTest('roll: negative modifier 1d20-3', () => {
  const result = roll('1d20-3')
  if (result.modifier !== -3) throw new Error(`Expected modifier -3, got ${result.modifier}`)
})

testRunner.registerTest('roll: keep highest 4d6kh3', () => {
  const result = roll('4d6kh3')
  if (result.kept.length !== 3) throw new Error(`Expected 3 kept dice, got ${result.kept.length}`)
})

testRunner.registerTest('roll: drop lowest 4d6dl1', () => {
  const result = roll('4d6dl1')
  if (result.kept.length !== 3) throw new Error(`Expected 3 kept dice, got ${result.kept.length}`)
})

testRunner.registerTest('roll: ParseError on invalid notation', () => {
  try {
    roll('invalid')
    throw new Error('Expected ParseError')
  } catch (e) {
    if (!(e instanceof ParseError)) throw new Error(`Expected ParseError, got ${e.constructor.name}`)
  }
})

testRunner.registerTest('roll: ParseError on empty string', () => {
  try {
    roll('')
    throw new Error('Expected ParseError')
  } catch (e) {
    if (!(e instanceof ParseError)) throw e
  }
})

testRunner.registerTest('roll: ParseError on zero dice', () => {
  try {
    roll('0d6')
    throw new Error('Expected ParseError')
  } catch (e) {
    if (!(e instanceof ParseError)) throw e
  }
})

// Stat block tests
testRunner.registerTest('createStatBlock: creates with base values', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  if (stats.get('str') !== 10) throw new Error(`Expected 10, got ${stats.get('str')}`)
})

testRunner.registerTest('createStatBlock: respects min bound', () => {
  const stats = createStatBlock({ str: { base: 10, min: 1 } })
  stats.set('str', -5)
  if (stats.get('str') !== 1) throw new Error(`Expected 1, got ${stats.get('str')}`)
})

testRunner.registerTest('createStatBlock: respects max bound', () => {
  const stats = createStatBlock({ str: { base: 10, max: 20 } })
  stats.set('str', 100)
  if (stats.get('str') !== 20) throw new Error(`Expected 20, got ${stats.get('str')}`)
})

testRunner.registerTest('createStatBlock: modify adds delta', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  stats.modify('str', 5)
  if (stats.getBase('str') !== 15) throw new Error(`Expected 15, got ${stats.getBase('str')}`)
})

testRunner.registerTest('createStatBlock: has returns true for existing stat', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  if (!stats.has('str')) throw new Error('Expected has(str) to be true')
})

testRunner.registerTest('createStatBlock: has returns false for non-existing stat', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  if (stats.has('dex')) throw new Error('Expected has(dex) to be false')
})

testRunner.registerTest('createStatBlock: stats() returns stat names', () => {
  const stats = createStatBlock({ str: { base: 10 }, dex: { base: 14 } })
  const names = stats.stats()
  if (!names.includes('str') || !names.includes('dex')) throw new Error('Missing stat names')
})

// Modifier tests
testRunner.registerTest('addModifier: applies flat modifier', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  stats.addModifier('str', { value: 5, source: 'buff' })
  if (stats.get('str') !== 15) throw new Error(`Expected 15, got ${stats.get('str')}`)
})

testRunner.registerTest('addModifier: applies multiply modifier', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  stats.addModifier('str', { value: 2, source: 'double', type: 'multiply' })
  if (stats.get('str') !== 20) throw new Error(`Expected 20, got ${stats.get('str')}`)
})

testRunner.registerTest('removeModifier: removes by source', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  stats.addModifier('str', { value: 5, source: 'buff' })
  stats.removeModifier('str', 'buff')
  if (stats.get('str') !== 10) throw new Error(`Expected 10, got ${stats.get('str')}`)
})

testRunner.registerTest('tick: decrements duration', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  stats.addModifier('str', { value: 5, source: 'buff', duration: 2 })
  stats.tick()
  const duration = stats.getRemainingDuration('str', 'buff')
  if (duration !== 1) throw new Error(`Expected 1, got ${duration}`)
})

testRunner.registerTest('tick: removes expired modifiers', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  stats.addModifier('str', { value: 5, source: 'buff', duration: 1 })
  stats.tick()
  if (stats.get('str') !== 10) throw new Error(`Expected 10, got ${stats.get('str')}`)
})

testRunner.registerTest('clearModifiers: removes all modifiers', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  stats.addModifier('str', { value: 5, source: 'buff1' })
  stats.addModifier('str', { value: 3, source: 'buff2' })
  stats.clearModifiers()
  if (stats.get('str') !== 10) throw new Error(`Expected 10, got ${stats.get('str')}`)
})

// Check tests
testRunner.registerTest('check: returns CheckResult structure', () => {
  const stats = createStatBlock({ str: { base: 14 } })
  const result = check(stats, 'str', { difficulty: 10 })
  if (typeof result.success !== 'boolean') throw new Error('Missing success')
  if (typeof result.total !== 'number') throw new Error('Missing total')
  if (typeof result.margin !== 'number') throw new Error('Missing margin')
})

testRunner.registerTest('check: calculates D&D modifier correctly', () => {
  const stats = createStatBlock({ str: { base: 16 } })
  const result = check(stats, 'str', { difficulty: 10 })
  if (result.modifier !== 3) throw new Error(`Expected modifier 3, got ${result.modifier}`)
})

testRunner.registerTest('check: throws on non-existent stat', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  try {
    check(stats, 'dex', { difficulty: 10 })
    throw new Error('Expected TypeError')
  } catch (e) {
    if (!(e instanceof TypeError)) throw e
  }
})

// Contest tests
testRunner.registerTest('contest: returns winner a, b, or tie', () => {
  const statsA = createStatBlock({ str: { base: 16 } })
  const statsB = createStatBlock({ str: { base: 8 } })
  const result = contest(statsA, 'str', statsB, 'str')
  if (!['a', 'b', 'tie'].includes(result.winner)) throw new Error(`Invalid winner: ${result.winner}`)
})

testRunner.registerTest('contest: with raw modifiers', () => {
  const result = contest(5, 3)
  if (!['a', 'b', 'tie'].includes(result.winner)) throw new Error(`Invalid winner: ${result.winner}`)
})

// Derived stat tests
testRunner.registerTest('createDerivedStat: computes from formula', () => {
  const stats = createStatBlock({ str: { base: 16 } })
  createDerivedStat(stats, 'carry', s => s.get('str') * 15)
  if (stats.get('carry') !== 240) throw new Error(`Expected 240, got ${stats.get('carry')}`)
})

testRunner.registerTest('createDerivedStat: updates when dependency changes', () => {
  const stats = createStatBlock({ str: { base: 16 } })
  createDerivedStat(stats, 'carry', s => s.get('str') * 15)
  stats.set('str', 20)
  if (stats.get('carry') !== 300) throw new Error(`Expected 300, got ${stats.get('carry')}`)
})

testRunner.registerTest('isDerived: returns true for derived stats', () => {
  const stats = createStatBlock({ str: { base: 16 } })
  createDerivedStat(stats, 'carry', s => s.get('str') * 15)
  if (!stats.isDerived('carry')) throw new Error('Expected isDerived to be true')
})

testRunner.registerTest('isDerived: returns false for base stats', () => {
  const stats = createStatBlock({ str: { base: 16 } })
  if (stats.isDerived('str')) throw new Error('Expected isDerived to be false')
})

// Roll table tests
testRunner.registerTest('rollTable: returns a value from entries', () => {
  const entries = [
    { weight: 1, value: 'a' },
    { weight: 1, value: 'b' }
  ]
  const result = rollTable(entries)
  if (!['a', 'b'].includes(result)) throw new Error(`Unexpected result: ${result}`)
})

testRunner.registerTest('rollTable: throws on empty table', () => {
  try {
    rollTable([])
    throw new Error('Expected ValidationError')
  } catch (e) {
    if (!(e instanceof ValidationError)) throw e
  }
})

testRunner.registerTest('rollTable: throws on negative weight', () => {
  try {
    rollTable([{ weight: -1, value: 'a' }])
    throw new Error('Expected ValidationError')
  } catch (e) {
    if (!(e instanceof ValidationError)) throw e
  }
})

testRunner.registerTest('rollTable: throws on all zero weights', () => {
  try {
    rollTable([{ weight: 0, value: 'a' }])
    throw new Error('Expected ValidationError')
  } catch (e) {
    if (!(e instanceof ValidationError)) throw e
  }
})

// Serialization tests
testRunner.registerTest('toJSON: serializes stat block', () => {
  const stats = createStatBlock({ str: { base: 16 } })
  stats.addModifier('str', { value: 4, source: 'buff', duration: 3 })
  const json = stats.toJSON()
  if (json.version !== 1) throw new Error('Expected version 1')
  if (json.stats.str !== 16) throw new Error('Expected str base 16')
})

testRunner.registerTest('fromJSON: restores stat block', () => {
  const original = createStatBlock({ str: { base: 16 } })
  original.addModifier('str', { value: 4, source: 'buff', duration: 3 })
  const json = original.toJSON()

  const restored = createStatBlock({ str: { base: 10 } }, { fromJSON: json })
  if (restored.getBase('str') !== 16) throw new Error('Base not restored')
  if (restored.get('str') !== 20) throw new Error('Modifier not restored')
})

// Event tests
testRunner.registerTest('onChange: fires on stat change', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  let fired = false
  stats.onChange(() => { fired = true })
  stats.set('str', 15)
  if (!fired) throw new Error('onChange not fired')
})

testRunner.registerTest('onStat: fires only for specific stat', () => {
  const stats = createStatBlock({ str: { base: 10 }, dex: { base: 10 } })
  let strFired = false
  stats.onStat('str', () => { strFired = true })
  stats.set('dex', 15)
  if (strFired) throw new Error('onStat fired for wrong stat')
  stats.set('str', 15)
  if (!strFired) throw new Error('onStat not fired for correct stat')
})

testRunner.registerTest('onChange: unsubscribe works', () => {
  const stats = createStatBlock({ str: { base: 10 } })
  let count = 0
  const unsub = stats.onChange(() => { count++ })
  stats.set('str', 15)
  unsub()
  stats.set('str', 20)
  if (count !== 1) throw new Error(`Expected 1 call, got ${count}`)
})

// ============================================
// EXHIBIT REGISTRATION FOR WALKTHROUGH
// ============================================

// Helper functions for demonstrations
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function click(selector) {
  document.querySelector(selector)?.click()
}

function setInputValue(selector, value) {
  const el = document.querySelector(selector)
  if (el) {
    el.value = value
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

function setCheckbox(selector, checked) {
  const el = document.querySelector(selector)
  if (el && el.checked !== checked) {
    el.checked = checked
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

// Exhibit 1: Dice Tray
testRunner.registerExhibit(
  'Dice Tray',
  document.getElementById('exhibit-dice-tray'),
  async () => {
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
)

// Exhibit 2: Character Sheet
testRunner.registerExhibit(
  'Character Sheet',
  document.getElementById('exhibit-character-sheet'),
  async () => {
    // Add a modifier first to populate the character sheet
    click('#char-add-modifier')
    await wait(300)

    setInputValue('#mod-stat', 'strength')
    setInputValue('#mod-name', "Bull's Strength")
    setInputValue('#mod-value', '4')
    setInputValue('#mod-type', 'flat')
    setInputValue('#mod-duration', '3')
    await wait(300)

    click('#mod-add')
    await wait(500)

    // Health changes
    click('[data-health="-10"]')
    await wait(400)
    click('[data-health="-10"]')
    await wait(400)
    click('[data-health="10"]')
    await wait(400)
    click('#health-full')
    await wait(500)

    // Tick to show duration countdown
    click('#char-tick')
    await wait(400)
    click('#char-tick')
    await wait(400)
  }
)

// Exhibit 3: Skill Check Arena
testRunner.registerExhibit(
  'Skill Check Arena',
  document.getElementById('exhibit-skill-check-arena'),
  async () => {
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
)

// Exhibit 4: Loot Table
testRunner.registerExhibit(
  'Loot Table',
  document.getElementById('exhibit-loot-table'),
  async () => {
    // Spin wheel
    click('#spin-wheel')
    await wait(3500) // Wait for spin animation

    // Spin x10 for stats demonstration
    click('#spin-10')
    await wait(800)

    // Reset history
    click('#reset-history')
    await wait(300)
  }
)

// ============================================
// INITIALIZE TESTS
// ============================================

// Register integrity tests FIRST
registerIntegrityTests()
