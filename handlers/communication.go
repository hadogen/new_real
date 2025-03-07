package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	database "main/Database"
	"net/http"
)

func GetPrivateMessagesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method Not allowed"})
		return
	}
	sender := r.URL.Query().Get("sender")
	receiver := r.URL.Query().Get("receiver")
	before := r.URL.Query().Get("before")

	w.Header().Set("Content-Type", "application/json")

	if sender == "" || receiver == "" {
		fmt.Println("Sender or receiver is empty")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Bad request"})
		return
	}

	var rows *sql.Rows
	var err error

	if before != "" {
		rows, err = database.Db.Query(`
            SELECT sender, receiver, message, created_at
            FROM private_messages
            WHERE ((sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?))
            AND created_at < ?
            ORDER BY created_at ASC
            LIMIT 10
        `, sender, receiver, receiver, sender, before)
	} else {
		rows, err = database.Db.Query(`
            SELECT sender, receiver, message, created_at
            FROM private_messages
            WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)
            ORDER BY created_at DESC
            LIMIT 10
        `, sender, receiver, receiver, sender)
	}

	if err != nil {
		fmt.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Interal server error"})
		return
	}
	defer rows.Close()

	messages := []map[string]string{}

	for rows.Next() {
		var sender, receiver, message, createdAt string
		err := rows.Scan(&sender, &receiver, &message, &createdAt)
		if err != nil {
			fmt.Println(err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to scan message: "})
			return
		}

		messages = append(messages, map[string]string{
			"sender":     sender,
			"receiver":   receiver,
			"message":    message,
			"created_at": createdAt,
		})
	}
	fmt.Println("messages loaded")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(messages)
}

func GetLatestMessageTimesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	username := r.URL.Query().Get("username")
	if username == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Username required"})
		return
	}

	rows, err := database.Db.Query(`
        SELECT 
            CASE 
                WHEN sender = ? THEN receiver
                ELSE sender
            END as other_user,
            MAX(created_at) as latest_message
        FROM private_messages
        WHERE sender = ? OR receiver = ?
        GROUP BY other_user
    `, username, username, username)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	latestMessages := map[string]string{}
	for rows.Next() {
		var otherUser, latestMessage string
		if err := rows.Scan(&otherUser, &latestMessage); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		latestMessages[otherUser] = latestMessage
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(latestMessages)
}
