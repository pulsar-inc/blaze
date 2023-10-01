type JSONValue = string | number | boolean | JSONObject | JSONValue[];

interface JSONObject {
    [x: string]: JSONValue;
}

export type JSONSchema = JSONObject;
