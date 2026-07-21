import { useEffect, useRef, useState } from 'react'
import { DEMO_JOB_DESCRIPTION } from './demoData'

const JOB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'JobPosting',
  title: 'Software Engineering Intern',
  description: DEMO_JOB_DESCRIPTION,
  datePosted: '2026-07-15',
  employmentType: 'INTERN',
  hiringOrganization: {
    '@type': 'Organization',
    name: 'Northstar Robotics',
    sameAs: 'https://northstar-robotics.example.com',
  },
  jobLocation: {
    '@type': 'Place',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'San Francisco',
      addressRegion: 'CA',
      addressCountry: 'US',
    },
  },
}

export default function DemoApplication() {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitted, setSubmitted] = useState(false)
  const [fileName, setFileName] = useState('No file selected')
  const demoApplicationId = sessionStorage.getItem('resumedb.demoApplicationId')

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Software Engineering Intern | Northstar Robotics'
    document.body.classList.add('demo-ats-body')
    return () => {
      document.title = previousTitle
      document.body.classList.remove('demo-ats-body')
    }
  }, [])

  const reset = () => {
    formRef.current?.reset()
    setFileName('No file selected')
    setSubmitted(false)
  }

  return (
    <div className="demo-ats-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JOB_SCHEMA) }} />
      <header className="demo-ats-header">
        <a className="demo-ats-brand" href={window.location.pathname} aria-label="Northstar Robotics careers">
          <span className="demo-ats-logo" aria-hidden="true">
            <svg viewBox="0 0 36 36"><path d="M18 2.5 21.5 14 33 18l-11.5 4L18 33.5 14.5 22 3 18l11.5-4L18 2.5Z" /></svg>
          </span>
          <span className="demo-ats-brand-name">Northstar Robotics</span>
        </a>
        <div className="demo-ats-header-actions">
          <span className="demo-ats-mode"><span aria-hidden="true" /> ResumeDB demo sandbox</span>
          <a className="demo-ats-back" href={window.location.pathname}>Back to ResumeDB</a>
        </div>
      </header>

      <main className="demo-ats-main">
        <aside className="demo-job-panel">
          <div className="demo-job-eyebrow">University recruiting</div>
          <h1>Software Engineering Intern</h1>
          <div className="demo-job-meta">
            <span>San Francisco, CA</span>
            <span>Hybrid</span>
            <span>Summer 2027</span>
          </div>
          <p>
            Help build the software layer for useful, approachable robots. You will ship production work with a small team and learn how thoughtful product engineering meets the physical world.
          </p>
          <h2>What you will do</h2>
          <ul>
            <li>Build reliable product experiences with React, TypeScript, Python, and REST APIs.</li>
            <li>Work with PostgreSQL data and improve internal developer tooling.</li>
            <li>Write tests, review code, and collaborate with engineers, designers, and operators.</li>
          </ul>
          <h2>What we are looking for</h2>
          <ul>
            <li>Pursuing a degree in computer science, data science, computer engineering, or a related field.</li>
            <li>Experience building software through coursework, research, internships, or substantial projects.</li>
            <li>Familiarity with Git and at least one modern web framework.</li>
          </ul>
          <div className="demo-sandbox-callout">
            <strong>ResumeDB test sandbox</strong>
            <span>This page never sends or stores an application. It exists to test capture, autofill, resume upload, human review, and manual submit.</span>
            {demoApplicationId && <code>Ready application: {demoApplicationId}</code>}
          </div>
        </aside>

        <section className="demo-form-panel" aria-labelledby="application-title">
          <div className="demo-form-heading">
            <div>
              <div className="demo-job-eyebrow">Application</div>
              <h2 id="application-title">Tell us about yourself</h2>
            </div>
            <span className="demo-required-note">* Required</span>
          </div>

          {submitted && (
            <div className="demo-submit-success" role="status">
              <strong>Demo submitted successfully.</strong>
              <span>No data left your browser. The full capture, autofill, review, and submit walkthrough is complete.</span>
            </div>
          )}

          <form
            ref={formRef}
            onSubmit={(event) => {
              event.preventDefault()
              setSubmitted(true)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            <fieldset className="demo-form-section">
              <legend>Contact information</legend>
              <div className="demo-form-grid">
                <DemoField label="First name" required>
                  <input id="first-name" name="first_name" autoComplete="given-name" required />
                </DemoField>
                <DemoField label="Last name" required>
                  <input id="last-name" name="last_name" autoComplete="family-name" required />
                </DemoField>
                <DemoField label="Email address" required>
                  <input id="email" name="email" type="email" autoComplete="email" required />
                </DemoField>
                <DemoField label="Phone number" required>
                  <input id="phone" name="phone" type="tel" autoComplete="tel" required />
                </DemoField>
                <DemoField label="Current city and state" required wide>
                  <input id="current-location" name="current_location" autoComplete="address-level2" placeholder="City, State" required />
                </DemoField>
              </div>
            </fieldset>

            <fieldset className="demo-form-section">
              <legend>Education</legend>
              <div className="demo-form-grid">
                <DemoField label="College or university" required wide>
                  <select id="college" name="college" defaultValue="" required>
                    <option value="" disabled>Select a school</option>
                    <option>Carnegie Mellon University</option>
                    <option>Georgia Institute of Technology</option>
                    <option>University of Illinois Urbana-Champaign</option>
                    <option>University of Michigan</option>
                    <option>The University of Texas at Austin</option>
                  </select>
                </DemoField>
                <DemoField label="Major or field of study" required>
                  <input id="major" name="major" required />
                </DemoField>
                <DemoField label="Degree" required>
                  <select id="degree" name="degree" defaultValue="" required>
                    <option value="" disabled>Select a degree</option>
                    <option>Bachelor of Science</option>
                    <option>Bachelor of Arts</option>
                    <option>Master of Science</option>
                  </select>
                </DemoField>
                <DemoField label="Expected graduation year" required>
                  <select id="graduation-year" name="graduation_year" defaultValue="" required>
                    <option value="" disabled>Select a year</option>
                    <option>2026</option>
                    <option>2027</option>
                    <option>2028</option>
                    <option>2029</option>
                  </select>
                </DemoField>
              </div>
            </fieldset>

            <fieldset className="demo-form-section">
              <legend>Links</legend>
              <div className="demo-form-grid">
                <DemoField label="LinkedIn URL" required>
                  <input id="linkedin" name="linkedin_url" type="url" placeholder="https://linkedin.com/in/..." required />
                </DemoField>
                <DemoField label="GitHub URL" required>
                  <input id="github" name="github_url" type="url" placeholder="https://github.com/..." required />
                </DemoField>
              </div>
            </fieldset>

            <fieldset className="demo-form-section">
              <legend>Work eligibility</legend>
              <div className="demo-form-grid">
                <DemoField label="Work authorization" required>
                  <select id="work-authorization" name="work_authorization" defaultValue="" required>
                    <option value="" disabled>Select an answer</option>
                    <option>Authorized to work in the US</option>
                    <option>Not currently authorized to work in the US</option>
                    <option>Prefer not to answer</option>
                  </select>
                </DemoField>
                <DemoField label="Will you now or in the future require visa sponsorship?" required>
                  <select id="sponsorship" name="requires_sponsorship" defaultValue="" required>
                    <option value="" disabled>Select an answer</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="prefer_not_to_answer">Prefer not to answer</option>
                  </select>
                </DemoField>
              </div>
              <div className="demo-choice-group">
                <div className="demo-choice-label">Are you 18 years of age or older? <span>*</span></div>
                <label><input type="radio" name="age_18_or_older" value="yes" required /> Yes</label>
                <label><input type="radio" name="age_18_or_older" value="no" required /> No</label>
              </div>
            </fieldset>

            <fieldset className="demo-form-section">
              <legend>Voluntary self-identification</legend>
              <p className="demo-section-help">These answers are optional and do not affect consideration. ResumeDB fills only answers explicitly stored in your profile.</p>
              <div className="demo-form-grid">
                <DemoField label="Gender identity">
                  <select id="gender" name="gender" defaultValue="">
                    <option value="">Select an answer</option>
                    <option>Woman</option>
                    <option>Man</option>
                    <option>Non-binary</option>
                    <option>Prefer not to answer</option>
                  </select>
                </DemoField>
                <DemoField label="Race or ethnicity">
                  <select id="race-ethnicity" name="race_ethnicity" defaultValue="">
                    <option value="">Select an answer</option>
                    <option>Asian</option>
                    <option>Black or African American</option>
                    <option>Hispanic or Latino</option>
                    <option>White</option>
                    <option>Two or more races</option>
                    <option>Prefer not to answer</option>
                  </select>
                </DemoField>
                <DemoField label="Veteran status">
                  <select id="veteran-status" name="veteran_status" defaultValue="">
                    <option value="">Select an answer</option>
                    <option>I am a protected veteran</option>
                    <option>I am not a protected veteran</option>
                    <option>Prefer not to answer</option>
                  </select>
                </DemoField>
                <DemoField label="Disability status">
                  <select id="disability-status" name="disability_status" defaultValue="">
                    <option value="">Select an answer</option>
                    <option>Yes, I have a disability</option>
                    <option>No, I do not have a disability</option>
                    <option>Prefer not to answer</option>
                  </select>
                </DemoField>
              </div>
            </fieldset>

            <fieldset className="demo-form-section">
              <legend>Application materials</legend>
              <div className="demo-file-card">
                <div>
                  <label htmlFor="resume-upload">Resume / CV <span>*</span></label>
                  <small>PDF only, up to 10 MB</small>
                </div>
                <label className="demo-file-button" htmlFor="resume-upload">Choose file</label>
                <input
                  className="demo-file-input"
                  id="resume-upload"
                  name="resume"
                  type="file"
                  accept="application/pdf,.pdf"
                  required
                  onChange={(event) => setFileName(event.target.files?.[0]?.name ?? 'No file selected')}
                />
                <span className="demo-file-name">{fileName}</span>
              </div>
              <DemoField label="Why are you interested in Northstar Robotics?" required wide>
                <textarea
                  id="why-northstar"
                  name="why_interested"
                  rows={5}
                  placeholder="This required question is intentionally left for human review."
                  required
                />
              </DemoField>
              <label className="demo-certification">
                <input type="checkbox" name="certification" required />
                <span>I certify that I reviewed this application and that the information is accurate. *</span>
              </label>
            </fieldset>

            <div className="demo-form-actions">
              <button className="demo-reset-button" type="button" onClick={reset}>Reset form</button>
              <button className="demo-submit-button" type="submit">Submit demo application</button>
            </div>
            <p className="demo-submit-note">The extension never clicks submit. This button only displays a local success state.</p>
          </form>
        </section>
      </main>
    </div>
  )
}

function DemoField({
  label,
  required = false,
  wide = false,
  children,
}: {
  label: string
  required?: boolean
  wide?: boolean
  children: React.ReactNode
}) {
  const child = children as React.ReactElement<{ id?: string }>
  return (
    <div className={`demo-form-field${wide ? ' demo-form-field-wide' : ''}`}>
      <label htmlFor={child.props.id}>{label} {required && <span>*</span>}</label>
      {children}
    </div>
  )
}
