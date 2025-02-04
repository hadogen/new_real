package main

import (
	"log"
	database "main/Database"
	handlers "main/handlers"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all connections
	},
}

// WebSocket connection handler

func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println("WebSocket upgrade failed:", err)
        return
    }
    defer conn.Close()

    userID := r.URL.Query().Get("user_id")
    if userID == "" {
        log.Println("User ID is required")
        return
    }

    var username string
    err = database.Db.QueryRow("SELECT nickname FROM users WHERE id = ?", userID).Scan(&username)
    if err != nil {
        log.Println("Failed to fetch username:", err)
        return
    }

    handlers.Clients[userID] = conn // Store WebSocket connection
    log.Println("User connected:", username)

    for {
        var msg struct {
            SenderID       string `json:"sender_id"`
            SenderUsername string `json:"senderUsername"`
            ReceiverID     string `json:"receiver_id"`
            Content        string `json:"content"`
        }
        err := conn.ReadJSON(&msg)
        if err != nil {
            log.Println("WebSocket read error:", err)
            delete(handlers.Clients, userID) // Remove user if disconnected
            break
        }

        // Save message to database
        msgID := uuid.New().String()
        _, err = database.Db.Exec(`
            INSERT INTO private_messages (id, sender_id, receiver_id, content)
            VALUES (?, ?, ?, ?)
        `, msgID, msg.SenderID, msg.ReceiverID, msg.Content)
        if err != nil {
            log.Println("Failed to save message:", err)
            continue
        }

        // Send message to receiver if online
        if receiverConn, ok := handlers.Clients[msg.ReceiverID]; ok {
            err := receiverConn.WriteJSON(msg)
            if err != nil {
                log.Println("Failed to send message to receiver:", err)
            }
        }
    }
}

// Broadcast a message to the receiver
func BroadcastUserStatus(userID string, online bool) {
    for _, conn := range handlers.Clients {
        conn.WriteJSON(map[string]interface{}{
            "type": "user_status",
            "user": map[string]interface{}{
                "id":     userID,
                "online": online,
            },
        })
    }
}
func main() {
	// Initialize the database
	db, err := database.InitDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Register HTTP handlers
	http.HandleFunc("/register", handlers.RegisterHandler)
	http.HandleFunc("/login", handlers.LoginHandler)
	http.HandleFunc("/posts", handlers.GetPostsHandler)
	http.HandleFunc("/posts/create", handlers.CreatePostHandler)
	http.HandleFunc("/posts/like", handlers.LikePostHandler)
	http.HandleFunc("/posts/category", handlers.GetPostsByCategoryHandler)
	http.HandleFunc("/posts/created", handlers.GetPostsByUserHandler)
	http.HandleFunc("/posts/liked", handlers.GetLikedPostsHandler)
	http.HandleFunc("/posts/dislike", handlers.DislikePostHandler)
	http.HandleFunc("/comments/create", handlers.CreateCommentHandler)
	http.HandleFunc("/comments", handlers.GetCommentsHandler)
	http.HandleFunc("/comments/like", handlers.LikeCommentHandler)
	http.HandleFunc("/comments/dislike", handlers.DislikeCommentHandler)
	http.HandleFunc("/private-messages", handlers.GetPrivateMessagesHandler)
	http.HandleFunc("/online-users", handlers.GetOnlineUsersHandler)
	http.HandleFunc("/ws", HandleWebSocket)

	// Serve static files (frontend)
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)

	// Start the server
	log.Println("Server started on localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
