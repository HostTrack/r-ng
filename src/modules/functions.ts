import { Client, Message } from "revolt.js";

import { Command, Context } from "../types/command";

import { globalStrings } from "../i18n/en_GB";

import type { ServerConfig, UserConfig } from "../types/config";
import { BotFramework } from "./framework";

// external libs
import dayjs from "dayjs";
import axios from "axios";
import FormData from "form-data";

// node builtins
import { readFile, writeFile } from "fs/promises";
import path from "path";

export function generateTimestamp() {
	return dayjs(new Date().getTime()).toISOString();
}

export async function handleError(
	msg: Message, // needed for the client
	error: any,
	type: "warning" | "error"
) {
	const loggingChannelId = process.env.LOGGING_CHANNEL ?? null;
	if (!loggingChannelId) {
		return console.log(error);
	}
	const loggingChannel = await msg.client.channels.fetch(loggingChannelId);
	if (!loggingChannel) {
		return console.log(error);
	}
	try {
		return loggingChannel.sendMessage(
			`**New ${
				type === "error" ? "error :bangbang:" : "warning :warning:"
			}**\n\`\`\`\n${error}\n\`\`\``
		);
	} catch {
		return console.log(error);
	}
}

export function isValidContext(
	msg: Message,
	isDev: boolean,
	bot: BotFramework
): Context {
	let values: Context = { command: null, args: [], canExecute: false };

	// ignore system messages
	if (!msg.content) return values;

	// if someone mentions the bot at the start of a message, reply to them with the prefix
	const prefixMention = new RegExp(`^<@!?${bot.client.user!._id}>.*$`);

	const botPinged = prefixMention.test(msg.content);
	if (botPinged)
		msg.channel?.sendMessage(globalStrings.help.pingPrefix(bot.prefix));

	if (!msg.content.startsWith(bot.prefix)) return values;

	const args = msg.content.slice(bot.prefix.length).split(" ");
	const commandName = args.shift();
	const command: Command = getCommand(commandName as string, bot);
	values.command = command;
	values.args = args;

	if (!command) return values;

	const issues = commandChecks(msg, command, isDev, bot);

	if (!issues) values.canExecute = true;
	return values;
}

export function commandChecks(
	msg: Message,
	command: Command,
	isDev: boolean,
	bot: BotFramework
) {
	if (command.developer && !isDev) {
		msg.channel?.sendMessage(globalStrings.errors.devOnlyCommand);
		return true;
	} else if (command.serverOnly && !msg.channel?.server) {
		msg.channel?.sendMessage(globalStrings.errors.serverOnlyCommand);
		return true;
	} else return false;
}

export function getCommand(value: string, bot: BotFramework) {
	return bot.commands.find(
		(cmd) => cmd.name === value || cmd.aliases.includes(value)
	);
}

/**
 * Resolves the directory for the given config file
 * @param id ID of the user/server
 */
function getDir(id: string) {
	const dir = `data/config/${id}.json`;
	const __dirname = path.resolve();
	const resolvedDir = path.resolve(__dirname, `${dir}`);
	return resolvedDir;
}

/**
 * Fetches config info for the provided user/server
 * @param id ID of the user/server
 */
async function getConfig(
	id: string
): Promise<UserConfig | ServerConfig | null> {
	const resolvedDir = getDir(id);
	try {
		const file = await readFile(resolvedDir);
		const readData = file.toString("utf8");
		const config = await JSON.parse(readData);
		if (config.type !== null) {
			return config;
		} else {
			return null;
		}
	} catch (err) {
		return null;
	}
}

/**
 * Sets the specified config key to the specified value
 * @param id The user/server's ID
 * @param key The config key to change
 * @param value The new value
 */
export async function setConfig(id: string, key: any, value: any) {
	try {
		let originalConfig = (await getConfig(id)) as any;
		if (originalConfig) {
			let newConfig = originalConfig;
			newConfig[key] = value;
			const newConfigAsJSON = JSON.stringify(newConfig, null, 4);
			try {
				const resolvedDir = getDir(id);
				await writeFile(resolvedDir, newConfigAsJSON);
			} catch (err) {
				console.log(err);
				return null;
			}
		}
	} catch (err) {
		console.log(err);
		return null;
	}
}

/**
 * Fetches config info for the provided user
 * @param id The user's ID
 * @returns The user's config (as a UserConfig object) or null
 */
export async function getUserConfig(id: string): Promise<UserConfig | null> {
	const config = getConfig(id);
	if (config !== null) {
		return config as UserConfig;
	} else {
		return null;
	}
}

/**
 * Fetches config info for the provided server
 * @param id The server's ID
 * @returns The server's config (as a ServerConfig object) or null
 */
export async function getServerConfig(
	id: string
): Promise<ServerConfig | null> {
	const config = getConfig(id);
	if (config !== null) {
		return config as ServerConfig;
	} else {
		return null;
	}
}

/**
 * Fetches the provided user's language and its strings
 */
export async function getLanguage(id: string): Promise<any | null> {
	try {
		const config = await getUserConfig(id);
		const rawData = config
			? await import(`../i18n/${config?.language}`)
			: null;
		const object = rawData.strings;
		return object;
	} catch (err) {
		return null;
	}
}

/**
 * Uploads the provided Buffer to Autumn
 * @param client The Client object, used to get the Autumn URL
 * @param file The Buffer to upload
 * @param filename The file name the file will be uploaded with
 */
export async function uploadFile(
	client: Client,
	file: Buffer,
	filename: string
): Promise<string> {
	const autumnURL = client.configuration?.features.autumn.url;

	let data = new FormData();
	data.append("file", file, { filename: filename });

	const headers = data.getHeaders();
	let req = await axios.post(`${autumnURL}/attachments`, data, {
		headers: headers,
	});
	return (req.data as any)["id"] as string;
}

/**
 * Wait for the given amount of time before doing anything else
 * @param ms The amount of time to wait for (in milliseconds)
 */
export const sleep = (ms: number | undefined) =>
	new Promise((r) => setTimeout(r, ms));
