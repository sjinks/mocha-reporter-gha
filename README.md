# mocha-reporter-gha

Mocha reporter for GitHub Actions.

This reporter was inspired by [mocha-github-actions-reporter](https://github.com/daniellockyer/mocha-github-actions-reporter) but is written in TypeScript and is implemented a bit differently. Unlike the origina, it supports mocha > 9.0.0 andhas a proper test suite.

## Installation

```bash
npm i -D mocha-reporter-gha
```

## Usage

```bash
mocha -R mocha-reporter-gha
```
