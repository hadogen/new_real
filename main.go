package main

import (
	"encoding/json"
	"fmt"
	"log"
	database "main/Database"
	"main/handlers"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

type online struct {
	clients map[string]*websocket.Conn
	mutex   sync.Mutex
}

var onlineConnections = online{
	clients: make(map[string]*websocket.Conn),
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Error upgrading connection:", err)
		return
	}
	defer conn.Close()

	session, err := r.Cookie("session")
	if err != nil {
		log.Println("Error getting session cookie:", err)
		return
	}
	username, err := database.GetUsernameFromSession(session.Value)

	fmt.Println("Username:", username)
	if err != nil {
		fmt.Println("Error getting username from session:", err)
		return
	}

	onlineConnections.mutex.Lock()
	onlineConnections.clients[username] = conn
    fmt.Println("the username that would get stored in the onlineConnections", username)
	onlineConnections.mutex.Unlock()

	for {
		_, msg, err := conn.ReadMessage()
        if err != nil {
			log.Println("Error reading message:", err)
			break
		}

        var messageData struct {
            Type     string `json:"type"`
            Username string `json:"username"`
            Message  string `json:"message"`
            Receiver string `json:"receiver"`
            Time     string `json:"time"`
        }
        err = json.Unmarshal(msg, &messageData)
        if err != nil {
            log.Println("Error unmarshalling message:", err)
            continue
        }

        _, err = database.Db.Exec(`
            INSERT INTO private_messages (sender, receiver, message, created_at)
            VALUES (?, ?, ?, ?)
        `, messageData.Username, messageData.Receiver, messageData.Message, messageData.Time)

        if err != nil {
			log.Println("Error inserting message into the database:", err)
			break
		}

		log.Printf("Received message from %s to %s: %s", messageData.Username, messageData.Receiver, messageData.Message)

        onlineConnections.mutex.Lock()
        receiverConn, ok := onlineConnections.clients[messageData.Receiver]
        onlineConnections.mutex.Unlock()

        if ok {
            responseMessage := map[string]string{
                "type":    "private",
                "sender":  messageData.Username,
                "message": messageData.Message,
                "time":    messageData.Time,
            }

            responseMessageJSON, err := json.Marshal(responseMessage)
            if err != nil {
                log.Println("Error marshalling response message:", err)
                continue
            }

            err = receiverConn.WriteMessage(websocket.TextMessage, responseMessageJSON)
            if err != nil {
                log.Println("Error sending message to receiver:", err)
            }
        } else {
            log.Printf("Receiver %s is not online", messageData.Receiver)
        }
	}
}



func GetActiveUsers(w http.ResponseWriter, r *http.Request) {
	onlineConnections.mutex.Lock()
	defer onlineConnections.mutex.Unlock()
	var activeUsers []string
	for username := range onlineConnections.clients {
		activeUsers = append(activeUsers, username)
        fmt.Println("Active users:", activeUsers)
        fmt.Println(len(onlineConnections.clients))
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(activeUsers)
}

func main() {
	db, err := database.InitDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	


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
	http.HandleFunc("/online-users", GetActiveUsers)
	http.HandleFunc("/ws", HandleWebSocket)

	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)

	log.Println("Server started on localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
