package graph

import (
	"ch02-data-models/internal/resume"
	"fmt"
	"sync"
	"time"
)

type Vertex struct {
	ID    string
	Label string         // "Person", "Company", "School", "Location", "Skill"
	Props map[string]any // schemaless bag: name, headline, dob, ...
	Out   []*Edge        // adjacency: edges LEAVING this vertex
	In    []*Edge        // adjacency: edges ENTERING this vertex
}

type Edge struct {
	Label string // "WORKED_AT", "HAS_SKILL", "CONNECTED_TO", ...
	From  *Vertex
	To    *Vertex
	Props map[string]any // relationship attrs: title, from, to, level, since
}

type Store struct {
	mu       sync.RWMutex
	vertices map[string]*Vertex // ID -> vertex, O(1) lookup by ID
	seq      uint64
}

func New() *Store {
	return &Store{
		vertices: make(map[string]*Vertex),
	}
}

func (s *Store) addVertex(label string, props map[string]any) *Vertex {

	s.seq++
	prefix := map[string]string{
		"Person": "p", "Company": "c", "School": "s", "Location": "l", "Skill": "sk",
	}[label]
	id := fmt.Sprintf("%s_%d", prefix, s.seq)

	newVertex := &Vertex{
		ID:    id,
		Label: label,
		Props: props,
	}

	s.vertices[id] = newVertex

	return newVertex
}

func (s *Store) AddPerson(in resume.PersonInput) (resume.PersonID, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	v := s.addVertex("Person", map[string]any{
		"name": in.Name, "headline": in.Headline, "dob": in.DOB, "sex": in.Sex,
	})
	return resume.PersonID(v.ID), nil
}

func (s *Store) AddCompany(name string) (resume.CompanyID, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	v := s.addVertex("Company", map[string]any{
		"name": name,
	})
	return resume.CompanyID(v.ID), nil
}

func (s *Store) AddSchool(name string) (resume.SchoolID, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	v := s.addVertex("School", map[string]any{
		"name": name,
	})
	return resume.SchoolID(v.ID), nil
}

func (s *Store) AddLocation(name string) (resume.LocationID, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	v := s.addVertex("Location", map[string]any{
		"name": name,
	})
	return resume.LocationID(v.ID), nil
}

func (s *Store) AddSkill(name string) (resume.SkillID, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	v := s.addVertex("Skill", map[string]any{
		"name": name,
	})
	return resume.SkillID(v.ID), nil
}

func (s *Store) addEdge(from, to *Vertex, label string, props map[string]any) *Edge {

	newEdge := &Edge{
		Label: label,
		From:  from,
		To:    to,
		Props: props,
	}
	from.Out = append(from.Out, newEdge)

	to.In = append(to.In, newEdge)

	return newEdge
}

// --- writes: relationships ---
func (s *Store) RecordEmployment(p resume.PersonID, c resume.CompanyID, title string, from, to time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	person, ok := s.vertices[string(p)]
	if !ok || person.Label != "Person" {
		return resume.ErrPersonNotFound
	}
	company, ok := s.vertices[string(c)]
	if !ok || company.Label != "Company" {
		return resume.ErrCompanyNotFound
	}

	s.addEdge(person, company, "WORKED_AT", map[string]any{
		"title": title, "from": from, "to": to,
	})
	return nil
}
func (s *Store) RecordEducation(p resume.PersonID, sch resume.SchoolID, degree string, from, to time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	person, ok := s.vertices[string(p)]
	if !ok || person.Label != "Person" {
		return resume.ErrPersonNotFound
	}
	school, ok := s.vertices[string(sch)]
	if !ok || school.Label != "School" {
		return resume.ErrSchoolNotFound
	}

	s.addEdge(person, school, "STUDIED_AT", map[string]any{
		"degree": degree, "from": from, "to": to,
	})
	return nil
}
func (s *Store) RecordSkill(p resume.PersonID, sk resume.SkillID, level string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	person, ok := s.vertices[string(p)]
	if !ok || person.Label != "Person" {
		return resume.ErrPersonNotFound
	}
	skill, ok := s.vertices[string(sk)]
	if !ok || skill.Label != "Skill" {
		return resume.ErrSkillNotFound
	}

	s.addEdge(person, skill, "HAS_SKILL", map[string]any{
		"level": level,
	})
	return nil
}
func (s *Store) RecordLocation(p resume.PersonID, l resume.LocationID) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	person, ok := s.vertices[string(p)]
	if !ok || person.Label != "Person" {
		return resume.ErrPersonNotFound
	}
	location, ok := s.vertices[string(l)]
	if !ok || location.Label != "Location" {
		return resume.ErrLocationNotFound
	}

	s.addEdge(person, location, "LOCATED_IN", nil)
	return nil
}
func (s *Store) Connect(a, b resume.PersonID, since time.Time) error {
	if a == b {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()

	personA, ok := s.vertices[string(a)]
	if !ok || personA.Label != "Person" {
		return resume.ErrPersonNotFound
	}
	personB, ok := s.vertices[string(b)]
	if !ok || personB.Label != "Person" {
		return resume.ErrPersonNotFound
	}

	s.addEdge(personA, personB, "CONNECTED_TO", map[string]any{
		"since": since,
	})
	return nil
}

// --- reads: the queries under comparison ---
func (s *Store) GetPerson(p resume.PersonID) (resume.Profile, error)
func (s *Store) Colleagues(p resume.PersonID) ([]resume.PersonRef, error)
func (s *Store) SecondDegreeConnections(p resume.PersonID) ([]resume.PersonRef, error)
func (s *Store) PeopleWithSkill(sk resume.SkillID) ([]resume.PersonRef, error)
