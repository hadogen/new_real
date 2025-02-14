package auth

import (
	"encoding/json"
	"log"
	database "main/Database"
	"net/http"
	"time"
)

// func Middleware(next http.HandlerFunc) http.HandlerFunc {
// 	return func(w http.ResponseWriter, r *http.Request) {
// 		sessionCookie, err := r.Cookie("session")
// 		if err != nil || sessionCookie.Value == "" {
// 			var nickname string
// 		err = Database.Db.QueryRow("SELECT nickname FROM sessions WHERE session = ?", sessionCookie.Value).Scan(&nickname)
// 		if err == sql.ErrNoRows {
// 			log.Println("Invalid session. Redirecting to login.")
// 			http.Redirect(w, r, "/login", http.StatusSeeOther)
// 			return
// 		} else if err != nil {
// 			log.Println("Database error:", err)
// 			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
// 			return
// 		}
// 			log.Println("Unauthorized. Redirecting to login.")
// 			w.WriteHeader(http.StatusUnauthorized) // Return 401 status
// 			json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
// 			return
// 		}
// 		next(w, r)
// 	}
// }
func AutoLog(next http.HandlerFunc)http.HandlerFunc{
	return func(w http.ResponseWriter, r* http.Request){
		sessionCookie , err := r.Cookie("session")
		if err!= nil{
			next(w, r)
			return
		}
		var nickname string
		var dbsession string
		var expiration time.Time
		err = database.Db.QueryRow("SELECT nickname, session, expiration FROM sessions WHERE session = ?", sessionCookie.Value).Scan(&nickname, &dbsession, &expiration)

		if err != nil || time.Now().After(expiration) {
			_, _ = database.Db.Exec("DELETE FROM sessions WHERE session = ?", sessionCookie.Value)
			next(w, r)

			return
		}
		if dbsession != sessionCookie.Value {
			next(w, r)
			return
		}
		http.Redirect(w, r, "/posts", http.StatusContinue)
	}
}
func Middleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sessionCookie, err := r.Cookie("session")

		if err != nil {
			log.Println("no cookie found")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
			return
		}

		var nickname string
		var dbsession string
		var expiration time.Time
		err = database.Db.QueryRow("SELECT nickname, session, expiration FROM sessions WHERE session = ?", sessionCookie.Value).Scan(&nickname, &dbsession, &expiration)

		if err != nil || time.Now().After(expiration) {
			_, _ = database.Db.Exec("DELETE FROM sessions WHERE session = ?", sessionCookie.Value)
			log.Println("invalid or expired session")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
			return
		}
		// Extra checking
		if dbsession != sessionCookie.Value {
			log.Println("invalid session")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
			return
		}
		next(w, r)
	}
}
