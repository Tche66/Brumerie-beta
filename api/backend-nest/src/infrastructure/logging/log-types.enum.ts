export enum LogType {
  EVENT = 'event',
  ERROR = 'error',
  WORKER = 'worker',
  API = 'api',
  DEADLETTER = 'deadletter',
}

export enum LogStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  RETRYING = 'retrying',
  DEADLETTER = 'deadletter',
}