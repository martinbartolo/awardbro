# AwardBro 🏆

Run your own interactive award show. Create categories, let everyone vote from their phones, then reveal the winners live on the big screen.

**[awardbro.com](https://www.awardbro.com)**

## Features

- **No sign-up for voters.** Share a link and people vote from any device.
- **Live big-screen presentation** with vote tracking and animated winner reveals.
- **Four category types:** classic votes, image votes, ranked top-N, and aggregate categories that combine results from others.
- **Host controls:** open one category at a time, reveal when ready, hide vote counts or show only the winner.
- **Password-protected management** for each show.

## How it works

1. **Create a show** with a name, a URL and an optional management password.
2. **Add categories and nominations.**
3. **Go live:** share `/vote/<your-show>` with voters, put `/present/<your-show>` on the big screen, and run the show from `/manage/<your-show>`.

## Development

Built with Next.js, tRPC, Prisma, Tailwind and shadcn/ui. Hosted on Vercel with Postgres on Neon.

```bash
pnpm install
vercel env pull .env.local
pnpm dev
```

- [docs/development.md](docs/development.md): setup, workflow, database and environments
- [docs/architecture.md](docs/architecture.md): data model, scoring and access control

## License

[Creative Commons Attribution-NonCommercial 4.0](LICENSE). This is a personal project. Bug reports and suggestions are welcome through issues, but it's not open for commercial use.
