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

	err = createTables(Db)
	if err != nil {
		log.Fatal(err)
		return nil, err
	}
	return Db, nil
}

func createTables(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			nickname TEXT UNIQUE PRIMARY KEY,
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

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS comments (
		id TEXT PRIMARY KEY,
		post_id TEXT,
		username TEXT,
		content TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	
	);`)
	if err != nil {
		return fmt.Errorf("failed to create comments table: %v", err)
	}

	_, err = db.Exec(`
	CREATE TABLE IF NOT EXISTS private_messages (
		sender TEXT NOT NULL,
    	receiver TEXT	NOT NULL,
    	message TEXT NOT NULL,
    	created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);
	`)
	if err != nil {
		return fmt.Errorf("failed to create messages table: %v", err)

	}
	_, err = db.Exec(
		`CREATE TABLE IF NOT EXISTS posts (
   	id TEXT PRIMARY KEY NOT NULL,
    username TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`)

	if err != nil {

		return fmt.Errorf("failed to create messages table: %v", err)

	}

	_,err = db.Exec(`CREATE TABLE IF NOT EXISTS sessions (
		id integer PRIMARY KEY autoincrement,
		nickname TEXT,
		session TEXT,
		expiration DATETIME
	);`)
	if err != nil {
		return fmt.Errorf("failed to create sessions table: %v", err)
	}
	return nil
}


func GetUsernameFromSession(session string) (string, error) {
	var username string
	err := Db.QueryRow(`
		SELECT nickname FROM sessions
		WHERE session = ?
	`, session).Scan(&username)
	if err != nil {
		return "", err
	}
	return username, nil
}

func GetAllUsers() ([]string, error) {
    rows, err := Db.Query("SELECT nickname FROM users")
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var users []string
    for rows.Next() {
        var username string
        if err = rows.Scan(&username); err != nil {
            return nil, err
        }
        users = append(users, username)
    }

    return users, nil
}