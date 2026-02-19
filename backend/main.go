package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
	"github.com/joho/godotenv"
)

type UploadRequest struct {
	TripNum       string `json:"tripNum"`
	OdometerPhoto string `json:"odometerPhoto"`
	CargoPhoto    string `json:"cargoPhoto"`
}

type UploadResponse struct {
	Success bool     `json:"success"`
	FileIDs []string `json:"fileIds"`
}

var driveService *drive.Service

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

func initDriveService() error {
	ctx := context.Background()

	credPath := ""
	if credPath == "" {
		credPath = `.\credentials\ascendant-epoch-465502-n6-169af5e4409a_epicor.admin.sgi.gdrive.account.json`
	}

	b, err := os.ReadFile(credPath)
	if err != nil {
		return fmt.Errorf("failed to read service account credentials: %w", err)
	}

	creds, err := google.CredentialsFromJSON(ctx, b, drive.DriveScope)
	if err != nil {
		return fmt.Errorf("failed to parse credentials: %w", err)
	}

	svc, err := drive.NewService(ctx, option.WithCredentials(creds))
	if err != nil {
		return fmt.Errorf("failed to create Drive service: %w", err)
	}

	driveService = svc
	log.Println("Google Drive service initialized successfully")
	return nil
}




func uploadFileToDrive(filename string, data []byte, parentID string) (string, error) {
	f := &drive.File{
		Name:    filename,
		Parents: []string{parentID},
	}
	created, err := driveService.Files.Create(f).
		Media(bytes.NewReader(data)).
		SupportsAllDrives(true).
		Do()
	if err != nil {
		return "", fmt.Errorf("failed to upload file: %w", err)
	}
	return created.Id, nil
}

func decodeBase64Image(data string) ([]byte, error) {
	// Buang prefix "data:image/jpeg;base64," kalau ada
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

	r.Body = http.MaxBytesReader(w, r.Body, 20<<20) // limit 20MB

	var req UploadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if req.TripNum == "" {
		http.Error(w, "tripNum is required", http.StatusBadRequest)
		return
	}

	rootFolderID := os.Getenv("DRIVE_FOLDER_ID")
	if rootFolderID == "" {
		http.Error(w, "DRIVE_FOLDER_ID environment variable not set", http.StatusInternalServerError)
		return
	}

	var fileIDs []string

	if req.OdometerPhoto != "" {
		imgBytes, err := decodeBase64Image(req.OdometerPhoto)
		if err != nil {
			http.Error(w, "Failed to decode odometer photo: "+err.Error(), http.StatusBadRequest)
			return
		}
		filename := req.TripNum + "_odometer.jpg"
		id, err := uploadFileToDrive(filename, imgBytes, rootFolderID)
		if err != nil {
			log.Printf("Failed to upload odometer photo: %v", err)
			http.Error(w, "Failed to upload odometer photo to Drive", http.StatusInternalServerError)
			return
		}
		fileIDs = append(fileIDs, id)
		log.Printf("Uploaded %s — Drive ID: %s", filename, id)
	}

	if req.CargoPhoto != "" {
		imgBytes, err := decodeBase64Image(req.CargoPhoto)
		if err != nil {
			http.Error(w, "Failed to decode cargo photo: "+err.Error(), http.StatusBadRequest)
			return
		}
		filename := req.TripNum + "_cargo.jpg"
		id, err := uploadFileToDrive(filename, imgBytes, rootFolderID)
		if err != nil {
			log.Printf("Failed to upload cargo photo: %v", err)
			http.Error(w, "Failed to upload cargo photo to Drive", http.StatusInternalServerError)
			return
		}
		fileIDs = append(fileIDs, id)
		log.Printf("Uploaded %s — Drive ID: %s", filename, id)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(UploadResponse{
		Success: true,
		FileIDs: fileIDs,
	})
}

func main() {
	godotenv.Load()
	
	if err := initDriveService(); err != nil {
		log.Fatalf("Failed to initialize Drive service: %v", err)
	}

	http.HandleFunc("/api/upload-photos", corsMiddleware(uploadPhotosHandler))

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	fmt.Printf("Photo upload server running on http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
