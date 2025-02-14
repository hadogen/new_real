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

	if sender == "" || receiver == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Sender and Receiver are required"})
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
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch messages: " + err.Error()})
		return
	}
	defer rows.Close()

	messages := []map[string]string{}

	for rows.Next() {
		var sender, receiver, message, createdAt string
		err := rows.Scan(&sender, &receiver, &message, &createdAt)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to scan message: " + err.Error()})
			return
		}

		messages = append(messages, map[string]string{
			"sender":     sender,
			"receiver":   receiver,
			"message":    message,
			"created_at": createdAt,
		})
	}
	fmt.Printf("length of messages : %d\n", len(messages))

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(messages)
}
