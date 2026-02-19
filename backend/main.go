package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type UploadRequest struct {
	TripNum       string `json:"tripNum"`
	OdometerPhoto string `json:"odometerPhoto"`
	CargoPhoto    string `json:"cargoPhoto"`
}

type UploadResponse struct {
	Success bool     `json:"success"`
	Paths   []string `json:"paths"`
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func decodeBase64Image(data string) ([]byte, error) {
	// Remove data URI prefix if present (e.g., "data:image/jpeg;base64,")
	if idx := strings.Index(data, ","); idx != -1 {
		data = data[idx+1:]
	}
	return base64.StdEncoding.DecodeString(data)
}

func uploadPhotosHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Limit request body to 20MB
	r.Body = http.MaxBytesReader(w, r.Body, 20<<20)

	var req UploadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if req.TripNum == "" {
		http.Error(w, "tripNum is required", http.StatusBadRequest)
		return
	}

	// Sanitize tripNum to prevent path traversal
	safeTripNum := filepath.Base(req.TripNum)
	uploadDir := filepath.Join("uploads", safeTripNum)

	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		http.Error(w, "Failed to create upload directory", http.StatusInternalServerError)
		return
	}

	var paths []string

	// Save odometer photo
	if req.OdometerPhoto != "" {
		imgBytes, err := decodeBase64Image(req.OdometerPhoto)
		if err != nil {
			http.Error(w, "Failed to decode odometer photo: "+err.Error(), http.StatusBadRequest)
			return
		}
		odometerPath := filepath.Join(uploadDir, "odometer.jpg")
		if err := os.WriteFile(odometerPath, imgBytes, 0644); err != nil {
			http.Error(w, "Failed to save odometer photo", http.StatusInternalServerError)
			return
		}
		paths = append(paths, odometerPath)
		log.Printf("Saved odometer photo: %s (%d bytes)", odometerPath, len(imgBytes))
	}

	// Save cargo photo
	if req.CargoPhoto != "" {
		imgBytes, err := decodeBase64Image(req.CargoPhoto)
		if err != nil {
			http.Error(w, "Failed to decode cargo photo: "+err.Error(), http.StatusBadRequest)
			return
		}
		cargoPath := filepath.Join(uploadDir, "cargo.jpg")
		if err := os.WriteFile(cargoPath, imgBytes, 0644); err != nil {
			http.Error(w, "Failed to save cargo photo", http.StatusInternalServerError)
			return
		}
		paths = append(paths, cargoPath)
		log.Printf("Saved cargo photo: %s (%d bytes)", cargoPath, len(imgBytes))
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(UploadResponse{
		Success: true,
		Paths:   paths,
	})
}

func servePhotoHandler(w http.ResponseWriter, r *http.Request) {
	// URL: /api/photos/{tripNum}/{filename}
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/photos/"), "/")
	if len(parts) != 2 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	tripNum := filepath.Base(parts[0])
	filename := filepath.Base(parts[1])

	filePath := filepath.Join("uploads", tripNum, filename)
	http.ServeFile(w, r, filePath)
}

func main() {
	http.HandleFunc("/api/upload-photos", corsMiddleware(uploadPhotosHandler))
	http.HandleFunc("/api/photos/", corsMiddleware(servePhotoHandler))

	port := "3000"
	fmt.Printf("Photo upload server running on http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
