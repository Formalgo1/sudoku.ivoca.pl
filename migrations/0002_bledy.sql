-- Wyzwanie dnia: liczba błędów (Sudoku sprawdza każdą cyfrę na serwerze)
ALTER TABLE sesje ADD COLUMN bledy INTEGER;
ALTER TABLE wyniki ADD COLUMN bledy INTEGER;
