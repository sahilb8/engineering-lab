package document

import (
	"ch02-data-models/internal/resume"
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

type Store struct {
	mu        sync.RWMutex                // guards everything below
	persons   map[resume.PersonID][]byte  // the JSON documents
	companies map[resume.CompanyID]string // id → name (side collection)
	schools   map[resume.SchoolID]string
	locations map[resume.LocationID]string
	skills    map[resume.SkillID]string
	seq       uint64 // counter for generating unique IDs
}

type employmentEntry struct {
	CompanyID resume.CompanyID `json:"companyId"`
	Title     string           `json:"title"`
	From      time.Time        `json:"from"`
	To        time.Time        `json:"to"`
}
type educationEntry struct {
	SchoolID resume.SchoolID `json:"schoolId"`
	Degree   string          `json:"degree"`
	From     time.Time       `json:"from"`
	To       time.Time       `json:"to"`
}

type skillEntry struct {
	SkillID resume.SkillID `json:"skillId"`
	Level   string         `json:"level"`
}

type connectionEntry struct {
	PersonID resume.PersonID `json:"personId"`
	Since    time.Time       `json:"since"`
}

// personDoc is the on-disk (well, in-memory) JSON shape. Lowercase = private to this package.
type personDoc struct {
	Name        string            `json:"name"`
	Headline    string            `json:"headline"`
	DOB         time.Time         `json:"dob"`
	Sex         string            `json:"sex"`
	LocationID  resume.LocationID `json:"locationId,omitempty"`
	Employment  []employmentEntry `json:"employment"`
	Education   []educationEntry  `json:"education"`
	Skills      []skillEntry      `json:"skills"`
	Connections []connectionEntry `json:"connections"`
}

func New() *Store {
	return &Store{
		persons:   make(map[resume.PersonID][]byte),
		companies: make(map[resume.CompanyID]string),
		schools:   make(map[resume.SchoolID]string),
		locations: make(map[resume.LocationID]string),
		skills:    make(map[resume.SkillID]string),
	}
}

func (s *Store) AddPerson(in resume.PersonInput) (resume.PersonID, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.seq++
	id := resume.PersonID(fmt.Sprintf("p_%d", s.seq))

	doc := personDoc{
		Name:     in.Name,
		Headline: in.Headline,
		DOB:      in.DOB,
		Sex:      in.Sex,
		// Employment/Education/Skills/Connections left nil — filled later via Record*
	}

	data, err := json.Marshal(doc)
	if err != nil {
		return "", err // return zero-value ID + the error
	}
	s.persons[id] = data
	return id, nil

}
func (s *Store) AddCompany(name string) (resume.CompanyID, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.seq++
	id := resume.CompanyID(fmt.Sprintf("c_%d", s.seq))
	s.companies[id] = name
	return id, nil
}
func (s *Store) AddSchool(name string) (resume.SchoolID, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.seq++
	id := resume.SchoolID(fmt.Sprintf("s_%d", s.seq))
	s.schools[id] = name
	return id, nil
}
func (s *Store) AddLocation(name string) (resume.LocationID, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.seq++
	id := resume.LocationID(fmt.Sprintf("l_%d", s.seq))
	s.locations[id] = name
	return id, nil
}
func (s *Store) AddSkill(name string) (resume.SkillID, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.seq++
	id := resume.SkillID(fmt.Sprintf("sk_%d", s.seq))
	s.skills[id] = name
	return id, nil
}

func (s *Store) RecordEmployment(p resume.PersonID, c resume.CompanyID, title string, from, to time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, op := s.persons[p]
	_, oc := s.companies[c]

	if !op {
		return resume.ErrPersonNotFound
	}
	if !oc {
		return resume.ErrCompanyNotFound
	}

	unmarshaledDoc := personDoc{}
	err := json.Unmarshal(data, &unmarshaledDoc)
	if err != nil {
		return fmt.Errorf("error in retrieving the data %s", err)
	}
	unmarshaledDoc.Employment = append(unmarshaledDoc.Employment, employmentEntry{
		CompanyID: c,
		Title:     title,
		From:      from,
		To:        to,
	})
	data, merr := json.Marshal(unmarshaledDoc)
	if merr != nil {
		return fmt.Errorf("error in marshaling the data %s", merr)
	}
	s.persons[p] = data
	return nil
}

func (s *Store) RecordEducation(p resume.PersonID, sch resume.SchoolID, degree string, from, to time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, op := s.persons[p]
	_, os := s.schools[sch]

	if !op {
		return resume.ErrPersonNotFound
	}
	if !os {
		return resume.ErrSchoolNotFound
	}

	unmarshaledDoc := personDoc{}
	err := json.Unmarshal(s.persons[p], &unmarshaledDoc)

	if err != nil {
		return fmt.Errorf("error in retrieving the data %s", err)
	}
	unmarshaledDoc.Education = append(unmarshaledDoc.Education, educationEntry{
		SchoolID: sch,
		Degree:   degree,
		From:     from,
		To:       to,
	})

	data, merr := json.Marshal(unmarshaledDoc)
	if merr != nil {
		return fmt.Errorf("error in marshaling the data %s", merr)
	}
	s.persons[p] = data
	return nil
}

func (s *Store) RecordSkill(p resume.PersonID, sk resume.SkillID, level string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, op := s.persons[p]
	_, ok := s.skills[sk]

	if !op {
		return resume.ErrPersonNotFound
	}
	if !ok {
		return resume.ErrSkillNotFound
	}

	unmarshaledDoc := personDoc{}
	if err := json.Unmarshal(data, &unmarshaledDoc); err != nil {
		return fmt.Errorf("error in retrieving the data %w", err)
	}
	unmarshaledDoc.Skills = append(unmarshaledDoc.Skills, skillEntry{
		SkillID: sk,
		Level:   level,
	})
	data, merr := json.Marshal(unmarshaledDoc)
	if merr != nil {
		return fmt.Errorf("error in marshaling the data %w", merr)
	}
	s.persons[p] = data
	return nil
}

func (s *Store) RecordLocation(p resume.PersonID, l resume.LocationID) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, op := s.persons[p]
	_, ok := s.locations[l]

	if !op {
		return resume.ErrPersonNotFound
	}
	if !ok {
		return resume.ErrLocationNotFound
	}

	unmarshaledDoc := personDoc{}
	if err := json.Unmarshal(data, &unmarshaledDoc); err != nil {
		return fmt.Errorf("error in retrieving the data %w", err)
	}
	// A person has exactly one location, so we SET the scalar field
	// (overwriting any previous value) rather than appending to a slice.
	unmarshaledDoc.LocationID = l
	data, merr := json.Marshal(unmarshaledDoc)
	if merr != nil {
		return fmt.Errorf("error in marshaling the data %w", merr)
	}
	s.persons[p] = data
	return nil
}

func (s *Store) Connect(a, b resume.PersonID, since time.Time) error {
	if a == b {
		return nil // or an error — connecting to yourself is a no-op / caller bug
	}
	s.mu.Lock()
	defer s.mu.Unlock()

	dataA, oa := s.persons[a]
	dataB, ob := s.persons[b]

	if !oa || !ob {
		return resume.ErrPersonNotFound
	}

	unmarshaledDocA := personDoc{}
	unmarshaledDocB := personDoc{}

	erra := json.Unmarshal(dataA, &unmarshaledDocA)
	if erra != nil {
		return fmt.Errorf("error in retrieving the data %w", erra)
	}
	errb := json.Unmarshal(dataB, &unmarshaledDocB)
	if errb != nil {
		return fmt.Errorf("error in retrieving the data %w", errb)
	}

	for _, c := range unmarshaledDocA.Connections {
		if c.PersonID == b {
			return nil // already connected, do nothing
		}
	}

	unmarshaledDocA.Connections = append(unmarshaledDocA.Connections, connectionEntry{
		PersonID: b,
		Since:    since,
	})

	unmarshaledDocB.Connections = append(unmarshaledDocB.Connections, connectionEntry{
		PersonID: a,
		Since:    since,
	})

	dataA, merra := json.Marshal(unmarshaledDocA)
	if merra != nil {
		return fmt.Errorf("error in marshaling the data %w", merra)
	}

	dataB, merrb := json.Marshal(unmarshaledDocB)
	if merrb != nil {
		return fmt.Errorf("error in marshaling the data %w", merrb)
	}

	s.persons[a] = dataA
	s.persons[b] = dataB

	return nil
}

func (s *Store) GetPerson(p resume.PersonID) (resume.Profile, error) {

	s.mu.RLock()
	defer s.mu.RUnlock()

	personData, oa := s.persons[p]

	if !oa {
		return resume.Profile{}, resume.ErrPersonNotFound
	}

	personDoc := personDoc{}
	profile := resume.Profile{}

	err := json.Unmarshal(personData, &personDoc)
	if err != nil {
		return resume.Profile{}, fmt.Errorf("error in marshaling the data %w", err)
	}

	profile.ID = p
	profile.Name = personDoc.Name
	profile.Headline = personDoc.Headline
	profile.DOB = personDoc.DOB
	profile.Sex = personDoc.Sex
	profile.LocationID = personDoc.LocationID
	profile.LocationName = s.locations[personDoc.LocationID]

	emp := make([]resume.EmploymentInfo, len(personDoc.Employment)) // N zero-valued slots
	for i, e := range personDoc.Employment {
		emp[i] = resume.EmploymentInfo{ // write INTO slot i, don't append
			CompanyID:   e.CompanyID,
			CompanyName: s.companies[e.CompanyID], // ← the join: resolve ID → name via the map
			Title:       e.Title,
			From:        e.From,
			To:          e.To,
		}
	}

	edu := make([]resume.EducationInfo, len(personDoc.Education))
	for i, e := range personDoc.Education {
		edu[i] = resume.EducationInfo{
			SchoolID:   e.SchoolID,
			SchoolName: s.schools[e.SchoolID], // join: school ID → name
			Degree:     e.Degree,
			From:       e.From,
			To:         e.To,
		}
	}

	skills := make([]resume.SkillInfo, len(personDoc.Skills))
	for i, e := range personDoc.Skills {
		skills[i] = resume.SkillInfo{
			SkillID:   e.SkillID,
			SkillName: s.skills[e.SkillID], // join: skill ID → name
			Level:     e.Level,
		}
	}

	profile.Employment = emp
	profile.Education = edu
	profile.Skills = skills

	return profile, nil
}

func (s *Store) PeopleWithSkill(sk resume.SkillID) ([]resume.PersonRef, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	_, os := s.skills[sk]

	if !os {
		return nil, resume.ErrSkillNotFound
	}

	personList := make([]resume.PersonRef, 0)
	for id, data := range s.persons {
		unmarshledPerson := personDoc{}
		err := json.Unmarshal(data, &unmarshledPerson)
		if err != nil {
			return nil, fmt.Errorf("error in marshaling the data %w", err)
		}

		for _, skill := range unmarshledPerson.Skills {
			if skill.SkillID == sk {
				personList = append(personList, resume.PersonRef{ID: id, Name: unmarshledPerson.Name, Headline: unmarshledPerson.Headline})
				break
			}
		}
	}

	return personList, nil
}

func (s *Store) Colleagues(p resume.PersonID) ([]resume.PersonRef, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	data, ok := s.persons[p]
	if !ok {
		return nil, resume.ErrPersonNotFound
	}
	var target personDoc
	if err := json.Unmarshal(data, &target); err != nil {
		return nil, fmt.Errorf("unmarshal person %s: %w", p, err)
	}

	// A zero To means "current / ongoing", i.e. open-ended — treat it as +infinity.
	end := func(t time.Time) time.Time {
		if t.IsZero() {
			return time.Unix(1<<62, 0)
		}
		return t
	}
	// Two intervals overlap iff aFrom <= bTo && bFrom <= aTo.
	overlaps := func(aFrom, aTo, bFrom, bTo time.Time) bool {
		return !aFrom.After(end(bTo)) && !bFrom.After(end(aTo))
	}

	out := make([]resume.PersonRef, 0)
	// No index from company -> people, so we scan EVERY person and self-join by hand.
	for id, raw := range s.persons {
		if id == p {
			continue // you are not your own colleague
		}
		var other personDoc
		if err := json.Unmarshal(raw, &other); err != nil {
			return nil, fmt.Errorf("unmarshal person %s: %w", id, err)
		}

		matched := false
		for _, te := range target.Employment {
			for _, oe := range other.Employment {
				if te.CompanyID == oe.CompanyID && overlaps(te.From, te.To, oe.From, oe.To) {
					matched = true
					break
				}
			}
			if matched {
				break
			}
		}
		if matched {
			out = append(out, resume.PersonRef{ID: id, Name: other.Name, Headline: other.Headline})
		}
	}
	return out, nil
}

func (s *Store) SecondDegreeConnections(p resume.PersonID) ([]resume.PersonRef, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	data, ok := s.persons[p]
	if !ok {
		return nil, resume.ErrPersonNotFound
	}
	var target personDoc
	if err := json.Unmarshal(data, &target); err != nil {
		return nil, fmt.Errorf("unmarshal person %s: %w", p, err)
	}

	// Exclusion set: p itself, plus everyone p is already directly connected to.
	exclude := map[resume.PersonID]bool{p: true}
	for _, c := range target.Connections {
		exclude[c.PersonID] = true
	}

	out := make([]resume.PersonRef, 0)
	added := map[resume.PersonID]bool{}

	// Hop 1: each direct connection. Hop 2: THEIR connections.
	for _, c := range target.Connections {
		raw, ok := s.persons[c.PersonID]
		if !ok {
			continue // dangling; skip defensively
		}
		var friend personDoc
		if err := json.Unmarshal(raw, &friend); err != nil {
			return nil, fmt.Errorf("unmarshal person %s: %w", c.PersonID, err)
		}
		for _, fc := range friend.Connections {
			cand := fc.PersonID
			if exclude[cand] || added[cand] {
				continue // skip p, direct connections, and dupes
			}
			craw, ok := s.persons[cand]
			if !ok {
				continue
			}
			var cdoc personDoc
			if err := json.Unmarshal(craw, &cdoc); err != nil {
				return nil, fmt.Errorf("unmarshal person %s: %w", cand, err)
			}
			added[cand] = true
			out = append(out, resume.PersonRef{ID: cand, Name: cdoc.Name, Headline: cdoc.Headline})
		}
	}
	return out, nil
}

// Compile-time proof that *Store fully satisfies the ResumeStore contract.
// If any method is missing or has the wrong signature, the build fails here.
var _ resume.ResumeStore = (*Store)(nil)
