package middleware

import (
	"net"
	"net/http"
)

func IPWhitelist(next http.Handler, allowedIPs []string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clientIP, _, _ := net.SplitHostPort(r.RemoteAddr)

		for _, ip := range allowedIPs {
			if clientIP == ip {
				next.ServeHTTP(w, r)
				return
			}
		}

		http.Error(w, "Forbidden", http.StatusForbidden)
	})
}
