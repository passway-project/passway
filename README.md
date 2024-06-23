# Passway

Passway enables anonymous and secure user authentication and cloud storage. It is meant to be a hosted web service that apps can integrate with.

## Requirements

1. Docker
2. NodeJS 20+

## Usage

### Installation

1. Clone this repo
2. In the project directory, run:

```sh
npm ci
```

Once installed, Passway can be started.

### Start Passway

```sh
npm start
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
