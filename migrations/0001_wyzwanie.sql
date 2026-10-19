-- Wyzwanie dnia: wspólna baza D1 „wyzwanie-dnia” dla Szyfranta i Sudoku
CREATE TABLE IF NOT EXISTS plansze (
  gra TEXT NOT NULL,
  dzien TEXT NOT NULL,
  dane TEXT NOT NULL,
  PRIMARY KEY (gra, dzien)
);
CREATE TABLE IF NOT EXISTS sesje (
  id TEXT PRIMARY KEY,
  gra TEXT NOT NULL,
  dzien TEXT NOT NULL,
  start INTEGER NOT NULL,
  stan TEXT NOT NULL,
  koniec INTEGER,
  czas INTEGER,
  wygrana INTEGER,
  proby INTEGER,
  zapisano INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS sesje_start ON sesje (start);
CREATE TABLE IF NOT EXISTS gracze (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  utworzono INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS wyniki (
  gra TEXT NOT NULL,
  dzien TEXT NOT NULL,
  gracz TEXT NOT NULL,
  proby INTEGER,
  czas INTEGER NOT NULL,
  zapisano INTEGER NOT NULL,
  PRIMARY KEY (gra, dzien, gracz)
);
