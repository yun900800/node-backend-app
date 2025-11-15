CREATE TABLE "Book" (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  description TEXT,
  cover_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "BookReview" (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES "Book"(id) ON DELETE CASCADE,
  reviewer VARCHAR(255), -- 评论者，可以是用户名或匿名
  chapter_title VARCHAR(255),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);



CREATE TABLE book_components (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,   -- 'title' | 'end' | 'ad' | 'custom'
  content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
