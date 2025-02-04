package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	database "main/Database"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"golang.org/x/crypto/bcrypt"
)

// User represents a user in the system
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

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to hash password"})
		return
	}
	user.Password = string(hashedPassword)

	// Generate a unique ID
	user.ID = uuid.New().String()

	// Insert the user into the database
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

	// Fetch the user from the database
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
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch user"})
		}
		return
	}

	// Compare the password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(credentials.Password))
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid password"})
		return
	}
	// session := uuid.New().String()
	// http.SetCookie(w, &http.Cookie{
	//     Name:  "session",
	//     Value: session,
	//     Expires: time.Now().Add(24 * time.Hour),
	// })
	// Set session cookies
	http.SetCookie(w, &http.Cookie{
		Name:  "user_id",
		Value: user.ID,
		Path:  "/",
	})
	http.SetCookie(w, &http.Cookie{
		Name:  "username",
		Value: user.Nickname,
		Path:  "/",
	})

	// Return a success response
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message":  "Login successful",
		"user_id":  user.ID,
		"username": user.Nickname,
	})
}

// Create a new post
func CreatePostHandler(w http.ResponseWriter, r *http.Request) {
	var post struct {
		Title    string `json:"title"`
		Content  string `json:"content"`
		Category string `json:"category"`
	}
	err := json.NewDecoder(r.Body).Decode(&post)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	// Get the user ID and username from the session
	userID := r.Header.Get("User-ID")
	username := r.Header.Get("Username")
	if userID == "" || username == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	// Generate a unique ID for the post
	postID := uuid.New().String()
	createdAt := time.Now().Format(time.RFC3339)

	// Insert the post into the database
	_, err = database.Db.Exec(`
        INSERT INTO posts (id, user_id, username, title, content, category, created_at)
        VALUES (?, ?, ?, ?, ?, ?,?)
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
    userID := r.Header.Get("User-ID")
    if userID == "" {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
        return
    }

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

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(posts)
}


// Like a comment
func LikeCommentHandler(w http.ResponseWriter, r *http.Request) {
	commentID := r.URL.Query().Get("comment_id")
	if commentID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Comment ID is required"})
		return
	}

	// Get the user ID from the session
	userID := r.Header.Get("User-ID")
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	// Check if the user has already liked the comment
	var likeID string
	err := database.Db.QueryRow(`
        SELECT id FROM comment_likes
        WHERE comment_id = ? AND user_id = ?
    `, commentID, userID).Scan(&likeID)
	if err == nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "You have already liked this comment"})
		return
	}

	// Insert the like into the database
	likeID = uuid.New().String()
	_, err = database.Db.Exec(`
        INSERT INTO comment_likes (id, comment_id, user_id)
        VALUES (?, ?, ?)
    `, likeID, commentID, userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to like comment: " + err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Comment liked successfully"})
}

// Dislike a comment
func DislikeCommentHandler(w http.ResponseWriter, r *http.Request) {
	commentID := r.URL.Query().Get("comment_id")
	if commentID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Comment ID is required"})
		return
	}

	// Get the user ID from the session
	userID := r.Header.Get("User-ID")
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	// Check if the user has already disliked the comment
	var dislikeID string
	err := database.Db.QueryRow(`
        SELECT id FROM comment_dislikes
        WHERE comment_id = ? AND user_id = ?
    `, commentID, userID).Scan(&dislikeID)
	if err == nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "You have already disliked this comment"})
		return
	}

	// Insert the dislike into the database
	dislikeID = uuid.New().String()
	_, err = database.Db.Exec(`
        INSERT INTO comment_dislikes (id, comment_id, user_id)
        VALUES (?, ?, ?)
    `, dislikeID, commentID, userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to dislike comment: " + err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Comment disliked successfully"})
}

// Create a comment
func CreateCommentHandler(w http.ResponseWriter, r *http.Request) {
	var comment struct {
		PostID  string `json:"post_id"`
		Content string `json:"content"`
	}
	err := json.NewDecoder(r.Body).Decode(&comment)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	// Get the user ID and username from the session
	userID := r.Header.Get("User-ID")
	username := r.Header.Get("Username")
	if userID == "" || username == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	// Generate a unique ID for the comment
	commentID := uuid.New().String()
	createdAt := time.Now().Format(time.RFC3339)

	// Insert the comment into the database
	_, err = database.Db.Exec(`
        INSERT INTO comments (id, post_id, user_id, username, content, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `, commentID, comment.PostID, userID, username, comment.Content, createdAt)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create comment: " + err.Error()})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Comment created successfully"})
}

// Fetch comments for a post
func GetCommentsHandler(w http.ResponseWriter, r *http.Request) {
	postID := r.URL.Query().Get("post_id")
	if postID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Post ID is required"})
		return
	}

	rows, err := database.Db.Query(`
        SELECT 
            c.id, 
            c.username, 
            c.content, 
            c.created_at,
            (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) AS likes,
            (SELECT COUNT(*) FROM comment_dislikes WHERE comment_id = c.id) AS dislikes
        FROM comments c
        WHERE c.post_id = ?
        ORDER BY c.created_at DESC
    `, postID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch comments: " + err.Error()})
		return
	}
	defer rows.Close()

	var comments []struct {
		ID        string `json:"id"`
		Username  string `json:"username"`
		Content   string `json:"content"`
		CreatedAt string `json:"created_at"`
		Likes     int    `json:"likes"`
		Dislikes  int    `json:"dislikes"`
	}
	for rows.Next() {
		var comment struct {
			ID        string `json:"id"`
			Username  string `json:"username"`
			Content   string `json:"content"`
			CreatedAt string `json:"created_at"`
			Likes     int    `json:"likes"`
			Dislikes  int    `json:"dislikes"`
		}
		err := rows.Scan(&comment.ID, &comment.Username, &comment.Content, &comment.CreatedAt, &comment.Likes, &comment.Dislikes)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to scan comment: " + err.Error()})
			return
		}
		comments = append(comments, comment)
	}

	// Return an empty array if no comments are found
	if comments == nil {
		comments = []struct {
			ID        string `json:"id"`
			Username  string `json:"username"`
			Content   string `json:"content"`
			CreatedAt string `json:"created_at"`
			Likes     int    `json:"likes"`
			Dislikes  int    `json:"dislikes"`
		}{}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(comments)
}

// Like a post

func LikePostHandler(w http.ResponseWriter, r *http.Request) {
	postID := r.URL.Query().Get("post_id")
	if postID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Post ID is required"})
		return
	}

	// Get the user ID from the session
	userID := r.Header.Get("User-ID")
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	// Check if the user has already liked the post
	var likeID string
	err := database.Db.QueryRow(`
        SELECT id FROM post_likes
        WHERE post_id = ? AND user_id = ?
    `, postID, userID).Scan(&likeID)
	if err == nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "You have already liked this post"})
		return
	}

	// Insert the like into the database
	likeID = uuid.New().String()
	_, err = database.Db.Exec(`
        INSERT INTO post_likes (id, post_id, user_id)
        VALUES (?, ?, ?)
    `, likeID, postID, userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to like post: " + err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Post liked successfully"})
}

// Dislike a post
func DislikePostHandler(w http.ResponseWriter, r *http.Request) {
	postID := r.URL.Query().Get("post_id")
	if postID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Post ID is required"})
		return
	}

	// Get the user ID from the session
	userID := r.Header.Get("User-ID")
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	// Check if the user has already disliked the post
	var dislikeID string
	err := database.Db.QueryRow(`
        SELECT id FROM post_dislikes
        WHERE post_id = ? AND user_id = ?
    `, postID, userID).Scan(&dislikeID)
	if err == nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "You have already disliked this post"})
		return
	}

	// Insert the dislike into the database
	dislikeID = uuid.New().String()
	_, err = database.Db.Exec(`
        INSERT INTO post_dislikes (id, post_id, user_id)
        VALUES (?, ?, ?)
    `, dislikeID, postID, userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to dislike post: " + err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Post disliked successfully"})
}

// Get posts by category
func GetPostsByCategoryHandler(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	fmt.Println(category)
	if category == "" {
		GetPostsHandler(w, r)
		return
	}

	rows, err := database.Db.Query(`
        SELECT 
            p.id, 
            p.username, 
            p.title, 
            p.content, 
            p.category,
            p.created_at,
            (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes,
            (SELECT COUNT(*) FROM post_dislikes WHERE post_id = p.id) AS dislikes
        FROM posts p
        WHERE p.category = ?
        ORDER BY p.created_at DESC
    `, category)
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
		Category  string `json:"category"`
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
			Category  string `json:"category"`
			CreatedAt string `json:"created_at"`
			Likes     int    `json:"likes"`
			Dislikes  int    `json:"dislikes"`
		}
		err := rows.Scan(&post.ID, &post.Username, &post.Title, &post.Content, &post.Category, &post.CreatedAt, &post.Likes, &post.Dislikes)
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
			Category  string `json:"category"`
			CreatedAt string `json:"created_at"`
			Likes     int    `json:"likes"`
			Dislikes  int    `json:"dislikes"`
		}{}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(posts)
}

// Get posts created by the logged-in user
func GetPostsByUserHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "User ID is required"})
		return
	}

	rows, err := database.Db.Query(`
        SELECT 
            p.id, 
            p.username, 
            p.title, 
            p.content, 
            p.category, 
            p.created_at,
            (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes,
            (SELECT COUNT(*) FROM post_dislikes WHERE post_id = p.id) AS dislikes
        FROM posts p
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
    `, userID)
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
		Category  string `json:"category"`
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
			Category  string `json:"category"`
			CreatedAt string `json:"created_at"`
			Likes     int    `json:"likes"`
			Dislikes  int    `json:"dislikes"`
		}
		err := rows.Scan(&post.ID, &post.Username, &post.Title, &post.Content, &post.Category, &post.CreatedAt, &post.Likes, &post.Dislikes)
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
			Category  string `json:"category"`
			CreatedAt string `json:"created_at"`
			Likes     int    `json:"likes"`
			Dislikes  int    `json:"dislikes"`
		}{}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(posts)
}

// Get posts liked by the logged-in user
func GetLikedPostsHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "User ID is required"})
		return
	}

	rows, err := database.Db.Query(`
        SELECT 
            p.id, 
            p.username, 
            p.title, 
            p.content, 
            p.category, 
            p.created_at,
            (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes,
            (SELECT COUNT(*) FROM post_dislikes WHERE post_id = p.id) AS dislikes
        FROM posts p
        INNER JOIN post_likes pl ON p.id = pl.post_id
        WHERE pl.user_id = ?
        ORDER BY p.created_at DESC
    `, userID)
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
		Category  string `json:"category"`
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
			Category  string `json:"category"`
			CreatedAt string `json:"created_at"`
			Likes     int    `json:"likes"`
			Dislikes  int    `json:"dislikes"`
		}
		err := rows.Scan(&post.ID, &post.Username, &post.Title, &post.Content, &post.Category, &post.CreatedAt, &post.Likes, &post.Dislikes)
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
			Category  string `json:"category"`
			CreatedAt string `json:"created_at"`
			Likes     int    `json:"likes"`
			Dislikes  int    `json:"dislikes"`
		}{}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(posts)
}

var Clients = make(map[string]*websocket.Conn) // Map to store connected clients

func GetOnlineUsersHandler(w http.ResponseWriter, r *http.Request) {
	var users []struct {
		ID       string `json:"id"`
		Username string `json:"username"`
	}

	for userID, conn := range Clients { // `clients` map from main.go
		if conn != nil {
			var username string
			err := database.Db.QueryRow("SELECT nickname FROM users WHERE id = ?", userID).Scan(&username)
			if err == nil {
				users = append(users, struct {
					ID       string `json:"id"`
					Username string `json:"username"`
				}{
					ID:       userID,
					Username: username,
				})
			}
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(users)
}

func GetPrivateMessagesHandler(w http.ResponseWriter, r *http.Request) {
    senderID := r.URL.Query().Get("sender_id")
    receiverID := r.URL.Query().Get("receiver_id")
    if senderID == "" || receiverID == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Sender ID and Receiver ID are required"})
        return
    }

    userID := r.Header.Get("User-ID")
    if userID == "" || (userID != senderID && userID != receiverID) {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized access"})
        return
    }

    rows, err := database.Db.Query(`
        SELECT pm.id, pm.sender_id, u.nickname AS senderUsername, pm.receiver_id, pm.content, pm.created_at
        FROM private_messages pm
        JOIN users u ON pm.sender_id = u.id
        WHERE (pm.sender_id = ? AND pm.receiver_id = ?) OR (pm.sender_id = ? AND pm.receiver_id = ?)
        ORDER BY pm.created_at DESC
        LIMIT 10
    `, senderID, receiverID, receiverID, senderID)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch messages: " + err.Error()})
        return
    }
    defer rows.Close()

    var messages []struct {
        ID             string `json:"id"`
        SenderID       string `json:"sender_id"`
        SenderUsername string `json:"senderUsername"`
        ReceiverID     string `json:"receiver_id"`
        Content        string `json:"content"`
        CreatedAt      string `json:"created_at"`
    }
    for rows.Next() {
        var msg struct {
            ID             string `json:"id"`
            SenderID       string `json:"sender_id"`
            SenderUsername string `json:"senderUsername"`
            ReceiverID     string `json:"receiver_id"`
            Content        string `json:"content"`
            CreatedAt      string `json:"created_at"`
        }
        err := rows.Scan(&msg.ID, &msg.SenderID, &msg.SenderUsername, &msg.ReceiverID, &msg.Content, &msg.CreatedAt)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Failed to scan message: " + err.Error()})
            return
        }
        messages = append(messages, msg)
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(messages)
}
