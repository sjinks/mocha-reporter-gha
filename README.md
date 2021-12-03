# mocha-reporter-gha

[![Build and Test](https://github.com/sjinks/mocha-reporter-gha/actions/workflows/build.yml/badge.svg)](https://github.com/sjinks/mocha-reporter-gha/actions/workflows/build.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=sjinks_mocha-reporter-gha&metric=alert_status)](https://sonarcloud.io/dashboard?id=sjinks_mocha-reporter-gha)

Mocha reporter for GitHub Actions.

This reporter was inspired by [mocha-github-actions-reporter](https://github.com/daniellockyer/mocha-github-actions-reporter) but is written in TypeScript and is implemented a bit differently. Unlike the original, it supports mocha > 9.0.0 and has a proper test suite.

## Installation

```bash
npm i -D mocha-reporter-gha
```

## Usage

```bash
mocha -R mocha-reporter-gha
```
