package main

import (
	"ch01-reliability/internal/metrics"
	"flag"
	"fmt"
	"net/http"
	"sync"
	"time"
)

func main() {
	histogram := metrics.NewHistogram()
	errorTracker := metrics.NewErrorTracker()

	url := flag.String("url", "http://localhost:8080/process", "URL to send requests to")
	rps := flag.Int("rps", 50, "Requests per second")
	duration := flag.Int("duration", 10, "Duration of the load test in seconds")
	flag.Parse()

	var wg sync.WaitGroup
	wg.Add(*rps * *duration)

	for i := 0; i < *duration; i++ {
		for j := 0; j < *rps; j++ {
			go func() {
				defer wg.Done()
				start := time.Now()
				resp, err := http.Get(*url)
				histogram.Record(float64(time.Since(start).Milliseconds()))
				if err != nil {
					errorTracker.RecordError()
					return
				}
				defer resp.Body.Close()
				if resp.StatusCode >= 500 {
					errorTracker.RecordError()
				} else {
					errorTracker.RecordSuccess()
				}

			}()
		}
		time.Sleep(1 * time.Second)
	}
	wg.Wait()

	total := histogram.Count()
	errorRate := errorTracker.ErrorRate()
	p50, _ := histogram.Percentile(50)
	p95, _ := histogram.Percentile(95)
	p99, _ := histogram.Percentile(99)

	fmt.Println("--- Load Test Results ---")
	fmt.Printf("Total requests: %d\n", total)
	fmt.Printf("Errors:         %.1f%%\n", errorRate*100)
	fmt.Printf("p50:            %.0fms\n", p50)
	fmt.Printf("p95:            %.0fms\n", p95)
	fmt.Printf("p99:            %.0fms\n", p99)
}
