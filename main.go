package main

import (
	"log"
	database "main/Database"
	"main/auth"
	"main/handlers"
	websocket "main/websocket"
	"net/http"
)

func main() {
	db, err := database.InitDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	http.HandleFunc("/register", handlers.RegisterHandler)
	http.HandleFunc("/login", handlers.LoginHandler)
	http.HandleFunc("/logout", handlers.LogoutHandler)

	http.HandleFunc("/posts", auth.Middleware(handlers.GetPostsHandler))
	http.HandleFunc("/posts/create", auth.Middleware(handlers.CreatePostHandler))
	http.HandleFunc("/posts/like", auth.Middleware(handlers.LikePostHandler))
	http.HandleFunc("/posts/category", auth.Middleware(handlers.GetPostsByCategoryHandler))
	http.HandleFunc("/posts/created", auth.Middleware(handlers.GetPostsByUserHandler))
	http.HandleFunc("/posts/liked", auth.Middleware(handlers.GetLikedPostsHandler))
	http.HandleFunc("/posts/dislike", auth.Middleware(handlers.DislikePostHandler))
    
	http.HandleFunc("/comments/create", auth.Middleware(handlers.CreateCommentHandler))
	http.HandleFunc("/comments", auth.Middleware(handlers.GetCommentsHandler))
	http.HandleFunc("/comments/like", auth.Middleware(handlers.LikeCommentHandler))
	http.HandleFunc("/comments/dislike", auth.Middleware(handlers.DislikeCommentHandler))

	http.HandleFunc("/private-messages", auth.Middleware(handlers.GetPrivateMessagesHandler))
	http.HandleFunc("/online-users", auth.Middleware(websocket.GetActiveUsers))
	http.HandleFunc("/ws", auth.Middleware(websocket.HandleWebSocket))

	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)

	log.Println("Server started on localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
