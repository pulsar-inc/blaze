# plsr/blaze

**Note: right now this lib is only compatible with openai LLMs.**

To install the lib externally **(Not available yet!)**

```bash
# bun
bun i openai @plsr/blaze

# npm
npm i openai @plsr/blaze

# yarn
yarn add openai @plsr/blaze
```

## Examples

<details>
  <summary>Example setup</summary>
  
  ```typescript
  import OpenAI from "openai";
  import { Translator } from "@plsr/blaze";

  const openai = new OpenAI(); // Requires api key in environment
  const schema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "Client",
      description: "Schema representing a client.",
      type: "object",
      properties: {
          isCompany: {
              default: false,
              type: "boolean",
              description: "true if the client is a company.",
          },
          firstName: {
              type: "string",
              description: "First name of the client.",
          },
          lastName: {
              type: "string",
              description: "Last name of the client.",
          },
          companyName: {
              type: "string",
              description: "Name of the company.",
          },
          address: {
              type: "string",
              description: "Client's address.",
          },
          email: {
              type: "string",
              format: "email",
              description: "Client's email address.",
          },
          phone: {
              type: "string",
              description: "Client's telephone number.",
          },
      },
  };

  const translator = new Translator(openai, schema);
  ```

</details>

**Basic example:**

```typescript
translator
    .translate(
        "Just sold 2 resistors and one capacitor to Jean Michel Frey, he's a really good guy! He lives just next to my house in the Avenue Montaigne in Paris",
    )
    .then((x) => console.log(x.result));
```

```json
{
    "isCompany": false,
    "firstName": "Jean Michel",
    "lastName": "Frey",
    "address": "Avenue Montaigne, Paris"
}
```

**Completion example:**

```typescript
translator
    .translate(
        "Just sold 2 resistors and one capacitor to Jean Michel Frey, he's a really good guy!",
    )
    .then((x) => x.processResult((res) => console.log(res)))
    .then((x) => x.complete("He lives just next to my house in the Avenue Montaigne in Paris"))
    .then((x) => console.log(x.result));
```

First log

```json
{
    "isCompany": false,
    "firstName": "Jean Michel",
    "lastName": "Frey"
}
```

Second log

```json
{
    "isCompany": false,
    "firstName": "Jean Michel",
    "lastName": "Frey",
    "address": "Avenue Montaigne, Paris"
}
```

## Ideas

You could use this lib [`json-schema-to-typescript`](https://www.npmjs.com/package/json-schema-to-typescript) to generate typings for your inputs.

## Dev

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.0.3. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
