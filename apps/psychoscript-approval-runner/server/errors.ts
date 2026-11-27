export class RunError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "RunError"
    this.status = status
  }
}
