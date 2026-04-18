.PHONY: run test loadtest build

run:
	go run main.go

build:
	go build -o bin/server main.go
	go build -o bin/loadgen ./cmd/loadgen/main.go

test:
	go test ./... -v -race

loadtest:
	go run ./cmd/loadgen/main.go -rps 50 -duration 10
