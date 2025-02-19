package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	database "main/Database"
	websocket "main/websocket"
	"net/http"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID        string `json:"id"`
	Nickname  string `json:"nickname"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	Age       int    `json:"age"`
	Gender    string `json:"gender"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}
type Post struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	var user User
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to hash password"})
		return
	}
	user.Password = string(hashedPassword)

	user.ID = uuid.New().String()

	_, err = database.Db.Exec(`
        INSERT INTO users (id, nickname, email, password, age, gender, first_name, last_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, user.ID, user.Nickname, user.Email, user.Password, user.Age, user.Gender, user.FirstName, user.LastName)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to register user: " + err.Error()})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "User registered successfully"})
}

// Login an existing user
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var credentials struct {
		Login    string `json:"login"`
		Password string `json:"password"`
	}
	err := json.NewDecoder(r.Body).Decode(&credentials)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	var user struct {
		ID       string `json:"id"`
		Nickname string `json:"nickname"`
		Password string `json:"password"`
	}
	err = database.Db.QueryRow(`
        SELECT id, nickname, password FROM users
        WHERE nickname = ? OR email = ?
    `, credentials.Login, credentials.Login).Scan(&user.ID, &user.Nickname, &user.Password)
	if err != nil {
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "User not found"})
		} else {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "wrong"})
		}
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(credentials.Password))
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid password"})
		return
	}

	// Create session
	session := uuid.New().String()
	expiration := time.Now().Add(60 * time.Minute)

	_, err = database.Db.Exec(`
        DELETE FROM sessions WHERE nickname = ?
    `, user.Nickname)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete session"})
		fmt.Println("failed to delete session")
		return
	}

	// Set session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    session,
		Expires:  expiration,
		Path:     "/",
		HttpOnly: true, // Prevents JavaScript access to the cookie
		SameSite: http.SameSiteStrictMode,
	})

	// Store session in database
	_, err = database.Db.Exec(`
        INSERT INTO sessions (session, nickname, expiration)
        VALUES (?, ?, ?)
    `, session, user.Nickname, expiration)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create session"})
		fmt.Println("failed to create session")
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Login successful",
	})
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	sessionCookie, err := r.Cookie("session")
	if err != nil {
		http.Error(w, "Session not found", http.StatusUnauthorized)
		return
	}

	username, err := database.GetUsernameFromSession(sessionCookie.Value)
	if err != nil {
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	_, err = database.Db.Exec(`DELETE FROM sessions WHERE session = ?`, sessionCookie.Value)
	if err != nil {
		http.Error(w, "Failed to delete session", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{Name: "session", Value: "", Path: "/", MaxAge: -1})

	websocket.OnlineConnections.Mutex.Lock()

	if conns, ok := websocket.OnlineConnections.Clients[username]; ok {
		for _, conn := range conns {
			err := conn.Close()
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"error": "failed to close connection"})
				return
			}
		}
		delete(websocket.OnlineConnections.Clients, username)
		fmt.Println("User logged out and connection deleted:", username)
	}
	websocket.OnlineConnections.Mutex.Unlock()

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Logged out successfully"))
}

// Create a new post
func CreatePostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method Not allowed"})
		return
	}

	// Get username from session
	sessionCookie, err := r.Cookie("session")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	username, err := database.GetUsernameFromSession(sessionCookie.Value)
	if err != nil {
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	// Get user ID from database
	var userID string
	err = database.Db.QueryRow("SELECT id FROM users WHERE nickname = ?", username).Scan(&userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to get user ID"})
		return
	}

	var post struct {
		Title    string `json:"title"`
		Content  string `json:"content"`
		Category string `json:"category"`
	}
	err = json.NewDecoder(r.Body).Decode(&post)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	postID := uuid.New().String()
	createdAt := time.Now().Format(time.RFC3339)

	_, err = database.Db.Exec(`
        INSERT INTO posts (id, user_id, username, title, content, category, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, postID, userID, username, post.Title, post.Content, post.Category, createdAt)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create post: " + err.Error()})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Post created successfully"})
}

// Fetch all posts
func GetPostsHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := database.Db.Query(`
        SELECT 
            p.id, 
            p.username, 
            p.title, 
            p.content, 
            p.created_at,
            (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes,
            (SELECT COUNT(*) FROM post_dislikes WHERE post_id = p.id) AS dislikes
        FROM posts p
        ORDER BY p.created_at DESC
    `)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch posts: " + err.Error()})
		return
	}
	defer rows.Close()

	var posts []struct {
		ID        string `json:"id"`
		Username  string `json:"username"`
		Title     string `json:"title"`
		Content   string `json:"content"`
		CreatedAt string `json:"created_at"`
		Likes     int    `json:"likes"`
		Dislikes  int    `json:"dislikes"`
	}
	for rows.Next() {
		var post struct {
			ID        string `json:"id"`
			Username  string `json:"username"`
			Title     string `json:"title"`
			Content   string `json:"content"`
			CreatedAt string `json:"created_at"`
			Likes     int    `json:"likes"`
			Dislikes  int    `json:"dislikes"`
		}
		err := rows.Scan(&post.ID, &post.Username, &post.Title, &post.Content, &post.CreatedAt, &post.Likes, &post.Dislikes)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to scan post: " + err.Error()})
			return
		}
		posts = append(posts, post)
	}

	// Return an empty array if no posts are found
	if posts == nil {
		posts = []struct {
			ID        string `json:"id"`
			Username  string `json:"username"`
			Title     string `json:"title"`
			Content   string `json:"content"`
			CreatedAt string `json:"created_at"`
			Likes     int    `json:"likes"`
			Dislikes  int    `json:"dislikes"`
		}{}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(posts)
}

func GetAllUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method Not allowed"})
		return
	}
	rows, err := database.Db.Query("SELECT nickname FROM users")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Error Selecting users from database"})
	}
	var nicknames []string
	for rows.Next() {
		var nickname string
		err := rows.Scan(&nickname)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "scaning rows all users failed"})
		}
		nicknames = append(nicknames, nickname)
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(nicknames)
}
