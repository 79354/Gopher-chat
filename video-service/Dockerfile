# Build Stage
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o video-service main.go

# Run Stage
FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/video-service .
# Copy .env if you have one, or rely on docker-compose env vars

EXPOSE 4000
CMD ["./video-service"]