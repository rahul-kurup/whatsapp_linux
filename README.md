# WhatsApp for Linux

## Credits

- Original fork: [uvindusl/Whatsapp-for-linux](https://github.com/uvindusl/Whatsapp-for-linux)
- User agent feed: [jnrbsn/user-agents](https://jnrbsn.github.io/user-agents/user-agents.json)

## Prerequisites

- Node.js 22+
- pnpm (recommended) or npm
- Linux operating system

## Installation

```bash
git clone https://github.com/rahul-kurup/whatsapp_linux.git
cd whatsapp_linux
pnpm install
```

## Development

```bash
# Start development server with hot reload
pnpm dev

# Type check only
pnpm type-check

# Lint code
pnpm lint

# Format code
pnpm format
```

## Building

```bash
# Compile and run
pnpm start

# Build production packages (AppImage, deb, rpm, tar.gz)
pnpm build

# Build development version
pnpm build:dev
```

## Code Quality check

```bash
# Run all checks
pnpm type-check && pnpm lint && pnpm format:check

# Fix issues
pnpm lint:fix
pnpm format
```
