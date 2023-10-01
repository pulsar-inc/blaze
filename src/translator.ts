import type {
    ChatCompletionCreateParamsBase,
    ChatCompletionMessage,
    ChatCompletionRole,
} from "openai/resources/chat/completions";
import type { JSONSchema, JSONValue } from "../types";
import type OpenAI from "openai";

function delay(time: number) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

export class Translator {
    model: ChatCompletionCreateParamsBase["model"];
    schema: JSONSchema;
    client: OpenAI;
    temperature: number = 1;
    messages: ChatCompletionMessage[] = [];
    debug: boolean;
    maxAPICallsPerMinute = 3;

    // default values
    systemInstructions = `You are a translator assistant.
    Your goal is to translate user inputs into JSON Objects matching this schema:`;

    private requestsTimeline: number[] = [];

    constructor(
        client: OpenAI,
        schema: JSONSchema,
        options?: {
            model?: ChatCompletionCreateParamsBase["model"];
            debug?: boolean;
        },
    ) {
        this.debug = options?.debug ?? false;
        this.model = options?.model ?? "gpt-3.5-turbo";
        this.schema = schema;
        this.client = client;
    }

    private async ensureRateLimit() {
        const currentTime = new Date().getTime();

        if (
            this.requestsTimeline.length >= this.maxAPICallsPerMinute &&
            currentTime - this.requestsTimeline[0] < 60000
        ) {
            const msToSleep = 60000 - (currentTime - this.requestsTimeline[0]);

            if (this.debug) console.log("Sleeping for", msToSleep, "ms");

            // Waiting the required delay
            await delay(msToSleep);

            // Removing first element in the time list
            this.requestsTimeline = this.requestsTimeline.slice(1);
        }
    }

    /**
     * Process messages to get LLM completions.
     */
    private async doLLMComplete() {
        // Checking rate limit
        await this.ensureRateLimit();
        // Adding ts to timeline to ensure rate limits
        this.requestsTimeline.push(new Date().getTime());

        const chat = await this.client.chat.completions.create({
            temperature: this.temperature,
            messages: this.messages,
            model: this.model,
            n: 1,
        });
        if (this.debug) {
            console.log("OpenAI usage:", chat.usage);
        }
        if (chat.choices[0].finish_reason !== "stop") {
            console.error("Bad stop");
        }
        this.messages.push(chat.choices[0].message);
    }

    /**
     * Will translate the given input into a JSON Object matching class' schema.
     * Running this function will reset the previous messages.
     * @param input User input
     * @returns Instance of this class
     */
    async translate(input: string) {
        this.messages = [];

        // System rules
        this.messages.push({
            role: "system",
            content:
                this.systemInstructions +
                "\n```json\n" +
                JSON.stringify(this.schema, null, 2) +
                "\n```\n",
        });

        // User input
        this.messages.push({
            role: "user",
            content: input,
        });

        await this.doLLMComplete();
        return this;
    }

    /**
     * Will complete last response with additional context.
     * @param input Aditional context to complete the last response
     * @param prompt Override local prompt
     * @returns Instance of this class
     *
     * The prompt will look like this:
     *
     * ````markdown
     * ${prompt}
     * ```
     * ${input}
     * ```
     * ````
     */
    async complete(input: string, prompt = "Complete your last response using this input:") {
        if (!this.messages.some((x) => x.role === "assistant")) {
            throw new Error("Can't complete if nothing was translated first.");
        }

        this.messages.push({
            role: "user",
            content: prompt + "\n```\n" + input + "\n```\n",
        });

        await this.doLLMComplete();
        return this;
    }

    /**
     * Provide more context by adding an example.
     *
     * ⚠️ **Please note, this may induce bias in responses.**
     * @param input User input that will produce the given result.
     * @param result JSON Object that should result from the given input.
     * @returns
     */
    addExample(input: string, result: Record<string, JSONValue>) {
        this.messages.push({
            role: "user",
            content: input,
        });

        this.messages.push({
            role: "assistant",
            content: JSON.stringify(result, null, 2),
        });
        return this;
    }

    addMessage(content: string, role: ChatCompletionRole) {
        this.messages.push({ role, content });
        return this;
    }

    /**
     * Allow processing the result while keeping the chain
     * @param handler
     * @returns Instance of this class
     */
    processResult(handler: (result: string | null, cls: Translator) => void) {
        handler(this.result, this);
        return this;
    }

    /**
     * Returns the last response from the LLM.
     * TODO:
     *  - remove any nullable fields
     *  - handle bad json objects
     */
    get result() {
        if (!this.messages.length) return null;
        const lastMessage = this.messages[this.messages.length - 1];
        if (lastMessage.role !== "assistant") return null;
        return lastMessage.content ? JSON.parse(lastMessage.content) : null;
    }
}
