<script lang="ts">
  import { FileDown } from '@lucide/svelte';

  interface Job {
    company: string;
    title: string;
    location: string;
    date: string;
    description: string;
  }

  const jobs: Job[] = [
    {
      company: 'Jensen Hughes',
      title: 'Automation Engineer',
      location: 'Remote, USA',
      date: 'February 2026 - Present',
      description:
        'Building workflows via Powershell, PowerAutomate, Python, and other related power app tools within Microsoft environments to expedite business workflows for marketing and sales teams. Exploring integrations with AI, Microsoft Dataverse, PowerBI and CRM tools to allow for more complex workflows.',
    },
    {
      company: 'Intel (UST Global)',
      title: 'Validation Tester II',
      location: 'Santa Clara, CA',
      date: 'August 2025 – February 2026',
      description:
        "Smoke testing for Chromebook SOC's; Linux Sysadmin work, setting up, updating host machines and maintaining network infrastructure for effective testing. Worked on automation of testing in bash, ansible, for tasks related to ensuring that the SOC's operate as intended – networking, sleep related tasks, and debugging via ADB.",
    },
    {
      company: 'Xerox Corporation',
      title: 'Software Engineer',
      location: 'Webster, NY',
      date: 'September 2022 – December 2022',
      description:
        'Integrated backend SQL database systems with PowerBI workflows for data visualization of software products for management to better assess priorities. Worked on software development for a front-end printer application, Workflow Central, in improving backend systems and integrating usage data into new Power BI environments.',
    },
    {
      company: 'Corning Optical Communications',
      title: 'Software Engineer',
      location: 'Hickory, NC',
      date: 'May 2022 – August 2022',
      description:
        'Worked on testing software deployment and development; upgraded test software in PowerShell, LabView. Improved testing speed 10x. Worked in C# and Postgres for internal database upgrades for future products.',
    },
    {
      company: 'Sensored Life',
      title: 'Software Engineer',
      location: 'Rochester, NY',
      date: 'January 2022 – May 2022',
      description:
        'Deployed a new CRM system, VTiger, company-wide and integrated frontend website systems with new CRM backend, while migrating customer data and resources. Set up automatic workflows for the new CRM product for company use.',
    },
  ];
</script>

<div class="work-page">
  <header class="card">
    <div class="resume-title">
      <h1>Resume</h1>
      <a href="/assets/resume.pdf" download aria-label="Download resume PDF">
        <FileDown size={'2rem'} />
      </a>
    </div>
  </header>

  <section class="card" aria-labelledby="education-heading">
    <h2 id="education-heading">Education</h2>
    <div class="education">
      <div>
        <h3>Rochester Institute of Technology</h3>
        <p>B.S. in Computer Science, Cum Laude</p>
      </div>
      <span class="date">August 2019 - May 2023</span>
    </div>
  </section>

  <section class="card" aria-labelledby="experience-heading">
    <h2 id="experience-heading">Experience</h2>

    {#each jobs as job}
      <div class="job">
        <div class="job-header">
          <div>
            <h3>{job.company}</h3>
            <p class="title">{job.title}</p>
          </div>
          <div class="job-meta">
            <span class="location">{job.location}</span>
            <span class="date">{job.date}</span>
          </div>
        </div>
        <p class="description">{job.description}</p>
      </div>
    {/each}
  </section>

  <section class="card" aria-labelledby="skills-heading">
    <h2 id="skills-heading">Skills</h2>
    <div class="skills">
      <div class="skill-category">
        <strong>Languages:</strong>
        <span
          >Rust, Python, Java, C#, C/C++, Bash, SQL, PowerShell, PHP, HTML5/CSS</span
        >
      </div>
      <div class="skill-category">
        <strong>Technologies:</strong>
        <span>Git, Power BI, MacOS, Windows, Linux, Docker, PostgreSQL</span>
      </div>
      <div class="skill-category">
        <strong>Frameworks:</strong>
        <span>Svelte, React</span>
      </div>
    </div>
  </section>
</div>

<style>
  .work-page {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .work-page,
  .work-page > .card {
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
  }
  .resume-title {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .resume-title a {
    color: var(--text);
    transition: color 0.3s ease;
  }

  .resume-title a:hover {
    color: var(--sapphire);
  }

  .education,
  .job-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .education h3 {
    margin-top: 0;
  }

  .job {
    margin-bottom: 1.5rem;
  }

  .job-header {
    margin-bottom: 0.5rem;
  }

  .job-header h3 {
    margin: 0 0 0.25rem 0;
  }

  .title {
    margin: 0;
    font-style: italic;
    color: var(--text);
  }

  .job-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
  }

  .location,
  .date {
    font-size: 0.9rem;
    color: var(--text);
  }

  .description {
    margin: 0.5rem 0 0 0;
    line-height: 1.6;
  }

  .skills {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .skill-category {
    line-height: 1.6;
  }

  .skill-category strong {
    margin-right: 0.5rem;
  }

  @media (max-width: 768px) {
    .education,
    .job-header {
      flex-direction: column;
    }

    .job-meta {
      align-items: flex-start;
      text-align: left;
      margin-top: 0.25rem;
    }

    h2,
    h3,
    p,
    strong,
    span {
      color: var(--text);
    }
  }
</style>
