// Command compare loads the SAME dataset into the document store and the graph
// store, runs the SAME queries against both, and prints how much work each model
// did to answer them. It's the Chapter 2 trade-off made measurable: locality vs
// traversal, and where each model wins.
package main

import (
	"fmt"
	"math/rand"
	"os"
	"text/tabwriter"
	"time"

	"ch02-data-models/internal/resume"
	"ch02-data-models/internal/resume/document"
	"ch02-data-models/internal/resume/graph"
)

// Instrumented is the read-cost meter both stores expose. It is deliberately
// NOT part of resume.ResumeStore — it's measurement, not domain behavior.
type Instrumented interface {
	ResetCost()
	Cost() int64
}

// Store is what the demo needs: the domain contract plus the cost meter.
type Store interface {
	resume.ResumeStore
	Instrumented
}

const (
	numPeople    = 100
	numCompanies = 20
	numSkills    = 10
	numSchools   = 3
)

// seedRefs are the specific IDs the demo queries against.
type seedRefs struct {
	target   resume.PersonID // a person for GetPerson / Colleagues / SecondDegree
	popSkill resume.SkillID  // a skill many people share
}

// seed populates a store with an identical, deterministic dataset and returns
// the IDs to query. It speaks only the ResumeStore interface, so it works for
// every implementation — and because it's seeded from a fixed RNG, both stores
// get byte-for-byte the same graph.
func seed(st Store) seedRefs {
	rng := rand.New(rand.NewSource(1))
	yr := func(y int) time.Time { return time.Date(y, 1, 1, 0, 0, 0, 0, time.UTC) }

	companies := make([]resume.CompanyID, numCompanies)
	for i := range companies {
		companies[i], _ = st.AddCompany(fmt.Sprintf("Company %d", i))
	}
	skills := make([]resume.SkillID, numSkills)
	for i := range skills {
		skills[i], _ = st.AddSkill(fmt.Sprintf("Skill %d", i))
	}
	schools := make([]resume.SchoolID, numSchools)
	for i := range schools {
		schools[i], _ = st.AddSchool(fmt.Sprintf("School %d", i))
	}
	london, _ := st.AddLocation("London")

	people := make([]resume.PersonID, numPeople)
	for i := range people {
		people[i], _ = st.AddPerson(resume.PersonInput{
			Name:     fmt.Sprintf("Person %d", i),
			Headline: "Engineer",
		})
	}

	for _, p := range people {
		// 1–2 jobs with random (often overlapping) tenures.
		for j := 0; j < 1+rng.Intn(2); j++ {
			start := 2000 + rng.Intn(20)
			_ = st.RecordEmployment(p, companies[rng.Intn(numCompanies)], "Engineer", yr(start), yr(start+1+rng.Intn(5)))
		}
		// 2–3 DISTINCT skills (distinct keeps result counts identical across models).
		perm := rng.Perm(numSkills)
		for k := 0; k < 2+rng.Intn(2); k++ {
			_ = st.RecordSkill(p, skills[perm[k]], "Proficient")
		}
		_ = st.RecordEducation(p, schools[rng.Intn(numSchools)], "BSc", yr(1996), yr(2000))
		_ = st.RecordLocation(p, london)
	}

	// Each person connects to ~3 random others (Connect guards self + dupes).
	for _, p := range people {
		for c := 0; c < 3; c++ {
			_ = st.Connect(p, people[rng.Intn(numPeople)], yr(2015))
		}
	}

	return seedRefs{target: people[0], popSkill: skills[0]}
}

func main() {
	stores := []struct {
		name string
		st   Store
	}{
		{"document", document.New()},
		{"graph", graph.New()},
	}
	refs := make([]seedRefs, len(stores))
	for i, s := range stores {
		refs[i] = seed(s.st) // seed each store independently; IDs are valid per-store
	}

	queries := []struct {
		name string
		run  func(st Store, r seedRefs) int // returns a result count for the parity check
	}{
		{"GetPerson", func(st Store, r seedRefs) int {
			p, _ := st.GetPerson(r.target)
			return len(p.Employment) + len(p.Education) + len(p.Skills)
		}},
		{"PeopleWithSkill", func(st Store, r seedRefs) int {
			res, _ := st.PeopleWithSkill(r.popSkill)
			return len(res)
		}},
		{"Colleagues", func(st Store, r seedRefs) int {
			res, _ := st.Colleagues(r.target)
			return len(res)
		}},
		{"SecondDegree", func(st Store, r seedRefs) int {
			res, _ := st.SecondDegreeConnections(r.target)
			return len(res)
		}},
	}

	fmt.Printf("Dataset: %d people, %d companies, %d skills, ~3 connections each\n\n",
		numPeople, numCompanies, numSkills)

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 3, ' ', 0)
	fmt.Fprintln(w, "QUERY\tRESULTS\tDOC (docs read)\tGRAPH (edges walked)\tCHEAPER")
	fmt.Fprintln(w, "-----\t-------\t---------------\t--------------------\t-------")

	for _, q := range queries {
		var docCost, graphCost int64
		var docN, graphN int
		for i, s := range stores {
			s.st.ResetCost()
			n := q.run(s.st, refs[i])
			cost := s.st.Cost()
			if s.name == "document" {
				docCost, docN = cost, n
			} else {
				graphCost, graphN = cost, n
			}
		}

		cheaper := "graph"
		switch {
		case docCost < graphCost:
			cheaper = "document"
		case docCost == graphCost:
			cheaper = "tie"
		}

		parity := ""
		if docN != graphN {
			parity = fmt.Sprintf("  ⚠ RESULT MISMATCH doc=%d graph=%d", docN, graphN)
		}
		fmt.Fprintf(w, "%s\t%d\t%d\t%d\t%s%s\n", q.name, docN, docCost, graphCost, cheaper, parity)
	}
	w.Flush()

	fmt.Println()
	fmt.Println("Takeaways:")
	fmt.Println("• GetPerson      → document wins: the whole résumé is ONE blob (locality).")
	fmt.Println("• PeopleWithSkill → graph wins big: the document store has no skill→people")
	fmt.Println("                    index, so it SCANS ALL people; the graph walks only the")
	fmt.Println("                    HAS_SKILL edges. The gap widens as the dataset grows.")
	fmt.Println("• Colleagues     → graph wins: same story — no company→people index, full scan.")
	fmt.Println("• SecondDegree   → document wins HERE, surprisingly: it stored connection IDs and")
	fmt.Println("                    loads only the neighborhood by ID. Our graph's connectionsOf must")
	fmt.Println("                    scan EVERY edge of each person (all labels) to find CONNECTED_TO")
	fmt.Println("                    ones — we didn't index edges by label. A per-label adjacency")
	fmt.Println("                    index would flip this. (A natural Phase-4 improvement.)")
}
