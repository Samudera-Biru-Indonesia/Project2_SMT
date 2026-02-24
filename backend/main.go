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
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
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

type Claims struct {
	Username string `json:"username"`
	EmpCode  string `json:"empCode"`
	Site     string `json:"site"`
	jwt.RegisteredClaims
}

var jwtSecret = []byte("your-secret-key") // In production, use environment variable

var driveService *drive.Service

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, Company")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func getJwtHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Username string `json:"username"`
		EmpCode  string `json:"empCode"`
		Site     string `json:"site"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Generate JWT for the user
	claims := Claims{
		Username: req.Username,
		EmpCode:  req.EmpCode,
		Site:     req.Site,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(3 * time.Hour)), // 3 hours
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"token": tokenString})
}

func jwtMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			http.Error(w, "Invalid token format", http.StatusUnauthorized)
			return
		}

		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// Optionally set user info in context
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
			http.Error(w, err.Error(), http.StatusInternalServerError)
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

func testHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"message": "Photo server is running",
	})
}

// ─── Dummy Data Handlers ──────────────────────────────────────────────────────

func dummyAuthenticateLogon(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	// API Samator returns empty {} on success
	w.Write([]byte(`{}`))
}

func dummyGetTripData(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"driver":     "BUDI SANTOSO",
		"codriver":   "AGUS PRASETYO",
		"truckPlate": "B 1234 ABC",
		"plant":      "SGI053",
		"ETADate":    "2026-02-20T08:00:00Z",
		"truckDesc":  "TRONTON 10 TON - MITSUBISHI FUSO",
	})
}

func dummyGetAllTripData(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"TripData": map[string]interface{}{
			"Result": []map[string]interface{}{
				{"tripNumber": "SGI053-00149601"},
				{"tripNumber": "SGI053-00149602"},
				{"tripNumber": "SGI053-00149603"},
			},
		},
	})
}

func dummyGetTruckByAuthSite(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"TruckData": map[string]interface{}{
			"Result": []map[string]interface{}{
				{"truckID": "TRK001", "truckPlate": "B 1234 ABC", "truckDesc": "TRONTON 10 TON - MITSUBISHI FUSO", "plantList": "SGI053"},
				{"truckID": "TRK002", "truckPlate": "B 5678 DEF", "truckDesc": "TRONTON 8 TON - HINO RANGER", "plantList": "SGI053"},
				{"truckID": "TRK003", "truckPlate": "D 9012 GHI", "truckDesc": "TRONTON 12 TON - ISUZU GIGA", "plantList": "SGI045"},
			},
		},
	})
}

func dummyGetListPlant(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	// Match the format the login component expects: { Result: { Plant: [...] } }
	json.NewEncoder(w).Encode(map[string]interface{}{
		"Result": map[string]interface{}{
			"Plant": []map[string]interface{}{
				{"Plant": "SGI053", "Name": "SGI YOGYAKARTA", "Lat": -7.797068, "Long": 110.370529},
				{"Plant": "SGI045", "Name": "SGI SEMARANG", "Lat": -6.966667, "Long": 110.416664},
				{"Plant": "SGI001", "Name": "SGI JAKARTA", "Lat": -6.200000, "Long": 106.816666},
			},
		},
	})
}

func dummyGetOutTruckCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"TruckCheckData": map[string]interface{}{
			"Result": []map[string]interface{}{
				{"Company": "SGI", "TripNum": "SGI053-00149601", "Odometer": 125000},
				{"Company": "SGI", "TripNum": "SGI053-00149602", "Odometer": 98500},
			},
		},
	})
}

func dummyGetTotalFromTripNumber(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"total": 15000,
		"type":  "OUT",
	})
}

func dummyInsertStagingTable(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Data berhasil disimpan (dummy)",
	})
}

func dummyProcessTripTimeEntry(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Trip berhasil diproses (dummy)",
	})
}

// ─────────────────────────────────────────────────────────────────────────────

func main() {
	godotenv.Load()

	// Try to initialize Drive service, but don't fail if it doesn't work
	if err := initDriveService(); err != nil {
		log.Printf("Warning: Failed to initialize Drive service: %v", err)
		log.Println("Continuing without Drive functionality - JWT and other endpoints will still work")
	}

	// Real endpoints
	http.HandleFunc("/api/get-jwt", corsMiddleware(getJwtHandler))
	http.HandleFunc("/api/upload-photos", corsMiddleware(jwtMiddleware(uploadPhotosHandler)))
	http.HandleFunc("/test", corsMiddleware(testHandler))

	// Dummy data endpoints (prefix: /api/dummy/)
	http.HandleFunc("/api/dummy/AuthenticateLogon", corsMiddleware(dummyAuthenticateLogon))
	http.HandleFunc("/api/dummy/GetTripData", corsMiddleware(dummyGetTripData))
	http.HandleFunc("/api/dummy/GetAllTripData", corsMiddleware(dummyGetAllTripData))
	http.HandleFunc("/api/dummy/getTruckByAuthSite", corsMiddleware(dummyGetTruckByAuthSite))
	http.HandleFunc("/api/dummy/GetListPlant", corsMiddleware(dummyGetListPlant))
	http.HandleFunc("/api/dummy/getOutTruckCheck", corsMiddleware(dummyGetOutTruckCheck))
	http.HandleFunc("/api/dummy/getTotalFromTripNumber", corsMiddleware(dummyGetTotalFromTripNumber))
	http.HandleFunc("/api/dummy/InsertStagingTable", corsMiddleware(dummyInsertStagingTable))
	http.HandleFunc("/api/dummy/ProcessTripTimeEntry", corsMiddleware(dummyProcessTripTimeEntry))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8004"
	}
	fmt.Printf("Server running on http://localhost:%s\n", port)
	fmt.Println("Dummy endpoints available at http://localhost:" + port + "/api/dummy/*")
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
