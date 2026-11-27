# AwardBro 🏆

Run your own interactive award show. Create categories, let everyone vote from their phones, then reveal the winners live on the big screen.

**[awardbro.com](https://www.awardbro.com)**

## Features

- **No sign-up for voters.** Guests scan the QR code on the big screen, or type a short room code, and vote from any device.
- **Live big-screen presentation** with vote tracking and animated winner reveals.
- **Four category types:** classic votes, image votes, ranked top-N, and aggregate categories that combine results from others.
- **Host controls:** run the show from a laptop or phone, one category at a time: open voting, close it, reveal the winner (with vote counts, without them, or only the winner), next.
- **Password-protected** manage page for each show.

## How it works

1. **Create a show** with a name and a password. It gets a room code, such as `K7QF`.
2. **Add categories and nominations.**
3. **Go live:** put `/present/K7QF` on the big screen, where guests scan the QR code or enter the code on the homepage, and run the show from `/manage/K7QF`.

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
