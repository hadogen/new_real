package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"html"
	database "main/Database"
	websocket "main/websocket"
	"net/http"
	"regexp"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
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

func ParseInput(nickname, email, firstname, lastname, password, gender string, age int) (string, bool) {
	if nickname == "" || email == "" || firstname == "" || lastname == "" || password == "" {
		return "missing input", false
	}

	if gender != "Male" && gender != "Female" {
		return "Invalid gender", false
	}

	if age < 18 || age > 100 {
		return "Age must be between 18 and 100", false
	}
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return "Invalid email format", false
	}

	nicknameRegex := regexp.MustCompile(`^[a-zA-Z0-9_-]{3,30}$`)
	if !nicknameRegex.MatchString(nickname) {
		return "Invalid nickname format", false
	}

	nameRegex := regexp.MustCompile(`^[a-zA-Z\s-]{2,50}$`)
	if !nameRegex.MatchString(firstname) || !nameRegex.MatchString(lastname) {
		return "Invalid name format", false
	}

	if len(password) < 8 {
		return "The password should at least have 8 characters", false
	}

	return "", true
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}
	var user User
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Bad request"})
		return
	}
	errmsg, resp := ParseInput(user.Nickname, user.Email, user.FirstName, user.LastName, user.Password, user.Gender, user.Age)
	if !resp {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": errmsg})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	user.Password = string(hashedPassword)

	_, err = database.Db.Exec(`
        INSERT INTO users ( nickname, email, password, age, gender, first_name, last_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, user.Nickname, user.Email, user.Password, user.Age, user.Gender, user.FirstName, user.LastName)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Internall server error"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "User registered successfully"})
}

// Login an existing user
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "method not allowed"})
		return

	}
	var credentials struct {
		Login    string `json:"login"`
		Password string `json:"password"`
	}
	err := json.NewDecoder(r.Body).Decode(&credentials)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Bad Request"})

		return
	}

	if credentials.Login == "" || credentials.Password == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Missing login or password"})
		return
	}

	var user struct {
		Nickname string
		Password string
	}
	err = database.Db.QueryRow(`
        SELECT nickname, password FROM users
        WHERE nickname = ? OR email = ?
    `, credentials.Login, credentials.Login).Scan(&user.Nickname, &user.Password)
	if err != nil {
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "User not found"})
		} else {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		}
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(credentials.Password))
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Username/email incorrect , try again"})
		return
	}

	session := uuid.New().String()
	expiration := time.Now().Add(60 * time.Minute)

	_, err = database.Db.Exec(`
        DELETE FROM sessions WHERE nickname = ?
    `, user.Nickname)
	if err != nil {
		fmt.Println("failed to delete session")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete session"})
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:    "session",
		Value:   session,
		Expires: expiration,
		Path:    "/",
	})
	fmt.Println("session created for : ",user.Nickname , session)

	_, err = database.Db.Exec(`
        INSERT INTO sessions (session, nickname, expiration)
        VALUES (?, ?, ?)
    `, session, user.Nickname, expiration)
	if err != nil {
		fmt.Println("failed to create session")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create session"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"username": user.Nickname,
	})
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {

	sessionCookie, err := r.Cookie("session")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "not auth"})
		return
	}
	username, err := database.GetUsernameFromSession(sessionCookie.Value)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not auth"})
		return
	}
	

	_, err = database.Db.Exec(`DELETE FROM sessions WHERE session = ?`, sessionCookie.Value)
	if err != nil {
		fmt.Println("failed to delete session")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "failed delete"})
		return
	}

	http.SetCookie(w, &http.Cookie{Name: "session", Value: "", MaxAge: -1})

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
		
		fmt.Println("User logged out and connection deleted :", username)
	}
	websocket.OnlineConnections.Mutex.Unlock()
	websocket.BroadcastUserStatus(username, false)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "logged out succesfully"})
}

// Create a new post
func CreatePostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method Not allowed"})
		return
	}

	sessionCookie, err := r.Cookie("session")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not auth"})

		return
	}

	username, err := database.GetUsernameFromSession(sessionCookie.Value)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not auth"})

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
		return
	}

	postID := uuid.New().String()
	createdAt := time.Now().Format(time.RFC3339)
	post.Content = html.EscapeString(post.Content)
	post.Title = html.EscapeString(post.Title)
	_, err = database.Db.Exec(`
        INSERT INTO posts (id, username, title, content, category, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `, postID, username, post.Title, post.Content, post.Category, createdAt)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	fmt.Println("Post created successfully")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Post created successfully"})
}

// Fetch all posts
func GetPostsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "method not allowed"})
		return
	}
	offset := r.URL.Query().Get("offset")
	if offset == "" {
		offset = "0"
	}

	limit := 10 // Fixed limit of 10 posts per request

	rows, err := database.Db.Query(`
        SELECT 
            p.id, 
            p.username, 
            p.title, 
            p.content, 
			p.category,
			p.created_at
        FROM posts p
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
    `, limit, offset)
	if err != nil {
		fmt.Println(err)

		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "internal server error "})
		return
	}
	defer rows.Close()

	var posts []struct {
		ID        string `json:"id"`
		Username  string `json:"username"`
		Title     string `json:"title"`
		Content   string `json:"content"`
		Category  string `json:"category"`
		CreatedAt string `json:"created_at"`
	}

	for rows.Next() {
		var post struct {
			ID        string `json:"id"`
			Username  string `json:"username"`
			Title     string `json:"title"`
			Content   string `json:"content"`
			Category  string `json:"category"`
			CreatedAt string `json:"created_at"`
		}
		err := rows.Scan(&post.ID, &post.Username, &post.Title, &post.Content,&post.Category ,&post.CreatedAt)
		if err != nil {
			fmt.Println(err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error"})
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
			Category  string `json:"category"`
			CreatedAt string `json:"created_at"`
		}{}
	}

	w.Header().Set("Content-Type", "application/json")
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
		fmt.Println(err)
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

