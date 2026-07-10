let dbReady = false;

export function isDatabaseReady() {
  return dbReady;
}

export function setDatabaseReady(value) {
  dbReady = value;
}
