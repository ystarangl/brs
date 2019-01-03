import * as fs from "fs";
import * as path from "path";
import pify from "pify";

const exists = pify(fs.exists, { errorFirst: false });
const readFile = pify(fs.readFile);

/** The set of possible value types in a `manifest` file's `key=value` pair. */
export type ManifestValue = number | string | boolean;

/** A map containing the data from a `manifest` file. */
export type Manifest = Map<string, ManifestValue>;

/**
 * Attempts to read a `manifest` file, parsing its contents into a map of string to JavaScript
 * number, string, or boolean.
 * @param rootDir the root directory in which a `manifest` file is expected
 * @returns a Promise that resolves to a map of string to JavaScript number, string, or boolean,
 *          representing the manifest file's contents
 */
export async function getManifest(rootDir: string): Promise<Manifest> {
    let manifestPath = path.join(rootDir, "manifest");

    if (!await exists(manifestPath)) {
        return Promise.resolve(new Map());
    }

    let contents: string = await readFile(manifestPath, "utf-8");

    try {
        let keyValuePairs = contents
            // for each line
            .split("\n")
            // remove leading/trailing whitespace
            .map(line => line.trim())
            // separate keys and values
            .map((line, index) => {
                // skip empty lines and comments
                if (line === "" || line.startsWith("#")) {
                    return ["", ""];
                }

                let equals = line.indexOf("=");
                if (equals === -1) {
                    throw new Error(`[manifest:${index + 1}] No '=' detected.  Manifest attributes must be of the form 'key=value'.`);
                }
                return [line.slice(0, equals), line.slice(equals + 1)];
            })
            // keep only non-empty keys and values
            .filter(([key, value]) => key && value)
            // remove leading/trailing whitespace from keys and values
            .map(([key, value]) => [key.trim(), value.trim()])
            // convert value to boolean, integer, or leave as string
            .map(([key, value]): [string, ManifestValue] => {
                if (value.toLowerCase() === "true") { return [key, true]; }
                if (value.toLowerCase() === "false") { return [key, false]; }

                let maybeNumber = Number.parseInt(value);
                // if it's not a number, it's just a string
                if (Number.isNaN(maybeNumber)) { return [key, value]; }
                return [key, maybeNumber];
            });

        return Promise.resolve(
            new Map<string, ManifestValue>(keyValuePairs)
        );
    } catch (err) {
        return Promise.reject(err);
    }
}

/**
 * Parses a 'manifest' file's `bs_const` property into a map of key to boolean value.
 * @param manifest the internal representation of the 'manifest' file to extract `bs_const` from
 * @returns a map of key to boolean value representing the `bs_const` attribute, or an empty map if
 *          no `bs_const` attribute is found.
 */
export function getBsConst(manifest: Manifest): Map<string, boolean> {
    if (!manifest.has("bs_const")) {
        return new Map();
    }

    let bsConstString = manifest.get("bs_const");
    if (typeof bsConstString !== "string") {
        throw new Error("Invalid bs_const right-hand side.  bs_const must be a string of ';'-separated 'key=value' pairs");
    }

    let keyValuePairs = bsConstString
        // for each key-value pair
        .split(";")
        // ignore empty key-value pairs
        .filter(keyValuePair => !!keyValuePair)
        // separate keys and values
        .map(keyValuePair => {
            let equals = keyValuePair.indexOf("=");
            if (equals === -1) {
                throw new Error(`No '=' detected for key ${keyValuePair}.  bs_const constants must be of the form 'key=value'.`);
            }
            return [keyValuePair.slice(0, equals), keyValuePair.slice(equals + 1)];
        })
        // remove leading/trailing whitespace from keys and values
        .map(([key, value]) => [key.trim(), value.trim()])
        // convert value to boolean or throw
        .map(([key, value]): [string, boolean] => {
            if (value.toLowerCase() === "true") { return [key, true]; }
            if (value.toLowerCase() === "false") { return [key, false]; }
            throw new Error(`Invalid value for bs_const key '${key}'.  Values must be either 'true' or 'false'.`);
        });

    return new Map(keyValuePairs);
}
