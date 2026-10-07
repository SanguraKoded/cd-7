# CD 7: Crime Documentary Mastery

A self-paced learning site built from the *Crime Documentary Mastery, 7-Day Course* curriculum.
Plain HTML, CSS and JavaScript: no build step, no dependencies, works on GitHub Pages as is.
Same structure and features as the DE 75 site, reskinned for this course.

## What is inside

- **Overview**: a progress filmstrip of all 7 days across three phases (pre-production, production, post & publish), the four deliverables, and how to use the course.
- **Day pages (1 to 7)**: every video for that day (Day 1 has a tutorial plus two channels to study; Day 2 has no video and links two written guides instead), every practice step as a checklist, the deliverable highlighted, notes, a timer, and previous/next navigation. Finishing the last step marks the day done.
- **Roadmap**: all days by phase, with filters for status and topic.
- **Resources**: the full resource library (study channels, sourcing guides, the editor, audio, thumbnails, policy).
- **Wins**: the motivation wall, a random "give me another" push, and a win log.
- **Search**: press `/` or `Ctrl/Cmd + K` to search topics, videos and practice steps. On a day page, use the left and right arrow keys to move between days.
- **Progress**: ticks, notes, timers, and wins are saved in the visitor's browser (localStorage). Use the download icon in the header to back up, restore or reset.
- Light and dark themes.

## Publish on GitHub Pages

1. Create a new repository on GitHub (for example `cd-7`).
2. Upload everything in this folder to the repository root (`index.html`, `assets/`, `.nojekyll`, `README.md`).
3. Go to **Settings, then Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. After a minute your site is live at `https://YOUR-USERNAME.github.io/cd-7/`.

If you want this alongside the DE 75 site in the same account, publish it as its own repository — GitHub Pages serves one site per repository.

## Edit the curriculum

All course content is in `assets/data.js` (`window.CURRICULUM`): days, videos, steps, phases, deliverables, resources and quotes.
Each day looks like this:

```js
{ n: 1, m: 1, topic: "…", note: null,
  videos: [ { label: "Channel or video title", url: "https://…", guide: false } ],
  steps: [ { t: "Step text", sub: ["optional sub-line", "another"] } ] }
```

A video with `guide: true` (or a non-YouTube URL) renders as a link card instead of an embedded player — used for the Day 1 channels to study and the Day 2 written guides.
Start a step with `Deliverable:` to highlight it.
If you change the number of steps in a day, the saved ticks of existing visitors still map by step position.

## Notes

- Fonts load from Google Fonts and videos from YouTube, so learners need an internet connection.
- Progress is per browser and per device. Nothing is sent to any server.
- Day 2 and the sound-design resource rely on sources the curriculum could not fully verify — see the notes on those pages before relying on them.
