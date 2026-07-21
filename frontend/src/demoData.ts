import type { Entry, Profile } from './api'

export const DEMO_COMPANY = 'Northstar Robotics'
export const DEMO_ROLE = 'Software Engineering Intern'

export const DEMO_JOB_DESCRIPTION = `
# Software Engineering Intern

Northstar Robotics builds accessible autonomy software for warehouse and field robots. Our internship team ships production features alongside engineers, designers, and operators.

## What you will do

- Build reliable product experiences with React, TypeScript, Python, and REST APIs.
- Work with PostgreSQL data and help improve internal developer tooling.
- Write tests, review code, and communicate progress with a cross-functional team.
- Turn ambiguous operator needs into small, measurable product improvements.

## What we are looking for

- Currently pursuing a bachelor's degree in computer science, data science, computer engineering, or a related field.
- Experience building and debugging software through coursework, internships, research, or substantial projects.
- Familiarity with Git and at least one modern web framework.
- Clear written communication and an interest in learning quickly.

This is a paid summer internship based in San Francisco with a flexible hybrid schedule. Northstar Robotics is an equal opportunity employer.
`.trim()

const SCHOOLS = [
  { college: 'Carnegie Mellon University', major: 'Computer Science' },
  { college: 'Georgia Institute of Technology', major: 'Computer Science' },
  { college: 'University of Illinois Urbana-Champaign', major: 'Computer Engineering' },
  { college: 'University of Michigan', major: 'Data Science' },
  { college: 'The University of Texas at Austin', major: 'Computer Science' },
]

export async function makeDemoProfile(): Promise<Profile> {
  const { faker } = await import('@faker-js/faker/locale/en')
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  const slug = `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const school = faker.helpers.arrayElement(SCHOOLS)
  const phoneSuffix = faker.number.int({ min: 100, max: 199 })

  return {
    demo_mode: true,
    name: `${firstName} ${lastName}`,
    email: faker.internet.exampleEmail({ firstName, lastName }).toLowerCase(),
    phone: `+1 (415) 555-${String(phoneSuffix).padStart(4, '0')}`,
    location: `${faker.location.city()}, ${faker.location.state({ abbreviated: true })}`,
    college: school.college,
    major: school.major,
    degree: 'Bachelor of Science',
    graduation_year: faker.helpers.arrayElement(['2027', '2028']),
    work_authorization: 'Authorized to work in the US',
    requires_sponsorship: 'no',
    preferred_roles: ['Software Engineering Intern', 'Backend Engineering Intern', 'Data Engineering Intern'],
    preferred_locations: ['San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Remote'],
    application_answers: {
      age_18_or_older: 'Yes',
      gender: 'Prefer not to answer',
      race_ethnicity: 'Prefer not to answer',
      veteran_status: 'I am not a protected veteran',
      disability_status: 'Prefer not to answer',
    },
    links: [
      { label: 'LinkedIn', url: `https://www.linkedin.com/in/resumedb-demo-${slug}` },
      { label: 'GitHub', url: `https://github.com/resumedb-demo-${slug}` },
    ],
  }
}

export function makeDemoEntries(profile: Profile): Entry[] {
  return [
    {
      id: 'hackathon-demo-education',
      type: 'education',
      title: `${profile.degree} in ${profile.major}`,
      org: profile.college,
      start: '2024',
      end: profile.graduation_year,
      bullets: ['Relevant coursework: Data Structures, Algorithms, Databases, and Software Engineering'],
      tags: ['Computer Science', 'Software Engineering'],
    },
    {
      id: 'hackathon-demo-experience',
      type: 'experience',
      title: 'Software Engineering Intern',
      org: 'Campus Technology Lab',
      location: 'Remote',
      start: 'May 2025',
      end: 'Aug 2025',
      bullets: [
        'Built TypeScript and React workflows that reduced repetitive student support tasks by 35%',
        'Implemented Python REST API endpoints backed by PostgreSQL and covered critical paths with automated tests',
        'Partnered with three student researchers to turn weekly feedback into scoped product improvements',
      ],
      tags: ['TypeScript', 'React', 'Python', 'PostgreSQL', 'REST APIs', 'Testing'],
    },
    {
      id: 'hackathon-demo-project',
      type: 'project',
      title: 'CoursePath',
      start: 'Jan 2025',
      end: 'Present',
      links: [{ label: 'GitHub', url: profile.links?.find((link) => link.label === 'GitHub')?.url ?? 'https://github.com/resumedb-demo' }],
      bullets: [
        'Created a full-stack course planning app used by 80 classmates to compare schedules and prerequisites',
        'Designed accessible React components and a typed API client, cutting form errors during usability tests',
      ],
      tags: ['React', 'TypeScript', 'Python', 'Git'],
    },
  ]
}

export function makeDemoResume(profile: Profile): string {
  return JSON.stringify(
    {
      name: profile.name,
      headline: 'Software Engineering Intern | React, TypeScript, Python',
      contact: {
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        links: profile.links,
      },
      sections: [
        {
          title: 'Education',
          entries: [
            {
              title: `${profile.degree} in ${profile.major}`,
              org: profile.college,
              dates: `Expected ${profile.graduation_year}`,
              bullets: ['Coursework: Data Structures, Algorithms, Databases, Software Engineering'],
            },
          ],
        },
        {
          title: 'Experience',
          entries: [
            {
              title: 'Software Engineering Intern',
              org: 'Campus Technology Lab',
              location: 'Remote',
              dates: 'May 2025 - Aug 2025',
              bullets: [
                'Shipped reliable TypeScript and React product workflows, reducing repetitive student support tasks by 35%',
                'Built Python REST API endpoints backed by PostgreSQL and protected critical paths with automated tests',
                'Partnered with three student researchers to translate weekly feedback into scoped product improvements',
              ],
            },
          ],
        },
        {
          title: 'Projects',
          entries: [
            {
              title: 'CoursePath',
              dates: 'Jan 2025 - Present',
              bullets: [
                'Created a full-stack course planning app used by 80 classmates to compare schedules and prerequisites',
                'Designed accessible React components and a typed API client, reducing form errors in usability tests',
              ],
            },
          ],
        },
        {
          title: 'Skills',
          items: [
            { label: 'Languages', value: 'TypeScript, Python, SQL, Java' },
            { label: 'Frameworks', value: 'React, FastAPI, Node.js' },
            { label: 'Tools', value: 'Git, PostgreSQL, Playwright, Docker' },
          ],
        },
      ],
    },
    null,
    2,
  )
}

export function makeDemoTailoring(): string {
  return JSON.stringify(
    {
      comparisons: [
        {
          before: 'Built TypeScript and React workflows that reduced repetitive student support tasks by 35%',
          after: 'Shipped reliable TypeScript and React product workflows, reducing repetitive student support tasks by 35%',
          requirement: 'Build reliable product experiences with React and TypeScript',
          evidence: 'The original experience explicitly names TypeScript, React, the workflow, and its measured 35% impact.',
          source: 'db/hackathon-demo-experience.yaml',
          keywords: ['React', 'TypeScript', 'reliable product experiences'],
        },
        {
          before: 'Implemented Python REST API endpoints backed by PostgreSQL and covered critical paths with automated tests',
          after: 'Built Python REST API endpoints backed by PostgreSQL and protected critical paths with automated tests',
          requirement: 'Work with Python, REST APIs, PostgreSQL, and automated tests',
          evidence: 'The canonical experience includes all four technologies and confirms automated coverage of critical paths.',
          source: 'db/hackathon-demo-experience.yaml',
          keywords: ['Python', 'REST APIs', 'PostgreSQL', 'automated tests'],
        },
        {
          before: 'Partnered with three student researchers to turn weekly feedback into scoped product improvements',
          after: 'Partnered with three student researchers to translate weekly feedback into scoped product improvements',
          requirement: 'Turn ambiguous needs into small, measurable product improvements with a cross-functional team',
          evidence: 'The source records the three collaborators, weekly feedback loop, and conversion into scoped improvements.',
          source: 'db/hackathon-demo-experience.yaml',
          keywords: ['cross-functional', 'product improvements'],
        },
      ],
    },
    null,
    2,
  )
}

export function makeDemoAnswers(profile: Profile): string {
  const labels: Record<string, string> = {
    age_18_or_older: 'Are you 18 years of age or older?',
    gender: 'Gender identity',
    race_ethnicity: 'Race or ethnicity',
    veteran_status: 'Veteran status',
    disability_status: 'Disability status',
  }
  const answers = Object.entries(profile.application_answers ?? {}).map(([key, value]) => ({
    key,
    question: labels[key] ?? key.replaceAll('_', ' '),
    value,
    required: false,
    source: `profile.application_answers.${key}`,
  }))
  return JSON.stringify({ answers, missing: [] }, null, 2)
}

export function makeDemoCoverLetter(profile: Profile): string {
  return `Dear Northstar Robotics hiring team,

I am excited to apply for the Software Engineering Intern role. My work on React and TypeScript product workflows, Python APIs, and PostgreSQL-backed tools maps directly to the systems your internship team builds. At the Campus Technology Lab, I shipped tools that reduced repetitive support tasks by 35% and worked closely with student researchers to turn feedback into focused improvements.

I would welcome the opportunity to bring that practical, collaborative approach to Northstar while learning from engineers building real robotics products.

Sincerely,
${profile.name}
`
}

export const DEMO_DECISIONS = `# Tailoring decisions

- Led with React, TypeScript, Python, REST API, PostgreSQL, Git, and testing evidence because those capabilities appear in the posting.
- Used only synthetic hackathon-demo facts created with this profile.
- Kept the resume to one page and prioritized measurable product work over generic coursework.
`
