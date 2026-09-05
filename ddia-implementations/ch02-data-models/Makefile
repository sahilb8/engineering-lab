.PHONY: test run vet fmt

# Run the full test suite (includes the cross-model contract test).
test:
	go test ./...

# Run the document-vs-graph cost comparison demo.
run:
	go run ./cmd/compare

vet:
	go vet ./...

fmt:
	gofmt -w .
