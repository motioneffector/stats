class F extends Error {
  constructor(s) {
    super(s), this.name = "StatsError", Object.setPrototypeOf(this, new.target.prototype);
  }
}
class M extends F {
  constructor(s, t) {
    super(s), this.notation = t, this.name = "ParseError";
  }
}
class T extends F {
  constructor(s, t) {
    super(s), this.field = t, this.name = "ValidationError";
  }
}
class k extends F {
  constructor(s, t) {
    super(s), this.cycle = t, this.name = "CircularDependencyError";
  }
}
class te extends F {
  constructor(s, t) {
    super(s), this.version = t, this.name = "VersionError";
  }
}
const ne = 100, L = 1e4, B = 1e6;
function re(o) {
  const s = o.trim();
  if (!s)
    throw new M("Dice notation cannot be empty", o);
  const t = s.replace(/\s+/g, "");
  if (t.match(/^-\d+[dD]/i))
    throw new M("Cannot roll negative number of dice", o);
  if (t.match(/[dD]-\d+/i))
    throw new M("Die cannot have negative sides", o);
  const h = /^(\d*)([dD])(\d+)/i, d = t.match(h);
  if (!d)
    throw new M(`Invalid dice notation: "${o}"`, o);
  const p = d[1], m = d[3];
  if (p.includes("."))
    throw new M("Dice count must be an integer", o);
  if (m.includes("."))
    throw new M("Die size must be an integer", o);
  const w = p === "" ? 1 : parseInt(p, 10), v = parseInt(m, 10);
  if (w === 0)
    throw new M("Cannot roll zero dice", o);
  if (w < 0)
    throw new M("Cannot roll negative number of dice", o);
  if (w > L)
    throw new M(`Cannot roll more than ${L} dice`, o);
  if (v === 0)
    throw new M("Die must have at least 1 side", o);
  if (v < 0)
    throw new M("Die cannot have negative sides", o);
  if (v > B)
    throw new M(`Die cannot have more than ${B} sides`, o);
  const l = t.slice(d[0].length), c = {
    count: w,
    sides: v,
    modifiers: 0,
    exploding: !1,
    rerollConditions: []
  };
  let a = 0;
  for (; a < l.length; ) {
    const f = l[a];
    if (f === "+" || f === "-") {
      const u = f === "+" ? 1 : -1;
      if (a++, a < l.length && (l[a] === "+" || l[a] === "-"))
        throw new M("Invalid modifier syntax", o);
      const x = l.slice(a).match(/^(\d+)/);
      if (!x)
        throw new M("Incomplete modifier", o);
      const V = x[1];
      if (V.includes("."))
        throw new M("Modifiers must be integers", o);
      c.modifiers += u * parseInt(V, 10), a += V.length;
      continue;
    }
    if (l.slice(a).match(/^[kK][hH]/i)) {
      a += 2;
      const u = l.slice(a).match(/^(\d+)/);
      u && (c.keepHighest = parseInt(u[1], 10), a += u[1].length);
      continue;
    }
    if (l.slice(a).match(/^[kK][lL]/i)) {
      a += 2;
      const u = l.slice(a).match(/^(\d+)/);
      u && (c.keepLowest = parseInt(u[1], 10), a += u[1].length);
      continue;
    }
    if (l.slice(a).match(/^[dD][hH]/i)) {
      a += 2;
      const u = l.slice(a).match(/^(\d+)/);
      u && (c.dropHighest = parseInt(u[1], 10), a += u[1].length);
      continue;
    }
    if (l.slice(a).match(/^[dD][lL]/i)) {
      a += 2;
      const u = l.slice(a).match(/^(\d+)/);
      u && (c.dropLowest = parseInt(u[1], 10), a += u[1].length);
      continue;
    }
    if (f === "!") {
      c.exploding = !0, a++;
      continue;
    }
    if (f === "r" || f === "R") {
      a++;
      const u = l.slice(a).match(/^(<=|>=|<|>|=)?(\d+)/);
      if (u) {
        const x = u[1] || "=", V = parseInt(u[2], 10);
        c.rerollConditions.push({ operator: x, value: V }), a += u[0].length;
      } else
        c.rerollConditions.push({ operator: "=", value: 1 });
      continue;
    }
    throw new M(`Unexpected character: "${f}"`, o);
  }
  return c;
}
function R(o) {
  return Math.floor(Math.random() * o) + 1;
}
function oe(o, s) {
  for (const t of s)
    switch (t.operator) {
      case "=":
        if (o === t.value) return !0;
        break;
      case "<":
        if (o < t.value) return !0;
        break;
      case ">":
        if (o > t.value) return !0;
        break;
      case "<=":
        if (o <= t.value) return !0;
        break;
      case ">=":
        if (o >= t.value) return !0;
        break;
    }
  return !1;
}
function ie(o, s, t) {
  const h = [];
  let d = R(o), p = 1;
  for (h.push({ value: d, exploded: !1, rerolled: !1 }); s && d === o && p < ne; )
    d = R(o), h.push({ value: d, exploded: !0, rerolled: !1 }), p++;
  if (t.length > 0) {
    const m = h.length - 1, w = h[m];
    if (oe(w.value, t)) {
      const v = w.value, l = w.exploded, c = R(o);
      h[m] = { value: v, exploded: l, rerolled: !0 }, h.push({ value: c, exploded: !1, rerolled: !1 });
    }
  }
  return h;
}
function se(o, s, t, h, d) {
  if (o.length === 0)
    return [];
  const p = [...o].sort((w, v) => w - v);
  let m = o.length;
  return s !== void 0 && (m = Math.min(m, s)), t !== void 0 && (m = Math.min(m, t)), h !== void 0 && (m = Math.min(m, o.length - h)), d !== void 0 && (m = Math.min(m, o.length - d)), m = Math.max(0, m), m === 0 ? [] : s !== void 0 || d !== void 0 ? p.slice(-m).sort((w, v) => w - v) : t !== void 0 || h !== void 0 ? p.slice(0, m) : p;
}
function S(o, s) {
  const t = re(o), h = [];
  for (let l = 0; l < t.count; l++)
    h.push(
      ie(t.sides, t.exploding, t.rerollConditions)
    );
  const d = [], p = [];
  for (const l of h) {
    for (const f of l)
      p.push(f.value);
    let c = 0, a = -1;
    for (let f = 0; f < l.length; f++)
      if (l[f].rerolled) {
        a = f;
        break;
      }
    if (a >= 0) {
      for (let f = 0; f < a; f++)
        c += l[f].value;
      a + 1 < l.length && (c += l[a + 1].value);
    } else
      c = l.reduce((f, u) => f + u.value, 0);
    d.push(c);
  }
  const m = se(
    d,
    t.keepHighest,
    t.keepLowest,
    t.dropHighest,
    t.dropLowest
  );
  return {
    total: m.reduce((l, c) => l + c, 0) + t.modifiers,
    rolls: p,
    kept: m,
    notation: o,
    modifier: t.modifiers
  };
}
function ce(o, s) {
  const t = /* @__PURE__ */ new Map(), h = [], d = [], p = /* @__PURE__ */ new Map();
  let m = !1;
  const w = (s == null ? void 0 : s.historyLimit) ?? 100, v = s == null ? void 0 : s.modifierFormula;
  for (const [e, n] of Object.entries(o)) {
    if (n.min !== void 0 && n.max !== void 0 && n.min > n.max)
      throw new T(`Min (${n.min}) cannot be greater than max (${n.max})`, e);
    let r = n.base;
    n.min !== void 0 && (r = Math.max(r, n.min)), n.max !== void 0 && (r = Math.min(r, n.max));
    const i = {
      base: r,
      modifiers: [],
      isDerived: !1
    };
    n.min !== void 0 && (i.min = n.min), n.max !== void 0 && (i.max = n.max), t.set(e, i);
  }
  if (s != null && s.fromJSON) {
    const e = s.fromJSON, n = e.version ?? 1;
    if (n !== 1)
      throw new te(`Unsupported version: ${n}`, n);
    const r = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
    for (const [i, y] of Object.entries(e.stats))
      if (!r.has(i) && Object.hasOwn(e.stats, i))
        if (t.has(i)) {
          const g = t.get(i);
          g.base = l(y, g.min, g.max);
        } else
          console.warn(`Unknown stat in JSON: ${i}`);
    for (const [i, y] of Object.entries(e.modifiers))
      if (!r.has(i) && Object.hasOwn(e.modifiers, i))
        if (t.has(i))
          for (const g of y)
            j(i, g);
        else
          console.warn(`Unknown stat in JSON modifiers: ${i}`);
  }
  function l(e, n, r) {
    let i = e;
    return n !== void 0 && (i = Math.max(i, n)), r !== void 0 && (i = Math.min(i, r)), i;
  }
  function c(e) {
    const n = t.get(e);
    if (!n) return 0;
    if (n.isDerived && n.derivedFormula)
      try {
        return n.derivedFormula(E);
      } catch (g) {
        return console.error(`Error calculating derived stat "${e}":`, g), 0;
      }
    let r = n.base;
    const i = n.modifiers.filter((g) => g.type === "flat");
    for (const g of i)
      r += g.value;
    const y = n.modifiers.filter((g) => g.type === "multiply");
    for (const g of y)
      r *= g.value;
    return r;
  }
  function a(e, n, r, i, y) {
    const g = {
      stat: e,
      oldValue: n,
      newValue: r,
      baseChanged: i,
      modifiersChanged: y
    };
    for (const b of d)
      try {
        b(g);
      } catch (O) {
        console.error("onChange callback error:", O);
      }
    const D = p.get(e);
    if (D)
      for (const b of D)
        try {
          b(g);
        } catch (O) {
          console.error("onStat callback error:", O);
        }
  }
  function f() {
    const e = /* @__PURE__ */ new Map();
    for (const [n, r] of t.entries())
      r.isDerived && e.set(n, c(n));
    return e;
  }
  function u(e) {
    for (const [n, r] of e.entries()) {
      const i = c(n);
      r !== i && a(n, r, i, !1, !1);
    }
  }
  function x(e) {
    if (t.has(e))
      return c(e);
  }
  function V(e) {
    const n = t.get(e);
    return n == null ? void 0 : n.base;
  }
  function _(e, n) {
    const r = t.get(e);
    if (!r)
      throw new TypeError(`Cannot set non-existent stat: "${e}"`);
    if (r.isDerived)
      throw new TypeError(`Cannot set derived stat "${e}"`);
    const i = c(e), y = f();
    r.base = l(n, r.min, r.max);
    const g = c(e);
    return i !== g && (a(e, i, g, !0, !1), u(y)), r.base;
  }
  function I(e, n) {
    const r = t.get(e);
    if (!r)
      throw new TypeError(`Cannot modify non-existent stat: "${e}"`);
    if (r.isDerived)
      throw new TypeError(`Cannot modify derived stat "${e}"`);
    const i = c(e), y = f();
    r.base = l(r.base + n, r.min, r.max);
    const g = c(e);
    return i !== g && (a(e, i, g, !0, !1), u(y)), r.base;
  }
  function C(e) {
    return t.has(e);
  }
  function $() {
    return Array.from(t.keys());
  }
  function j(e, n) {
    const r = t.get(e);
    if (!r)
      throw new TypeError(`Cannot add modifier to non-existent stat: "${e}"`);
    if (r.isDerived)
      throw new TypeError(`Cannot add modifier to derived stat "${e}"`);
    const i = c(e), y = f(), g = r.modifiers.findIndex((ee) => ee.source === n.source), D = n.type ?? "flat";
    let b = "permanent", O = 1 / 0;
    n.duration !== void 0 && (n.duration === "permanent" ? (b = "permanent", O = 1 / 0) : n.duration === "temporary" ? (b = 1, O = 1) : (b = n.duration, O = n.duration));
    const A = {
      value: n.value,
      source: n.source,
      type: D,
      duration: b,
      remainingDuration: O
    };
    g >= 0 ? r.modifiers[g] = A : r.modifiers.push(A);
    const P = c(e);
    return i !== P && (a(e, i, P, !1, !0), u(y)), {
      value: n.value,
      source: n.source,
      type: D,
      duration: n.duration ?? "permanent"
    };
  }
  function H(e, n) {
    const r = t.get(e);
    if (!r) return !1;
    const i = c(e), y = f(), g = r.modifiers.length;
    r.modifiers = r.modifiers.filter((b) => b.source !== n);
    const D = r.modifiers.length < g;
    if (D) {
      const b = c(e);
      i !== b && (a(e, i, b, !1, !0), u(y));
    }
    return D;
  }
  function J(e) {
    const n = t.get(e);
    if (n)
      return n.modifiers.map((r) => ({
        value: r.value,
        source: r.source,
        type: r.type,
        duration: r.remainingDuration === 1 / 0 ? "permanent" : r.remainingDuration
      }));
  }
  function K(e) {
    let n = 0;
    if (e !== void 0) {
      const r = t.get(e);
      if (r) {
        const i = c(e), y = f();
        n = r.modifiers.length, r.modifiers = [];
        const g = c(e);
        i !== g && n > 0 && (a(e, i, g, !1, !0), u(y));
      }
    } else {
      const r = f();
      for (const [i, y] of t.entries()) {
        const g = c(i), D = y.modifiers.length;
        y.modifiers = [], n += D;
        const b = c(i);
        g !== b && D > 0 && a(i, g, b, !1, !0);
      }
      u(r);
    }
    return n;
  }
  function U(e, n) {
    const r = t.get(e);
    if (!r) return;
    const i = r.modifiers.find((y) => y.source === n);
    if (i)
      return i.remainingDuration === 1 / 0 ? 1 / 0 : i.remainingDuration;
  }
  function X() {
    const e = [], n = f();
    for (const [r, i] of t.entries()) {
      const y = [], g = c(r);
      for (const D of i.modifiers)
        D.remainingDuration !== 1 / 0 && (D.remainingDuration--, D.remainingDuration <= 0 && (y.push(D.source), e.push(D.source)));
      if (y.length > 0) {
        i.modifiers = i.modifiers.filter((b) => !y.includes(b.source));
        const D = c(r);
        g !== D && a(r, g, D, !1, !0);
      }
    }
    return u(n), e;
  }
  function z(e) {
    return w === 0 ? [] : e === void 0 ? [...h] : h.slice(0, e);
  }
  function Y() {
    h.length = 0;
  }
  function W(e) {
    return d.push(e), () => {
      const n = d.indexOf(e);
      n >= 0 && d.splice(n, 1);
    };
  }
  function q(e, n) {
    if (!t.get(e))
      throw new TypeError(`Cannot listen to non-existent stat: "${e}"`);
    return p.has(e) || p.set(e, []), p.get(e).push(n), () => {
      const i = p.get(e);
      if (i) {
        const y = i.indexOf(n);
        y >= 0 && i.splice(y, 1);
      }
    };
  }
  function G(e) {
    const n = t.get(e);
    return (n == null ? void 0 : n.isDerived) ?? !1;
  }
  function Q() {
    const e = {}, n = {};
    for (const [r, i] of t.entries())
      i.isDerived || (e[r] = i.base, i.modifiers.length > 0 && (n[r] = i.modifiers.map((y) => ({
        value: y.value,
        source: y.source,
        type: y.type,
        duration: y.remainingDuration === 1 / 0 ? "permanent" : y.remainingDuration
      }))));
    return {
      version: 1,
      stats: e,
      modifiers: n
    };
  }
  function Z(e, n) {
    t.set(e, {
      base: 0,
      modifiers: [],
      isDerived: !0,
      derivedFormula: n
    });
  }
  function N() {
    m = !0, d.length = 0, p.clear(), h.length = 0;
    for (const [, e] of t.entries())
      e.modifiers = [], e.derivedFormula && delete e.derivedFormula;
    t.clear(), E._derivedDependencies && (E._derivedDependencies.clear(), delete E._derivedDependencies), delete E._addDerivedStat, delete E._modifierFormula;
  }
  const E = {
    get: x,
    getBase: V,
    set: _,
    modify: I,
    has: C,
    stats: $,
    addModifier: j,
    removeModifier: H,
    getModifiers: J,
    clearModifiers: K,
    getRemainingDuration: U,
    tick: X,
    getRollHistory: z,
    clearRollHistory: Y,
    onChange: W,
    onStat: q,
    isDerived: G,
    toJSON: Q,
    dispose: N
  };
  return E._addDerivedStat = Z, E._modifierFormula = v, Object.defineProperty(E, "_isDisposed", {
    get: () => m,
    enumerable: !1,
    configurable: !0
  }), E;
}
function ae(o, s, t) {
  const h = o.get(s);
  if (h === void 0)
    throw new TypeError(`Cannot check non-existent stat: "${s}"`);
  let d;
  if (t.modifier !== void 0)
    d = t.modifier;
  else {
    const f = o._modifierFormula;
    f ? d = f(h) : d = Math.floor((h - 10) / 2);
  }
  const p = t.bonus ?? 0, m = t.dice ?? "1d20";
  let w, v;
  if (t.advantage && t.disadvantage) {
    const f = S(m);
    w = f.rolls, v = f.total - f.modifier;
  } else if (t.advantage) {
    const f = S(m), u = S(m), x = f.total - f.modifier, V = u.total - u.modifier;
    w = [x, V], v = Math.max(x, V);
  } else if (t.disadvantage) {
    const f = S(m), u = S(m), x = f.total - f.modifier, V = u.total - u.modifier;
    w = [x, V], v = Math.min(x, V);
  } else {
    const f = S(m);
    w = f.rolls, v = f.total - f.modifier;
  }
  const l = v + d + p, c = l >= t.difficulty, a = l - t.difficulty;
  return {
    success: c,
    roll: v,
    rolls: w,
    modifier: d,
    bonus: p,
    total: l,
    difficulty: t.difficulty,
    margin: a
  };
}
function le(o, s, t) {
  const h = o;
  h._derivedDependencies || (h._derivedDependencies = /* @__PURE__ */ new Map());
  const d = /* @__PURE__ */ new Set(), p = [], m = (v, l = /* @__PURE__ */ new Set()) => {
    if (l.has(v))
      return /* @__PURE__ */ new Set();
    l.add(v);
    const c = h._derivedDependencies.get(v);
    if (!c)
      return /* @__PURE__ */ new Set();
    const a = new Set(c);
    for (const f of c) {
      const u = m(f, l);
      for (const x of u)
        a.add(x);
    }
    return a;
  }, w = new Proxy(o, {
    get(v, l) {
      return v._isDisposed ? l === "get" ? () => {
      } : void 0 : l === "get" ? (c) => {
        if (c === s)
          throw p.push(s), new k("Circular dependency detected in derived stat", p);
        d.add(c);
        const a = m(c);
        if (a.has(s))
          throw p.push(c, ...Array.from(a), s), new k("Circular dependency detected in derived stat", p);
        return v.get(c);
      } : v[l];
    }
  });
  try {
    t(w);
  } catch (v) {
    if (v instanceof k)
      throw v;
  }
  return h._derivedDependencies.set(s, d), h._addDerivedStat && h._addDerivedStat(s, t), {
    getValue: () => {
      try {
        return t(o);
      } catch (v) {
        return console.error(`Error calculating derived stat "${s}":`, v), 0;
      }
    }
  };
}
function fe(o, s, t) {
  return ae(o, s, { difficulty: t }).success;
}
function de(o, s, t, h, d) {
  const p = (d == null ? void 0 : d.dice) ?? "1d20";
  let m, w;
  if (typeof o == "number" && typeof s == "number")
    m = o, w = s;
  else if (typeof o == "object" && typeof s == "string" && t && typeof h == "string") {
    const _ = o.get(s), I = t.get(h);
    if (_ === void 0)
      throw new TypeError(`Cannot contest with non-existent stat: "${s}"`);
    if (I === void 0)
      throw new TypeError(`Cannot contest with non-existent stat: "${h}"`);
    const C = o._modifierFormula, $ = t._modifierFormula;
    m = C ? C(_) : Math.floor((_ - 10) / 2), w = $ ? $(I) : Math.floor((I - 10) / 2);
  } else
    throw new TypeError("Invalid contest arguments");
  const v = S(p), l = S(p), c = v.total - v.modifier, a = l.total - l.modifier, f = c + m, u = a + w;
  let x;
  f > u ? x = "a" : u > f ? x = "b" : x = "tie";
  const V = Math.abs(f - u);
  return {
    winner: x,
    rolls: { a: c, b: a },
    totals: { a: f, b: u },
    margin: V
  };
}
function ue(o) {
  if (o.length === 0)
    throw new T("Roll table cannot be empty");
  for (const d of o)
    if (d.weight < 0)
      throw new T("Roll table weights cannot be negative");
  const s = o.reduce((d, p) => d + p.weight, 0);
  if (s === 0)
    throw new T("Roll table must have at least one non-zero weight");
  const t = Math.random() * s;
  let h = 0;
  for (const d of o)
    if (h += d.weight, t < h)
      return d.value;
  return o[o.length - 1].value;
}
function he(o) {
  const { stats: s, options: t } = o;
  function h(d) {
    const p = {}, m = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
    for (const [w, v] of Object.entries(s)) {
      let l = v.default;
      d && w in d && !m.has(w) && Object.hasOwn(d, w) && (l = d[w]);
      const c = { base: l };
      v.min !== void 0 && (c.min = v.min), v.max !== void 0 && (c.max = v.max), p[w] = c;
    }
    if (d)
      for (const w of Object.keys(d))
        m.has(w) || Object.hasOwn(d, w) && (w in s || console.warn(`Override for unknown stat: ${w}`));
    return ce(p, t);
  }
  return {
    create: h
  };
}
export {
  k as CircularDependencyError,
  M as ParseError,
  T as ValidationError,
  te as VersionError,
  ae as check,
  de as contest,
  le as createDerivedStat,
  ce as createStatBlock,
  he as createStatTemplate,
  S as roll,
  ue as rollTable,
  fe as saveThrow
};
