# Student Project Showcase

A responsive web app for publishing and discovering student projects. Students add their semester projects, and visitors such as faculty reviewers, recruiters and other students can search, filter and shortlist them.

**Live demo:** https://&lt;username&gt;.github.io/student-project-showcase/

Built with plain HTML, CSS and JavaScript: no frameworks, libraries or build step.

## Features

- **Browse projects.** Cards show category, course, semester, team size, summary and technologies.
- **Search and filter.** Live keyword search across titles, summaries, courses, technologies and team members. Filters for category, semester and Featured projects, plus clickable technology tags. Sort by newest, most liked or title.
- **Project details.** A popup shows the full team, technologies, repository and demo links, and contact email.
- **Submit a project.** The form checks every field as you go and explains each problem next to the field.
- **Likes and shortlist.** Like projects and save them to a personal shortlist to review later.
- **Statistics.** Projects by category, most-used technologies, average team size and the most-liked project, updated as projects are added.
- **Responsive.** Separate layouts for mobile, tablet (600 px and up) and desktop (960 px and up).
- **Accessible.** Keyboard navigation, a skip link, labelled form fields, error messages announced to screen readers, and visible focus outlines.

## Showcase rules

| Rule | Enforced by |
|---|---|
| A team has 1 to 4 members | Submit form |
| A title can be used only once per semester | Submit form (checked again when the semester changes) |
| A project is **Featured** only with both a GitHub repository and a live demo link | Badge, filter and live preview in the form |

## Running locally

Clone the repository, then either:

- open `index.html` in a modern browser, or
- serve the folder:
  ```bash
  python -m http.server 8000
  ```
  and visit http://localhost:8000.

## Project structure

```
├── index.html      Page structure: header, hero, browse, submit, stats, shortlist, detail dialog
├── css/styles.css  Mobile-first styles; breakpoints at 600px and 960px
├── js/data.js      Categories, semesters and 8 sample projects
└── js/app.js       State, filtering, rendering, event handling and form validation
```

## Data and storage

The app runs entirely in the browser and has no server. The sample projects come from `js/data.js`. Projects you add, likes and your shortlist are saved in your browser's `localStorage`, so they:

- stay after a page reload,
- are visible only on that browser and device,
- can be cleared by deleting the `sps-*` keys in DevTools → Application → Local Storage.

If `localStorage` is unavailable, the app still works but doesn't save changes.

All sample projects, names and links are fictional. Links use the reserved `example.app` and `example.edu` domains.

## Roadmap

- A server API and database so submissions are shared across all users
- Student and reviewer accounts with roles
- Moderation and reviewer feedback on projects
- Searchable public profiles for students

## Credits

Built by Ali Abdullah Abbasi for CS344 Web Engineering (Assignment 1, idea #31). No third-party code, images or fonts are used. Icons are Unicode characters, and the font is the system font stack.

**AI assistance:** _describe how AI tools were used._
