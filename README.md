# daily deck ✅

A small Notion-style task manager. Lists you create yourself, a due date and priority on anything, notes on individual tasks, and a "today" view that pulls together anything due today or earlier from every list at once.

![status](https://img.shields.io/badge/status-active-brightgreen) ![license](https://img.shields.io/badge/license-MIT-blue)

## How it works, in plain English

- Tasks and lists both save to `localStorage` on every change, no account, no backend
- The "today" view isn't a real list, it's a filter that shows anything due today or earlier from every list combined, so you get one place to see what actually needs doing
- Custom lists are just a name and an id, add one and it shows up in the sidebar immediately
- Clicking a task opens a notes panel where you can jot anything down, or delete the task entirely

## Importing your calendar

There's an "import calendar" button in the sidebar that accepts a `.ics` file, the standard export format basically every calendar app supports (Google Calendar, Apple Calendar, Outlook, all of them). Export your calendar as `.ics` from whichever app you use, upload it here, and each event becomes a task with its title and date carried over.

I went with file import instead of a live calendar connection on purpose. A real live sync would need Google's OAuth flow and a backend to hold the credentials safely, which is a lot of infrastructure for a personal tool like this. A `.ics` file gets you the same data instantly, no accounts, no API keys, no privacy concerns about a third party holding a live connection to your calendar.

## The jarvis connection

This is the part that's actually a little clever rather than just a claim: every project in this GitHub account gets deployed under the same `niloufersanahmohammed-dev.github.io` domain, just at different paths. Browsers scope `localStorage` to the domain, not the path, which means every one of these projects technically shares the same storage. So when jarvis reads a task list, it's not calling an API or faking anything, it's reading the exact same data this app just saved, because they're genuinely running on the same origin.

The catch, and it's a real one: this only works within the same browser. If you add tasks here on your laptop, jarvis on your phone won't see them, since browser storage never leaves the device it was written on. It's not a synced cloud service, just two pages quietly agreeing to use the same storage key (`sanah-shared-tasks-v1`) so they can talk to each other without needing one.

## Running it

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Customizing

- **Colors** are CSS variables at the top of `style.css`.
- **Priority levels** are just three strings (`low`, `medium`, `high`) used throughout `script.js` and matched to colors in `style.css`, add a fourth if you want more granularity.
- **The shared storage key**: if you ever rename `TASKS_KEY` in `script.js`, make sure to update the matching key in jarvis's `commands.js` too, or the connection between the two breaks silently.

## License

MIT. Organize your life however makes sense to you.
