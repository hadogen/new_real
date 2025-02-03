package database

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var Db *sql.DB

func InitDB() (*sql.DB, error) {
	var err error
	Db, err = sql.Open("sqlite3", "./Database/forum.db")
	if err != nil {
		log.Fatal(err)
		return nil, err
	}
	// Create tables
	err = createTables(Db)
	if err != nil {
		log.Fatal(err)
		return nil, err
	}
	fmt.Println("Database and tables created successfully!")
	return Db, nil
}

func createTables(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			nickname TEXT UNIQUE,
			email TEXT UNIQUE,
			password TEXT,
			age INTEGER,
			gender TEXT,
			first_name TEXT,
			last_name TEXT
		);
	`)
	if err != nil {
		return fmt.Errorf("failed to create users table: %v", err)
	}

	// Create comments table
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS comments (
		id TEXT PRIMARY KEY,
		post_id TEXT,
		user_id TEXT,
		username TEXT,
		content TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (post_id) REFERENCES posts(id),
		FOREIGN KEY (user_id) REFERENCES users(id)
	);`)
	if err != nil {
		return fmt.Errorf("failed to create comments table: %v", err)
	}
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS comment_likes (
		id TEXT PRIMARY KEY,
		comment_id TEXT,
		user_id TEXT,
		FOREIGN KEY (comment_id) REFERENCES comments(id),
		FOREIGN KEY (user_id) REFERENCES users(id)
	);`)
	if err != nil {
		return fmt.Errorf("failed to create comment_likes table: %v", err)
	}

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS comment_dislikes (
		id TEXT PRIMARY KEY,
		comment_id TEXT,
		user_id TEXT,
		FOREIGN KEY (comment_id) REFERENCES comments(id),
		FOREIGN KEY (user_id) REFERENCES users(id)
	);`)
	if err != nil {
		return fmt.Errorf("failed to create comment_dislikes table: %v", err)
	}

	// Create messages table
	_, err = db.Exec(`
	CREATE TABLE IF NOT EXISTS private_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT,
    receiver_id TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);
	`)
	if err != nil {
		return fmt.Errorf("failed to create messages table: %v", err)

	}
	_, err = db.Exec(
		`CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    username TEXT,
    title TEXT,
    content TEXT,
    category TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);`)

	if err != nil {

		return fmt.Errorf("failed to create messages table: %v", err)

	}

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS post_likes (
		id TEXT PRIMARY KEY,
		post_id TEXT,
		user_id TEXT,
		FOREIGN KEY (post_id) REFERENCES posts(id),
		FOREIGN KEY (user_id) REFERENCES users(id)
	);`)
	if err != nil {
		return fmt.Errorf("failed to create post_likes table: %v", err)
	}

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS post_dislikes (
		id TEXT PRIMARY KEY,
		post_id TEXT,
		user_id TEXT,
		FOREIGN KEY (post_id) REFERENCES posts(id),
		FOREIGN KEY (user_id) REFERENCES users(id)
	);`)
	if err != nil {
		return fmt.Errorf("failed to create post_dislikes table: %v", err)
	}
	return nil
}
