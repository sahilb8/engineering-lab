// Package resume defines the model-agnostic contract for storing and querying
// LinkedIn-style résumé data.
//
// The whole point of this Chapter 2 lab is that the SAME data and the SAME
// questions can be served by very different data models. So the contract lives
// here, in one interface (ResumeStore), and each data model — a document store
// and a property graph — provides its own implementation. Callers speak only
// this neutral vocabulary; they never see a JSON document or a graph vertex.
//
// DDIA mapping:
//   - The write methods load the dataset (the object-relational mapping step).
//   - The read methods are the queries whose cost/ergonomics differ per model:
//     GetPerson exercises data locality; Colleagues and PeopleWithSkill exercise
//     many-to-many traversal; SecondDegreeConnections exercises graph reach.
package resume

import (
	"errors"
	"time"
)

// Typed identifiers. These are distinct string types (not a shared `type ID
// string`) so the compiler rejects passing a CompanyID where a PersonID is
// expected — a cheap, zero-cost guardrail against a whole class of bugs.
type (
	PersonID   string
	CompanyID  string
	SchoolID   string
	LocationID string
	SkillID    string
)

// Sentinel errors. Callers match with errors.Is, per the lab convention.
// A boolean "ok" would tell you THAT a write failed but not WHY; these say why.
var (
	ErrPersonNotFound   = errors.New("resume: person not found")
	ErrCompanyNotFound  = errors.New("resume: company not found")
	ErrSchoolNotFound   = errors.New("resume: school not found")
	ErrLocationNotFound = errors.New("resume: location not found")
	ErrSkillNotFound    = errors.New("resume: skill not found")
)

// PersonInput carries the person's own attributes at creation time. Only
// attributes that belong to the Person itself live here — anything relational
// (employer, school, location, skills, connections) is recorded afterward via
// the Record*/Connect methods, because those are edges, not fields.
type PersonInput struct {
	Name     string
	Headline string
	DOB      time.Time
	Sex      string
}

// PersonRef is the lightweight handle returned by list queries: just enough to
// identify and display a person without assembling their whole résumé. Returning
// full profiles from a list query would be over-fetching (assemble N résumés to
// answer "who knows Go?").
type PersonRef struct {
	ID       PersonID
	Name     string
	Headline string
}

// Profile is the fully assembled, self-contained résumé — the neutral return
// type for reading one person. Every reference is RESOLVED to its name here, so
// the caller never has to do a follow-up lookup.
//
// This is the type that makes the model trade-off visible: for the document
// store, building a Profile is essentially one local read (locality wins); for
// the graph store, it means walking every edge off the Person and assembling
// the pieces by hand.
type Profile struct {
	PersonRef // embeds ID, Name, Headline

	DOB time.Time
	Sex string

	LocationID   LocationID // "" if no location recorded
	LocationName string

	Employment []EmploymentInfo
	Education  []EducationInfo
	Skills     []SkillInfo
}

// EmploymentInfo is one resolved position. Title/From/To describe the
// RELATIONSHIP between the person and the company (in the graph model these are
// literally edge properties), which is why they live here and not on either
// endpoint.
type EmploymentInfo struct {
	CompanyID   CompanyID
	CompanyName string
	Title       string
	From        time.Time
	To          time.Time // zero value = current / ongoing
}

// EducationInfo is one resolved education record.
type EducationInfo struct {
	SchoolID   SchoolID
	SchoolName string
	Degree     string
	From       time.Time
	To         time.Time
}

// SkillInfo is one resolved skill, with the person's self-reported level.
type SkillInfo struct {
	SkillID   SkillID
	SkillName string
	Level     string
}

// ResumeStore is the single contract implemented by every data model in this
// lab. Same methods, same neutral types, radically different mechanics
// underneath — that contrast is the experiment.
type ResumeStore interface {
	// --- Writes: create entities ---------------------------------------
	// Each returns a store-generated ID. The reference entities
	// (Company/School/Location/Skill) must exist before they can be
	// referenced by the Record* methods below.

	AddPerson(in PersonInput) (PersonID, error)
	AddCompany(name string) (CompanyID, error)
	AddSchool(name string) (SchoolID, error)
	AddLocation(name string) (LocationID, error)
	AddSkill(name string) (SkillID, error)

	// --- Writes: record relationships ----------------------------------
	// These are the "edges". Each validates that its endpoints exist and
	// returns an Err*NotFound sentinel otherwise.

	RecordEmployment(p PersonID, c CompanyID, title string, from, to time.Time) error
	RecordEducation(p PersonID, s SchoolID, degree string, from, to time.Time) error
	RecordSkill(p PersonID, s SkillID, level string) error
	RecordLocation(p PersonID, l LocationID) error
	Connect(a, b PersonID, since time.Time) error

	// --- Reads: the queries under comparison ---------------------------

	// GetPerson assembles and returns one full résumé. Exercises data locality.
	GetPerson(p PersonID) (Profile, error)

	// Colleagues returns everyone who shared an employer with p during an
	// OVERLAPPING tenure (same company + overlapping [from,to] ranges).
	// The overlap is an internal filter; the caller just gets the set of people.
	Colleagues(p PersonID) ([]PersonRef, error)

	// SecondDegreeConnections returns the connections of p's connections,
	// excluding p and p's own direct connections. Exercises graph reach.
	SecondDegreeConnections(p PersonID) ([]PersonRef, error)

	// PeopleWithSkill returns everyone who has the given skill. Exercises the
	// people↔skills many-to-many axis.
	PeopleWithSkill(s SkillID) ([]PersonRef, error)
}
