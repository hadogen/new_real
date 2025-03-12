package websocket

import (
	"encoding/json"
	"fmt"
	"html"
	"log"
	database "main/Database"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Online struct {
	Clients map[string][]*websocket.Conn
	Mutex   sync.Mutex
}

var OnlineConnections = Online{
	Clients: make(map[string][]*websocket.Conn),
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
	OnlineConnections.Mutex.Unlock()

	BroadcastUserStatus(username, true)
	sendFullUserStatus(conn)

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var messageData struct {
			Type     string `json:"type"`
			Username string `json:"username"`
			Message  string `json:"message"`
			Receiver string `json:"receiver"`
			Time     string `json:"time"`
			Session  string `json:"session"`
		}
		err = json.Unmarshal(msg, &messageData)
		if err != nil {
			log.Println("Error unmarshalling message:", err)
			continue
		}
		if isValidSession(messageData.Session) {
			switch messageData.Type {
			case "message":
				fmt.Println("handling pm", messageData.Message)
				handlePrivateMessage(messageData)
			case "requestUsers":
				sendFullUserStatus(conn)
			}
		} else {
			conn.WriteMessage(websocket.TextMessage, []byte(`{"type": "logout"}`))
			break
		}
	}
	handleDisconnection(username, conn)
}

func handlePrivateMessage(messageData struct {
	Type     string `json:"type"`
	Username string `json:"username"`
	Message  string `json:"message"`
	Receiver string `json:"receiver"`
	Time     string `json:"time"`
	Session  string `json:"session"`
}) {
	messageData.Message = html.EscapeString(messageData.Message)
	_, err := database.Db.Exec(`
		INSERT INTO private_messages (sender, receiver, message, created_at)
		VALUES (?, ?, ?, ?)
	`, messageData.Username, messageData.Receiver, messageData.Message, time.Now().Format(time.RFC3339))

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
		newConns := make([]*websocket.Conn, 0)
		for _, c := range connections {
			if c != conn {
				newConns = append(newConns, c)
			}
		}
		OnlineConnections.Clients[username] = newConns

		if len(newConns) == 0 {
			delete(OnlineConnections.Clients, username)
			go BroadcastUserStatus(username, false)
		}
	}
}

func sendFullUserStatus(conn *websocket.Conn) {
	OnlineConnections.Mutex.Lock()
	defer OnlineConnections.Mutex.Unlock()

	allUsers, err := database.GetAllUsers()
	if err != nil {
		log.Println("Error fetching all users:", err)
		return
	}

	response := make([]map[string]any, len(allUsers))
	for i, user := range allUsers {
		response[i] = map[string]any{
			"username": user,
			"online":   len(OnlineConnections.Clients[user]) > 0,
		}
	}

	conn.WriteJSON(map[string]any{
		"type":  "fullUserStatus",
		"users": response,
	})
}

func isValidSession(sessionID string) bool {
	var dbsession string
	var expiration time.Time

	err := database.Db.QueryRow(`
		SELECT session, expiration FROM sessions 
		WHERE session = ?
	`, sessionID).Scan(&dbsession, &expiration)

	if err != nil || time.Now().After(expiration) || dbsession != sessionID {
		if err == nil {
			_, _ = database.Db.Exec("DELETE FROM sessions WHERE session = ?", sessionID)
		}
		return false
	}
	return true
}
