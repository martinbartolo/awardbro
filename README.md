# AwardBro - Create Interactive Award Shows! 🎉

AwardBro is a web application that helps you create and manage interactive award shows. Whether you're organizing a company event, school ceremony, or fun gathering, AwardBro makes it easy to manage nominations and voting in real-time.

## Features

- **Perfect for Any Group** - Host award shows for company events, team celebrations, or social gatherings with unlimited participants
- **Easy Voting** - Participants vote instantly from any device - no registration required
- **Live Presentations** - Dynamic big-screen display with live vote tracking and winner reveals
- **Quick Setup** - Ready in 2 minutes - just add your categories and start
- **Secure Management** - Control your event with a private management dashboard
- **Real-time Updates** - See votes come in live as people make their choice

## How It Works

1. **Create Your Event** - Set up your award show with a custom name and optional password protection
2. **Customize Categories** - Add your award categories and nominations for people to vote on
3. **Go Live** - Share the voting link, watch the votes roll in, and present winners on the big screen

## Tech Stack

This project is built using the T3 Stack, which includes:

- [Next.js](https://nextjs.org) - React framework for production
- [Prisma](https://prisma.io) - Database ORM
- [tRPC](https://trpc.io) - End-to-end typesafe APIs
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- [Shadcn](https://ui.shadcn.com) - UI components

## Setup Instructions

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up your environment variables:
   - Copy `.env.example` to `.env`
   - Configure your database URL and other required variables
4. Run database migrations:

   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

## Deployment

For deployment instructions, follow our guides for:

- [Vercel](https://create.t3.gg/en/deployment/vercel)
- [Netlify](https://create.t3.gg/en/deployment/netlify)
- [Docker](https://create.t3.gg/en/deployment/docker)

## License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License - see the [LICENSE](LICENSE) file for details.

## Contributing

While this is a personal project, bug reports and suggestions are welcome through the issues page. Please note that this project is not open for commercial use.
