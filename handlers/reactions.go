package handlers

import (
	"encoding/json"
	"html"
	database "main/Database"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// Create a comment
func CreateCommentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "bad request"})
		return
	}
	var comment struct {
		PostID  string `json:"post_id"`
		Content string `json:"content"`
	}
	err := json.NewDecoder(r.Body).Decode(&comment)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Bad request"})
		return
	}
	sessionCookie, err := r.Cookie("session")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "not auth"})

		return
	}
	username, err := database.GetUsernameFromSession(sessionCookie.Value)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "not auth"})

		return
	}

	commentID := uuid.New().String()
	createdAt := time.Now().Format(time.RFC3339)
	comment.Content = html.EscapeString(comment.Content)
	_, err = database.Db.Exec(`
        INSERT INTO comments (id, post_id,  username, content, created_at)
        VALUES (?, ?, ?, ?, ?)
    `, commentID, comment.PostID, username, comment.Content, createdAt)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "ise"})
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
		json.NewEncoder(w).Encode(map[string]string{"error": "bad request"})

		return
	}

	rows, err := database.Db.Query(`
        SELECT 
            id, 
            username, 
            content, 
            created_at
        FROM comments 
        WHERE post_id = ?
        ORDER BY created_at DESC
    `, postID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "ise"})

		return
	}
	defer rows.Close()

	var comments []struct {
		ID        string `json:"id"`
		Username  string `json:"username"`
		Content   string `json:"content"`
		CreatedAt string `json:"created_at"`
	}
	for rows.Next() {
		var comment struct {
			ID        string `json:"id"`
			Username  string `json:"username"`
			Content   string `json:"content"`
			CreatedAt string `json:"created_at"`
		}
		err := rows.Scan(&comment.ID, &comment.Username, &comment.Content, &comment.CreatedAt)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error"})
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
		}{}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(comments)
}
