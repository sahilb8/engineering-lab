package document_test

import (
	"errors"
	"testing"
	"time"

	"ch02-data-models/internal/resume"
	"ch02-data-models/internal/resume/document"
)

func date(y int) time.Time { return time.Date(y, 1, 1, 0, 0, 0, 0, time.UTC) }

func must(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatalf("setup failed: %v", err)
	}
}

// names collapses a []PersonRef into a set of names for order-independent
// comparison (map iteration makes result order non-deterministic).
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

// ids holds every identifier the tests assert against.
type ids struct {
	ada, alan, grace, linus resume.PersonID
	goSkill, dist           resume.SkillID
}

// seed builds a small graph with intentionally tricky cases.
func seed(t *testing.T) (*document.Store, ids) {
	t.Helper()
	st := document.New()

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

	// Employment — the overlap boundary is the whole point here:
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

	return st, ids{ada: ada, alan: alan, grace: grace, linus: linus, goSkill: goSkill, dist: dist}
}

func TestGetPerson_ResolvesAllReferences(t *testing.T) {
	st, id := seed(t)

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
}

func TestGetPerson_Unknown(t *testing.T) {
	st, _ := seed(t)
	if _, err := st.GetPerson("p_nope"); !errors.Is(err, resume.ErrPersonNotFound) {
		t.Errorf("got %v, want ErrPersonNotFound", err)
	}
}

func TestPeopleWithSkill(t *testing.T) {
	st, id := seed(t)

	got, err := st.PeopleWithSkill(id.goSkill)
	if err != nil {
		t.Fatalf("PeopleWithSkill: %v", err)
	}
	// Ada + Grace have "Go"; Alan + Linus have "Distributed Systems".
	if !sameSet(got, "Ada Lovelace", "Grace Hopper") {
		t.Errorf("got %v, want {Ada, Grace}", names(got))
	}
}

func TestColleagues_OverlapBoundary(t *testing.T) {
	st, id := seed(t)

	got, err := st.Colleagues(id.ada)
	if err != nil {
		t.Fatalf("Colleagues: %v", err)
	}
	// Alan overlaps Ada's Google tenure; Grace joined Google AFTER Ada left; Linus was elsewhere.
	if !sameSet(got, "Alan Turing") {
		t.Errorf("got %v, want {Alan} (Grace joined after Ada left; Linus was at Bell Labs)", names(got))
	}
}

func TestSecondDegree(t *testing.T) {
	st, id := seed(t)

	got, err := st.SecondDegreeConnections(id.ada)
	if err != nil {
		t.Fatalf("SecondDegree: %v", err)
	}
	// Ada—Alan direct; Alan—Grace makes Grace 2nd degree; Linus is 3rd.
	if !sameSet(got, "Grace Hopper") {
		t.Errorf("got %v, want {Grace}", names(got))
	}
}
