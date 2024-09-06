# Passway

Passway enables anonymous and secure user authentication and cloud storage. It is meant to be a hosted web service that apps can integrate with.

## Requirements

1. Docker
2. NodeJS 20+

## Installation

1. Clone this repo
2. In the project directory, run:

```sh
npm ci
```

### Production usage

#### Configuration

Once installed, Passway can be configured. Examine `.env` to see what environment variables you can configure. **DO NOT** use default values for sensitive credentials such as passwords and secrets.

Once configured, Passway can be started.

#### Start Passway

```sh
npm start
```

This will start the whole stack via Docker. By default:

- The API can be accessed at http://localhost:3123/api with [Swagger UI](https://swagger.io/tools/swagger-ui/) at the root.
- The SDK playground can be accessed at https://localhost:3126/.
  - This environment is served via a self-signed certificate that is generated when the stack is booted. You will probably be shown a browser warning UI when opening the page. If so, you will need to accept any risks described by the browser in order to access the playground.
- The SDK documentation can be accessed at http://localhost:3127/.

Once started, Passway can be stopped.

#### Stop Passway

```sh
npm run stop
```

#### Rebuild

If you make configuration changes, you may need to rebuild Passway for them to take effect. This can be done with:

```sh
npm run build
```

### Development

If you'd like to make changes to Passway or debug it, you can run it in development mode (assuming it's not already running in Production mode as above):

```sh
npm run start:dev
```

This will run the same stack as Production, but with a few modifications:

- Local source code is mounted in the containers, so changes made to them will automatically be reflected in the running containers.
- The API server will automatically restart when a source code change is made.
- The following additional API ports will be exposed:
  - `9229`: For debugging application code and unit tests with [a Node debugger](https://nodejs.org/en/learn/getting-started/debugging)
  - `9230`: For debugging application code at runtime with [a Node debugger](https://nodejs.org/en/learn/getting-started/debugging)

And a few additions:

- [pgAdmin](https://www.pgadmin.org/) can be accessed at http://localhost:3124
- [Redis Commander](https://joeferner.github.io/redis-commander/) can be accessed at http://localhost:3125

To tear down the development stack, run:

```sh
npm run stop:dev
```

#### Tests

When making changes to Passway, please add appropriate automated test coverage. Unit tests can be run with:

```sh
npm test
```

A test watcher can be started to automatically test changes with:

```sh
npm run test:watch
```

Unit tests should be set up such that resource dependencies (such as DB or cache) are mocked out. To validate code against real infrastructure, integration testing coverage should be added. Integration tests can be run with:

```sh
npm run test:integration
```

This will spin up ephemeral infrastructure (such as a database and cache), run integrations tests (denoted by having the `.integration-test.ts` file suffix), and then tear down the infrastructure that was used.

#### Data modeling

Data modeling is done with [Prisma](https://www.prisma.io/), and data models are defined at `server/api/prisma/schema.prisma`. To apply changes made to this file, you can run:

```sh
npm run db:migrate:dev
```

To ensure that the SDK is using accurate TypeScript types for the API schema, you can run:

```sh
npm run check:types
```

## License

[FSL-1.1-MIT](https://fsl.software/FSL-1.1-MIT.template.md)
