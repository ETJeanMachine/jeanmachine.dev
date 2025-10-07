<script lang="ts">
  import { FileDown } from '@lucide/svelte';
</script>

<div class="card">
  <div class="resume-title">
    <h1>Resume</h1>
    <a href="/resume.pdf" download>
      <FileDown size={'2rem'} />
    </a>
  </div>
  <hr />

  <h2>Education</h2>
  <div class="education">
    <div>
      <h3>Rochester Institute of Technology</h3>
      <p>B.S. in Computer Science, Cum Laude</p>
    </div>
    <span class="date">August 2019 - May 2023</span>
  </div>

  <hr />

  <h2>Experience</h2>

  <div class="job">
    <div class="job-header">
      <div>
        <h3>Intel (UST Global)</h3>
        <p class="title">Validation Tester II</p>
      </div>
      <div class="job-meta">
        <span class="location">Santa Clara, CA</span>
        <span class="date">August 2025 – Present</span>
      </div>
    </div>
    <p class="description">
      Smoke testing for Chromebook SOC's; Linux Sysadmin work, setting up,
      updating host machines and maintaining network infrastructure for
      effective testing. Worked on automation of testing in bash, ansible, for
      tasks related to ensuring that the SOC's operate as intended – networking,
      sleep related tasks, and debugging via ADB.
    </p>
  </div>

  <div class="job">
    <div class="job-header">
      <div>
        <h3>Xerox Corporation</h3>
        <p class="title">Software Engineer</p>
      </div>
      <div class="job-meta">
        <span class="location">Webster, NY</span>
        <span class="date">September 2022 – December 2022</span>
      </div>
    </div>
    <p class="description">
      Integrated backend SQL database systems with PowerBI workflows for data
      visualization of software products for management to better assess
      priorities. Worked on software development for a front-end printer
      application, Workflow Central, in improving backend systems and
      integrating usage data into new Power BI environments.
    </p>
  </div>

  <div class="job">
    <div class="job-header">
      <div>
        <h3>Corning Optical Communications</h3>
        <p class="title">Software Engineer</p>
      </div>
      <div class="job-meta">
        <span class="location">Hickory, NC</span>
        <span class="date">May 2022 – August 2022</span>
      </div>
    </div>
    <p class="description">
      Worked on testing software deployment and development; upgraded test
      software in PowerShell, LabView. Improved testing speed 10x. Worked in C#
      and Postgres for internal database upgrades for future products.
    </p>
  </div>

  <div class="job">
    <div class="job-header">
      <div>
        <h3>Sensored Life</h3>
        <p class="title">Software Engineer</p>
      </div>
      <div class="job-meta">
        <span class="location">Rochester, NY</span>
        <span class="date">January 2022 – May 2022</span>
      </div>
    </div>
    <p class="description">
      Deployed a new CRM system, VTiger, company-wide and integrated frontend
      website systems with new CRM backend, while migrating customer data and
      resources. Set up automatic workflows for the new CRM product for company
      use.
    </p>
  </div>

  <hr />

  <h2>Skills</h2>
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
</div>

<style>
  .card {
    max-height: calc(100vh - 150px);
    overflow-y: auto;
  }

  .resume-title {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .resume-title a {
    color: var(--primary);
    transition: color 0.3s ease;
  }

  .resume-title a:hover {
    color: var(--accent-background);
  }

  .education {
    display: flex;
    flex-direction: row;
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
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
  }

  .job-header h3 {
    margin: 0 0 0.25rem 0;
  }

  .title {
    margin: 0;
    font-style: italic;
    color: var(--primary);
  }

  .job-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
  }

  .location {
    font-size: 0.9rem;
    color: var(--primary);
  }

  .date {
    font-size: 0.9rem;
    color: var(--primary);
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
    .card {
      max-height: none;
      overflow-y: visible;
    }

    .education {
      flex-direction: column;
    }

    .job-header {
      flex-direction: column;
    }

    .job-meta {
      align-items: flex-start;
      text-align: left;
      margin-top: 0.25rem;
    }

    .title,
    .location,
    .date {
      color: var(--primary);
    }

    h2,
    h3,
    p,
    strong,
    span {
      color: var(--primary);
    }
  }
</style>
