package handlers

import (
	"encoding/json"
	"fmt"
	database "main/Database"
	"net/http"
	"time"

	"github.com/google/uuid"
)

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
	fmt.Println("postid" , postID)
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
