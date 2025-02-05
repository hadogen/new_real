package auth

import (
	"encoding/json"
	"log"
	"net/http"
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

func Middleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sessionCookie, err := r.Cookie("session")
		if err != nil || sessionCookie.Value == "" {
			log.Println("Unauthorized. Redirecting to login.")
			w.WriteHeader(http.StatusUnauthorized) // Return 401 status
			json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
			return
		}
		next(w, r)
	}
}
