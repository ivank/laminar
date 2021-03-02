# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.9.0] - 2020-10-03

### Changed

- Ability to coerce request query params into its schema defined types (integer, boolean)

## [0.9.3] - 2020-12-04

### Changed

- Support CORs headers even if there are exceptions in the response

## [0.9.5] - 2020-12-22

### Changed

- Support type coercion even for nested request parameter objects in the query string

## [0.9.6] - 2021-01-21

### Changed

- Introduced the `optional` response helper, for more elegantly dealing with MyType | undefined types with nullish coallesing

## [0.10.0] - 2021-01-28

### Changed

- Changed laminar to use OpenApi's json-schema dielect, instead of the latest json-schema draft. Differences documented here https://swagger.io/docs/specification/data-models/keywords/.

## [0.10.1] - 2021-03-02

### Changed

- `jsonNoContent`, `htmlNoContent` and `textNoContent` no longer accept a body argument, as there should be no content
- `start` and `stop` laminar calls now return the server object, so it can be easily described later.
