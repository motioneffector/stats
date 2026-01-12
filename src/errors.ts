// Error classes for @motioneffector/stats

export class StatsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StatsError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ParseError extends StatsError {
  constructor(
    message: string,
    public readonly notation?: string
  ) {
    super(message)
    this.name = 'ParseError'
  }
}

export class ValidationError extends StatsError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class CircularDependencyError extends StatsError {
  constructor(
    message: string,
    public readonly cycle?: string[]
  ) {
    super(message)
    this.name = 'CircularDependencyError'
  }
}

export class VersionError extends StatsError {
  constructor(
    message: string,
    public readonly version?: number
  ) {
    super(message)
    this.name = 'VersionError'
  }
}
