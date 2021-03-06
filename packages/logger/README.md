# @cumulus/logger [![Build Status](https://travis-ci.org/nasa/cumulus.svg?branch=master)](https://travis-ci.org/nasa/cumulus)

> A logging library for use on the Cumulus project.

The `@cumulus/logger` library exports a `Logger` class, which generates
JSON-formated log events.

Log events always have the following keys:

- **level** (string) - the priority level of the message
- **message** (string) - the message itself
- **sender** (string) - the resource that created the message
- **timestamp** (string) - an ISO-8601 timestamp

Log events may have the following options keys:

- **executions** (string)
- **version** (string)

Log events may also contain user-specified keys.

Example log event:

```json
{
  "level": "info",
  "message": "hello world",
  "sender": "greetingFunction",
  "timestamp": "2018-10-19T19:12:47.501Z"
}
```

## Install

```
$ npm install @cumulus/logger
```

## Usage

```js
const Logger = require('@cumulus/logger');

const log = new Logger({ sender: 'example' });

log.info('hello, world');
```

## API

### new Logger({ [sender], [executions], [version] })

#### sender

Type: `string`

The sender of the log event.  Typically a Lambda Function Name or ECS Task Name.
Defaults to "unknown".

#### executions

Type: `string`

An optional description of the executions.

#### version

Type: `string`

An optional version.

### log.debug([...messageArgs])

Writes a log event to stdout with level set to "debug".

#### args

Type: `...any`

See [console.log()](https://nodejs.org/dist/latest-v8.x/docs/api/console.html#console_console_log_data_args).

### log.error([...messageArgs][, error])

Writes a log event to stderr with level set to "error".

#### args

Type: `...any`

See [console.log()](https://nodejs.org/dist/latest-v8.x/docs/api/console.html#console_console_log_data_args).

#### error

Type: `Error`

If the last argument is an Error then the following additional properties will be set on the log event:

* **error** (Object)
  * **name** (string)
  * **message** (string)
  * **stack** (Array\<string\>) - the lines of the stack trace

### log.fatal([...messageArgs])

Writes a log event to stdout with level set to "fatal".

#### args

Type: `...any`

See [console.log()](https://nodejs.org/dist/latest-v8.x/docs/api/console.html#console_console_log_data_args).

### log.info([...messageArgs])

Writes a log event to stdout with level set to "info".

#### args

Type: `...any`

See [console.log()](https://nodejs.org/dist/latest-v8.x/docs/api/console.html#console_console_log_data_args).

### log.infoWithAdditionalKeys(additionalKeys, ...messageArgs)

Writes a log event to stdout with level set to "info".  In addition to the
standard keys, additional keys will be added to the event.  If an additional key
is specified with the same name as a standard key, the value standard key will
be displayed.

#### additionalKeys

Type: `Object`

Additional key/value pairs to be added to the event.

#### args

Type: `...any`

See [console.log()](https://nodejs.org/dist/latest-v8.x/docs/api/console.html#console_console_log_data_args).

### log.trace([...messageArgs])

Writes a log event to stdout with level set to "trace".

#### args

Type: `...any`

See [console.log()](https://nodejs.org/dist/latest-v8.x/docs/api/console.html#console_console_log_data_args).

### log.warn([...messageArgs])

Writes a log event to stdout with level set to "debug".

#### args

Type: `...any`

See [console.log()](https://nodejs.org/dist/latest-v8.x/docs/api/console.html#console_console_log_data_args).

## What is Cumulus?

Cumulus is a cloud-based data ingest, archive, distribution and management
prototype for NASA's future Earth science data streams.

[Cumulus Documentation](https://nasa.github.io/cumulus)

## Contributing

See [Cumulus README](https://github.com/nasa/cumulus/blob/master/README.md#installing-and-deploying)
