package auth

import (
	"encoding/json"
	"fmt"
	"log"
	database "main/Database"
	"net/http"
	"time"
)

func Middleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sessionCookie, err := r.Cookie("session")
		if err != nil {
			log.Println("No session cookie found")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error" : "Not authorized"})
			return
		}

		var nickname string
		var dbsession string
		var expiration time.Time
		err = database.Db.QueryRow(`
			SELECT nickname, session, expiration FROM sessions 
			WHERE session = ?
		`, sessionCookie.Value).Scan(&nickname, &dbsession, &expiration)

		if err != nil || time.Now().After(expiration) || dbsession != sessionCookie.Value {
			if err == nil {
				_, _ = database.Db.Exec("DELETE FROM sessions WHERE session = ?", sessionCookie.Value)
			}
			log.Println("Invalid session")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error" : "Not authorized"})
			return
		}

		next(w, r)
	}
}

func AutoLoginHandler(w http.ResponseWriter, r *http.Request) {
	sessionCookie, err := r.Cookie("session")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error" : "Not authorized"})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	var username string
	err = database.Db.QueryRow(`
		SELECT nickname FROM sessions 
		WHERE session = ? AND expiration > ?
	`, sessionCookie.Value, time.Now()).Scan(&username)

	if err != nil {
		fmt.Println("Error getting username from session:", err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error" : "Not authorized"})
		return
	}
	fmt.Println("Auto login successful")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"username": username})
}
