package handlers

import (
	"encoding/json"
	"fmt"
	database "main/Database"
	"net/http"
)

func GetPrivateMessagesHandler(w http.ResponseWriter, r *http.Request) {
	sender := r.URL.Query().Get("sender")
	receiver := r.URL.Query().Get("receiver")

	if sender == "" || receiver == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Sender and Receiver are required"})
		return
	}

	rows, err := database.Db.Query(`
        SELECT sender, receiver, message, created_at
        FROM private_messages
        WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)
        ORDER BY created_at DESC
        LIMIT 10
    `, sender, receiver, receiver, sender)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Println("Error fetching messages:", err)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch messages: " + err.Error()})
		return
	}
	defer rows.Close()

	// ✅ Always return an array (even if no messages exist)
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

	fmt.Println("These are the messages:", messages)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(messages)
}
