package handlers

import (
	"encoding/json"
	"fmt"
	database "main/Database"
	"net/http"
)

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
			return
		}
		posts = append(posts, post)
	}

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
	if r.Method != "GET"{
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	username := r.URL.Query().Get("username")
	if username == "" {
		w.WriteHeader(http.StatusBadRequest)
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
        WHERE p.username = ?
        ORDER BY p.created_at DESC
    `, username)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
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
		fmt.Println("posts filterd", post.ID)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		posts = append(posts, post)
	}

	// emty arr if no data
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

func GetLikedPostsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET"{
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	username := r.URL.Query().Get("username")
	if username == "" {
		w.WriteHeader(http.StatusBadRequest)
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
        WHERE pl.username = ?
        ORDER BY p.created_at DESC
    `, username)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
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
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(posts)
}