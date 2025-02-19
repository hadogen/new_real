package handlers

import (
	"encoding/json"
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

	// Get username from session
	sessionCookie, err := r.Cookie("session")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	username, err := database.GetUsernameFromSession(sessionCookie.Value)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid session"})
		return
	}

	// Check if the user has already liked the comment
	var likeID string
	err = database.Db.QueryRow(`
        SELECT id FROM comment_likes
        WHERE comment_id = ? AND user_id = ?
    `, commentID, username).Scan(&likeID)
	if err == nil {
		_, err := database.Db.Exec(`
        DELETE FROM comment_likes
        WHERE comment_id = ? AND user_id = ?
    `, commentID, username)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to remove like"})
			return
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "Like removed successfully"})
		return
	}

	// Insert the like into the database
	likeID = uuid.New().String()
	_, err = database.Db.Exec(`
        INSERT INTO comment_likes (id, comment_id, user_id)
        VALUES (?, ?, ?)
    `, likeID, commentID, username)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to like comment"})
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

	// Get username from session
	sessionCookie, err := r.Cookie("session")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	username, err := database.GetUsernameFromSession(sessionCookie.Value)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid session"})
		return
	}

	// Check if the user has already disliked the comment
	var dislikeID string
	err = database.Db.QueryRow(`
        SELECT id FROM comment_dislikes
        WHERE comment_id = ? AND user_id = ?
    `, commentID, username).Scan(&dislikeID)
	if err == nil {
		_, err := database.Db.Exec(`
        DELETE FROM comment_dislikes
        WHERE comment_id = ? AND user_id = ?
    `, commentID, username)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to remove dislike"})
			return
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "Dislike removed successfully"})
		return
	}

	// Insert the dislike into the database
	dislikeID = uuid.New().String()
	_, err = database.Db.Exec(`
        INSERT INTO comment_dislikes (id, comment_id, user_id)
        VALUES (?, ?, ?)
    `, dislikeID, commentID, username)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to dislike comment"})
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
	sessionCookie, err := r.Cookie("session")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Cookie not found"})
		return
	}
	username, err := database.GetUsernameFromSession(sessionCookie.Value)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Cookie not found in database"})
		return
	}

	commentID := uuid.New().String()
	createdAt := time.Now().Format(time.RFC3339)

	_, err = database.Db.Exec(`
        INSERT INTO comments (id, post_id,  username, content, created_at)
        VALUES (?, ?, ?, ?, ?)
    `, commentID, comment.PostID,  username, comment.Content, createdAt)
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

	// Get username from session
	sessionCookie, err := r.Cookie("session")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	username, err := database.GetUsernameFromSession(sessionCookie.Value)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid session"})
		return
	}

	// Check if the user has already liked the post
	var likeID string
	err = database.Db.QueryRow(`
        SELECT id FROM post_likes
        WHERE post_id = ? AND user_id = ?
    `, postID, username).Scan(&likeID)
	if err == nil {
		_, err := database.Db.Exec(`
        DELETE FROM post_likes
        WHERE post_id = ? AND user_id = ?
    `, postID, username)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to remove like"})
			return
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "Like removed successfully"})
		return
	}

	// Insert the like into the database
	likeID = uuid.New().String()
	_, err = database.Db.Exec(`
        INSERT INTO post_likes (id, post_id, user_id)
        VALUES (?, ?, ?)
    `, likeID, postID, username)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to like post"})
		return
	}

	w.WriteHeader(http.StatusOK)
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

	// Get username from session
	sessionCookie, err := r.Cookie("session")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	username, err := database.GetUsernameFromSession(sessionCookie.Value)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid session"})
		return
	}

	// Check if the user has already disliked the post
	var dislikeID string
	err = database.Db.QueryRow(`
        SELECT id FROM post_dislikes
        WHERE post_id = ? AND user_id = ?
    `, postID, username).Scan(&dislikeID)
	if err == nil {
		_, err := database.Db.Exec(`
        DELETE FROM post_dislikes
        WHERE post_id = ? AND user_id = ?
    `, postID, username)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to remove dislike"})
			return
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "Dislike removed successfully"})
		return
	}

	// Insert the dislike into the database
	dislikeID = uuid.New().String()
	_, err = database.Db.Exec(`
        INSERT INTO post_dislikes (id, post_id, user_id)
        VALUES (?, ?, ?)
    `, dislikeID, postID, username)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to dislike post"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Post disliked successfully"})
}
