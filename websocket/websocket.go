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

	OnlineConnections.Mutex.Lock()
	OnlineConnections.Clients[username] = append(OnlineConnections.Clients[username], conn)
	OnlineConnections.Mutex.Unlock()
	
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

		receiverConnections, ok := OnlineConnections.Clients[messageData.Receiver]
		//check if the user/sender logs out all connections get deleted 
		//if the receiver is loged out the message should still be added to the database and not shown for that connection but when he fetches the messages all the
		if ok {
			for _, receiverConnection := range receiverConnections {
				responseMessage := map[string]string{
					"type":    "private",
					"sender":  messageData.Username,
					"message": messageData.Message,
					"time":    messageData.Time,
				}
				message, _:= json.Marshal(responseMessage)
				err := receiverConnection.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					log.Println("error sending message")
				}
			}
		} else {
			log.Printf("Receiver %s is not online", messageData.Receiver)
		}
	}
	var temp []*websocket.Conn

	if len(OnlineConnections.Clients[username])==1 {
		OnlineConnections.Mutex.Lock()
		delete(OnlineConnections.Clients, username)
		OnlineConnections.Mutex.Unlock()
	}else{
		for _, activeConn := range OnlineConnections.Clients[username] {
			if activeConn.RemoteAddr().String() != conn.RemoteAddr().String() {
				temp = append(temp, activeConn)
			}
		}
		OnlineConnections.Mutex.Lock()
		OnlineConnections.Clients[username] = temp
		OnlineConnections.Mutex.Unlock()

	}
}

func GetActiveUsers(w http.ResponseWriter, r *http.Request) {
	OnlineConnections.Mutex.Lock()
	defer OnlineConnections.Mutex.Unlock()
	var activeUsers []string
	for username := range OnlineConnections.Clients {
		activeUsers = append(activeUsers, username)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(activeUsers)
}
