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

## [0.11.0] - 2021-04-06

### Changed

- Implemented "Service" architecture to organise various node services and their lifecycles
- Multipart/form parser built in
- Removed cookie dependency
- Implemented LoggerLike interface and various middlewares / functions that support it
- All http listener functions now need to be async. This allows much more simple types throughout the app
- Middleware types refactored - Middleware type allows you to write middlewares that can be used with different services (not just http) with the same type, as well as building your own function specific middlewares with AbstractMiddleware. HttpMiddleware is now implemented using AbstractMiddleware

## [0.11.1] - 2021-04-23

### Changed

- Fixed OpenApi type coersers

## [0.11.2] - 2021-05-10

### Changed

- Updated default http request log to be more readable in object loggers

## [0.11.4] - 2021-06-15

### Changed

- Fixed coercions of query types, based on the defined types. There was a problem with complex types (arrays / objects)

## [0.11.6] - 2021-06-25

### Changed

- Added support for default values in parameters

## [0.11.7] - 2021-06-26

### Changed

- Added support for form style array parameters

## [0.12.2] - 2021-09-11

### Changed

- Deep coercion with support for most json-schmea composition logic

## [0.12.4] - 2021-11-26

### Changed

- Added yamlOk, yamlNotFound etc helper functions, as well as "created" status code helper functions

## [0.12.5] - 2021-11-26

### Changed

- Fixed types for setCookie to work with strictly typed responses

## [0.12.6] - 2021-11-29

### Changed

- Added custom request error handler

## [0.12.7] - 2021-11-29

### Changed

- Fixed coercing of form data for request bodies

## [0.13.0] - 2021-11-30

### Changed

- Made security and error handling more generic, so it can be used by both JSON and HTML services.
