package resume_test

// Contract test: every ResumeStore implementation must answer the SAME queries
// with the SAME results. The document store and the graph store have radically
// different internals, but from the caller's side they are indistinguishable —
// that behavioral equivalence is what makes the Chapter 2 cost comparison fair.

import (
	"errors"
	"testing"
	"time"

	"ch02-data-models/internal/resume"
	"ch02-data-models/internal/resume/document"
	"ch02-data-models/internal/resume/graph"
)

// Every implementation under test. Add a new data model here and it inherits
// the entire suite for free.
var implementations = []struct {
	name     string
	newStore func() resume.ResumeStore
}{
	{"document", func() resume.ResumeStore { return document.New() }},
	{"graph", func() resume.ResumeStore { return graph.New() }},
}

func date(y int) time.Time { return time.Date(y, 1, 1, 0, 0, 0, 0, time.UTC) }

func must(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatalf("setup failed: %v", err)
	}
}

func names(refs []resume.PersonRef) map[string]bool {
	out := map[string]bool{}
	for _, r := range refs {
		out[r.Name] = true
	}
	return out
}

func sameSet(got []resume.PersonRef, want ...string) bool {
	g := names(got)
	if len(g) != len(want) {
		return false
	}
	for _, w := range want {
		if !g[w] {
			return false
		}
	}
	return true
}

type ids struct {
	ada, alan, grace, linus resume.PersonID
	goSkill, dist           resume.SkillID
}

// seed builds the same small graph in whatever store it's handed — it only
// speaks the ResumeStore interface, so it works for every implementation.
func seed(t *testing.T, st resume.ResumeStore) ids {
	t.Helper()

	google, _ := st.AddCompany("Google")
	bell, _ := st.AddCompany("Bell Labs")
	mit, _ := st.AddSchool("MIT")
	london, _ := st.AddLocation("London")
	goSkill, _ := st.AddSkill("Go")
	dist, _ := st.AddSkill("Distributed Systems")

	ada, _ := st.AddPerson(resume.PersonInput{Name: "Ada Lovelace", Headline: "Staff Engineer", DOB: date(1985), Sex: "F"})
	alan, _ := st.AddPerson(resume.PersonInput{Name: "Alan Turing", Headline: "Researcher", DOB: date(1980), Sex: "M"})
	grace, _ := st.AddPerson(resume.PersonInput{Name: "Grace Hopper", Headline: "Engineer", DOB: date(1975), Sex: "F"})
	linus, _ := st.AddPerson(resume.PersonInput{Name: "Linus Torvalds", Headline: "Kernel Hacker", DOB: date(1970), Sex: "M"})

	// Employment — the overlap boundary is the point:
	must(t, st.RecordEmployment(ada, google, "Staff Engineer", date(2018), date(2022)))
	must(t, st.RecordEmployment(alan, google, "Researcher", date(2020), date(2024))) // overlaps Ada 2020–2022 -> colleague
	must(t, st.RecordEmployment(grace, google, "Engineer", date(2023), time.Time{})) // ongoing, joined AFTER Ada left -> NOT a colleague
	must(t, st.RecordEmployment(linus, bell, "Fellow", date(2015), date(2019)))      // different company -> never a colleague

	must(t, st.RecordEducation(ada, mit, "BSc", date(2014), date(2018)))
	must(t, st.RecordLocation(ada, london))

	must(t, st.RecordSkill(ada, goSkill, "Expert"))
	must(t, st.RecordSkill(grace, goSkill, "Advanced"))
	must(t, st.RecordSkill(alan, dist, "Expert"))
	must(t, st.RecordSkill(linus, dist, "Expert"))

	// Connection chain: Ada — Alan — Grace — Linus
	must(t, st.Connect(ada, alan, date(2019)))
	must(t, st.Connect(alan, grace, date(2021)))
	must(t, st.Connect(grace, linus, date(2022)))

	return ids{ada: ada, alan: alan, grace: grace, linus: linus, goSkill: goSkill, dist: dist}
}

func TestContract(t *testing.T) {
	for _, impl := range implementations {
		impl := impl
		t.Run(impl.name, func(t *testing.T) {

			t.Run("GetPerson resolves all references", func(t *testing.T) {
				st := impl.newStore()
				id := seed(t, st)
				p, err := st.GetPerson(id.ada)
				if err != nil {
					t.Fatalf("GetPerson: %v", err)
				}
				if p.ID != id.ada || p.Name != "Ada Lovelace" || p.Headline != "Staff Engineer" {
					t.Errorf("identity: got ID=%q Name=%q Headline=%q", p.ID, p.Name, p.Headline)
				}
				if p.LocationName != "London" {
					t.Errorf("location join: got %q, want London", p.LocationName)
				}
				if len(p.Employment) != 1 || p.Employment[0].CompanyName != "Google" {
					t.Errorf("employment join: got %+v", p.Employment)
				}
				if len(p.Education) != 1 || p.Education[0].SchoolName != "MIT" {
					t.Errorf("education join: got %+v", p.Education)
				}
				if len(p.Skills) != 1 || p.Skills[0].SkillName != "Go" {
					t.Errorf("skill join: got %+v", p.Skills)
				}
			})

			t.Run("GetPerson unknown -> ErrPersonNotFound", func(t *testing.T) {
				st := impl.newStore()
				seed(t, st)
				if _, err := st.GetPerson("p_nope"); !errors.Is(err, resume.ErrPersonNotFound) {
					t.Errorf("got %v, want ErrPersonNotFound", err)
				}
			})

			t.Run("PeopleWithSkill(Go) = {Ada, Grace}", func(t *testing.T) {
				st := impl.newStore()
				id := seed(t, st)
				got, err := st.PeopleWithSkill(id.goSkill)
				if err != nil {
					t.Fatalf("PeopleWithSkill: %v", err)
				}
				if !sameSet(got, "Ada Lovelace", "Grace Hopper") {
					t.Errorf("got %v, want {Ada, Grace}", names(got))
				}
			})

			t.Run("Colleagues(Ada) = {Alan} (overlap boundary)", func(t *testing.T) {
				st := impl.newStore()
				id := seed(t, st)
				got, err := st.Colleagues(id.ada)
				if err != nil {
					t.Fatalf("Colleagues: %v", err)
				}
				if !sameSet(got, "Alan Turing") {
					t.Errorf("got %v, want {Alan} (Grace joined after Ada left; Linus at Bell Labs)", names(got))
				}
			})

			t.Run("SecondDegree(Ada) = {Grace}", func(t *testing.T) {
				st := impl.newStore()
				id := seed(t, st)
				got, err := st.SecondDegreeConnections(id.ada)
				if err != nil {
					t.Fatalf("SecondDegree: %v", err)
				}
				if !sameSet(got, "Grace Hopper") {
					t.Errorf("got %v, want {Grace}", names(got))
				}
			})
		})
	}
}
