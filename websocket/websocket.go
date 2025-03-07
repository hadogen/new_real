package websocket

import (
	"encoding/json"
	"fmt"
	"log"
	database "main/Database"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

type Online struct {
	Clients map[string][]*websocket.Conn
	Mutex   sync.Mutex
}

var OnlineConnections = Online{
	Clients: map[string][]*websocket.Conn{},
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

	sessionCookie, err := r.Cookie("session")
	if err != nil {
		log.Println("Error getting session cookie:", err)
		return
	}

	username, err := database.GetUsernameFromSession(sessionCookie.Value)
	if err != nil {
		log.Println("Error getting username from session:", err)
		return
	}

	OnlineConnections.Mutex.Lock()
	OnlineConnections.Clients[username] = append(OnlineConnections.Clients[username], conn)
	fmt.Println("this user ", username, "has these connections: ", len(OnlineConnections.Clients[username]))
	OnlineConnections.Mutex.Unlock()

	BroadcastUserStatus(username, true)

	sendFullUserStatus(conn)

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

		switch messageData.Type {
		case "message":
			fmt.Println("handling pm", messageData.Message)
			handlePrivateMessage(messageData)
		case "requestUsers":
			sendFullUserStatus(conn)
		}
	}
	fmt.Println("closing connection ", username)
	handleDisconnection(username, conn)
}

func handlePrivateMessage(messageData struct {
	Type     string `json:"type"`
	Username string `json:"username"`
	Message  string `json:"message"`
	Receiver string `json:"receiver"`
	Time     string `json:"time"`
}) {
	fmt.Println("messageData: ", messageData.Message)
	_, err := database.Db.Exec(`
		INSERT INTO private_messages (sender, receiver, message, created_at)
		VALUES (?, ?, ?, ?)
	`, messageData.Username, messageData.Receiver, messageData.Message, messageData.Time)

	if err != nil {
		log.Println("Error inserting message into the database:", err)
		return
	}

	OnlineConnections.Mutex.Lock()
	receiverConnections, ok := OnlineConnections.Clients[messageData.Receiver]
	OnlineConnections.Mutex.Unlock()

	if ok {
		for _, receiverConnection := range receiverConnections {
			responseMessage := map[string]string{
				"type":    "private",
				"sender":  messageData.Username,
				"message": messageData.Message,
				"time":    messageData.Time,
			}
			message, _ := json.Marshal(responseMessage)
			err := receiverConnection.WriteMessage(websocket.TextMessage, message)
			if err != nil {
				log.Println("Error sending message to receiver:", err)
			}
		}
	} else {
		fmt.Println(messageData.Receiver, "is not online")
	}
}

func BroadcastUserStatus(username string, online bool) {
	OnlineConnections.Mutex.Lock()
	defer OnlineConnections.Mutex.Unlock()

	msg := map[string]any{
		"type":     "userUpdate",
		"username": username,
		"online":   online,
	}
	for _, conns := range OnlineConnections.Clients {
		for _, conn := range conns {
			conn.WriteJSON(msg)
		}
	}
}

func handleDisconnection(username string, conn *websocket.Conn) {
	OnlineConnections.Mutex.Lock()
	defer OnlineConnections.Mutex.Unlock()

	if connections, ok := OnlineConnections.Clients[username]; ok {
		newConns := []*websocket.Conn{}
		for _, c := range connections {
			if c != conn {
				newConns = append(newConns, c)
			}
		}
		OnlineConnections.Clients[username] = newConns

		if len(newConns) == 0 {
			fmt.Println("loging out bcz no connections left for ", username)
			delete(OnlineConnections.Clients, username)
			go BroadcastUserStatus(username, false)
		}
	}
}

func sendFullUserStatus(conn *websocket.Conn) {
	OnlineConnections.Mutex.Lock()
	defer OnlineConnections.Mutex.Unlock()

	use, err := database.GetAllUsers()
	if err != nil {
		log.Println("Error fetching all users:", err)
		return
	}

	response := []map[string]any{}
	for _, user := range use {
		response = append(response, map[string]any{
			"username": user,
			"online":   len(OnlineConnections.Clients[user]) > 0,
		})
	}

	conn.WriteJSON(map[string]any{
		"type":  "fullUserStatus",
		"users": response,
	})
}
