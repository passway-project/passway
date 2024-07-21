# Passway

Passway enables anonymous and secure user authentication and cloud storage. It is meant to be a hosted web service that apps can integrate with.

## Requirements

1. Docker
2. NodeJS 20+

## Production usage

### Installation

1. Clone this repo
2. In the project directory, run:

```sh
npm ci
```

### Configuration

Once installed, Passway can be configured. Examine `.env` to see what environment variables you can configure. **DO NOT** use default values for sensitive credentials such as passwords and secrets.

Once configured, Passway can be started.

### Start Passway

```sh
npm start
```

This will start Passway in Production Mode. You can also start Passway in Development Mode to enable debugging:

```sh
npm start:dev
```

Once started, Passway can be stopped.

### Stop Passway

```sh
npm run stop
```

### Rebuild

If you make configuration changes, you may need to rebuild Passway for them to take effect. This can be done with:

```sh
npm run build
```
