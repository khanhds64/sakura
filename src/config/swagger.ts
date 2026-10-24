
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const openapiFilePath = path.resolve(
    process.cwd(),
    "openapi/openapi.yaml"
);

const openapiFile = fs.readFileSync(openapiFilePath, "utf8");

export const openapiSpecification = YAML.parse(openapiFile);
