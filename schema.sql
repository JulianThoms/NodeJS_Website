-- Database schema for the bookstore website.
-- Safe to run more than once: existing tables and rows are kept.

CREATE TABLE IF NOT EXISTS users (
  id_user SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  answer_passwort_reset TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

-- year is TEXT because the search compares it with any search term
CREATE TABLE IF NOT EXISTS books (
  id_book SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  year TEXT,
  isbn TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS users_favourites (
  id_user INTEGER NOT NULL REFERENCES users (id_user) ON DELETE CASCADE,
  id_book INTEGER NOT NULL REFERENCES books (id_book) ON DELETE CASCADE,
  PRIMARY KEY (id_user, id_book)
);

CREATE TABLE IF NOT EXISTS users_reviews (
  id_user INTEGER NOT NULL REFERENCES users (id_user) ON DELETE CASCADE,
  id_book INTEGER NOT NULL REFERENCES books (id_book) ON DELETE CASCADE,
  review TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  PRIMARY KEY (id_user, id_book)
);

-- Test account (password: "password")
INSERT INTO users (name, password, answer_passwort_reset, email)
VALUES ('Markus', '$2b$10$9M7PlJIYD7RTzL2KRTyReuLilCv4sJBCa3CMdqL9HRGfYWziS4AnS', 'Schnabeltier', 'Markus@email.de')
ON CONFLICT DO NOTHING;

-- A few sample books, more can be imported from a CSV file with import.js
INSERT INTO books (title, author, year, isbn) VALUES
  ('1984', 'George Orwell', '1949', '9780451524935'),
  ('To Kill a Mockingbird', 'Harper Lee', '1960', '9780061120084'),
  ('The Great Gatsby', 'F. Scott Fitzgerald', '1925', '9780743273565'),
  ('Pride and Prejudice', 'Jane Austen', '1813', '9780141439518'),
  ('The Hobbit', 'J. R. R. Tolkien', '1937', '9780547928227')
ON CONFLICT DO NOTHING;
